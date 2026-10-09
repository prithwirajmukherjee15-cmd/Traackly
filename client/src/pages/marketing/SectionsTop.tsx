import { useState } from 'react';
import { Check } from 'lucide-react';
import { Pill } from './Chrome';
import { DEMO_ROWS, ROLES, type RoleKey } from './data';
import { ChangeDiffMock, KioskMock, MiniBoard, NotificationMock, TimelineMock } from './Mockups';
import { Marquee, Reveal } from './motion';

/** The preview card for a role; used by the hero stack and the tabbed section. */
export function RolePreview({ role }: { role: RoleKey }) {
  switch (role) {
    case 'coordinator':
      return <MiniBoard key="c" title="My requests" tone="in_progress" rows={DEMO_ROWS} />;
    case 'authorizer':
      return (
        <div key="a" className="animate-pop-in space-y-3">
          <ChangeDiffMock />
          <div className="rounded-lg border border-line p-2.5">
            <NotificationMock />
          </div>
        </div>
      );
    case 'logistics':
      return (
        <div key="l" className="animate-pop-in space-y-3">
          <MiniBoard
            title="Needs a timeline"
            tone="updated"
            rows={DEMO_ROWS.filter((r) => r.state === 'updated' || r.state === 'in_progress')}
          />
          <TimelineMock />
        </div>
      );
    case 'floor':
      return (
        <div key="f" className="animate-pop-in">
          <KioskMock />
        </div>
      );
  }
}

