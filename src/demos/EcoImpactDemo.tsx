import { useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Field, Pill } from '../components/ui';
import { int, money, num, round } from '../lib/money';
import { IdleCard, NoteList, RunningCard, TableWrap, Td, Th } from './common';

interface AffectedBom {
  code: string;
  name: string;
  usage: number;
  wip: number;
  open: number;
}

interface Alternate {
  code: string;
  name: string;
  status: string;
  priceDiff: number;
  note: string;
}

interface Material {
  code: string;
  name: string;
  unitPrice: number;
  stock: number;
  boms: AffectedBom[];
  alternates: Alternate[];
}

const MATERIALS: Record<string, Material> = {
  'IC-MCU-01': {
    code: 'IC-MCU-01',
    name: '主控 MCU 32位 64KB',
    unitPrice: 39.8,
    stock: 4800,
    boms: [
      { code: 'CTRL-001', name: '空调室外机电子控制器', usage: 1, wip: 800, open: 2000 },
      { code: 'CTRL-004', name: '商用机组控制器', usage: 1, wip: 400, open: 600 },
      { code: 'CTRL-002', name: '风机驱动控制器', usage: 1, wip: 0, open: 400 },
    ],
    alternates: [
      {
        code: 'IC-MCU-02',
        name: '替代 MCU（同封装，128KB）',
        status: '候选 · 待工程验证',
        priceDiff: 2.4,
        note: '需验证 Flash 容量、上电时序与烧录工具链兼容性',
      },
      {
        code: 'IC-MCU-07',
        name: '替代 MCU（另一品牌）',
        status: '候选 · 待工程验证',
        priceDiff: -1.2,
        note: '需确认供货周期与长期供货承诺',
      },
    ],
  },
  'RLY-16A': {
    code: 'RLY-16A',
    name: '功率继电器 16A',
    unitPrice: 11.6,
    stock: 15000,
    boms: [
      { code: 'CTRL-001', name: '空调室外机电子控制器', usage: 4, wip: 800, open: 2000 },
      { code: 'CTRL-002', name: '风机驱动控制器', usage: 2, wip: 300, open: 900 },
    ],
    alternates: [
      {
        code: 'RLY-16B',
        name: '替代继电器（同规格）',
        status: '候选 · 待工程验证',
        priceDiff: 0.8,
        note: '需验证电气寿命次数与安规认证范围',
      },
      {
        code: 'RLY-20A',
        name: '替代继电器（20A）',
        status: '候选 · 待工程验证',
        priceDiff: 3.5,
        note: '外形尺寸不同，需评估 PCB 改板',
      },
    ],
  },
  'CAP-470U': {
    code: 'CAP-470U',
    name: '铝电解电容 470µF 25V',
    unitPrice: 2.1,
    stock: 26000,
    boms: [
      { code: 'CTRL-001', name: '空调室外机电子控制器', usage: 4, wip: 800, open: 2000 },
      { code: 'CTRL-004', name: '商用机组控制器', usage: 6, wip: 400, open: 600 },
      { code: 'PWR-010', name: '开关电源板', usage: 2, wip: 0, open: 1500 },
    ],
    alternates: [
      {
        code: 'CAP-470U-125',
        name: '替代电容（125℃ 长寿命）',
        status: '候选 · 待工程验证',
        priceDiff: 0.75,
        note: '尺寸高度增加 2mm，需确认结构干涉',
      },
    ],
  },
};

const CODES = Object.keys(MATERIALS);

interface Snapshot {
  mat: Material;
  alt: Alternate;
  demand: number;
  idleQty: number;
  idleAmount: number;
  wipQty: number;
  openQty: number;
}

