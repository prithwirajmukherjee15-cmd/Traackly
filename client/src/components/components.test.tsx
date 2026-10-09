import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { makeRequest } from '../test/fixtures';
import { BoardView } from './board/Board';
import { ItemPanel } from './board/ItemPanel';
import { RequestBoard } from './requests/RequestBoard';
import { Modal } from './ui/Modal';
import { groupByState } from '../lib/grouping';
import { FieldDiff } from './requests/Changelog';
import { RequestFormFields } from './requests/RequestForm';
import { StatusCell } from './ui/StatusPill';
import { EMPTY_FIELDS } from '../lib/requestFields';

describe('StatusCell', () => {
  it('always carries a text label, never color alone', () => {
    render(<StatusCell state="updated" />);
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});

describe('RequestBoard', () => {
  it('renders non-empty groups with flags and links', async () => {
    const flagged = makeRequest({
      id: 'f',
      clientName: 'Railway order',
      state: 'updated',
      pendingAcks: ['logistics', 'floor'],
    });
    const atRisk = makeRequest({
      id: 'r',
      clientName: 'Kirloskar',
      risk: { atRisk: true, reasons: ['Edited 2 times'] },
    });
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RequestBoard
          groups={[
            { key: 'u', title: 'Updated', tone: 'updated', items: [flagged] },
            { key: 'p', title: 'In progress', tone: 'in_progress', items: [atRisk] },
            { key: 'e', title: 'Empty group', tone: 'raised', items: [] },
          ]}
          href={(r) => `/requests/${r.id}`}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Railway order' })).toHaveAttribute('href', '/requests/f');
    expect(screen.getByText('Awaiting ack: Logistics + Floor')).toBeInTheDocument();
    expect(screen.getByText('At risk')).toBeInTheDocument();
    expect(screen.queryByText('Empty group')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Updated/ }));
    expect(screen.queryByRole('link', { name: 'Railway order' })).not.toBeInTheDocument();
  });
});

describe('FieldDiff', () => {
  it('shows before and after with readable labels', () => {
    render(
      <FieldDiff
        entry={{
          field: 'targetDepartment',
          oldValue: 'production',
          newValue: 'qa',
          changedBy: { id: 'a', name: 'F' },
          changedAt: '',
        }}
      />,
    );
    expect(screen.getByText('Target department')).toBeInTheDocument();
    expect(screen.getByText('Production').tagName).toBe('DEL');
    expect(screen.getByText('QA').tagName).toBe('INS');
  });
});

describe('RequestFormFields', () => {
  it('binds inputs to API field names and surfaces errors', async () => {
    const onChange = vi.fn();
    render(
      <RequestFormFields
        value={EMPTY_FIELDS}
        onChange={onChange}
        errors={{ clientName: 'Client name is required' }}
      />,
    );
    expect(screen.getByLabelText('Client name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Client name is required')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Urgent'));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FIELDS, priority: 'urgent' });
    await userEvent.selectOptions(screen.getByLabelText('Target department'), 'qa');
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FIELDS, targetDepartment: 'qa' });
  });
});

describe('BoardView', () => {
  beforeEach(() => localStorage.clear());
  const items = [
    makeRequest({ id: 'a', clientName: 'BHEL Haridwar', state: 'raised' }),
    makeRequest({ id: 'b', clientName: 'Kirloskar Motors', state: 'in_progress' }),
  ];
  const renderBoard = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BoardView
          title="My requests"
          storageKey="test"
          items={items}
          stageGroups={groupByState}
          columns={['status']}
          href={(r) => `/requests/${r.id}`}
        />
      </MemoryRouter>,
    );

  it('searches client-side and offers to clear when nothing matches', async () => {
    renderBoard();
    await userEvent.type(screen.getByLabelText('Search requests'), 'kirlo');
    expect(screen.getByRole('link', { name: 'Kirloskar Motors' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'BHEL Haridwar' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search requests'), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(screen.getByRole('link', { name: 'BHEL Haridwar' })).toBeInTheDocument();
  });

  it('filters by status and switches to Kanban', async () => {
    renderBoard();
    await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
    await userEvent.click(screen.getByLabelText('Raised'));
    expect(screen.queryByRole('link', { name: 'Kirloskar Motors' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Kanban' }));
    expect(screen.getByRole('region', { name: /Raised/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'BHEL Haridwar' })).toBeInTheDocument();
  });

  it('selects rows and shows the bulk action bar', async () => {
    renderBoard();
    await userEvent.click(screen.getByLabelText('Select BHEL Haridwar'));
    expect(screen.getByRole('region', { name: 'Selected requests' })).toHaveTextContent('1Request selected');
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByRole('region', { name: 'Selected requests' })).not.toBeInTheDocument();
  });
});

describe('ItemPanel', () => {
  function Harness({ modal }: { modal: boolean }) {
    return (
      <MemoryRouter
        initialEntries={['/requests/a']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/requests" element={<p>Board</p>} />
          <Route
            path="/requests/a"
            element={
              <ItemPanel title="BHEL Haridwar" closeTo="/requests">
                <Modal open={modal} title="Confirm" onClose={() => {}}>
                  <p>Inner dialog</p>
                </Modal>
              </ItemPanel>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  }

  it('closes on Escape back to the board', async () => {
    render(<Harness modal={false} />);
    expect(screen.getByRole('dialog', { name: 'BHEL Haridwar' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('Board')).toBeInTheDocument();
  });

  it('leaves Escape to a dialog opened inside it', async () => {
    render(<Harness modal />);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'BHEL Haridwar' })).toBeInTheDocument();
  });
});
