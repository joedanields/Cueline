/** Low-confidence AI tag: said in text with an icon, never shown by border style alone. */
export function CheckThis({ className = '' }: { className?: string }) {
  return (
    <span className={`text-xs font-semibold text-warn ${className}`}>
      <span aria-hidden="true">⚠ </span>Check this
    </span>
  );
}
