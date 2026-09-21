import type { PreviewKind } from '../data/scenarios';

const SHELL = 'rounded-md border border-line bg-ink-900/70 overflow-hidden';
const BAR = 'flex h-6 items-center gap-1.5 border-b border-line-soft px-2.5';
const DOT = 'h-[5px] w-[5px] rounded-full';

function Head({ title, right }: { title: string; right?: string }) {
  return (
    <div className={BAR}>
      <span className={`${DOT} bg-line-strong`} />
      <span className={`${DOT} bg-line-strong`} />
      <span className="ml-1 truncate text-[10px] tracking-wide text-muted">{title}</span>
      {right && <span className="num ml-auto shrink-0 text-[10px] text-muted">{right}</span>}
    </div>
  );
}

function Row({ a, b, c, tone }: { a: string; b: string; c?: string; tone?: 'add' | 'del' | 'chg' | 'warn' }) {
  const color =
    tone === 'add'
      ? 'text-teal'
      : tone === 'del'
        ? 'text-[#C9786B]'
        : tone === 'chg'
          ? 'text-cat-production'
          : tone === 'warn'
            ? 'text-cat-quality'
            : 'text-body';
  return (
    <div className="flex items-baseline gap-2 px-2.5 py-[5px]">
      <span className="num w-[62px] shrink-0 truncate text-[10px] text-muted">{a}</span>
      <span className={`flex-1 truncate text-[10.5px] ${color}`}>{b}</span>
      {c && <span className={`num shrink-0 text-[10.5px] ${color}`}>{c}</span>}
    </div>
  );
}

function QuotePreview() {
  return (
    <div className={SHELL}>
      <Head title="报价单草稿 · CTRL-001" right="5,000 台" />
      <div className="divide-y divide-line-soft">
        <Row a="材料" b="8 项 BOM · 阶梯取价" c="¥ 72.41" />
        <Row a="加工" b="4 道工序 · 工时×费率" c="¥ 23.35" />
        <Row a="费用" b="损耗+物流+管理+模具" c="¥ 15.62" />
      </div>
      <div className="flex items-baseline justify-between border-t border-line px-2.5 py-[6px]">
        <span className="text-[10px] text-muted">含税单价</span>
        <span className="num text-[11.5px] text-cream">¥ 131.35</span>
      </div>
    </div>
  );
}

