import type { ReactNode } from 'react';
import type { MoneySource } from '../../shared/schemas';

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';
const TONES: Record<Tone, string> = {
  neutral: 'border-line text-fg',
  ok: 'border-ok text-ok',
  warn: 'border-warn text-warn',
  danger: 'border-danger text-danger',
  accent: 'border-accent text-accent',
};

/** Status pill. Always carries a word (and optional icon) — never colour alone. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: Tone;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

const SOURCE: Record<MoneySource, { tone: Tone; icon: string; label: string }> = {
  estimate: { tone: 'warn', icon: '≈', label: 'Estimate' },
  quote: { tone: 'accent', icon: '✎', label: 'Quote' },
  confirmed: { tone: 'ok', icon: '✓', label: 'Confirmed' },
};

/** Every money value says where it came from: Estimate (assumption), Quote (vendor), Confirmed. */
export function SourceBadge({ source }: { source: MoneySource }) {
  const s = SOURCE[source];
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  );
}
