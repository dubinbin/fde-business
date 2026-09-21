import type { ReactNode } from 'react';

export function IdleCard({ text }: { text: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="text-[13.5px] text-cream">尚未运行</p>
      <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}

export function RunningCard({ text }: { text: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-teal" />
      <p className="text-[13px] text-body">{text}</p>
    </div>
  );
}

export function KV({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12px] text-muted">{k}</span>
      <span className={`num text-[12.5px] ${tone ?? 'text-body'}`}>{v}</span>
    </div>
  );
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return <th className={`th px-2 py-1.5 font-normal ${right ? 'text-right' : ''}`}>{children}</th>;
}

export function Td({ children, right, tone }: { children: ReactNode; right?: boolean; tone?: string }) {
  return <td className={`td num px-2 py-1.5 ${right ? 'text-right' : ''} ${tone ?? ''}`}>{children}</td>;
}

export function TableWrap({ min = 560, children }: { min?: number; children: ReactNode }) {
  return (
    <div className="scrollx rounded-lg border border-line">
      <table className="w-full border-collapse" style={{ minWidth: min }}>
        {children}
      </table>
    </div>
  );
}

export function NoteList({ items, className = 'text-body' }: { items: string[]; className?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className={`flex gap-2 text-[12px] leading-relaxed ${className}`}>
          <span className="text-teal/70" aria-hidden="true">
            ·
          </span>
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}