function ComparePreview() {
  const rows = [
    { n: 'S-01', v: 74, ok: false, t: '¥ 74.9万' },
    { n: 'S-02', v: 62, ok: true, t: '¥ 62.6万' },
    { n: 'S-03', v: 70, ok: true, t: '¥ 70.1万' },
  ];
  return (
    <div className={SHELL}>
      <Head title="可比口径 · 含税到岸总额" right="MOQ / 交期已校验" />
      <div className="space-y-[5px] px-2.5 py-2">
        {rows.map((r) => (
          <div key={r.n} className="flex items-center gap-2">
            <span className="num w-8 shrink-0 text-[10px] text-muted">{r.n}</span>
            <span className="relative h-[7px] flex-1 overflow-hidden rounded-sm bg-ink-750">
              <span
                className={`absolute inset-y-0 left-0 rounded-sm ${r.ok ? 'bg-teal/70' : 'bg-cat-sales/60'}`}
                style={{ width: `${r.v}%` }}
              />
            </span>
            <span className={`num w-[52px] shrink-0 text-right text-[10.5px] ${r.ok ? 'text-teal' : 'text-body'}`}>
              {r.t}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-line-soft px-2.5 py-[5px] text-[10px] text-muted">
        最低单价 S-01 因交期不满足被排除
      </div>
    </div>
  );
}

function BomPreview() {
  return (
    <div className={SHELL}>
      <Head title="BOM v1.2 → v1.3" right="7 项变更" />
      <div className="divide-y divide-line-soft">
        <Row a="RLY-16A" b="用量 3 → 4" c="+¥ 10.80" tone="add" />
        <Row a="CAP-470U" b="规格 105℃ → 125℃" c="待确认" tone="chg" />
        <Row a="CONN-4P" b="删除项" c="−¥ 2.40" tone="del" />
        <Row a="IC-MCU-02" b="新增项 · 无价格" c="待确认" tone="warn" />
      </div>
    </div>
  );
}

function KitPreview() {
  return (
    <div className={SHELL}>
      <Head title="齐套检查 · 订单 O-2609-014" right="预计 09-28" />
      <div className="divide-y divide-line-soft">
        <Row a="IC-MCU-01" b="缺 1,240 pcs · 在途" c="09-26 到" />
        <Row a="RLY-16A" b="缺 3,600 pcs · 无到料日" c="阻塞" tone="del" />
        <Row a="PCB-A1" b="可用 6,800 pcs" c="充足" tone="add" />
      </div>
    </div>
  );
}

function SchedulePreview() {
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  return (
    <div className={SHELL}>
      <Head title="交付日历 · 简化产能试排" right="W-39" />
      <div className="grid grid-cols-7 gap-[3px] px-2.5 py-2">
        {days.map((d, i) => (
          <div key={d} className="text-center">
            <div className="text-[9px] text-muted">{d}</div>
            <div
              className={`mt-[3px] h-[18px] rounded-[3px] border ${
                i === 2
                  ? 'border-cat-production/60 bg-cat-production/20'
                  : i === 3 || i === 4
                    ? 'border-teal/40 bg-teal/12'
                    : 'border-line bg-ink-850'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-line-soft px-2.5 py-[5px] text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-[6px] w-[6px] rounded-sm bg-cat-production/60" />插单
        </span>
        <span className="flex items-center gap-1">
          <span className="h-[6px] w-[6px] rounded-sm bg-teal/40" />受影响订单
        </span>
      </div>
    </div>
  );
}

function QualityPreview() {
  return (
    <div className={SHELL}>
      <Head title="历史异常记录" right="3 条命中" />
      <div className="divide-y divide-line-soft">
        <Row a="QA-2418" b="波峰焊 · 焊点虚焊" c="已闭环" tone="add" />
        <Row a="QA-2261" b="回流焊 · 锡珠残留" c="已闭环" tone="add" />
        <Row a="QA-2388" b="手工补焊 · 焊盘脱落" c="待确认" tone="chg" />
      </div>
      <div className="border-t border-line-soft px-2.5 py-[5px] text-[10px] text-muted">
        依据：WI-焊接-003 v2.1 · 8D-2418
      </div>
    </div>
  );
}

function EcoPreview() {
  return (
    <div className={SHELL}>
      <Head title="影响追溯 · IC-MCU-01" right="5 个 BOM" />
      <div className="divide-y divide-line-soft">
        <Row a="CTRL-001" b="在制 1,200 · 未交 3,000" c="受影响" tone="chg" />
        <Row a="CTRL-004" b="库存 4,800 pcs" c="呆滞 ¥ 20.4万" tone="del" />
        <Row a="ALT" b="候选替代 IC-MCU-02" c="待工程验证" tone="warn" />
      </div>
    </div>
  );
}

function CostPreview() {
  return (
    <div className={SHELL}>
      <Head title="报价 vs 实际 · 每单位" right="总差异 ¥ 8.63" />
      <div className="divide-y divide-line-soft">
        <Row a="材料" b="采购价上浮" c="+¥ 5.10" tone="chg" />
        <Row a="加工" b="实际工时超耗" c="+¥ 2.24" tone="chg" />
        <Row a="损耗" b="报废 1.8% → 3.1%" c="+¥ 0.98" tone="chg" />
        <Row a="物流" b="临时空运" c="+¥ 0.30" tone="chg" />
      </div>
    </div>
  );
}

function TicketPreview() {
  return (
    <div className={SHELL}>
      <Head title="工单 WO-2609-118" right="优先级 高" />
      <div className="space-y-[5px] px-2.5 py-2 text-[10.5px]">
        <div className="flex gap-2">
          <span className="shrink-0 text-muted">已识别</span>
          <span className="text-body">CTRL-002 · E-12 · 保外</span>
        </div>
        <div className="flex gap-2">
          <span className="shrink-0 text-muted">待补充</span>
          <span className="text-cat-production">故障发生时工况 · 现场照片</span>
        </div>
        <div className="flex gap-2">
          <span className="shrink-0 text-muted">建议分派</span>
          <span className="text-body">售后二组 · 现场服务工程师</span>
        </div>
      </div>
    </div>
  );
}

const MAP: Record<PreviewKind, () => JSX.Element> = {
  quote: QuotePreview,
  compare: ComparePreview,
  bom: BomPreview,
  kit: KitPreview,
  schedule: SchedulePreview,
  quality: QualityPreview,
  eco: EcoPreview,
  cost: CostPreview,
  ticket: TicketPreview,
};

export default function Preview({ kind }: { kind: PreviewKind }) {
  const C = MAP[kind];
  return (
    <div aria-hidden="true" className="select-none">
      <C />
    </div>
  );
}
