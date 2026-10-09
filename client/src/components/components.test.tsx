import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeRequest } from '../test/fixtures';
import { RequestBoard } from './requests/RequestBoard';
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
