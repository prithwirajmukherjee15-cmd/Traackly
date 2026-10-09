import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Pill } from './Chrome';
import {
  ChangeDiffMock,
  FloatCard,
  KioskMock,
  MiniBoard,
  NotificationMock,
  TimelineMock,
  UpdatesMock,
} from './Mockups';
import { useParallax } from './hooks';
import { Reveal } from './motion';
import { DEMO_ROWS } from './data';

const FEATURES = [
  {
    title: 'Change flags',
    body: 'Edit a request after approval and it turns amber everywhere, with a field-by-field before and after.',
    card: <ChangeDiffMock />,
    stat: 'Every changed field logged',
  },
  {
    title: 'Acknowledgment gate',
    body: 'The floor cannot mark a changed job done until someone has read and acknowledged the change.',
    card: <KioskMock />,
    stat: '“Mark done” stays locked',
  },
  {
    title: 'Live request board',
    body: 'Status cells update in seconds over a live connection — nobody refreshes, nobody chases.',
    card: <MiniBoard title="Live board" tone="in_progress" rows={DEMO_ROWS.slice(0, 3)} animate={false} />,
    stat: 'Updates in about 2 seconds',
  },
  {
    title: 'Timeline revisions',
    body: 'Logistics sees post-approval edits on its own queue. Re-confirming the date is its acknowledgment.',
    card: <TimelineMock />,
    stat: 'Dates follow the spec',
  },
  {
    title: 'Instant notifications',
    body: 'The right owners get an email the moment a spec changes, with exactly what changed.',
    card: <NotificationMock />,
    stat: 'Nobody hears it second-hand',
  },
];

/** Warm rounded panel: an accordion of features on the left, a card carousel on the right. */
export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const go = (d: number) => setIndex((i) => (i + d + FEATURES.length) % FEATURES.length);
  const current = FEATURES[index]!;
  return (
    <section id="product" className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10">
      <Reveal>
        <h2 className="mb-12 text-center font-display text-[40px] font-normal tracking-[-0.03em] text-black sm:text-[56px]">
          Built for every handoff
        </h2>
      </Reveal>
      <Reveal>
        <div className="grid gap-10 rounded-section bg-panel-warm px-6 py-12 lg:grid-cols-[360px_1fr] lg:px-16 lg:py-20">
          <ul className="space-y-3">
            {FEATURES.map((f, i) =>
              i === index ? (
                <li key={f.title} className="animate-pop-in rounded-2xl bg-white px-6 py-5">
                  <p className="font-display text-[17px] font-normal text-black">{f.title}</p>
                  <p className="mt-2 font-display text-[14px] font-light leading-[1.6] text-ink-muted">
                    {f.body}
                  </p>
                </li>
              ) : (
                <li key={f.title}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className="flex w-full items-center gap-2.5 rounded-full border border-black px-5 py-1.5 text-left font-display text-[16px] font-light text-black transition-colors duration-300 hover:bg-white"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-black">
                      <Plus size={10} aria-hidden />
                    </span>
                    {f.title}
                  </button>
                </li>
              ),
            )}
          </ul>
          <div className="relative flex flex-col items-center justify-center">
            <div className="flex w-full items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous feature"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow transition-transform hover:scale-105 sm:flex"
              >
                <ChevronLeft size={20} />
              </button>
              <div key={index} className="w-full max-w-[420px] animate-pop-in">
                <div className="rounded-2xl bg-white p-5 shadow-[0_24px_60px_-28px_rgb(var(--shadow)/0.35)]">
                  {current.card}
                </div>
                <p className="mt-6 font-display text-[22px] font-normal text-black">{current.title}</p>
                <p className="mt-2 font-display text-[15px] font-light text-ink-muted">{current.stat}</p>
              </div>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next feature"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow transition-transform hover:scale-105 sm:flex"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="mt-8 flex gap-2" role="tablist" aria-label="Features">
              {FEATURES.map((f, i) => (
                <button
                  key={f.title}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={f.title}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-ink' : 'w-2 bg-ink/25'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Floating({
  factor,
  className,
  children,
}: {
  factor: number;
  className: string;
  children: React.ReactNode;
}) {
  const { ref, offset } = useParallax<HTMLDivElement>(factor);
  return (
    <div
      ref={ref}
      className={`absolute ${className}`}
      style={{ transform: `translate3d(0, ${offset}px, 0)` }}
    >
      {children}
    </div>
  );
}

/** Big statement + floating product cards that drift at different speeds while scrolling. */
export function NothingSilent() {
  return (
    <section className="relative mx-auto max-w-[1440px] overflow-hidden px-5 pt-20 lg:px-10">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:px-[120px]">
        <Reveal>
          <h2 className="font-display text-[64px] font-medium leading-[0.95] tracking-[-0.05em] text-black sm:text-[96px] lg:text-[112px]">
            Nothing changes silently
          </h2>
        </Reveal>
        <Reveal delay={120} className="lg:pt-6">
          <p className="max-w-[480px] font-display text-[19px] font-light leading-[1.55] text-black">
            <span className="font-medium">A change nobody reads is a change nobody makes.</span> Traackly
            carries the current spec, its history and its owners with every request — so the people building
            it always see what changed.
          </p>
          <div className="mt-8">
            <Pill to="/login" variant="black">
              Get started
            </Pill>
          </div>
        </Reveal>
      </div>

      <div className="relative mt-10 hidden h-[760px] lg:block" aria-hidden>
        <Floating factor={0.12} className="left-[6%] top-[40px] w-[260px]">
          <FloatCard title="Changelog">
            <ChangeDiffMock />
          </FloatCard>
        </Floating>
        <Floating factor={-0.08} className="right-[8%] top-0 w-[380px]">
          <FloatCard title="Live board">
            <MiniBoard title="Production" tone="in_progress" rows={DEMO_ROWS.slice(0, 2)} animate={false} />
          </FloatCard>
        </Floating>
        <Floating factor={0.05} className="left-1/2 top-[160px] w-[320px] -translate-x-1/2">
          <div className="animate-float">
            <FloatCard title="Floor kiosk">
              <KioskMock />
            </FloatCard>
          </div>
        </Floating>
        <Floating factor={0.18} className="left-[12%] top-[420px] w-[280px]">
          <FloatCard title="Notifications">
            <NotificationMock />
          </FloatCard>
        </Floating>
        <Floating factor={-0.14} className="right-[10%] top-[400px] w-[300px]">
          <FloatCard title="Updates">
            <UpdatesMock />
          </FloatCard>
        </Floating>
        <Floating factor={0.1} className="right-[34%] top-[560px] w-[260px]">
          <FloatCard title="Timeline">
            <TimelineMock />
          </FloatCard>
        </Floating>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:hidden">
        <FloatCard title="Changelog">
          <ChangeDiffMock />
        </FloatCard>
        <FloatCard title="Floor kiosk">
          <KioskMock />
        </FloatCard>
      </div>
    </section>
  );
}
