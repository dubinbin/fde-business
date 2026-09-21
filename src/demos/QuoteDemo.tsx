import { useMemo, useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Field } from '../components/ui';
import {
  ASSUMPTIONS,
  DELIVERY_TERMS,
  DEMO_TODAY,
  DATA_STATES,
  PRODUCT,
  PURCHASE_PLANS,
  type DataStateId,
  type DeliveryTerm,
  type PurchasePlan,
} from '../data/quote';
import { addDays, int, money, num, price, weekday } from '../lib/money';
import { DEFAULT_QUOTE_INPUT, compareTiers, computeQuote, type QuoteInput, type QuoteResult } from '../lib/quote';
import { parseInquiry, validateQuoteInput } from '../lib/nlp';

const QTY_PRESETS = [1000, 5000, 10000];
const SAMPLE_TEXT = '给客户A报5000件控制器，目标毛利15%，分别看一下1000件和10000件的价格。';

function sig(i: QuoteInput) {
  return [i.qty, i.marginPct, i.taxPct, i.planId, i.deliveryId, i.dataState, i.amortQty].join('|');
}

interface Snapshot {
  input: QuoteInput;
  result: QuoteResult;
  comparison: QuoteResult[];
  nlFields?: string[];
}

/** 未运行时的通用口径说明，运行后替换为本次计算依据 */
const GENERAL_BASIS = [
  '数量阶梯：< 1,000 / 1,000–4,999 / 5,000–9,999 / ≥ 10,000，按订货数量所在档取未税单价。',
  '材料成本 = Σ（单台用量 × 阶梯未税单价 × 采购方案系数）；缺价项不计入，也不按 0 计入。',
  '加工成本 = Σ（单台工时 × 费率）。',
  '损耗 = 材料成本 × 2.5%（基数：材料成本）；管理费用 =（材料 + 加工）× 8%（基数：材料 + 加工）。',
  '包装物流 = 包装 1.80 + 物流 1.40 + 交付条件附加（出厂价 0 / 送到仓 1.60 / 含安装调试 4.80）。',
  '单位模具摊销 = 模具总额 ÷ 摊销数量；未税单价 = 单位总成本 ÷（1 − 目标毛利率）；含税单价 = 未税单价 ×（1 + 销项税率）。',
  '金额四舍五入到「分」展示，合计由已舍入明细相加；税率和费用参数均为演示假设。',
];

