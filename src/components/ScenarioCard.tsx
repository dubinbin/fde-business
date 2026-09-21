import { Link } from 'react-router-dom';
import { CATEGORY_COLOR, CATEGORY_NAME, type Scenario } from '../data/scenarios';
import Preview from './Preview';
import { Dot, Pill } from './ui';

export default function ScenarioCard({ s, index = 0 }: { s: Scenario; index?: number }) {
  const color = CATEGORY_COLOR[s.category];
  return (
    <article
      className="card group flex flex-col overflow-hidden transition-colors duration-200 hover:border-teal/40 focus-within:border-teal/40 animate-fadeup"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <Dot color={color} />
            <span className="text-[11px] tracking-wide" style={{ color }}>
              {CATEGORY_NAME[s.category]}
            </span>
          </span>
          <Pill color="#3FD6B0" variant="soft">
            <Dot color="#3FD6B0" />
            {s.level === '完整交互' ? '交互演示 · 完整' : '交互演示 · 轻量'}
          </Pill>
        </div>

        <div>
          <h3 className="text-[15.5px] font-medium leading-snug text-cream">{s.name}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-body">“{s.question}”</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{s.delivers}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {s.tags.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </div>

        <div className="mt-1">
          <Preview kind={s.preview} />
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <p className="label mb-1.5">典型输入</p>
            <ul className="space-y-1">
              {s.inputs.slice(0, 3).map((i) => (
                <li key={i} className="flex gap-1.5 text-[11.5px] leading-relaxed text-muted">
                  <span className="text-line-strong" aria-hidden="true">
                    ·
                  </span>
                  <span className="min-w-0">{i}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label mb-1.5">输出物</p>
            <ul className="space-y-1">
              {s.outputs.slice(0, 3).map((i) => (
                <li key={i} className="flex gap-1.5 text-[11.5px] leading-relaxed text-muted">
                  <span className="text-teal/60" aria-hidden="true">
                    ·
                  </span>
                  <span className="min-w-0">{i}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-line-soft px-4 py-3 sm:px-5">
        <Link
          to={`/scenario/${s.id}`}
          className="inline-flex items-center gap-1.5 rounded-md text-[13px] text-teal transition-colors hover:text-teal-soft"
        >
          打开演示
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
            <path d="M1 4.5h8M6 1.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
