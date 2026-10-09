import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Feedback';
import { TextInput } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { ROLE_HOME } from '../../lib/states';
import { AuthLayout } from './AuthLayout';

interface LoginState {
  from?: string;
  notice?: string;
  tone?: 'success' | 'danger' | 'info';
  email?: string;
}

/** S-02: single entry point for every role. Redirects to the role's landing screen or the deep link. */
export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as LoginState;
  const [email, setEmail] = useState(state.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={state.from ?? ROLE_HOME[user.role]} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(state.from ?? ROLE_HOME[u.role], { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Log in to Traackly" subtitle="Track every request from order desk to shop floor.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {state.notice && !error && <Banner tone={state.tone ?? 'success'}>{state.notice}</Banner>}
        {error && <Banner tone="danger">{error}</Banner>}
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus={!state.email}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus={Boolean(state.email)}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-[13px] font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email || !password}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-[13px] text-ink-muted">
        Accounts are invite-only. Ask your Authorizer for an invite. Floor kiosks connect with a station link.
      </p>
    </AuthLayout>
  );
}
