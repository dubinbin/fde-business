import { useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Field, Pill } from '../components/ui';
import { int, money, num, round } from '../lib/money';
import { IdleCard, NoteList, RunningCard, TableWrap, Td, Th } from './common';

const DEFAULTS = {
  qty: '5000',
  price: '137.65',
  qMat: '90.00',
  qProc: '23.35',
  qScrap: '2.25',
  qLogi: '1.40',
  matUp: '5.67',
  hourUp: '9.60',
  scrapQty: '52',
  aLogi: '1.70',
};

interface Snapshot {
  qty: number;
  price: number;
  quoted: { mat: number; proc: number; scrap: number; logi: number; total: number };
  actual: { mat: number; proc: number; scrap: number; logi: number; total: number };
  diff: { mat: number; proc: number; scrap: number; logi: number; total: number };
  scrapPerUnit: number;
  quotedGross: number;
  actualGross: number;
  quotedMargin: number;
  actualMargin: number;
}

function build(d: typeof DEFAULTS): Snapshot {
  const qty = Math.max(1, Math.round(num(d.qty)));
  const price = round(num(d.price), 2);
  const qMat = round(num(d.qMat), 2);
  const qProc = round(num(d.qProc), 2);
  const qScrap = round(num(d.qScrap), 2);
  const qLogi = round(num(d.qLogi), 2);
  const quotedTotal = round(qMat + qProc + qScrap + qLogi, 2);

  const aMat = round(qMat * (1 + num(d.matUp) / 100), 2);
  const aProc = round(qProc * (1 + num(d.hourUp) / 100), 2);
  const scrapPerUnit = round((Math.max(0, Math.round(num(d.scrapQty))) * aMat) / qty, 2);
  const aScrap = round(qScrap + scrapPerUnit, 2);
  const aLogi = round(num(d.aLogi), 2);
  const actualTotal = round(aMat + aProc + aScrap + aLogi, 2);

  const diff = {
    mat: round(aMat - qMat, 2),
    proc: round(aProc - qProc, 2),
    scrap: round(aScrap - qScrap, 2),
    logi: round(aLogi - qLogi, 2),
    total: 0,
  };
  diff.total = round(diff.mat + diff.proc + diff.scrap + diff.logi, 2);

  const quotedGross = round(price - quotedTotal, 2);
  const actualGross = round(price - actualTotal, 2);
  return {
    qty,
    price,
    quoted: { mat: qMat, proc: qProc, scrap: qScrap, logi: qLogi, total: quotedTotal },
    actual: { mat: aMat, proc: aProc, scrap: aScrap, logi: aLogi, total: actualTotal },
    diff,
    scrapPerUnit,
    quotedGross,
    actualGross,
    quotedMargin: round((quotedGross / price) * 100, 2),
    actualMargin: round((actualGross / price) * 100, 2),
  };
}

