import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { prefersReducedMotion, useInView } from './hooks';

/** Subtle fade + rise as the block enters the viewport; `delay` staggers siblings. */
export function Reveal({
  children,
  delay = 0,
  className = '',
  y = 28,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  as?: 'div' | 'section' | 'li' | 'span';
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const style: CSSProperties = {
    transitionDelay: `${delay}ms`,
    transform: inView ? 'none' : `translate3d(0, ${y}px, 0)`,
    opacity: inView ? 1 : 0,
  };
  return (
    <Tag
      ref={ref as never}
      style={style}
      className={`transition-[opacity,transform] duration-700 ease-out-soft will-change-transform ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Endless horizontal scroller; content is duplicated so the loop is seamless. */
export function Marquee({
  children,
  speed = 40,
  reverse = false,
  className = '',
  fade = true,
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      className={`group relative flex overflow-hidden ${fade ? '[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]' : ''} ${className}`}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1 || undefined}
          className="flex shrink-0 animate-marquee items-center motion-reduce:animate-none group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

/** Counts up to `to` once visible. */
export function CountUp({
  to,
  suffix = '',
  duration = 1400,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.5);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}
