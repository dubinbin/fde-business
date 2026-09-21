import { useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Pill } from '../components/ui';
import { int, money, num, price, round } from '../lib/money';

interface BomRow {
  key: string;
  code: string;
  name: string;
  spec: string;
  qty: string;
  /** 空字符串表示缺价 */
  price: string;
}

let seq = 0;

const OLD_DEFAULT: BomRow[] = [
  row('PCB-A1', '主控 PCB 板', 'FR-4 双层 120×90mm', '1', '16.80'),
  row('IC-MCU-01', '主控 MCU', '32位 MCU 64KB', '1', '39.80'),
  row('RLY-16A', '功率继电器', '16A 250VAC', '3', '11.60'),
  row('CAP-470U', '铝电解电容', '470µF 25V 105℃', '4', '2.10'),
  row('RES-10K', '贴片电阻', '10KΩ ±1% 0603', '12', '0.080'),
  row('CONN-4P', '接插件', '4P 2.54mm', '2', '2.40'),
  row('SCR-M3', '不锈钢螺钉', 'M3×8', '4', '0.110'),
];

const NEW_DEFAULT: BomRow[] = [
  row('PCB-A1', '主控 PCB 板', 'FR-4 双层 120×90mm', '1', '16.80'),
  row('IC-MCU-01', '主控 MCU', '32位 MCU 64KB', '1', '38.90'),
  row('RLY-16A', '功率继电器', '16A 250VAC', '4', '11.60'),
  row('CAP-470U', '铝电解电容', '470µF 25V 125℃', '4', '2.85'),
  row('RES-10K', '贴片电阻', '10KΩ ±1% 0603', '12', '0.080'),
  row('SCR-M3', '不锈钢螺钉', 'M3×8', '4', '0.110'),
  row('IC-DRV-02', '驱动 IC', '继电器驱动 4 通道', '1', ''),
  row('HS-AL-01', '铝散热片', '型材 45×25×12mm', '1', '6.20'),
];

function row(code: string, name: string, spec: string, qty: string, price: string): BomRow {
  seq += 1;
  return { key: `r${seq}`, code, name, spec, qty, price };
}

type ChangeKind = 'same' | 'added' | 'removed' | 'qty' | 'spec' | 'price' | 'mixed';

interface DiffRow {
  code: string;
  name: string;
  kind: ChangeKind;
  label: string;
  oldQty: number | null;
  newQty: number | null;
  oldPrice: number | null;
  newPrice: number | null;
  oldSpec: string;
  newSpec: string;
  /** 已知影响金额（元/台）；null = 待确认 */
  impact: number | null;
  note: string;
}

function amountOf(qty: string, p: string): number | null {
  if (p.trim() === '') return null;
  const q = num(qty, 0);
  return round(q * num(p, 0), 2);
}