export default function CostReviewDemo() {
  const [draft, setDraft] = useState(DEFAULTS);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [sig, setSig] = useState('');

  const set = (k: keyof typeof DEFAULTS, v: string) => setDraft((p) => ({ ...p, [k]: v }));
  const currentSig = JSON.stringify(draft);
  const qty = Math.max(1, Math.round(num(draft.qty)));
  const valid = qty > 0 && Number.isInteger(qty);

  const run = () => {
    if (!valid) return;
    setStatus('running');
    const s = build(draft);
    window.setTimeout(() => {
      setSnap(s);
      setSig(currentSig);
      setStatus('done');
    }, 440);
  };

  const reset = () => {
    setDraft(DEFAULTS);
    setSnap(null);
    setSig('');
    setStatus('idle');
  };

  const loadSample = () => {
    setDraft(DEFAULTS);
    setStatus('running');
    const s = build(DEFAULTS);
    window.setTimeout(() => {
      setSnap(s);
      setSig(JSON.stringify(DEFAULTS));
      setStatus('done');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && currentSig !== sig;

  const numField = (k: keyof typeof DEFAULTS, label: string, step = '0.01') => (
    <Field label={label}>
      <input
        type="number"
        step={step}
        value={draft[k]}
        onChange={(e) => set(k, e.target.value)}
        className="w-full num"
      />
    </Field>
  );

  const left = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {numField('qty', '订单数量（台）', '1')}
        {numField('price', '报价未税单价')}
      </div>

      <div>
        <p className="label mb-2">报价口径（单位成本，元/台）</p>
        <div className="grid grid-cols-2 gap-3">
          {numField('qMat', '材料')}
          {numField('qProc', '加工')}
          {numField('qScrap', '损耗')}
          {numField('qLogi', '物流')}
        </div>
      </div>

      <div className="hairline pt-4">
        <p className="label mb-2">实际口径（同一订单，同一数量）</p>
        <div className="grid grid-cols-2 gap-3">
          {numField('matUp', '实际采购价上浮 %', '0.01')}
          {numField('hourUp', '实际工时超耗 %', '0.01')}
          {numField('scrapQty', '报废数量（件）', '1')}
          {numField('aLogi', '实际物流（元/台）')}
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted">
        实际材料 = 报价材料 ×（1 + 采购价上浮）；实际加工 = 报价加工 ×（1 + 工时超耗）；单位报废 = 报废数量 × 实际材料 ÷ 订单数量，计入损耗。
      </p>
      {!valid && <p className="text-[12px] text-cat-production">订单数量需为正整数。</p>}
    </div>
  );

  const right =
    status === 'idle' ? (
      <IdleCard text="点击「载入示例」载入一张已交付订单的复盘样例，或修改左侧参数后「运行演示」。" />
    ) : status === 'running' || !snap ? (
      <RunningCard text="正在对齐数量与成本口径，按材料、加工、损耗、物流归因…" />
    ) : (
      <div className={`space-y-5 ${stale ? 'opacity-60' : ''}`}>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="panel px-3.5 py-2.5">
            <p className="label">单位成本总差异</p>
            <p className="num mt-1 text-[16px] text-cat-production">+{money(snap.diff.total)}</p>
          </div>
          <div className="panel px-3.5 py-2.5">
            <p className="label">订单总差异</p>
            <p className="num mt-1 text-[16px] text-cat-production">
              +{money(round(snap.diff.total * snap.qty, 2))}
            </p>
          </div>
          <div className="panel px-3.5 py-2.5">
            <p className="label">毛利率变化</p>
            <p className="num mt-1 text-[16px] text-cat-production">
              {money(snap.quotedMargin)}% → {money(snap.actualMargin)}%
            </p>
          </div>
        </section>

        <section>
          <p className="label mb-2">成本差异与归因</p>
          <TableWrap min={620}>
            <thead className="bg-ink-800/60">
              <tr>
                <Th>维度</Th>
                <Th right>报价</Th>
                <Th right>实际</Th>
                <Th right>差异</Th>
                <Th>归因说明</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {(
                [
                  ['材料', snap.quoted.mat, snap.actual.mat, snap.diff.mat, '实际采购价高于报价时使用的价格'],
                  ['加工', snap.quoted.proc, snap.actual.proc, snap.diff.proc, '实际工时超出报价定额'],
                  [
                    '损耗',
                    snap.quoted.scrap,
                    snap.actual.scrap,
                    snap.diff.scrap,
                    `报废带来的单位损耗 ${money(snap.scrapPerUnit)}`,
                  ],
                  ['物流', snap.quoted.logi, snap.actual.logi, snap.diff.logi, '实际物流方式与费用不同'],
                ] as const
              ).map(([name, q, a, d, note]) => (
                <tr key={name}>
                  <td className="px-2 py-1.5 text-[12.5px] text-cream">{name}</td>
                  <Td right>{money(q)}</Td>
                  <Td right>{money(a)}</Td>
                  <Td right tone={d > 0 ? 'text-cat-production' : d < 0 ? 'text-teal' : 'text-muted'}>
                    {d > 0 ? '+' : ''}
                    {money(d)}
                  </Td>
                  <td className="px-2 py-1.5 text-[11.5px] text-body">{note}</td>
                </tr>
              ))}
              <tr className="border-t border-line bg-ink-800/40">
                <td className="px-2 py-1.5 text-[12.5px] text-cream">合计</td>
                <Td right tone="text-cream">
                  {money(snap.quoted.total)}
                </Td>
                <Td right tone="text-cream">
                  {money(snap.actual.total)}
                </Td>
                <Td right tone="text-cat-production">
                  +{money(snap.diff.total)}
                </Td>
                <td className="px-2 py-1.5 text-[11.5px] text-muted">各维度差异之和 = 总差异</td>
              </tr>
            </tbody>
          </TableWrap>
          <p className="num mt-1.5 text-[11px] text-muted">
            校验：{money(snap.diff.mat)} + {money(snap.diff.proc)} + {money(snap.diff.scrap)} +{' '}
            {money(snap.diff.logi)} = {money(snap.diff.total)}（等于 {money(snap.actual.total)} −{' '}
            {money(snap.quoted.total)}）
          </p>
        </section>

        <section className="panel px-3.5 py-2">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <p className="num text-[12px] text-body">
              报价单位毛利：<span className="text-cream">¥ {money(snap.quotedGross)}</span>
            </p>
            <p className="num text-[12px] text-body">
              实际单位毛利：<span className="text-cream">¥ {money(snap.actualGross)}</span>
            </p>
            <p className="num text-[12px] text-body">
              报价未税单价：<span className="text-cream">¥ {money(snap.price)}</span>
            </p>
            <p className="num text-[12px] text-body">
              订单数量：<span className="text-cream">{int(snap.qty)} 台</span>
            </p>
          </div>
        </section>

        <section>
          <p className="label mb-2">需要更新的报价参数</p>
          <NoteList
            items={[
              snap.diff.mat > 0
                ? `材料基准价：按实际上浮 ${money(num(draft.matUp))}% 复核报价材料单价（当前差异 ${money(snap.diff.mat)} 元/台）`
                : '材料基准价：本次无上浮，暂不需调整',
              snap.diff.proc > 0
                ? `工时定额：按实际超耗 ${money(num(draft.hourUp))}% 更新工序工时（当前差异 ${money(snap.diff.proc)} 元/台）`
                : '工时定额：本次无超耗，暂不需调整',
              snap.diff.scrap > 0
                ? `损耗参数：将报废 ${int(num(draft.scrapQty))} 件计入损耗率（当前差异 ${money(snap.diff.scrap)} 元/台）`
                : '损耗参数：本次无额外报废',
              snap.diff.logi > 0
                ? `物流口径：确认报价是否应包含本次实际物流方式（当前差异 ${money(snap.diff.logi)} 元/台）`
                : '物流口径：与报价一致',
            ]}
          />
        </section>

        <div className="flex flex-wrap gap-2">
          <Pill color="#E0A23C" variant="soft">
            最大归因：材料 {money(snap.diff.mat)}
          </Pill>
          <Pill>归因项数 4</Pill>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。该订单与成本数据均为匿名化模拟数据；各维度归因之和严格等于总差异，不做分摊余数。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={snap ? `总差异 +${money(snap.diff.total)} 元/台` : undefined}
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          '口径对齐：报价与实际使用同一订单数量与同一成本范围（材料 / 加工 / 损耗 / 物流），不含税费差异。',
          '实际材料 = 报价材料 ×（1 + 采购价上浮%）；实际加工 = 报价加工 ×（1 + 工时超耗%）。',
          '单位报废 = 报废数量 × 实际材料 ÷ 订单数量，计入实际损耗。',
          '差异（每维度）= 实际 − 报价；总差异 = 各维度差异之和，因此归因金额严格对得上。',
          '毛利变化 = 报价未税单价 − 实际单位成本 与 报价未税单价 − 报价单位成本 之差。',
          '本演示未处理返工人工、模具追加、汇率等维度，实际复盘需由成本会计确认口径。',
        ]}
      />
    </div>
  );
}
