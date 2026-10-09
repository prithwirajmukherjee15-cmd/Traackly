import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  FileLock2,
  GitBranch,
  KeyRound,
  Lock,
  MonitorSmartphone,
  Plus,
  ShieldCheck,
  UserX,
  Zap,
} from 'lucide-react';
import { Pill } from './Chrome';
import { useInView } from './hooks';
import { CountUp, Marquee, Reveal } from './motion';

const TRUST = [
  {
    icon: FileLock2,
    title: 'Append-only history',
    body: 'Changelog entries can be added, never edited or deleted — the record of what changed is permanent.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    body: 'Coordinators, Authorizers, Logistics and the floor each see and do only what their role allows, checked on the server.',
  },
  {
    icon: KeyRound,
    title: 'Kiosk station tokens',
    body: 'Shared floor screens connect with a per-department credential that can be revoked in one click.',
  },
  {
    icon: UserX,
    title: 'Instant revocation',
    body: 'Deactivate someone and every open session they have ends on its very next request.',
  },
  {
    icon: GitBranch,
    title: 'No silent overwrites',
    body: 'Two people editing at once? The second save is stopped and shown the latest version instead.',
  },
  {
    icon: Lock,
    title: 'Invite-only accounts',
    body: 'No public sign-up. Every account traces back to an Authorizer’s invite.',
  },
];

