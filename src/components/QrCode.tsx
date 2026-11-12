import { useMemo } from 'react';
import { encode } from 'uqr';

interface Props {
  value: string;
  /** Beschreibung für Screenreader. */
  label: string;
}

/** Angestrebte Kantenlänge in CSS-Pixeln. */
const TARGET = 240;
/** Mindestens so viele Pixel je Modul, sonst wird der Code auf Bildschirmen mit einfacher Auflösung unscharf. */
const MIN_MODULE = 3;

/** Wandelt die Modulmatrix in einen einzigen SVG-Pfad um: je Zeile ein Rechteck pro dunklem Abschnitt. */
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
 * QR-Code als SVG. Immer schwarz auf weiss, auch im dunklen Farbschema: Invertierte Codes lesen
 * nicht alle Kameras. Passt der Inhalt nicht hinein, erscheint ein Hinweis statt des Codes.
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
  // Ganzzahlige Pixel je Modul, damit keine Kante zwischen zwei Pixeln verschwimmt.
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