function buildDiff(oldRows: BomRow[], newRows: BomRow[]): DiffRow[] {
  const out: DiffRow[] = [];
  const oldMap = new Map(oldRows.map((r) => [r.code, r]));
  const newMap = new Map(newRows.map((r) => [r.code, r]));

  for (const n of newRows) {
    const o = oldMap.get(n.code);
    if (!o) {
      const impact = amountOf(n.qty, n.price);
      out.push({
        code: n.code,
        name: n.name,
        kind: 'added',
        label: '新增',
        oldQty: null,
        newQty: num(n.qty, 0),
        oldPrice: null,
        newPrice: n.price.trim() === '' ? null : num(n.price, 0),
        oldSpec: '',
        newSpec: n.spec,
        impact,
        note: impact === null ? '新增项无价格，需采购补充' : '新增项',
      });
      continue;
    }
    const oq = num(o.qty, 0);
    const nq = num(n.qty, 0);
    const op = o.price.trim() === '' ? null : num(o.price, 0);
    const np = n.price.trim() === '' ? null : num(n.price, 0);
    const qtyChanged = oq !== nq;
    const specChanged = o.spec.trim() !== n.spec.trim();
    const priceChanged = op !== np;

    let kind: ChangeKind = 'same';
    const labels: string[] = [];
    if (qtyChanged) {
      kind = 'qty';
      labels.push(`用量 ${oq} → ${nq}`);
    }
    if (specChanged) {
      kind = kind === 'same' ? 'spec' : 'mixed';
      labels.push('规格变化');
    }
    if (priceChanged) {
      kind = kind === 'same' ? 'price' : kind === 'qty' || kind === 'spec' ? 'mixed' : kind;
      labels.push(
        `单价 ${op === null ? '待确认' : price(op)} → ${np === null ? '待确认' : price(np)}`,
      );
    }

    const oldAmt = amountOf(o.qty, o.price);
    const newAmt = amountOf(n.qty, n.price);
    let impact: number | null = null;
    if (oldAmt !== null && newAmt !== null) impact = round(newAmt - oldAmt, 2);
    else if (oldAmt === null && newAmt === null) impact = null;

    out.push({
      code: n.code,
      name: n.name,
      kind,
      label: kind === 'same' ? '无变化' : labels.join(' · '),
      oldQty: oq,
      newQty: nq,
      oldPrice: op,
      newPrice: np,
      oldSpec: o.spec,
      newSpec: n.spec,
      impact: kind === 'same' ? 0 : impact,
      note:
        impact === null
          ? '存在缺价，影响金额待确认'
          : kind === 'same'
            ? ''
            : '影响金额 = 新版金额 − 旧版金额',
    });
  }

  for (const o of oldRows) {
    if (!newMap.has(o.code)) {
      const impact = amountOf(o.qty, o.price);
      out.push({
        code: o.code,
        name: o.name,
        kind: 'removed',
        label: '删除',
        oldQty: num(o.qty, 0),
        newQty: null,
        oldPrice: o.price.trim() === '' ? null : num(o.price, 0),
        newPrice: null,
        oldSpec: o.spec,
        newSpec: '',
        impact: impact === null ? null : round(-impact, 2),
        note: impact === null ? '删除项无价格，影响待确认' : '删除项，成本减少',
      });
    }
  }
  return out;
}

const KIND_COLOR: Record<ChangeKind, string> = {
  same: '#8A948F',
  added: '#3FD6B0',
  removed: '#C9786B',
  qty: '#E0A23C',
  spec: '#A98BE0',
  price: '#5A9BD8',
  mixed: '#E0A23C',
};

