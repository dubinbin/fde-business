import { Link, useParams } from 'react-router-dom';
import QuoteDemo from '../demos/QuoteDemo';
import SupplierDemo from '../demos/SupplierDemo';
import BomDiffDemo from '../demos/BomDiffDemo';
import KitShortageDemo from '../demos/KitShortageDemo';
import InsertOrderDemo from '../demos/InsertOrderDemo';
import QualityEvidenceDemo from '../demos/QualityEvidenceDemo';
import EcoImpactDemo from '../demos/EcoImpactDemo';
import CostReviewDemo from '../demos/CostReviewDemo';
import ServiceTicketDemo from '../demos/ServiceTicketDemo';
import { Disclosure, EmptyState, Pill, SectionLabel } from '../components/ui';
import { CATEGORY_COLOR, CATEGORY_NAME, SCENARIOS, getScenario } from '../data/scenarios';

function demoFor(id: string) {
  switch (id) {
    case 'quote':
      return <QuoteDemo />;
    case 'sourcing-compare':
      return <SupplierDemo />;
    case 'bom-diff':
      return <BomDiffDemo />;
    case 'kit-shortage':
      return <KitShortageDemo />;
    case 'insert-order':
      return <InsertOrderDemo />;
    case 'quality-evidence':
      return <QualityEvidenceDemo />;
    case 'eco-impact':
      return <EcoImpactDemo />;
    case 'cost-review':
      return <CostReviewDemo />;
    case 'service-ticket':
      return <ServiceTicketDemo />;
    default:
      return null;
  }
}

export default function ScenarioDetail() {
  const { id } = useParams();
  const s = getScenario(id);

  if (!s) {
    return (
      <div className="shell py-20">
        <EmptyState
          title="没有找到这个场景"
          desc="该场景不存在或已被调整。可以返回场景库查看全部 9 个场景。"
          action={
            <Link to="/" className="btn-primary px-4 py-2 text-[13px]">
              返回场景库
            </Link>
          }
        />
      </div>
    );
  }

  const color = CATEGORY_COLOR[s.category];
  const demo = demoFor(s.id);
  const others = SCENARIOS.filter((x) => x.id !== s.id).slice(0, 4);

  return (
    <div className="shell py-8 sm:py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-md text-[12.5px] text-muted transition-colors hover:text-teal"
      >
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
          <path d="M10 4.5H2M5 1.5L2 4.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        返回场景库
      </Link>

      {/* 顶部信息 */}
      <header className="mt-5 border-b border-line-soft pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Pill color={color} variant="soft">
            <span className="h-[6px] w-[6px] rounded-full" style={{ background: color }} />
            {CATEGORY_NAME[s.category]}
          </Pill>
          <Pill color="#3FD6B0" variant="soft">
            模拟数据演示
          </Pill>
          <Pill>{s.level === '完整交互' ? '完整交互' : '轻量交互'}</Pill>
        </div>

        <h1 className="mt-4 text-[24px] font-medium leading-snug tracking-tight text-cream sm:text-[30px]">
          {s.name}
        </h1>

        <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-body">“{s.question}”</p>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">{s.delivers}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="label mr-1">适用角色</span>
          {s.roles.map((r) => (
            <Pill key={r}>{r}</Pill>
          ))}
        </div>
      </header>

      {/* 处理流程 */}
      <section className="py-8">
        <SectionLabel>PROCESS</SectionLabel>
        <h2 className="mt-3 text-[15px] text-cream">处理流程</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: '输入', d: s.inputs },
            { t: '数据与规则', d: s.landing.data.slice(0, 3) },
            { t: '业务结果', d: s.outputs.slice(0, 3) },
            { t: '负责人确认', d: s.landing.human.slice(0, 3) },
          ].map((node) => (
            <div key={node.t} className="card p-4">
              <p className="text-[13px] text-teal">{node.t}</p>
              <ul className="mt-2 space-y-1">
                {node.d.map((x) => (
                  <li key={x} className="flex gap-1.5 text-[11.5px] leading-relaxed text-muted">
                    <span aria-hidden="true">·</span>
                    <span className="min-w-0">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {s.flow.map((f, i) => (
            <li key={f.title} className="panel flex gap-3 px-3.5 py-3">
              <span className="num shrink-0 text-[12px] text-teal/80">{i + 1}</span>
              <span>
                <span className="block text-[13px] text-cream">{f.title}</span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">{f.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        {s.caveat && (
          <p className="mt-4 rounded-lg border border-cat-production/30 bg-cat-production/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-cat-production">
            {s.caveat}
          </p>
        )}
      </section>

      {/* 交互演示 */}
      <section className="border-t border-line-soft py-8">
        <SectionLabel>INTERACTIVE DEMO</SectionLabel>
        <h2 className="mt-3 text-[15px] text-cream">交互演示</h2>
        <div className="mt-4">{demo}</div>
      </section>

      {/* 落地要求 */}
      <section className="border-t border-line-soft py-8">
        <SectionLabel>DEPLOYMENT</SectionLabel>
        <h2 className="mt-3 mb-4 text-[15px] text-cream">落地到企业需要什么</h2>
        <div className="space-y-3">
          <Disclosure title="数据来源" subtitle="需要对接或整理的系统与文件" defaultOpen>
            <ul className="space-y-2">
              {s.landing.data.map((d) => (
                <li key={d} className="flex gap-2 text-[12.5px] leading-relaxed text-body">
                  <span className="text-teal/70" aria-hidden="true">
                    ·
                  </span>
                  <span className="min-w-0">{d}</span>
                </li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure title="企业需要明确的业务规则" subtitle="规则不清，结果就无法稳定复现">
            <ul className="space-y-2">
              {s.landing.rules.map((d) => (
                <li key={d} className="flex gap-2 text-[12.5px] leading-relaxed text-body">
                  <span className="text-teal/70" aria-hidden="true">
                    ·
                  </span>
                  <span className="min-w-0">{d}</span>
                </li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure title="人工判断和确认环节" subtitle="哪些结论必须由人签字">
            <ul className="space-y-2">
              {s.landing.human.map((d) => (
                <li key={d} className="flex gap-2 text-[12.5px] leading-relaxed text-body">
                  <span className="text-teal/70" aria-hidden="true">
                    ·
                  </span>
                  <span className="min-w-0">{d}</span>
                </li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure title="试点验收指标及计量方法" subtitle="以下为待测项，不是已实现的提升">
            <div className="scrollx">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th px-2 py-1.5">待测指标</th>
                    <th className="th px-2 py-1.5">计量方法</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {s.landing.metrics.map((m) => (
                    <tr key={m.name}>
                      <td className="px-2 py-2 text-[12.5px] text-cream">{m.name}</td>
                      <td className="px-2 py-2 text-[12px] leading-relaxed text-body">{m.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              以上指标需要在试点开始前与业务负责人共同确认基线，才能判断是否有改善；本站不提供任何已实现的效率提升数据。
            </p>
          </Disclosure>
        </div>
      </section>

      {/* 其他场景 */}
      <section className="border-t border-line-soft py-8">
        <SectionLabel>MORE SCENARIOS</SectionLabel>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((o) => (
            <Link
              key={o.id}
              to={`/scenario/${o.id}`}
              className="card px-3.5 py-3 transition-colors hover:border-teal/40"
            >
              <span className="text-[11px]" style={{ color: CATEGORY_COLOR[o.category] }}>
                {CATEGORY_NAME[o.category]}
              </span>
              <p className="mt-1.5 text-[13px] leading-snug text-cream">{o.name}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
