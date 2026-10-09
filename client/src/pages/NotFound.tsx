import { SearchX } from 'lucide-react';
import { LinkButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';

export function NotFoundPanel({
  title = 'Page not found',
  to = '/',
  label = 'Go home',
}: {
  title?: string;
  to?: string;
  label?: string;
}) {
  return (
    <EmptyState
      icon={<SearchX size={28} />}
      title={title}
      body="It may have been moved, or you may not have access to it."
      action={
        <LinkButton to={to} variant="secondary">
          {label}
        </LinkButton>
      }
    />
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-surface">
      <NotFoundPanel />
    </div>
  );
}
