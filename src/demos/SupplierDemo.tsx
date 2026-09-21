import { useMemo, useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Field, Pill } from '../components/ui';
import { DEMO_TODAY } from '../data/quote';
import { addDays, diffDays, int, money, num, round, weekday } from '../lib/money';

interface Supplier {
  id: string;
  label: string;
  /** 报价口径：未税 / 含税 */
  mode: 'excl' | 'incl';
  price: string;
  tax: string;
  freight: string;
  moq: string;
  lead: string;
}

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'A', label: '供应商 A', mode: 'excl', price: '128.60', tax: '13', freight: '800', moq: '6000', lead: '32' },
  { id: 'B', label: '供应商 B', mode: 'excl', price: '129.80', tax: '13', freight: '1200', moq: '5000', lead: '12' },
  { id: 'C', label: '供应商 C', mode: 'incl', price: '147.35', tax: '13', freight: '500', moq: '5000', lead: '14' },
];

interface Row {
  id: string;
  label: string;
  mode: 'excl' | 'incl';
  quotedPrice: number;
  unitExcl: number;
  unitIncl: number;
  taxPct: number;
  freight: number;
  moq: number;
  leadDays: number;
  buyQty: number;
  overQty: number;
  overAmount: number;
  goodsExcl: number;
  taxAmount: number;
  comparable: number;
  arrive: string;
  feasible: boolean;
  delayDays: number;
}

function compute(s: Supplier, qty: number, needDate: string): Row {
  const quoted = round(num(s.price), 2);
  const taxPct = num(s.tax);
  const freight = round(num(s.freight), 2);
  const moq = Math.round(num(s.moq));
  const leadDays = Math.round(num(s.lead));
  const unitExcl = s.mode === 'incl' ? round(quoted / (1 + taxPct / 100), 2) : quoted;
  const unitIncl = round(unitExcl * (1 + taxPct / 100), 2);
  const buyQty = Math.max(qty, moq);
  const overQty = buyQty - qty;
  const goodsExcl = round(unitExcl * buyQty, 2);
  const taxAmount = round(goodsExcl * (taxPct / 100), 2);
  const comparable = round(goodsExcl + taxAmount + freight, 2);
  const overAmount = round(overQty * unitIncl, 2);
  const arrive = addDays(DEMO_TODAY, leadDays).toISOString().slice(0, 10);
  const delayDays = diffDays(needDate, arrive);
  return {
    id: s.id,
    label: s.label,
    mode: s.mode,
    quotedPrice: quoted,
    unitExcl,
    unitIncl,
    taxPct,
    freight,
    moq,
    leadDays,
    buyQty,
    overQty,
    overAmount,
    goodsExcl,
    taxAmount,
    comparable,
    arrive,
    feasible: delayDays <= 0,
    delayDays,
  };
}

interface Snapshot {
  qty: number;
  needDate: string;
  rows: Row[];
  feasibleSorted: Row[];
  minUnitRow: Row;
  recommended: Row | null;
  sig: string;
}

