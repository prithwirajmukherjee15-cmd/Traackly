import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui/Feedback';
import { AuthProvider, useAuth } from './lib/auth';
import { RealtimeProvider } from './lib/realtime';
import { ROLE_HOME } from './lib/states';
import { ToastProvider } from './lib/toast';
import type { Role } from './lib/types';
import { TeamPage } from './pages/admin/TeamPage';
import { ActivatePage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth/PasswordPages';
import { LoginPage } from './pages/auth/Login';
import { AuthorizationQueue, ReviewRequestPage } from './pages/authorizer/AuthorizerPages';
import {
  CoordinatorDashboard,
  CoordinatorRequestPage,
  NewRequestPage,
} from './pages/coordinator/CoordinatorPages';
import { KioskConnectPage, KioskJobPage, KioskLayout, KioskQueuePage } from './pages/kiosk/KioskPages';
import { LogisticsQueue, TimelinePage } from './pages/logistics/LogisticsPages';
import { NotFoundPage } from './pages/NotFound';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: true } },
});

/** Requires a logged-in office user; remembers the deep link for after login (App Flow section 8). */
function RequireOffice() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role === 'floor_supervisor') return <Navigate to="/kiosk" replace />;
  return (
    <RealtimeProvider>
      <AppShell />
    </RealtimeProvider>
  );
}

/** Role gate inside the office shell; other roles go to their own landing screen. */
function Only({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children ?? <Outlet />}</>;
}

const HomePage = lazy(() => import('./pages/marketing/HomePage').then((m) => ({ default: m.HomePage })));

/** "/" is the public homepage for visitors and the role landing screen for signed-in users. */
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return (
    <Suspense fallback={<Spinner />}>
      <HomePage />
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/activate/:token" element={<ActivatePage />} />

      <Route path="/kiosk/connect" element={<KioskConnectPage />} />
      <Route path="/kiosk" element={<KioskLayout />}>
        <Route index element={<KioskQueuePage />} />
        <Route path="jobs/:id" element={<KioskJobPage />} />
      </Route>

      <Route path="/" element={<Home />} />

      <Route element={<RequireOffice />}>
        <Route element={<Only roles={['coordinator']} />}>
          <Route path="/requests" element={<CoordinatorDashboard />} />
          <Route path="/requests/new" element={<NewRequestPage />} />
          <Route path="/requests/:id" element={<CoordinatorRequestPage />} />
        </Route>
        <Route element={<Only roles={['authorizer']} />}>
          <Route path="/authorize" element={<AuthorizationQueue />} />
          <Route path="/authorize/:id" element={<ReviewRequestPage />} />
          <Route path="/team" element={<TeamPage />} />
        </Route>
        <Route element={<Only roles={['logistics']} />}>
          <Route path="/logistics" element={<LogisticsQueue />} />
          <Route path="/logistics/requests/:id" element={<TimelinePage />} />
        </Route>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