export default function BomDiffDemo() {
  const [oldRows, setOldRows] = useState(OLD_DEFAULT);
  const [newRows, setNewRows] = useState(NEW_DEFAULT);
  const [tab, setTab] = useState<'old' | 'new'>('new');
  const [snap, setSnap] = useState<{ diff: DiffRow[]; known: number; missing: DiffRow[] } | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [sig, setSig] = useState('');

  const rows = tab === 'old' ? oldRows : newRows;
  const setRows = tab === 'old' ? setOldRows : setNewRows;

  const update = (key: string, field: 'qty' | 'price' | 'spec', value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const remove = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const add = () =>
    setRows((prev) => [
      ...prev,
      row(`NEW-${prev.length + 1}`, '新增物料', '待填规格', '1', ''),
    ]);

  const currentSig = JSON.stringify([oldRows, newRows]);

  const run = () => {
    setStatus('running');
    const diff = buildDiff(oldRows, newRows);
    const known = round(
      diff.reduce((s, d) => s + (d.impact ?? 0), 0),
      2,
    );
    const missing = diff.filter((d) => d.impact === null);
    window.setTimeout(() => {
      setSnap({ diff, known, missing });
      setSig(currentSig);
      setStatus(missing.length > 0 ? 'partial' : 'done');
    }, 460);
  };

  const reset = () => {
    setOldRows(OLD_DEFAULT);
    setNewRows(NEW_DEFAULT);
    setTab('new');
    setSnap(null);
    setSig('');
    setStatus('idle');
  };

  const loadSample = () => {
    setOldRows(OLD_DEFAULT);
    setNewRows(NEW_DEFAULT);
    setStatus('running');
    const diff = buildDiff(OLD_DEFAULT, NEW_DEFAULT);
    const known = round(
      diff.reduce((s, d) => s + (d.impact ?? 0), 0),
      2,
    );
    const missing = diff.filter((d) => d.impact === null);
    window.setTimeout(() => {
      setSnap({ diff, known, missing });
      setSig(JSON.stringify([OLD_DEFAULT, NEW_DEFAULT]));
      setStatus(missing.length > 0 ? 'partial' : 'done');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && currentSig !== sig;

  const left = (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {([
          ['old', '旧版 BOM v1.2'],
          ['new', '新版 BOM v1.3'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-md border px-2.5 py-1.5 text-[12px] transition-colors ${
              tab === k
                ? 'border-teal/60 bg-teal/10 text-teal'
                : 'border-line text-body hover:border-line-strong'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        可编辑当前版本的用量、单价与规格；单价留空表示缺价。删除或新增行会直接体现在差异结果中。
      </p>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="num text-[11.5px] text-cream">{r.code}</span>
              <button
                type="button"
                onClick={() => remove(r.key)}
                className="rounded px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:text-cat-production"
                aria-label={`删除 ${r.code}`}
              >
                删除
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">{r.name}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <input
                value={r.spec}
                onChange={(e) => update(r.key, 'spec', e.target.value)}
                className="col-span-3 px-2 py-1 text-[11.5px]"
                aria-label={`${r.code} 规格`}
              />
              <label className="block">
                <span className="label">用量</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={r.qty}
                  onChange={(e) => update(r.key, 'qty', e.target.value)}
                  className="num w-full px-2 py-1 text-[11.5px]"
                />
              </label>
              <label className="col-span-2 block">
                <span className="label">未税单价（留空 = 缺价）</span>
                <input
                  type="number"
                  step="0.01"
                  value={r.price}
                  onChange={(e) => update(r.key, 'price', e.target.value)}
                  className="num w-full px-2 py-1 text-[11.5px]"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-quiet w-full px-3 py-1.5 text-[12.5px]" onClick={add}>
        + 新增物料行
      </button>
    </div>
  );

  const right =
    status === 'idle' ? (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
        <p className="text-[13.5px] text-cream">尚未运行</p>
        <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
          点击「载入示例」载入两版预置 BOM，或直接在左侧修改后「运行演示」。
        </p>
      </div>
    ) : status === 'running' || !snap ? (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
        <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-teal" />
        <p className="text-[13px] text-body">正在按物料号对齐两版 BOM，比较用量、规格与单价…</p>
      </div>
    ) : (
      <div className={`space-y-5 ${stale ? 'opacity-60' : ''}`}>
        <section className="flex flex-wrap items-center gap-3">
          <div className="panel px-3.5 py-2.5">
            <p className="label">已知成本差异（元/台）</p>
            <p className={`num mt-1 text-[18px] ${snap.known >= 0 ? 'text-cat-production' : 'text-teal'}`}>
              {snap.known >= 0 ? '+' : ''}
              {money(snap.known)}
            </p>
          </div>
          <div className="panel px-3.5 py-2.5">
            <p className="label">变更项</p>
            <p className="num mt-1 text-[18px] text-cream">
              {snap.diff.filter((d) => d.kind !== 'same').length}
              <span className="ml-1 text-[12px] text-muted">
                / 共 {snap.diff.length} 行
              </span>
            </p>
          </div>
          {snap.missing.length > 0 && (
            <Pill color="#E0A23C" variant="soft">
              {snap.missing.length} 项待确认
            </Pill>
          )}
        </section>

        <section>
          <p className="label mb-2">差异表</p>
          <div className="scrollx rounded-lg border border-line">
            <table className="w-full min-w-[700px] border-collapse">
              <thead className="bg-ink-800/60">
                <tr>
                  <th className="th px-2 py-1.5">物料</th>
                  <th className="th px-2 py-1.5">变化</th>
                  <th className="th px-2 py-1.5 text-right">旧用量</th>
                  <th className="th px-2 py-1.5 text-right">新用量</th>
                  <th className="th px-2 py-1.5 text-right">旧单价</th>
                  <th className="th px-2 py-1.5 text-right">新单价</th>
                  <th className="th px-2 py-1.5 text-right">影响金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {snap.diff.map((d) => (
                  <tr key={`${d.code}-${d.kind}`}>
                    <td className="px-2 py-1.5">
                      <span className="num block text-[12px] text-cream">{d.code}</span>
                      <span className="block text-[10.5px] text-muted">{d.name}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className="inline-block rounded border px-1.5 py-[1px] text-[10.5px]"
                        style={{ color: KIND_COLOR[d.kind], borderColor: `${KIND_COLOR[d.kind]}66` }}
                      >
                        {d.kind === 'same' ? '无变化' : d.kind === 'added' ? '新增' : d.kind === 'removed' ? '删除' : '变化'}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-body">{d.label}</span>
                    </td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">
                      {d.oldQty === null ? '—' : int(d.oldQty)}
                    </td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">
                      {d.newQty === null ? '—' : int(d.newQty)}
                    </td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">
                      {d.oldPrice === null ? '缺价' : price(d.oldPrice)}
                    </td>
                    <td className="num px-2 py-1.5 text-right text-[12px] text-body">
                      {d.newPrice === null ? '缺价' : price(d.newPrice)}
                    </td>
                    <td
                      className={`num px-2 py-1.5 text-right text-[12.5px] ${
                        d.impact === null
                          ? 'text-cat-production'
                          : d.impact > 0
                            ? 'text-cat-production'
                            : d.impact < 0
                              ? 'text-teal'
                              : 'text-muted'
                      }`}
                    >
                      {d.impact === null
                        ? '待确认'
                        : d.impact === 0
                          ? '—'
                          : `${d.impact > 0 ? '+' : ''}${money(d.impact)}`}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line bg-ink-800/40">
                  <td className="px-2 py-1.5 text-[12px] text-cream" colSpan={6}>
                    已知影响合计
                  </td>
                  <td className="num px-2 py-1.5 text-right text-[13px] text-cream">
                    {snap.known >= 0 ? '+' : ''}
                    {money(snap.known)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {snap.missing.length > 0 && (
          <section className="rounded-lg border border-cat-production/40 bg-cat-production/[0.07] px-3.5 py-3">
            <p className="text-[12.5px] text-cat-production">缺失价格清单（不按 0 计入）</p>
            <ul className="mt-2 space-y-1">
              {snap.missing.map((m) => (
                <li key={m.code} className="text-[12px] text-body">
                  · <span className="num">{m.code}</span> {m.name}：{m.note}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="label mb-2">待工程确认项</p>
          <ul className="space-y-1.5">
            {snap.diff
              .filter((d) => d.kind === 'added' || d.kind === 'removed' || d.kind === 'spec' || d.impact === null)
              .map((d) => (
                <li key={`c-${d.code}`} className="flex gap-2 text-[12px] leading-relaxed text-body">
                  <span className="text-teal/70" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {d.kind === 'added' && `${d.code} 为新增项：是否为预期新增？`}
                    {d.kind === 'removed' && `${d.code} 被删除：是否为预期取消？库存与在制如何处理？`}
                    {d.kind === 'spec' &&
                      `${d.code} 规格由「${d.oldSpec}」变为「${d.newSpec}」：是否构成实质变更，需要重新验证？`}
                    {d.kind !== 'added' && d.kind !== 'removed' && d.kind !== 'spec' && d.impact === null &&
                      `${d.code} 缺价：请采购补充有效价格后再评估成本影响。`}
                  </span>
                </li>
              ))}
            {snap.diff.every(
              (d) => d.kind !== 'added' && d.kind !== 'removed' && d.kind !== 'spec' && d.impact !== null,
            ) && <li className="text-[12px] text-muted">· 无需要工程确认的变更项。</li>}
          </ul>
        </section>
      </div>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。两版 BOM 与价格均为匿名化模拟数据；缺价项一律显示「待确认」，不会按 0 参与计算。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={
          snap ? (snap.missing.length ? `${snap.missing.length} 项缺价待确认` : '差异已计算') : undefined
        }
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          '对齐口径：以物料号为准；同一物料号出现在一版中即为变更项，仅出现在新版为新增，仅出现在旧版为删除。',
          '单项金额 = 用量 × 未税单价；缺价（单价留空）时金额记为待确认，不按 0 参与。',
          '影响金额 = 新版单项金额 − 旧版单项金额；两侧都有价格时才计算。',
          '已知影响合计 = 所有已确定影响金额之和；缺价项不计入，因此合计是「已知部分」的下限。',
          '规格变化单独标记，由工程判断是否构成实质变更。',
        ]}
      />
    </div>
  );
}