export default function SupplierDemo() {
  const [draft, setDraft] = useState({ qty: '5000', needDate: '2026-10-05' });
  const [suppliers, setSuppliers] = useState(DEFAULT_SUPPLIERS);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');

  const qty = Math.round(num(draft.qty, 0));
  const valid = qty > 0 && Number.isInteger(qty) && !!draft.needDate;

  const set = (id: string, key: keyof Supplier, value: string) =>
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const signature = JSON.stringify([draft, suppliers]);

  const run = () => {
    if (!valid) return;
    setStatus('running');
    const rows = suppliers.map((s) => compute(s, qty, draft.needDate));
    const feasibleSorted = rows.filter((r) => r.feasible).sort((a, b) => a.comparable - b.comparable);
    const minUnitRow = [...rows].sort((a, b) => a.unitIncl - b.unitIncl)[0];
    const recommended = feasibleSorted[0] ?? null;
    const sig = JSON.stringify([draft, suppliers]);
    window.setTimeout(() => {
      setSnap({ qty, needDate: draft.needDate, rows, feasibleSorted, minUnitRow, recommended, sig });
      setStatus(rows.some((r) => !r.feasible) || !recommended ? 'partial' : 'done');
    }, 460);
  };

  const reset = () => {
    setDraft({ qty: '5000', needDate: '2026-10-05' });
    setSuppliers(DEFAULT_SUPPLIERS);
    setSnap(null);
    setStatus('idle');
  };

  const loadSample = () => {
    const d = { qty: '5000', needDate: '2026-10-05' };
    setDraft(d);
    setSuppliers(DEFAULT_SUPPLIERS);
    setStatus('running');
    const rows = DEFAULT_SUPPLIERS.map((s) => compute(s, 5000, d.needDate));
    const feasibleSorted = rows.filter((r) => r.feasible).sort((a, b) => a.comparable - b.comparable);
    const minUnitRow = [...rows].sort((a, b) => a.unitIncl - b.unitIncl)[0];
    const sig = JSON.stringify([d, DEFAULT_SUPPLIERS]);
    window.setTimeout(() => {
      setSnap({
        qty: 5000,
        needDate: d.needDate,
        rows,
        feasibleSorted,
        minUnitRow,
        recommended: feasibleSorted[0] ?? null,
        sig,
      });
      setStatus('partial');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && snap.sig !== signature;

  const left = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="采购数量">
          <input
            type="number"
            min={1}
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
            className="w-full num"
          />
        </Field>
        <Field label="需求日期">
          <input
            type="date"
            value={draft.needDate}
            onChange={(e) => setDraft({ ...draft, needDate: e.target.value })}
            className="w-full num"
          />
        </Field>
      </div>
      {!valid && <p className="text-[12px] text-cat-production">采购数量需为正整数，并填写需求日期。</p>}

      <div className="space-y-3">
        {suppliers.map((s) => (
          <div key={s.id} className="panel px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] text-cream">{s.label}</span>
              <div className="flex gap-1">
                {(['excl', 'incl'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set(s.id, 'mode', m)}
                    className={`rounded border px-2 py-[3px] text-[11px] transition-colors ${
                      s.mode === m
                        ? 'border-teal/60 bg-teal/10 text-teal'
                        : 'border-line text-muted hover:text-body'
                    }`}
                  >
                    {m === 'excl' ? '未税报价' : '含税报价'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="报价单价">
                <input
                  type="number"
                  step="0.01"
                  value={s.price}
                  onChange={(e) => set(s.id, 'price', e.target.value)}
                  className="w-full num"
                />
              </Field>
              <Field label="税率 %">
                <input
                  type="number"
                  step="1"
                  value={s.tax}
                  onChange={(e) => set(s.id, 'tax', e.target.value)}
                  className="w-full num"
                />
              </Field>
              <Field label="运费（元/单）">
                <input
                  type="number"
                  step="10"
                  value={s.freight}
                  onChange={(e) => set(s.id, 'freight', e.target.value)}
                  className="w-full num"
                />
              </Field>
              <Field label="起订量 MOQ">
                <input
                  type="number"
                  step="1"
                  value={s.moq}
                  onChange={(e) => set(s.id, 'moq', e.target.value)}
                  className="w-full num"
                />
              </Field>
              <Field label="交期（天）" className="col-span-2">
                <input
                  type="number"
                  step="1"
                  value={s.lead}
                  onChange={(e) => set(s.id, 'lead', e.target.value)}
                  className="w-full num"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        供应商名称已匿名化为 A / B / C；价格、税率、运费、MOQ 与交期均为模拟数据。
      </p>
    </div>
  );

  const right = useMemo(() => {
    if (status === 'idle')
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
          <p className="text-[13.5px] text-cream">尚未运行</p>
          <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
            点击「载入示例」使用默认的三家报价，或修改左侧条款后「运行演示」。
          </p>
        </div>
      );
    if (status === 'running' || !snap)
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
          <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-teal" />
          <p className="text-[13px] text-body">正在统一税别与运费口径，校验 MOQ 与交期…</p>
        </div>
      );

    const { rows, recommended, minUnitRow, feasibleSorted, needDate } = snap;

    return (
      <div className="space-y-5">
        <section className="panel px-3.5 py-3">
          <p className="label mb-2">推荐方案</p>
          {recommended ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] text-teal">{recommended.label}</span>
                <Pill color="#3FD6B0" variant="soft">
                  可比总额 ¥ {money(recommended.comparable)}
                </Pill>
                <Pill>交期 {recommended.leadDays} 天</Pill>
              </div>
              <ul className="mt-2.5 space-y-1">
                <li className="text-[12.5px] leading-relaxed text-body">
                  · 在交期可行的 {feasibleSorted.length} 家方案中，可比总额最低。
                </li>
                {minUnitRow.id !== recommended.id && (
                  <li className="text-[12.5px] leading-relaxed text-body">
                    · 名义含税单价最低的是 {minUnitRow.label}（¥ {money(minUnitRow.unitIncl)}），但
                    {!minUnitRow.feasible
                      ? `预计到货 ${minUnitRow.arrive}，晚于需求日期 ${needDate} ${minUnitRow.delayDays} 天，不满足交期`
                      : '其可比总额更高'}
                    ；{minUnitRow.overQty > 0 ? `且 MOQ ${int(minUnitRow.moq)} 会产生 ${int(minUnitRow.overQty)} 件超采。` : ''}
                  </li>
                )}
                {recommended.overQty > 0 && (
                  <li className="text-[12.5px] leading-relaxed text-cat-production">
                    · 注意：MOQ 高于需求量，将超采 {int(recommended.overQty)} 件，占用约 ¥{' '}
                    {money(recommended.overAmount)}。
                  </li>
                )}
                {recommended.id === minUnitRow.id && (
                  <li className="text-[12.5px] leading-relaxed text-body">
                    · 该方案同时是名义含税单价最低者。
                  </li>
                )}
              </ul>
            </>
          ) : (
            <div>
              <p className="text-[13px] text-cat-production">没有满足需求日期的方案</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">
                三家供应商的预计到货均晚于 {needDate}。建议：调整需求日期、拆分订单，或启用备选供应商——由采购与计划共同决定。
              </p>
            </div>
          )}
        </section>

        <section>
          <p className="label mb-2">归一后的可比明细</p>
          <div className="scrollx rounded-lg border border-line">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-ink-800/60">
                <tr>
                  <th className="th px-2 py-1.5">供应商</th>
                  <th className="th px-2 py-1.5 text-right">报价口径</th>
                  <th className="th px-2 py-1.5 text-right">未税单价</th>
                  <th className="th px-2 py-1.5 text-right">含税单价</th>
                  <th className="th px-2 py-1.5 text-right">采购数量</th>
                  <th className="th px-2 py-1.5 text-right">超采</th>
                  <th className="th px-2 py-1.5 text-right">未税货值</th>
                  <th className="th px-2 py-1.5 text-right">税额</th>
                  <th className="th px-2 py-1.5 text-right">运费</th>
                  <th className="th px-2 py-1.5 text-right">可比总额</th>
                  <th className="th px-2 py-1.5 text-right">预计到货</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.map((r) => (
                  <tr key={r.id} className={recommended?.id === r.id ? 'bg-teal/[0.05]' : ''}>
                    <td className="px-2 py-1.5">
                      <span className="block text-[12.5px] text-cream">{r.label}</span>
                      {!r.feasible && (
                        <span className="block text-[10.5px] text-cat-production">
                          交期不满足（晚 {r.delayDays} 天）
                        </span>
                      )}
                    </td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">
                      {r.mode === 'incl' ? '含税' : '未税'}
                    </td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">{money(r.unitExcl)}</td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">{money(r.unitIncl)}</td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">{int(r.buyQty)}</td>
                    <td
                      className={`num px-2 py-1.5 text-right text-[12px] ${
                        r.overQty > 0 ? 'text-cat-production' : 'text-muted'
                      }`}
                    >
                      {r.overQty > 0 ? int(r.overQty) : '—'}
                    </td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">{money(r.goodsExcl)}</td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">{money(r.taxAmount)}</td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">{money(r.freight)}</td>
                    <td className="num px-2 py-1.5 text-right text-[13px] text-cream">{money(r.comparable)}</td>
                    <td
                      className={`num px-2 py-1.5 text-right text-[12px] ${
                        r.feasible ? 'text-body' : 'text-cat-production'
                      }`}
                    >
                      {r.arrive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <p className="label mb-2">超采与交期差异</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className="panel px-3 py-2.5">
                <p className="text-[12.5px] text-cream">{r.label}</p>
                <p className="num mt-1 text-[11.5px] text-body">
                  超采 {r.overQty > 0 ? `${int(r.overQty)} 件（¥ ${money(r.overAmount)}）` : '无'}
                </p>
                <p className="num mt-0.5 text-[11.5px] text-body">
                  到货 {r.arrive}（{weekday(r.arrive)}）·{' '}
                  {r.feasible ? '满足需求日期' : `晚 ${r.delayDays} 天`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11.5px] leading-relaxed text-muted">
          可比口径：未税货值 ×(1 + 税率) + 运费，按实际采购数量（受 MOQ 影响）计算。本演示不含质量、账期、历史交付表现等非价格因素，
          最终选择由采购负责人确认。
        </p>
      </div>
    );
  }, [status, snap]);

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。三家供应商均为匿名化模拟数据，不对应任何真实企业。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={
          status === 'done'
            ? '已生成推荐'
            : status === 'partial'
              ? '存在交期不可行方案'
              : undefined
        }
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          `未税单价 = 含税报价 ÷（1 + 税率）；本演示中 ${snap?.rows.find((r) => r.mode === 'incl')?.label ?? '含税报价的供应商'} 的报价需先折算为未税。`,
          `采购数量 = max（需求数量, MOQ）= max(${int(snap?.qty ?? qty)}, 各供应商 MOQ）。`,
          '未税货值 = 未税单价 × 采购数量；税额 = 未税货值 × 税率。',
          '可比总额（含税到岸）= 未税货值 + 税额 + 运费。',
          `预计到货 = 基准日 ${DEMO_TODAY} + 交期天数；与需求日期 ${snap?.needDate ?? draft.needDate} 比较判定可行性。`,
          '推荐规则：先按交期可行性过滤，再在可行方案中取可比总额最低者；不考虑质量、账期与历史表现。',
          '所有金额四舍五入到「分」，合计由已舍入明细相加。',
        ]}
      />
    </div>
  );
}
