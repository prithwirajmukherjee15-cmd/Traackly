import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../lib/auth';
import { LoginPage } from '../../pages/auth/Login';
import { DemoDock } from './DemoDock';

const coordinator = {
  id: 'u1',
  name: 'Meera Iyer',
  email: 'coordinator@traackly.demo',
  role: 'coordinator',
  department: null,
  status: 'active',
};

function json(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

/** Stubs the API: `demo` decides whether this looks like the public demo deployment. */
function stubApi(demo: boolean) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url === '/api/auth/me') return json(401, { error: { code: 'unauthorized', message: 'Log in' } });
    if (url === '/api/demo')
      return demo ? json(200, { enabled: true }) : json(404, { error: { code: 'not_found' } });
    if (url === '/api/demo/login') return json(200, { user: coordinator });
    return json(404, { error: { code: 'not_found', message: 'Not found' } });
  });
  return calls;
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<p>Homepage</p>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/requests" element={<p>Coordinator board</p>} />
          </Routes>
          <DemoDock />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('public demo', () => {
  it('lets a visitor in with one click and switch roles from anywhere', async () => {
    const calls = stubApi(true);
    renderAt('/login');
    expect(await screen.findByText('Explore the live demo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Coordinator/ }));
    expect(await screen.findByText('Coordinator board')).toBeInTheDocument();
    expect(calls).toContain('POST /api/demo/login');

    await userEvent.click(screen.getByRole('button', { name: /Switch role/ }));
    const dialog = screen.getByRole('dialog', { name: 'Switch demo role' });
    expect(dialog).toHaveTextContent("You're here");
    expect(dialog).toHaveTextContent('Floor kiosk');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('invites homepage visitors in', async () => {
    stubApi(true);
    renderAt('/');
    expect(await screen.findByRole('link', { name: /Try the live demo/ })).toHaveAttribute('href', '/login');
  });

  it('stays out of the way on a normal deployment', async () => {
    const calls = stubApi(false);
    renderAt('/login');
    expect(await screen.findByText('Log in to Traackly')).toBeInTheDocument();
    await waitFor(() => expect(calls).toContain('GET /api/demo'));
    expect(screen.queryByText('Explore the live demo')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Try the live demo/ })).not.toBeInTheDocument();
  });
});