export default function EcoImpactDemo() {
  const [draft, setDraft] = useState({ code: 'IC-MCU-01', stock: '4800', alt: 'IC-MCU-02' });
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [sig, setSig] = useState('');

  const currentSig = JSON.stringify(draft);
  const mat = MATERIALS[draft.code];
  const alternates = mat.alternates;
  const alt = alternates.find((a) => a.code === draft.alt) ?? alternates[0];

  const run = () => {
    setStatus('running');
    const stock = Math.max(0, Math.round(num(draft.stock)));
    const demand = mat.boms.reduce((s, b) => s + b.open * b.usage, 0);
    const idleQty = Math.max(0, stock - demand);
    const built: Snapshot = {
      mat,
      alt,
      demand,
      idleQty,
      idleAmount: round(idleQty * mat.unitPrice, 2),
      wipQty: mat.boms.reduce((s, b) => s + b.wip * b.usage, 0),
      openQty: demand,
    };
    window.setTimeout(() => {
      setSnap(built);
      setSig(currentSig);
      setStatus('done');
    }, 440);
  };

  const reset = () => {
    setDraft({ code: 'IC-MCU-01', stock: '4800', alt: 'IC-MCU-02' });
    setSnap(null);
    setSig('');
    setStatus('idle');
  };

  const loadSample = () => {
    const d = { code: 'IC-MCU-01', stock: '4800', alt: 'IC-MCU-02' };
    setDraft(d);
    setStatus('running');
    const m = MATERIALS['IC-MCU-01'];
    const demand = m.boms.reduce((s, b) => s + b.open * b.usage, 0);
    const idleQty = Math.max(0, 4800 - demand);
    window.setTimeout(() => {
      setSnap({
        mat: m,
        alt: m.alternates[0],
        demand,
        idleQty,
        idleAmount: round(idleQty * m.unitPrice, 2),
        wipQty: m.boms.reduce((s, b) => s + b.wip * b.usage, 0),
        openQty: demand,
      });
      setSig(JSON.stringify(d));
      setStatus('done');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && currentSig !== sig;

  const left = (
    <div className="space-y-4">
      <Field label="原物料号（停产 / 需替换）">
        <select
          value={draft.code}
          onChange={(e) => {
            const c = e.target.value;
            setDraft({ ...draft, code: c, stock: String(MATERIALS[c].stock), alt: MATERIALS[c].alternates[0].code });
          }}
          className="w-full"
        >
          {CODES.map((c) => (
            <option key={c} value={c}>
              {c} · {MATERIALS[c].name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="现有库存（可编辑）">
        <input
          type="number"
          min={0}
          value={draft.stock}
          onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
          className="w-full num"
        />
      </Field>
      <Field label="候选替代方案">
        <select
          value={draft.alt}
          onChange={(e) => setDraft({ ...draft, alt: e.target.value })}
          className="w-full"
        >
          {alternates.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} · {a.name}（价差 {a.priceDiff >= 0 ? '+' : ''}
              {money(a.priceDiff)}）
            </option>
          ))}
        </select>
      </Field>
      <p className="text-[11.5px] leading-relaxed text-muted">
        替代料一律标记为「候选」，是否可用必须由工程验证确认；本演示不输出可用性结论。
      </p>
    </div>
  );

  const right =
    status === 'idle' ? (
      <IdleCard text="点击「载入示例」载入一个停产物料的追溯样例，或选择其他物料后「运行演示」。" />
    ) : status === 'running' || !snap ? (
      <RunningCard text="正在反查物料关联：受影响 BOM、库存、在制与未交订单…" />
    ) : (
      <div className={`space-y-5 ${stale ? 'opacity-60' : ''}`}>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="panel px-3.5 py-2.5">
            <p className="label">受影响 BOM</p>
            <p className="num mt-1 text-[16px] text-cream">{snap.mat.boms.length}</p>
          </div>
          <div className="panel px-3.5 py-2.5">
            <p className="label">在制占用</p>
            <p className="num mt-1 text-[16px] text-cat-production">{int(snap.wipQty)}</p>
          </div>
          <div className="panel px-3.5 py-2.5">
            <p className="label">潜在呆滞库存</p>
            <p className="num mt-1 text-[16px] text-cat-production">¥ {money(snap.idleAmount)}</p>
          </div>
        </section>

        <section>
          <p className="label mb-2">影响清单</p>
          <TableWrap min={620}>
            <thead className="bg-ink-800/60">
              <tr>
                <Th>产品 / BOM</Th>
                <Th right>单台用量</Th>
                <Th right>在制占用</Th>
                <Th right>未交订单需求</Th>
                <Th>状态</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {snap.mat.boms.map((b) => (
                <tr key={b.code}>
                  <td className="px-2 py-1.5">
                    <span className="num block text-[12px] text-cream">{b.code}</span>
                    <span className="block text-[10.5px] text-muted">{b.name}</span>
                  </td>
                  <Td right>{b.usage}</Td>
                  <Td right>{int(b.wip * b.usage)}</Td>
                  <Td right>{int(b.open * b.usage)}</Td>
                  <td className="px-2 py-1.5">
                    {b.wip > 0 ? (
                      <span className="text-[11.5px] text-cat-production">在制占用，需切换方案</span>
                    ) : (
                      <span className="text-[11.5px] text-body">仅未交订单</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line bg-ink-800/40">
                <td className="px-2 py-1.5 text-[12px] text-cream">合计</td>
                <td />
                <Td right tone="text-cream">
                  {int(snap.wipQty)}
                </Td>
                <Td right tone="text-cream">
                  {int(snap.openQty)}
                </Td>
                <td />
              </tr>
            </tbody>
          </TableWrap>
        </section>

        <section className="panel px-3.5 py-3">
          <p className="label mb-2">潜在呆滞库存测算</p>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <p className="num text-[12px] text-body">
              现有库存：<span className="text-cream">{int(num(draft.stock))}</span>
            </p>
            <p className="num text-[12px] text-body">
              未交订单后续需求：<span className="text-cream">{int(snap.demand)}</span>
            </p>
            <p className="num text-[12px] text-body">
              潜在呆滞数量：<span className="text-cat-production">{int(snap.idleQty)}</span>
            </p>
            <p className="num text-[12px] text-body">
              潜在呆滞金额（按 {money(snap.mat.unitPrice)} /件）：
              <span className="text-cat-production">¥ {money(snap.idleAmount)}</span>
            </p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            潜在呆滞 = 现有库存 − 未交订单后续需求；未扣除在制已占用部分，实际处理方案由计划与采购确认。
          </p>
        </section>

        <section>
          <p className="label mb-2">候选替代料（不是可用结论）</p>
          <div className="card px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-[13px] text-cream">{snap.alt.code}</span>
              <Pill color="#E0A23C" variant="soft">
                {snap.alt.status}
              </Pill>
              <span className="num text-[11.5px] text-body">
                单价差 {snap.alt.priceDiff >= 0 ? '+' : ''}
                {money(snap.alt.priceDiff)} 元/件
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-body">{snap.alt.name}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{snap.alt.note}</p>
          </div>
        </section>

        <section>
          <p className="label mb-2">工程验证与采购跟进任务</p>
          <NoteList
            items={[
              `工程：验证 ${snap.alt.code} 在 ${snap.mat.boms.map((b) => b.code).join('、')} 上的电气与结构兼容性，并出具验证结论`,
              `工程：确认 ${snap.mat.code} 在制工单（占用 ${int(snap.wipQty)} 件）的切换方案或继续使用方案`,
              `采购：向原厂确认 ${snap.mat.code} 停产时间、最后采购机会与现有库存消耗计划`,
              `计划：评估潜在呆滞库存 ${int(snap.idleQty)} 件（约 ¥ ${money(snap.idleAmount)}）的处理方式`,
              `质量：更新来料检验标准，将 ${snap.alt.code} 纳入待验证物料清单`,
            ]}
          />
        </section>
      </div>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。物料、BOM、库存与替代料均为匿名化模拟数据；替代料只标记为候选，不输出可用性结论。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={snap ? `${snap.mat.code} 影响已汇总` : undefined}
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          '反查口径：以物料号在模拟 BOM 关系中反查使用该物料的产品清单。',
          '未交订单需求 = Σ（未交订单数量 × 单台用量）；在制占用 = Σ（在制数量 × 单台用量）。',
          '潜在呆滞 = max(0, 现有库存 − 未交订单后续需求) × 单价；未扣除在制已占用。',
          '替代料一律标记为候选；是否可用必须由工程验证确认，本演示不做判定。',
        ]}
      />
    </div>
  );
}
