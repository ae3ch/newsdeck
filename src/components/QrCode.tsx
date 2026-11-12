import { useMemo } from 'react';
import { encode } from 'uqr';

interface Props {
  value: string;
  /** Description for screen readers. */
  label: string;
}

/** Target edge length in CSS pixels. */
const TARGET = 240;
/** At least this many pixels per module, otherwise the code gets blurry on standard-resolution screens. */
const MIN_MODULE = 3;

/** Turns the module matrix into a single SVG path: one rectangle per dark run in each row. */
function toPath(data: boolean[][]): string {
  let d = '';
  data.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return d;
}

/**
 * QR code as SVG. Always black on white, even in the dark color scheme: not every camera reads
 * inverted codes. If the content does not fit, a notice appears instead of the code.
 */
export function QrCode({ value, label }: Props) {
  const qr = useMemo(() => {
    try {
      return encode(value, { ecc: 'L', border: 3 });
    } catch {
      return null;
    }
  }, [value]);

  if (!qr) {
    return <p className="text-sm text-muted">This link is too long for a QR code. Copy or share it instead.</p>;
  }
  // Whole pixels per module, so no edge blurs between two pixels.
  const size = qr.size * Math.max(MIN_MODULE, Math.round(TARGET / qr.size));
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="block h-auto max-w-full shrink-0 rounded-lg"
    >
      <rect width={qr.size} height={qr.size} fill="#fff" />
      <path d={toPath(qr.data)} fill="#000" />
    </svg>
  );
}