export function Trust() {
  return (
    <section id="trust" className="mt-20 bg-panel-cool">
      <div className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-24">
        <Reveal>
          <h2 className="mb-14 max-w-[720px] font-display text-[40px] font-normal leading-[1.2] tracking-[-0.03em] text-black sm:text-[56px]">
            Built to be trusted on the shop floor
          </h2>
        </Reveal>
        <div className="grid gap-x-16 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 90}>
              <t.icon size={24} className="text-accent" strokeWidth={1.6} aria-hidden />
              <p className="mt-4 font-display text-[17px] font-medium text-black">{t.title}</p>
              <p className="mt-2.5 max-w-[340px] font-display text-[16px] font-light leading-[1.6] text-black">
                {t.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Zap, tone: 'bg-state-completed', label: 'When a spec changes after approval', shape: 'hex' },
  { icon: AlertTriangle, tone: 'bg-state-updated', label: 'Flag the request as Updated', shape: 'diamond' },
  { icon: BellRing, tone: 'bg-accent', label: 'Notify Logistics and the floor', shape: 'diamond' },
  {
    icon: MonitorSmartphone,
    tone: 'bg-danger',
    label: 'Lock “Mark done” until acknowledged',
    shape: 'diamond',
  },
];

/** The lifecycle as an automation recipe: nodes pop in and connectors draw as it scrolls into view. */
export function Flow() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <section id="flow" className="mx-auto max-w-[1440px] px-5 py-24 text-center lg:px-10 lg:py-32">
      <Reveal>
        <h2 className="font-display text-[56px] font-medium leading-[1] tracking-[-0.05em] text-black sm:text-[96px]">
          Let changes flow
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <p className="mx-auto mt-6 max-w-[640px] font-display text-[24px] font-light leading-[1.35] tracking-[-0.02em] text-black sm:text-[32px]">
          From the person who edits it to the people who build it — automatically
        </p>
      </Reveal>
      <Reveal delay={180}>
        <div className="mt-10">
          <Pill to="/login" variant="black">
            Get started
          </Pill>
        </div>
      </Reveal>
      <div ref={ref} className="mx-auto mt-16 flex max-w-[420px] flex-col items-center">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex w-full flex-col items-center">
            {i > 0 && (
              <span
                className={`block h-10 w-px origin-top bg-ink transition-transform duration-500 ease-out-soft ${inView ? 'scale-y-100' : 'scale-y-0'}`}
                style={{ transitionDelay: `${i * 380 - 150}ms` }}
                aria-hidden
              />
            )}
            <div
              className={`relative w-full transition-all duration-500 ease-spring ${inView ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
              style={{ transitionDelay: `${i * 380}ms` }}
            >
              <span
                className={`absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center text-white ${s.tone} ${
                  s.shape === 'hex'
                    ? '[clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0_50%)]'
                    : 'rotate-45 rounded-md'
                }`}
                aria-hidden
              >
                <s.icon size={15} className={s.shape === 'hex' ? '' : '-rotate-45'} />
              </span>
              <div
                className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-4 text-left shadow-sm ${
                  i === 0
                    ? 'border-line-strong'
                    : 'border-transparent [background:linear-gradient(white,white)_padding-box,linear-gradient(90deg,rgb(var(--state-raised)),rgb(var(--accent)),rgb(var(--state-completed)))_border-box]'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-cool">
                  <s.icon size={17} aria-hidden />
                </span>
                <span className="font-display text-[15px] font-normal text-black">{s.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Facts() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-10">
      <Reveal>
        <h2 className="mb-12 text-center font-display text-[40px] font-normal tracking-[-0.03em] text-black sm:text-[56px]">
          Designed around one rule
        </h2>
      </Reveal>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        <Reveal className="h-full">
          <div className="flex h-full flex-col rounded-section border border-line-strong p-8">
            <p className="font-display text-[32px] font-normal tracking-[-0.02em] text-black">
              Every edit after approval is acknowledged before work continues
            </p>
            <p className="mt-5 max-w-[520px] font-display text-[16px] font-light leading-[1.6] text-black">
              That single mechanic is the whole point. It closes the gap where every person in an email chain
              did their part correctly — and the floor still built to an old spec.
            </p>
            <a
              href="#flow"
              className="mt-auto inline-flex w-fit items-center gap-1.5 border-b border-black pt-8 font-display text-[16px] font-light text-black"
            >
              See how it flows <ArrowRight size={16} aria-hidden />
            </a>
          </div>
        </Reveal>
        <Reveal delay={90} className="h-full">
          <div className="flex h-full flex-col items-center justify-center rounded-section border border-line-strong p-8 text-center">
            <p className="font-display text-[15px] font-light text-black">Live updates arrive in about</p>
            <p className="my-4 font-display text-[64px] font-normal tracking-[-0.04em] text-black">
              <CountUp to={2} suffix="s" />
            </p>
            <p className="font-display text-[15px] font-light text-black">
              on every board and kiosk, no refresh
            </p>
          </div>
        </Reveal>
        <Reveal delay={180} className="h-full">
          <div className="flex h-full flex-col items-center justify-center rounded-section border border-line-strong p-8 text-center">
            <p className="font-display text-[15px] font-light text-black">Kiosk buttons are at least</p>
            <p className="my-4 font-display text-[64px] font-normal tracking-[-0.04em] text-black">
              <CountUp to={60} suffix="px" />
            </p>
            <p className="font-display text-[15px] font-light text-black">
              tall — built for gloves and quick taps
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function GiantMarquee() {
  const words = ['raise', 'authorize', 'acknowledge', 'deliver'];
  return (
    <section className="overflow-hidden py-10" aria-hidden>
      <Marquee speed={30} fade={false}>
        {words.map((w, i) => (
          <span key={w} className="flex items-center">
            <span className="whitespace-nowrap px-8 font-display text-[88px] font-medium tracking-[-0.05em] text-black sm:text-[140px]">
              {w}
            </span>
            <span
              className={`h-16 w-16 rounded-full sm:h-24 sm:w-24 ${['bg-state-raised', 'bg-accent', 'bg-state-updated', 'bg-state-completed'][i]}`}
            />
          </span>
        ))}
      </Marquee>
    </section>
  );
}

const FAQ = [
  {
    q: 'Is Traackly a full project-management suite?',
    a: 'No. It is a focused request and handoff layer: raise, authorize, schedule, execute — with the edit-acknowledgment gate in the middle.',
  },
  {
    q: 'Do floor staff need their own logins?',
    a: 'No. Each department gets one kiosk link set up by an Authorizer. Supervisors can optionally tap in a name when they acknowledge.',
  },
  {
    q: 'What happens if someone edits a request after it is approved?',
    a: 'It turns Updated, every changed field is logged with before and after values, Logistics and the floor are notified, and “Mark done” stays locked until they acknowledge.',
  },
  {
    q: 'What if the warehouse Wi-Fi drops?',
    a: 'The kiosk keeps showing the last known queue, and acknowledgments tapped while offline sync automatically when the connection returns.',
  },
  {
    q: 'Can a changelog entry be edited or removed?',
    a: 'Never. History is append-only at the database level, so the evidence trail always matches what happened.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-[960px] px-5 py-20 lg:py-28">
      <Reveal>
        <h2 className="mb-10 text-center font-display text-[40px] font-normal tracking-[-0.03em] text-black sm:text-[56px]">
          Questions, answered
        </h2>
      </Reveal>
      <ul className="divide-y divide-line border-y border-line">
        {FAQ.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 py-6 text-left font-display text-[19px] font-normal text-black"
              >
                {f.q}
                <Plus
                  size={22}
                  className={`shrink-0 transition-transform duration-300 ease-out-soft ${isOpen ? 'rotate-45' : ''}`}
                  aria-hidden
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-400 ease-out-soft ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <p className="overflow-hidden pr-10 font-display text-[16px] font-light leading-[1.65] text-ink-muted">
                  <span className="block pb-6">{f.a}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Closing call to action with the pill email input. Accounts are invite-only, so it leads to login. */
export function FinalCta() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/login', {
      state: email
        ? { email, notice: 'Log in with your invite, or ask your Authorizer for one.', tone: 'info' }
        : undefined,
    });
  };
  return (
    <section id="cta" className="px-5 pb-24 lg:px-10">
      <Reveal>
        <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-section bg-black px-6 py-20 text-center text-white sm:px-16">
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-state-raised/30 blur-3xl"
            aria-hidden
          />
          <h2 className="relative font-display text-[40px] font-normal leading-[1.15] tracking-[-0.03em] sm:text-[64px]">
            Every edit. Acknowledged.
          </h2>
          <p className="relative mx-auto mt-5 max-w-[520px] font-display text-[17px] font-light text-white/75">
            Bring your next order onto one board — from the desk that raises it to the floor that builds it.
          </p>
          <form
            onSubmit={submit}
            className="relative mx-auto mt-10 flex max-w-[520px] flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="cta-email" className="sr-only">
              Work email
            </label>
            <input
              id="cta-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="h-[50px] w-full min-w-0 sm:flex-1 rounded-full border border-white/25 bg-white/10 px-6 font-display text-[16px] font-light text-white placeholder:text-white/55 transition-[border-color] duration-100 ease-in focus:border-white focus:outline-none"
            />
            <button
              type="submit"
              className="group/pill inline-flex h-[50px] shrink-0 whitespace-nowrap items-center justify-center gap-2.5 rounded-full bg-accent px-8 font-display text-base font-normal text-white transition-colors duration-300 ease-pill hover:bg-accent-hover"
            >
              Get started
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover/pill:translate-x-1"
                aria-hidden
              />
            </button>
          </form>
          <p className="relative mt-4 font-display text-[13px] font-light text-white/55">
            Invite-only accounts <span className="mx-1.5 text-accent">✦</span> Kiosks need no logins
          </p>
        </div>
      </Reveal>
    </section>
  );
}
