import { useId, useState, type ReactNode } from 'react';

export function Pill({
  children,
  color,
  variant = 'outline',
}: {
  children: ReactNode;
  color?: string;
  variant?: 'outline' | 'solid' | 'soft';
}) {
  const style =
    variant === 'solid'
      ? { background: color ?? '#3FD6B0', color: '#101312', borderColor: color ?? '#3FD6B0' }
      : variant === 'soft'
        ? { color: color ?? '#3FD6B0', borderColor: `${color ?? '#3FD6B0'}55`, background: `${color ?? '#3FD6B0'}12` }
        : { color: color ?? '#B9C2BC', borderColor: '#39423d' };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] leading-none"
      style={style}
    >
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-[6px] w-[6px] shrink-0 rounded-full"
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        {hint && <span className="text-[10.5px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Disclosure({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-ink-750 sm:px-5"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span className="block text-[14px] text-cream">{title}</span>
          {subtitle && <span className="mt-0.5 block text-[12px] text-muted">{subtitle}</span>}
        </span>
        <span
          className="ml-2 shrink-0 text-muted transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {open && (
        <div id={id} className="border-t border-line px-4 py-4 sm:px-5">
          {children}
        </div>
      )}
    </div>
  );
}

/** 模拟数据声明条 */
export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-teal/25 bg-teal/[0.06] px-3.5 py-2.5">
      <span className="mt-[3px] text-teal" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 4.6v.1M8 7v4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <p className="text-[12px] leading-relaxed text-body">
        {children ?? '以下为模拟数据交互演示，可按企业实际流程部署。'}
      </p>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-[1px] w-6 bg-teal/60" aria-hidden="true" />
      <span className="label text-teal/90">{children}</span>
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-muted"
        aria-hidden="true"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10.8 10.8L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[14px] text-cream">{title}</p>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
