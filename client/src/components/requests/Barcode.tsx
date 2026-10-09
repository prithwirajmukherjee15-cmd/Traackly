import { code39Bars } from '../../lib/barcode';

export function Barcode({ value, height = 64 }: { value: string; height?: number }) {
  const { bars, width } = code39Bars(value);
  return (
    <figure className="inline-flex flex-col items-center rounded-lg bg-surface px-4 pb-2 pt-3">
      <svg viewBox={`0 0 ${width} ${height}`} height={height} role="img" aria-label={`Barcode ${value}`}>
        {bars.map(([x, w]) => (
          <rect key={x} x={x} y={0} width={w} height={height} className="fill-ink" />
        ))}
      </svg>
      <figcaption className="mt-1 font-mono text-sm tracking-[0.3em] text-ink">{value}</figcaption>
    </figure>
  );
}