export function Hero() {
  const [role, setRole] = useState<RoleKey>('coordinator');
  return (
    <section className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1fr_1.05fr] lg:px-[72px] lg:pb-24 lg:pt-24">
      <div>
        <Reveal>
          <h1 className="font-display text-[44px] font-normal leading-[1.15] tracking-[-0.04em] text-black sm:text-[56px] sm:leading-[1.2]">
            Every request, from order desk to shop floor
          </h1>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-6 max-w-[440px] font-display text-[17px] font-light leading-[1.6] text-black">
            The request layer where edits after approval can&apos;t slip past the people doing the work.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div
            className="mt-7 flex max-w-[460px] flex-wrap gap-2"
            role="radiogroup"
            aria-label="Preview a role"
          >
            {ROLES.map((r) => {
              const active = r.key === role;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRole(r.key)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 font-display text-[15px] font-light transition-colors duration-300 ${
                    active ? 'bg-accent-soft text-accent' : 'bg-panel-cool text-ink hover:bg-accent-soft/60'
                  }`}
                >
                  {active && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                      <Check size={11} strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  {r.label}
                </button>
              );
            })}
          </div>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-8">
            <Pill to="/login">Get started</Pill>
          </div>
          <p className="mt-4 font-display text-[13px] font-light text-ink-muted">
            No more email chains <span className="mx-1.5 text-accent">✦</span> Every edit acknowledged
          </p>
        </Reveal>
      </div>

      <Reveal delay={120} className="relative mx-auto w-full max-w-[600px]">
        <div className="relative h-[380px] sm:h-[420px]" aria-label={`${role} preview`}>
          <div className="absolute left-0 top-10 hidden h-[300px] w-[52%] -rotate-3 rounded-2xl border border-line bg-panel-cool shadow-[0_24px_60px_-30px_rgb(var(--shadow)/0.35)] sm:block" />
          <div className="absolute right-0 top-10 hidden h-[300px] w-[52%] rotate-3 rounded-2xl border border-line bg-accent-soft shadow-[0_24px_60px_-30px_rgb(var(--shadow)/0.35)] sm:block" />
          <div className="absolute inset-x-0 top-0 mx-auto w-full rounded-2xl border border-line bg-white p-4 shadow-[0_30px_80px_-30px_rgb(var(--shadow)/0.45)] sm:w-[78%]">
            <div className="mb-3 flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-state-declined/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-state-updated/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-state-completed/80" />
              <span className="ml-2 text-[12px] font-medium text-ink-muted">
                {ROLES.find((r) => r.key === role)?.label} view
              </span>
            </div>
            <RolePreview role={role} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const INDUSTRIES = [
  'Carbon & graphite',
  'Electrical machines',
  'Auto components',
  'Rail & traction',
  'Foundries',
  'Precision machining',
  'Packaging',
  'Textiles',
  'Industrial spares',
];

export function IndustryMarquee() {
  return (
    <section className="pb-16" aria-label="Industries">
      <Reveal>
        <p className="mb-8 text-center font-display text-[19px] font-light text-black">
          Made for manufacturers who still run handoffs over email
        </p>
      </Reveal>
      <Marquee speed={45}>
        {INDUSTRIES.map((i) => (
          <span
            key={i}
            className="mx-10 whitespace-nowrap font-display text-[26px] font-medium tracking-[-0.03em] text-ink/70"
          >
            {i}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

const SEAT_COPY: Record<RoleKey, { title: string; accent: string; body: string }> = {
  coordinator: {
    title: 'Raise it once.',
    accent: 'Stop chasing.',
    body: 'Every request you raise lives on one board that updates itself — no follow-up emails, no "any news?" calls.',
  },
  authorizer: {
    title: 'Approve, then edit.',
    accent: 'Safely.',
    body: 'Change a spec after approval and Traackly logs each field, flags it downstream, and notifies the right people.',
  },
  logistics: {
    title: 'Every change lands',
    accent: 'on your queue.',
    body: 'New approvals and post-approval edits arrive together. Saving the timeline is your acknowledgment.',
  },
  floor: {
    title: 'The floor sees it.',
    accent: 'Before it builds.',
    body: 'A shared kiosk per department shows each job, its barcode and its latest spec — and blocks “done” until a change is acknowledged.',
  },
};

export function EverySeat() {
  const [role, setRole] = useState<RoleKey>('authorizer');
  const copy = SEAT_COPY[role];
  return (
    <section id="roles" className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
      <Reveal>
        <h2 className="text-center font-display text-[40px] font-normal leading-[1.2] tracking-[-0.03em] text-black sm:text-[56px]">
          One request, every seat
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <div className="mx-auto mt-10 flex w-fit max-w-full overflow-x-auto rounded-full bg-white p-2 shadow-[0_4px_24px_rgb(var(--shadow)/0.08)]">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              aria-pressed={r.key === role}
              className={`whitespace-nowrap rounded-full px-6 py-2.5 font-display text-[15px] font-light transition-colors duration-300 ${
                r.key === role ? 'bg-accent-soft text-black' : 'text-ink-muted hover:text-black'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Reveal>
      <div className="mt-14 grid items-center gap-12 lg:grid-cols-[0.8fr_1.4fr] lg:px-16">
        <div key={role} className="animate-row-in">
          <h3 className="font-display text-[30px] font-normal leading-[1.25] tracking-[-0.02em] text-black">
            {copy.title} <span className="text-accent">{copy.accent}</span>
          </h3>
          <p className="mt-5 max-w-[360px] font-display text-[17px] font-light leading-[1.6] text-black">
            {copy.body}
          </p>
          <div className="mt-8">
            <Pill to="/login" size="sm" className="!h-11 !px-6 !text-[15px]">
              Get started
            </Pill>
          </div>
        </div>
        <Reveal>
          <div className="rounded-section bg-panel-cool p-6">
            <div className="flex min-h-[340px] gap-4 rounded-xl bg-white p-4 shadow-[0_8px_30px_-12px_rgb(var(--shadow)/0.2)]">
              <div
                className="hidden w-8 flex-col items-center gap-4 border-r border-line pr-3 pt-1 text-ink-faint sm:flex"
                aria-hidden
              >
                {ROLES.map((r) => (
                  <r.icon key={r.key} size={16} className={r.key === role ? 'text-accent' : ''} />
                ))}
              </div>
              <div className="flex flex-1 items-center">
                <div className="w-full">
                  <RolePreview role={role} />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