export default function QuoteDemo() {
  const [draft, setDraft] = useState({
    qty: String(DEFAULT_QUOTE_INPUT.qty),
    margin: String(DEFAULT_QUOTE_INPUT.marginPct),
    tax: String(DEFAULT_QUOTE_INPUT.taxPct),
    amort: String(DEFAULT_QUOTE_INPUT.amortQty),
  });
  const [planId, setPlanId] = useState<PurchasePlan['id']>(DEFAULT_QUOTE_INPUT.planId);
  const [deliveryId, setDeliveryId] = useState<DeliveryTerm['id']>(DEFAULT_QUOTE_INPUT.deliveryId);
  const [dataState, setDataState] = useState<DataStateId>(DEFAULT_QUOTE_INPUT.dataState);
  const [nlText, setNlText] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseInquiry> | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [confirmed, setConfirmed] = useState(false);

  const input: QuoteInput = useMemo(
    () => ({
      qty: Math.round(num(draft.qty, 0)),
      marginPct: num(draft.margin, 0),
      taxPct: num(draft.tax, 0),
      planId,
      deliveryId,
      dataState,
      amortQty: Math.round(num(draft.amort, 0)),
    }),
    [draft, planId, deliveryId, dataState],
  );

  const issues = validateQuoteInput(input.qty, input.marginPct, input.taxPct, input.amortQty);
  const stale = !!snap && status !== 'idle' && sig(snap.input) !== sig(input);

  const run = (override?: QuoteInput, nlFields?: string[]) => {
    const target = override ?? input;
    const errs = validateQuoteInput(target.qty, target.marginPct, target.taxPct, target.amortQty);
    if (errs.length > 0) return;
    setStatus('running');
    const result = computeQuote(target);
    const qtySet = Array.from(new Set([...QTY_PRESETS, target.qty])).sort((a, b) => a - b);
    window.setTimeout(() => {
      setSnap({ input: target, result, comparison: compareTiers(target, qtySet), nlFields });
      setConfirmed(false);
      setStatus(result.blocked ? 'partial' : 'done');
    }, 520);
  };

  const reset = () => {
    setDraft({
      qty: String(DEFAULT_QUOTE_INPUT.qty),
      margin: String(DEFAULT_QUOTE_INPUT.marginPct),
      tax: String(DEFAULT_QUOTE_INPUT.taxPct),
      amort: String(DEFAULT_QUOTE_INPUT.amortQty),
    });
    setPlanId(DEFAULT_QUOTE_INPUT.planId);
    setDeliveryId(DEFAULT_QUOTE_INPUT.deliveryId);
    setDataState(DEFAULT_QUOTE_INPUT.dataState);
    setNlText('');
    setParsed(null);
    setSnap(null);
    setConfirmed(false);
    setStatus('idle');
  };

  const loadSample = () => {
    setNlText(SAMPLE_TEXT);
    const p = parseInquiry(SAMPLE_TEXT);
    setParsed(p);
    const qty = p.quantities.values[0] ?? DEFAULT_QUOTE_INPUT.qty;
    const next: QuoteInput = {
      qty,
      marginPct: p.marginPct.value ?? DEFAULT_QUOTE_INPUT.marginPct,
      taxPct: p.taxPct.value ?? DEFAULT_QUOTE_INPUT.taxPct,
      planId: DEFAULT_QUOTE_INPUT.planId,
      deliveryId: DEFAULT_QUOTE_INPUT.deliveryId,
      dataState: 'complete',
      amortQty: DEFAULT_QUOTE_INPUT.amortQty,
    };
    setDraft({
      qty: String(next.qty),
      margin: String(next.marginPct),
      tax: String(next.taxPct),
      amort: String(next.amortQty),
    });
    setPlanId(next.planId);
    setDeliveryId(next.deliveryId);
    setDataState(next.dataState);
    run(next, describeParsed(p));
  };

  const parseNow = () => {
    const p = parseInquiry(nlText);
    setParsed(p);
    if (p.anyHit) {
      const next: QuoteInput = {
        ...input,
        qty: p.quantities.values[0] ?? input.qty,
        marginPct: p.marginPct.value ?? input.marginPct,
        taxPct: p.taxPct.value ?? input.taxPct,
      };
      setDraft({
        qty: String(next.qty),
        margin: String(next.marginPct),
        tax: String(next.taxPct),
        amort: draft.amort,
      });
      run(next, describeParsed(p));
    }
  };

  const res = snap?.result ?? null;
  const canQuote = !!res && !res.blocked;
  const validUntil = addDays(DEMO_TODAY, 30);
  const quoteNo = snap ? `DEMO-Q-${snap.input.qty}-${snap.input.marginPct}` : '';

  const left = (
    <div className="space-y-4">
      <div className="panel px-3 py-2.5">
        <p className="label">产品（演示固定）</p>
        <p className="num mt-1 text-[13px] text-cream">{PRODUCT.code}</p>
        <p className="mt-0.5 text-[12px] text-body">{PRODUCT.name}</p>
        <p className="mt-0.5 text-[11px] text-muted">{PRODUCT.spec}</p>
      </div>

      <div>
        <p className="label mb-2">自然语言输入（有限规则解析）</p>
        <textarea
          rows={3}
          value={nlText}
          onChange={(e) => setNlText(e.target.value)}
          placeholder={SAMPLE_TEXT}
          className="w-full resize-y leading-relaxed"
          aria-describedby="nl-help"
        />
        <p id="nl-help" className="mt-1.5 text-[11px] leading-relaxed text-muted">
          可识别：产品、数量、目标毛利率、税率。识别结果会展示在下方供确认，识别不了会提示用表单补全。
        </p>
        <button
          type="button"
          className="btn-quiet mt-2 px-3 py-1.5 text-[12.5px]"
          onClick={parseNow}
          disabled={!nlText.trim()}
        >
          解析并填入
        </button>
      </div>

      {parsed && <ParsedPanel parsed={parsed} />}

      <div className="hairline pt-4">
        <p className="label mb-3">表单输入</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="数量（台）" hint="正整数">
            <input
              type="number"
              min={1}
              step={1}
              value={draft.qty}
              onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
              className="w-full num"
            />
          </Field>
          <Field label="目标毛利率（%）" hint="< 100">
            <input
              type="number"
              step={0.5}
              value={draft.margin}
              onChange={(e) => setDraft({ ...draft, margin: e.target.value })}
              className="w-full num"
            />
          </Field>
          <Field label="销项税率（%）" hint="演示假设">
            <input
              type="number"
              step={1}
              value={draft.tax}
              onChange={(e) => setDraft({ ...draft, tax: e.target.value })}
              className="w-full num"
            />
          </Field>
          <Field label="模具摊销数量" hint="正整数">
            <input
              type="number"
              min={1}
              step={1}
              value={draft.amort}
              onChange={(e) => setDraft({ ...draft, amort: e.target.value })}
              className="w-full num"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {QTY_PRESETS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setDraft({ ...draft, qty: String(q) })}
              className={`rounded-md border px-2.5 py-1 text-[12px] num transition-colors ${
                num(draft.qty) === q
                  ? 'border-teal/60 bg-teal/10 text-teal'
                  : 'border-line text-body hover:border-line-strong hover:text-cream'
              }`}
            >
              {int(q)}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          <Field label="模拟采购方案">
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value as PurchasePlan['id'])}
              className="w-full"
            >
              {PURCHASE_PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（系数 {p.factor}）
                </option>
              ))}
            </select>
          </Field>
          <p className="-mt-1 text-[11px] leading-relaxed text-muted">
            {PURCHASE_PLANS.find((p) => p.id === planId)?.note}
          </p>

          <Field label="交付条件">
            <select
              value={deliveryId}
              onChange={(e) => setDeliveryId(e.target.value as DeliveryTerm['id'])}
              className="w-full"
            >
              {DELIVERY_TERMS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <p className="label mb-2">示例数据状态</p>
            <div className="grid gap-1.5">
              {DATA_STATES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDataState(d.id)}
                  className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                    dataState === d.id
                      ? 'border-teal/60 bg-teal/[0.07]'
                      : 'border-line hover:border-line-strong'
                  }`}
                >
                  <span className="block text-[12.5px] text-cream">{d.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="rounded-md border border-cat-production/40 bg-cat-production/[0.08] px-3 py-2.5">
          {issues.map((i) => (
            <p key={i.field} className="text-[12px] text-cat-production">
              {i.field}：{i.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );

  const right =
    status === 'idle' ? (
      <IdlePanel />
    ) : status === 'running' ? (
      <RunningPanel />
    ) : res && snap ? (
      <ResultPanel
        snap={snap}
        confirmed={confirmed}
        quoteNo={quoteNo}
        validUntil={addDays(DEMO_TODAY, 30)}
        onConfirm={() => setConfirmed(true)}
        onExport={() => exportJson(snap, quoteNo, addDays(DEMO_TODAY, 30), confirmed)}
        stale={stale}
      />
    ) : null;

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。所有价格、BOM、工时与费率均为匿名化模拟数据，计算在浏览器本地完成，未接入
        ERP 或真实模型服务。
      </DemoNotice>

      <DemoShell
        status={status}
        statusText={res?.statusText}
        stale={stale}
        onRun={() => run()}
        onSample={loadSample}
        onReset={reset}
        runLabel="运行演示"
        left={left}
        right={right}
        basis={res?.basis ?? GENERAL_BASIS}
      />

      {canQuote && confirmed && snap && (
        <PrintSheet snap={snap} quoteNo={quoteNo} validUntil={validUntil} />
      )}
    </div>
  );
}

function describeParsed(p: ReturnType<typeof parseInquiry>): string[] {
  const out: string[] = [];
  if (p.product.value) out.push(`产品：${p.product.value}（匹配词「${p.product.raw}」）`);
  out.push(
    p.quantities.values.length
      ? `数量：${p.quantities.values.map((v) => int(v)).join(' / ')}（匹配词「${p.quantities.raw.join('、')}」）`
      : '数量：未识别',
  );
  out.push(p.marginPct.value !== null ? `目标毛利率：${p.marginPct.value}%` : '目标毛利率：未识别');
  out.push(p.taxPct.value !== null ? `税率：${p.taxPct.value}%` : '税率：未识别（沿用表单值）');
  return out;
}

function ParsedPanel({ parsed }: { parsed: ReturnType<typeof parseInquiry> }) {
  const lines = describeParsed(parsed);
  return (
    <div className="panel px-3 py-3">
      <p className="label mb-2">解析结果（请确认）</p>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l} className="num text-[12px] text-body">
            {l}
          </li>
        ))}
      </ul>
      {parsed.unresolved.length > 0 && (
        <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-cat-production">
          未识别：{parsed.unresolved.join('、')}。请在下方表单中补全后再运行。
        </p>
      )}
      {!parsed.anyHit && (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-cat-production">
          这条输入没有匹配到任何已知字段。本演示只支持有限规则解析，请使用下方表单输入。
        </p>
      )}
    </div>
  );
}

function IdlePanel() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="text-[13.5px] text-cream">尚未运行</p>
      <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
        点击「载入示例」填入一条示例询价，或直接在左侧填写数量、目标毛利与税率后点击「运行演示」。
      </p>
    </div>
  );
}

function RunningPanel() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-teal" />
      <p className="text-[13px] text-body">正在按规则计算：匹配 BOM → 取阶梯价 → 校验有效期 → 汇总成本…</p>
      <p className="mt-1.5 text-[11.5px] text-muted">演示延迟，不是模型调用。</p>
    </div>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12px] text-muted">{k}</span>
      <span className={`num text-[12.5px] ${tone ?? 'text-body'}`}>{v}</span>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`th ${right ? 'text-right' : ''} px-2 py-1.5 font-normal`}>{children}</th>
  );
}

function Td({ children, right, tone }: { children: React.ReactNode; right?: boolean; tone?: string }) {
  return <td className={`td num px-2 py-1.5 ${right ? 'text-right' : ''} ${tone ?? ''}`}>{children}</td>;
}

function ResultPanel({
  snap,
  confirmed,
  quoteNo,
  validUntil,
  onConfirm,
  onExport,
  stale,
}: {
  snap: Snapshot;
  confirmed: boolean;
  quoteNo: string;
  validUntil: Date;
  onConfirm: () => void;
  onExport: () => void;
  stale: boolean;
}) {
  const r = snap.result;
  const i = snap.input;
  const dim = stale ? 'opacity-60' : '';

  return (
    <div className={`space-y-5 ${dim}`}>
      {/* 询价条件 */}
      <section>
        <p className="label mb-2">识别出的询价条件</p>
        <div className="panel grid gap-x-6 px-3 py-2 sm:grid-cols-2">
          <KV k="产品" v={`${PRODUCT.code} ${PRODUCT.name}`} />
          <KV k="数量" v={`${int(i.qty)} 台（阶梯 ${r.tierLabel}）`} />
          <KV k="目标毛利率" v={`${i.marginPct}%`} />
          <KV k="销项税率" v={`${i.taxPct}%（演示假设）`} />
          <KV k="采购方案" v={r.plan.name} />
          <KV k="交付条件" v={r.delivery.name} />
          <KV k="模具摊销" v={`${money(r.toolingTotal)} ÷ ${int(r.amortQty)}`} />
          <KV k="价格基准日" v={`${DEMO_TODAY}（${weekday(DEMO_TODAY)}）`} />
        </div>
      </section>

      {/* 异常 */}
      {r.blocked && (
        <section className="rounded-lg border border-cat-production/40 bg-cat-production/[0.07] px-3.5 py-3">
          <p className="text-[12.5px] text-cat-production">
            {r.missing.length > 0 ? '成本待补全 · ' : '存在待确认价格 · '}
            {r.statusText}
          </p>
          <ul className="mt-2 space-y-1">
            {r.blockReasons.map((b) => (
              <li key={b} className="text-[12px] leading-relaxed text-body">
                · {b}
              </li>
            ))}
          </ul>
          {r.missing.length > 0 && (
            <p className="mt-2 text-[12px] text-body">
              已知成本小计（不含缺价项）：<span className="num text-cream">¥ {money(r.unitCostPartial)}</span> / 台
            </p>
          )}
        </section>
      )}

      {/* 材料明细 */}
      <section>
        <p className="label mb-2">材料明细（未税 · 含采购方案系数 {r.plan.factor}）</p>
        <div className="scrollx rounded-lg border border-line">
          <table className="w-full min-w-[620px] border-collapse">
            <thead className="bg-ink-800/60">
              <tr>
                <Th>物料</Th>
                <Th>名称 / 规格</Th>
                <Th right>用量</Th>
                <Th right>阶梯单价</Th>
                <Th right>金额</Th>
                <Th>来源与有效期</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {r.materials.map((m) => (
                <tr key={m.code}>
                  <td className="px-2 py-1.5 align-top">
                    <span className="num block text-[12px] text-cream">{m.code}</span>
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <span className="block text-[12px] text-body">{m.name}</span>
                    <span className="block text-[10.5px] text-muted">{m.spec}</span>
                  </td>
                  <Td right>
                    {m.qtyPer} {m.unit}
                  </Td>
                  <Td right tone={m.priceState === 'ok' ? '' : 'text-cat-production'}>
                    {m.unitPrice === null ? '待确认' : price(m.unitPrice)}
                  </Td>
                  <Td right tone={m.priceState === 'ok' ? 'text-cream' : 'text-cat-production'}>
                    {m.amount === null ? '待确认' : money(m.amount)}
                  </Td>
                  <td className="px-2 py-1.5 align-top">
                    <span className="block text-[11px] text-muted">{m.source}</span>
                    <span
                      className={`num block text-[11px] ${
                        m.priceState === 'expired'
                          ? 'text-cat-production'
                          : m.priceState === 'missing'
                            ? 'text-cat-production'
                            : 'text-muted'
                      }`}
                    >
                      {m.priceState === 'missing' ? '无有效价格记录' : m.priceLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-ink-800/40">
                <td className="px-2 py-1.5 text-[12px] text-cream" colSpan={4}>
                  材料成本合计
                  {r.missing.length > 0 && (
                    <span className="ml-1.5 text-[11px] text-cat-production">（缺价项未计入）</span>
                  )}
                </td>
                <Td right tone="text-cream">
                  {money(r.materialCost)}
                </Td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 加工明细 + 成本汇总 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <p className="label mb-2">加工明细（工时 × 费率）</p>
          <div className="scrollx rounded-lg border border-line">
            <table className="w-full min-w-[320px] border-collapse">
              <thead className="bg-ink-800/60">
                <tr>
                  <Th>工序</Th>
                  <Th right>工时/台</Th>
                  <Th right>费率</Th>
                  <Th right>金额</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {r.process.map((p) => (
                  <tr key={p.name}>
                    <td className="px-2 py-1.5 text-[12px] text-body">{p.name}</td>
                    <Td right>{p.hoursPerUnit.toFixed(2)}</Td>
                    <Td right>{money(p.rate)}</Td>
                    <Td right tone="text-cream">
                      {money(p.amount)}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-ink-800/40">
                  <td className="px-2 py-1.5 text-[12px] text-cream">加工成本合计</td>
                  <td />
                  <td />
                  <Td right tone="text-cream">
                    {money(r.processCost)}
                  </Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section>
          <p className="label mb-2">单位成本拆解</p>
          <div className="panel divide-y divide-line-soft px-3 py-1">
            <KV k={`材料（${r.materials.length} 项）`} v={money(r.materialCost)} tone="text-cream" />
            <KV k="加工" v={money(r.processCost)} tone="text-cream" />
            <KV
              k={`损耗 ${(ASSUMPTIONS.scrapRate * 100).toFixed(1)}%（基数 材料 ${money(r.scrapBase)}）`}
              v={money(r.scrap)}
              tone="text-cream"
            />
            <KV
              k={`包装物流（包装 ${money(r.packDetail.pack)} + 物流 ${money(r.packDetail.freight)} + 交付 ${money(r.packDetail.delivery)}）`}
              v={money(r.packFreight)}
              tone="text-cream"
            />
            <KV
              k={`管理费用 ${(ASSUMPTIONS.overheadRate * 100).toFixed(1)}%（基数 材料+加工 ${money(r.overheadBase)}）`}
              v={money(r.overhead)}
              tone="text-cream"
            />
            <KV k={`模具摊销（${int(r.amortQty)} 台）`} v={money(r.tooling)} tone="text-cream" />
            <div className="flex items-baseline justify-between gap-3 py-2">
              <span className="text-[12.5px] text-cream">单位总成本</span>
              <span className="num text-[14px] text-teal">
                {r.unitCost === null ? '待补全' : `¥ ${money(r.unitCost)}`}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* 数量阶梯对比 */}
      <section>
        <p className="label mb-2">数量阶梯报价对比</p>
        <div className="scrollx rounded-lg border border-line">
          <table className="w-full min-w-[560px] border-collapse">
            <thead className="bg-ink-800/60">
              <tr>
                <Th>项目</Th>
                {snap.comparison.map((c) => (
                  <Th key={c.qty} right>
                    {int(c.qty)} 台
                    {c.qty === i.qty && <span className="ml-1 text-teal">当前</span>}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              <tr>
                <td className="px-2 py-1.5 text-[12px] text-body">取价阶梯</td>
                {snap.comparison.map((c) => (
                  <Td key={c.qty} right>
                    {c.tierLabel}
                  </Td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-1.5 text-[12px] text-body">材料成本 / 台</td>
                {snap.comparison.map((c) => (
                  <Td key={c.qty} right>
                    {money(c.materialCost)}
                  </Td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-1.5 text-[12px] text-body">单位总成本</td>
                {snap.comparison.map((c) => (
                  <Td key={c.qty} right>
                    {c.unitCost === null ? '待补全' : money(c.unitCost)}
                  </Td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-1.5 text-[12px] text-body">未税单价</td>
                {snap.comparison.map((c) => (
                  <Td key={c.qty} right tone="text-cream">
                    {c.unitPriceExTax === null ? '待补全' : money(c.unitPriceExTax)}
                  </Td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-1.5 text-[12px] text-body">含税单价</td>
                {snap.comparison.map((c) => (
                  <Td key={c.qty} right tone="text-teal">
                    {c.unitPriceTax === null ? '待补全' : money(c.unitPriceTax)}
                  </Td>
                ))}
              </tr>
              <tr className="bg-ink-800/40">
                <td className="px-2 py-1.5 text-[12px] text-cream">订单含税总额</td>
                {snap.comparison.map((c) => (
                  <Td key={c.qty} right tone="text-cream">
                    {c.totalTaxIncl === null ? '待补全' : money(c.totalTaxIncl)}
                  </Td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          各数量档独立取阶梯价，因此单价随档位变化；金额均为未税成本口径推导，非实际成交价。
        </p>
      </section>

      {/* 本次计算说明 */}
      <section>
        <p className="label mb-2">本次计算说明</p>
        <p className="text-[12.5px] leading-relaxed text-body">
          按「{r.tierLabel}」档取价，
          {r.plan.factor === 1 ? '使用现有协议价' : `在协议价基础上应用系数 ${r.plan.factor}`}
          ，材料成本 {money(r.materialCost)} 元；加工 {money(r.processCost)} 元；损耗按材料成本的{' '}
          {(ASSUMPTIONS.scrapRate * 100).toFixed(1)}% 计 {money(r.scrap)} 元；管理费用按材料+加工的{' '}
          {(ASSUMPTIONS.overheadRate * 100).toFixed(1)}% 计 {money(r.overhead)} 元；模具摊销{' '}
          {money(r.tooling)} 元。
          {r.unitCost === null
            ? '因存在缺价，未税单价不出计算结果。'
            : `单位总成本 ${money(r.unitCost)} 元，按目标毛利 ${i.marginPct}% 得未税单价 ${money(r.unitPriceExTax!)} 元，含税单价 ${money(r.unitPriceTax!)} 元。`}
        </p>
        {r.expired.length > 0 && (
          <p className="mt-2 text-[12px] leading-relaxed text-cat-production">
            注意：{r.expired.map((m) => m.code).join('、')} 的报价已过期，上述金额仅为参考，需采购更新价格或书面确认后重算。
          </p>
        )}
      </section>

      {/* 客户版报价预览 / 确认 */}
      <section>
        <p className="label mb-2">客户版报价预览</p>
        {r.unitPriceTax === null ? (
          <div className="rounded-lg border border-dashed border-line px-3.5 py-6 text-center">
            <p className="text-[12.5px] text-cat-production">成本待补全，不能生成正式报价。</p>
            <p className="mt-1 text-[11.5px] text-muted">
              请先由采购补充 {r.missing.map((m) => m.code).join('、')} 的有效价格后重新运行。
            </p>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <span className="text-[12.5px] text-cream">报价单（客户版）</span>
              <span className="num text-[11px] text-muted">
                {quoteNo} · 有效期至 {addDays(DEMO_TODAY, 30).toISOString().slice(0, 10)}
              </span>
            </div>
            <div className="scrollx">
              <table className="w-full min-w-[440px] border-collapse">
                <thead className="bg-ink-800/50">
                  <tr>
                    <Th>产品</Th>
                    <Th right>数量</Th>
                    <Th right>未税单价</Th>
                    <Th right>含税单价</Th>
                    <Th right>含税金额</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-2">
                      <span className="block text-[12.5px] text-cream">{PRODUCT.name}</span>
                      <span className="num block text-[11px] text-muted">{PRODUCT.code}</span>
                    </td>
                    <Td right>{int(i.qty)}</Td>
                    <Td right>{money(r.unitPriceExTax!)}</Td>
                    <Td right>{money(r.unitPriceTax!)}</Td>
                    <Td right tone="text-cream">
                      {money(r.totalTaxIncl!)}
                    </Td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="grid gap-x-6 border-t border-line px-3.5 py-2.5 sm:grid-cols-2">
              <KV k="税口径" v={`含税（销项税率 ${i.taxPct}%）`} />
              <KV k="交付条件" v={r.delivery.name} />
              <KV k="报价有效期" v={`${validUntil.toISOString().slice(0, 10)}（30 天）`} />
              <KV k="币种" v="人民币（CNY）" />
            </div>
            <p className="border-t border-line px-3.5 py-2 text-[11px] text-muted">
              客户版不含材料成本、毛利等内部数据。
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary px-3.5 py-2 text-[12.5px]"
            disabled={!canQuoteNow(r) || confirmed}
            onClick={onConfirm}
            title={r.blocked ? '存在缺价或过期价格，需先处理' : ''}
          >
            {confirmed ? '已确认（模拟）' : '模拟负责人确认'}
          </button>
          <button type="button" className="btn-ghost px-3.5 py-2 text-[12.5px]" onClick={onExport}>
            导出报价数据 JSON
          </button>
          <button
            type="button"
            className="btn-ghost px-3.5 py-2 text-[12.5px]"
            disabled={!confirmed}
            onClick={() => window.print()}
          >
            打印 / 存为 PDF
          </button>
          {r.blocked && (
            <span className="text-[11.5px] text-cat-production">
              存在待确认项，确认与出单已锁定
            </span>
          )}
        </div>
        {confirmed && (
          <p className="mt-2.5 text-[12px] text-teal">
            已生成演示报价单 {quoteNo}，可打印或导出。这是模拟确认，不产生任何对外文件。
          </p>
        )}
      </section>
    </div>
  );
}

function canQuoteNow(r: QuoteResult) {
  return !r.blocked && r.unitPriceTax !== null;
}

function exportJson(snap: Snapshot, quoteNo: string, validUntil: Date, confirmed: boolean) {
  const r = snap.result;
  const payload = {
    _声明: '本文件由「FDE 场景实验室」生成，全部为模拟数据演示，不代表真实报价，不得对外发出。',
    _生成时间: new Date().toISOString(),
    _数据基准日: DEMO_TODAY,
    报价单号: quoteNo,
    状态: confirmed ? '已模拟确认' : '草稿（未确认）',
    产品: { 编号: PRODUCT.code, 名称: PRODUCT.name, 规格: PRODUCT.spec },
    询价条件: {
      数量: snap.input.qty,
      目标毛利率百分比: snap.input.marginPct,
      销项税率百分比: snap.input.taxPct,
      采购方案: r.plan.name,
      交付条件: r.delivery.name,
      模具摊销数量: r.amortQty,
      取价阶梯: r.tierLabel,
    },
    单位成本拆解: {
      材料: r.materialCost,
      加工: r.processCost,
      损耗: r.scrap,
      包装物流: r.packFreight,
      管理费用: r.overhead,
      模具摊销: r.tooling,
      单位总成本: r.unitCost,
    },
    单价: {
      未税单价: r.unitPriceExTax,
      含税单价: r.unitPriceTax,
      订单未税金额: r.totalExTax,
      税额: r.taxAmount,
      订单含税金额: r.totalTaxIncl,
    },
    材料明细: r.materials.map((m) => ({
      物料号: m.code,
      名称: m.name,
      规格: m.spec,
      单台用量: m.qtyPer,
      单位: m.unit,
      阶梯未税单价: m.unitPrice,
      金额: m.amount,
      价格来源: m.source,
      有效期: `${m.validFrom} ~ ${m.validTo}`,
      价格状态: m.priceState,
    })),
    加工明细: r.process,
    数量阶梯对比: snap.comparison.map((c) => ({
      数量: c.qty,
      取价阶梯: c.tierLabel,
      材料成本: c.materialCost,
      单位总成本: c.unitCost,
      未税单价: c.unitPriceExTax,
      含税单价: c.unitPriceTax,
      订单含税金额: c.totalTaxIncl,
    })),
    待确认事项: r.blockReasons,
    有效期至: validUntil.toISOString().slice(0, 10),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quoteNo || 'DEMO-Q'}-模拟报价数据.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PrintSheet({ snap, quoteNo, validUntil }: { snap: Snapshot; quoteNo: string; validUntil: Date }) {
  const r = snap.result;
  const d = validUntil.toISOString().slice(0, 10);
  return (
    <div className="print-area bg-white px-8 py-8 text-[12px] text-black">
      <div className="mb-6 flex items-start justify-between border-b border-black pb-3">
        <div>
          <p className="text-[16px] font-semibold">产品报价单（演示）</p>
          <p className="mt-1 text-[11px]">
            FDE 场景实验室 · 模拟数据演示 · 单号 {quoteNo}
          </p>
        </div>
        <div className="text-right text-[11px]">
          <p>报价日期：{DEMO_TODAY}</p>
          <p>有效期至：{d}</p>
        </div>
      </div>

      <table className="mb-6 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-neutral-300 px-2 py-1.5 text-left">产品编号</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-left">产品名称</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right">数量</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right">未税单价</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right">含税单价</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right">含税金额</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-neutral-300 px-2 py-1.5">{PRODUCT.code}</td>
            <td className="border border-neutral-300 px-2 py-1.5">{PRODUCT.name}</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right">{int(snap.input.qty)}</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right">{money(r.unitPriceExTax!)}</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right">{money(r.unitPriceTax!)}</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right">{money(r.totalTaxIncl!)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
        <p>税口径：含税（销项税率 {snap.input.taxPct}%）</p>
        <p>交付条件：{r.delivery.name}</p>
        <p>币种：人民币（CNY）</p>
        <p>报价有效期：{d}（30 天）</p>
      </div>

      <p className="mb-3 text-[13px] font-semibold">内部成本拆解（不随报价单发出）</p>
      <table className="mb-6 w-full border-collapse text-[12px]">
        <tbody>
          {[
            ['材料成本', r.materialCost],
            ['加工成本', r.processCost],
            ['损耗', r.scrap],
            ['包装物流', r.packFreight],
            ['管理费用', r.overhead],
            ['模具摊销', r.tooling],
            ['单位总成本', r.unitCost ?? 0],
          ].map(([k, v]) => (
            <tr key={k as string}>
              <td className="border border-neutral-300 px-2 py-1">{k as string}</td>
              <td className="border border-neutral-300 px-2 py-1 text-right">{money(v as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 border-t border-neutral-300 pt-3 text-[10.5px] leading-relaxed text-neutral-700">
        本报价单由「FDE 场景实验室」生成，用于流程演示。所有产品、BOM、价格、工时、税率与费用参数均为匿名化模拟数据，
        未连接任何 ERP、MES 或供应商系统，不构成任何要约或承诺，不得对外发出。
      </p>
    </div>
  );
}

/** 供详情页面复用的示例句 */
export { SAMPLE_TEXT };
