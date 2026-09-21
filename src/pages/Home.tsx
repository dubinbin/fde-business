import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ScenarioCard from '../components/ScenarioCard';
import { DemoNotice, EmptyState, SectionLabel } from '../components/ui';
import { CATEGORIES, SCENARIOS, filterScenarios, type CategoryId } from '../data/scenarios';

const STEPS = [
  {
    n: '01',
    title: '现场梳理',
    desc: '跟随一个真实业务案件，找到数据、决策和部门交接点。',
  },
  {
    n: '02',
    title: '建立基准',
    desc: '整理样本、统一字段、确认业务规则和验收口径。',
  },
  {
    n: '03',
    title: '接入试点',
    desc: '连接现有工具，让一条工作流先跑起来。',
  },
  {
    n: '04',
    title: '持续复盘',
    desc: '对比人工与系统结果，记录异常并迭代规则。',
  },
];

export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (target) {
      const el = document.getElementById(target);
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }, [location.state]);

  const list = useMemo(() => filterScenarios(keyword, cat), [keyword, cat]);

  const goLibrary = () => {
    document.getElementById('library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* 首屏 */}
      <section className="relative overflow-hidden border-b border-line-soft">
        <div className="shell py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl animate-fadeup">
            <div className="flex items-center gap-2.5">
              <span className="h-[1px] w-6 bg-teal/60" aria-hidden="true" />
              <span className="num text-[11px] uppercase tracking-[0.18em] text-teal/90">
                MANUFACTURING / FORWARD DEPLOYED ENGINEERING
              </span>
            </div>

            <h1 className="mt-6 text-[30px] font-medium leading-[1.35] tracking-tight text-cream sm:text-[40px] lg:text-[46px]">
              从一张报表开始，
              <br />
              把 AI 接入工厂的实际流程。
            </h1>

            <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-body sm:text-[15.5px]">
              从询价、采购到生产与质量，探索可交互的业务场景。看见输入、规则、部门协作和最终交付物。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary px-4 py-2.5 text-[13.5px]" onClick={goLibrary}>
                探索应用场景
              </button>
              <button
                type="button"
                className="btn-ghost px-4 py-2.5 text-[13.5px]"
                onClick={() => navigate('/scenario/quote')}
              >
                试算一份报价
              </button>
            </div>

            <div className="mt-8 max-w-xl">
              <DemoNotice />
            </div>
          </div>
        </div>
      </section>

      {/* 场景库 */}
      <section id="library" className="shell scroll-mt-16 py-14 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>SCENARIO LIBRARY</SectionLabel>
            <h2 className="mt-3 text-[22px] font-medium tracking-tight text-cream sm:text-[26px]">
              场景库
            </h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
              每个场景都从一句具体的业务问题出发。点开可以看到输入、处理规则与输出物，并在本地模拟数据上直接试算。
            </p>
          </div>
          <p className="num text-[12px] text-muted">
            共 {SCENARIOS.length} 个场景 · 当前显示 {list.length} 个
          </p>
        </div>

        {/* 分类与搜索 */}
        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="场景分类">
            {CATEGORIES.map((c) => {
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] transition-colors ${
                    active
                      ? 'border-teal/60 bg-teal/[0.08] text-teal'
                      : 'border-line text-body hover:border-line-strong hover:text-cream'
                  }`}
                >
                  <span
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ background: active ? c.color : '#39423d' }}
                    aria-hidden="true"
                  />
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-[300px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10.8 10.8L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索场景名称、问题或标签"
              aria-label="搜索场景"
              className="w-full pl-9 pr-3 py-2 text-[13px]"
            />
          </div>
        </div>

        {/* 卡片 */}
        <div className="mt-6">
          {list.length === 0 ? (
            <EmptyState
              title="没有匹配的场景"
              desc="当前的分类与关键词组合没有命中任何场景。可以更换关键词，或清除筛选条件查看全部场景。"
              action={
                <button
                  type="button"
                  className="btn-ghost px-3.5 py-2 text-[12.5px]"
                  onClick={() => {
                    setKeyword('');
                    setCat('all');
                  }}
                >
                  清除筛选
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s, i) => (
                <ScenarioCard key={s.id} s={s} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 交付方式 */}
      <section id="delivery" className="scroll-mt-16 border-t border-line-soft">
        <div className="shell py-14 sm:py-16">
          <SectionLabel>HOW WE DELIVER</SectionLabel>
          <h2 className="mt-3 text-[22px] font-medium tracking-tight text-cream sm:text-[26px]">
            从一个流程开始，做到可以验收。
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-5">
                <span className="num text-[12px] text-teal">{s.n}</span>
                <h3 className="mt-3 text-[15px] text-cream">{s.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{s.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[13.5px] leading-relaxed text-body">
            交付范围包括数据连接、业务规则、操作界面、测试样本和运行记录。
          </p>

          <div className="mt-6">
            <button type="button" className="btn-primary px-4 py-2.5 text-[13.5px]" onClick={goLibrary}>
              选择一个场景开始
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
