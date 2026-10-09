import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Banner, Spinner } from '../../components/ui/Feedback';
import { TextInput } from '../../components/ui/Field';
import { api, ApiError } from '../../lib/api';
import { emailSchema, fieldErrors, passwordSchema } from '../../lib/validation';
import { AuthLayout } from './AuthLayout';

function PasswordForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (pw: string, confirm: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local = fieldErrors(passwordSchema.safeParse({ password, confirmPassword: confirm }));
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await onSubmit(password, confirm);
    } catch (err) {
      const ae = err instanceof ApiError ? err : null;
      setErrors(
        ae?.fields && Object.keys(ae.fields).length
          ? ae.fields
          : { form: ae?.message ?? 'Something went wrong.' },
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {errors.form && <Banner tone="danger">{errors.form}</Banner>}
      <TextInput
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint="At least 8 characters, including a number."
      />
      <TextInput
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirmPassword}
      />
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** S-01: invite acceptance. Name and email are resolved from the single-use token. */
export function ActivatePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const info = useQuery({ queryKey: ['invite', token], queryFn: () => api.inviteInfo(token), retry: false });

  if (info.isLoading) return <AuthLayout title="Set up your account">{<Spinner />}</AuthLayout>;
  if (info.isError) {
    return (
      <AuthLayout title="Invite link unavailable">
        <Banner tone="danger">{(info.error as ApiError).message}</Banner>
        <Link to="/login" className="mt-6 inline-block font-medium text-brand hover:underline">
          Go to login
        </Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout
      title={`Welcome, ${info.data!.name.split(' ')[0]}`}
      subtitle="Choose a password to activate your account."
    >
      <div className="mb-4 space-y-3">
        <TextInput label="Name" value={info.data!.name} readOnly disabled />
        <TextInput label="Email" value={info.data!.email} readOnly disabled />
      </div>
      <PasswordForm
        submitLabel="Activate account"
        onSubmit={async (pw, confirm) => {
          const r = await api.activate(token, pw, confirm);
          navigate('/login', {
            replace: true,
            state: { email: r.email, notice: 'Account activated — log in to continue.' },
          });
        }}
      />
    </AuthLayout>
  );
}

/** S-03: always shows the same confirmation, whether or not the email exists. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    setError('');
    setBusy(true);
    try {
      const r = await api.forgotPassword(parsed.data);
      setDevLink(r.devLink ?? '');
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link that's valid for 1 hour.">
      {sent ? (
        <div className="space-y-4">
          <Banner tone="success">If an account exists for that email, a reset link has been sent.</Banner>
          {devLink && (
            <Banner tone="info">
              Dev mode:{' '}
              <a className="underline" href={devLink}>
                open the reset link
              </a>
            </Banner>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            autoFocus
          />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email}>
            Send reset link
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-[13px] font-medium text-brand hover:underline">
        Back to login
      </Link>
    </AuthLayout>
  );
}

/** S-04: time-limited reset (1 hour). */
export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [expired, setExpired] = useState('');
  if (expired) {
    return (
      <AuthLayout title="Link expired">
        <Banner tone="danger">{expired}</Banner>
        <Link to="/forgot-password" className="mt-6 inline-block font-medium text-brand hover:underline">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Choose a new password">
      <PasswordForm
        submitLabel="Reset password"
        onSubmit={async (pw, confirm) => {
          try {
            await api.resetPassword(token, pw, confirm);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              setExpired(err.message);
              return;
            }
            throw err;
          }
          navigate('/login', {
            replace: true,
            state: { notice: 'Password updated — log in with your new password.' },
          });
        }}
      />
    </AuthLayout>
  );
}
