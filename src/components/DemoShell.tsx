import { useState, type ReactNode } from 'react';
import { Pill } from './ui';

export type DemoStatus = 'idle' | 'running' | 'done' | 'partial';

const STATUS_META: Record<DemoStatus, { label: string; color: string }> = {
  idle: { label: '未运行', color: '#8A948F' },
  running: { label: '处理中', color: '#E0A23C' },
  done: { label: '完成', color: '#3FD6B0' },
  partial: { label: '待补充数据', color: '#E0A23C' },
};

export default function DemoShell({
  status,
  statusText,
  stale,
  onRun,
  onSample,
  onReset,
  runLabel = '运行演示',
  left,
  right,
  basis,
  extra,
}: {
  status: DemoStatus;
  statusText?: string;
  stale?: boolean;
  onRun: () => void;
  onSample: () => void;
  onReset: () => void;
  runLabel?: string;
  left: ReactNode;
  right: ReactNode;
  basis?: string[];
  extra?: ReactNode;
}) {
  const [showBasis, setShowBasis] = useState(false);
  const meta = STATUS_META[status];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] text-cream">交互演示区</span>
          <Pill color={meta.color} variant="soft">
            <span
              className={`h-[6px] w-[6px] rounded-full ${status === 'running' ? 'animate-pulse' : ''}`}
              style={{ background: meta.color }}
            />
            {meta.label}
          </Pill>
          {statusText && <span className="text-[12px] text-muted">{statusText}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-quiet px-3 py-1.5 text-[12.5px]" onClick={onSample}>
            载入示例
          </button>
          <button type="button" className="btn-quiet px-3 py-1.5 text-[12.5px]" onClick={onReset}>
            重置
          </button>
          <button type="button" className="btn-primary px-3.5 py-1.5 text-[12.5px]" onClick={onRun}>
            {stale ? '重新计算' : runLabel}
          </button>
        </div>
      </div>

      {stale && status !== 'idle' && (
        <div className="border-b border-line-soft bg-cat-production/[0.08] px-4 py-2 sm:px-5">
          <p className="text-[12px] text-cat-production">
            输入已修改，下方结果为上一次计算的旧结果，请点击「重新计算」更新。
          </p>
        </div>
      )}

      <div className="grid gap-0 lg:grid-cols-[minmax(0,352px)_minmax(0,1fr)]">
        <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="label mb-3">输入</p>
          {left}
        </div>
        <div className="p-4 sm:p-5">
          <p className="label mb-3">输出</p>
          {right}
        </div>
      </div>

      {(basis?.length || extra) && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          {extra}
          {basis?.length ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md text-[12.5px] text-muted transition-colors hover:text-teal"
                aria-expanded={showBasis}
                onClick={() => setShowBasis((v) => !v)}
              >
                <svg width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                查看处理依据（计算口径与规则）
              </button>
              {showBasis && (
                <ol className="mt-3 space-y-1.5 border-l border-line pl-4">
                  {basis.map((b, i) => (
                    <li key={i} className="num text-[12px] leading-relaxed text-muted">
                      {i + 1}. {b}
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
