import { useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Field } from '../components/ui';
import { DEMO_TODAY } from '../data/quote';
import { addDays, diffDays, int, num, round, weekday } from '../lib/money';
import { IdleCard, KV, NoteList, RunningCard, TableWrap, Td, Th } from './common';

interface Material {
  key: string;
  code: string;
  name: string;
  /** 单台用量 */
  per: string;
  stock: string;
  allocated: string;
  /** 在途数量 */
  inbound: string;
  /** 预计到料日期，空 = 无到料计划 */
  eta: string;
}

const DEFAULT_MATERIALS: Material[] = [
  m('PCB-A1', '主控 PCB 板', '1', '6800', '1200', '0', ''),
  m('IC-MCU-01', '主控 MCU', '1', '4200', '800', '3000', '2026-09-26'),
  m('RLY-16A', '功率继电器', '4', '15000', '4200', '0', ''),
  m('CAP-470U', '铝电解电容', '4', '26000', '4000', '0', ''),
  m('RES-10K', '贴片电阻', '12', '90000', '12000', '0', ''),
  m('HS-AL-01', '铝散热片', '1', '3100', '600', '0', ''),
];

function m(
  code: string,
  name: string,
  per: string,
  stock: string,
  allocated: string,
  inbound: string,
  eta: string,
): Material {
  return { key: code, code, name, per, stock, allocated, inbound, eta };
}

interface Row {
  code: string;
  name: string;
  need: number;
  available: number;
  gap: number;
  inbound: number;
  eta: string;
  etaFeasible: boolean;
  blocking: boolean;
  owner: string;
}

function compute(mats: Material[], orderQty: number): Row[] {
  return mats.map((x) => {
    const need = round(num(x.per) * orderQty, 0);
    const available = Math.max(0, round(num(x.stock) - num(x.allocated), 0));
    const gap = Math.max(0, need - available);
    const inbound = num(x.inbound);
    const covered = gap > 0 && inbound >= gap && !!x.eta;
    return {
      code: x.code,
      name: x.name,
      need,
      available,
      gap,
      inbound,
      eta: x.eta,
      etaFeasible: covered,
      blocking: gap > 0 && !covered,
      owner: gap === 0 ? '—' : covered ? '采购（跟在途到料）' : '采购（无在途，需下单）',
    };
  });
}

export default function KitShortageDemo() {
  const [draft, setDraft] = useState({ qty: '3000', due: '2026-09-28' });
  const [mats, setMats] = useState(DEFAULT_MATERIALS);
  const [snap, setSnap] = useState<{ rows: Row[]; ready: string; blocked: Row[]; qty: number } | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [sig, setSig] = useState('');

  const qty = Math.round(num(draft.qty, 0));
  const valid = qty > 0 && Number.isInteger(qty);
  const currentSig = JSON.stringify([draft, mats]);

  const set = (key: string, field: keyof Material, value: string) =>
    setMats((prev) => prev.map((x) => (x.key === key ? { ...x, [field]: value } : x)));

  const run = () => {
    if (!valid) return;
    setStatus('running');
    const rows = compute(mats, qty);
    const blocked = rows.filter((r) => r.blocking);
    const etas = rows.filter((r) => r.gap > 0 && r.eta).map((r) => r.eta);
    const ready = blocked.length > 0 ? '' : etas.length ? etas.sort()[etas.length - 1] : DEMO_TODAY;
    window.setTimeout(() => {
      setSnap({ rows, ready, blocked, qty });
      setSig(currentSig);
      setStatus(blocked.length > 0 ? 'partial' : 'done');
    }, 440);
  };

  const reset = () => {
    setDraft({ qty: '3000', due: '2026-09-28' });
    setMats(DEFAULT_MATERIALS);
    setSnap(null);
    setSig('');
    setStatus('idle');
  };

  const loadSample = () => {
    setDraft({ qty: '3000', due: '2026-09-28' });
    setMats(DEFAULT_MATERIALS);
    setStatus('running');
    const rows = compute(DEFAULT_MATERIALS, 3000);
    const blocked = rows.filter((r) => r.blocking);
    const etas = rows.filter((r) => r.gap > 0 && r.eta).map((r) => r.eta);
    window.setTimeout(() => {
      setSnap({
        rows,
        ready: blocked.length > 0 ? '' : etas.length ? etas.sort()[etas.length - 1] : DEMO_TODAY,
        blocked,
        qty: 3000,
      });
      setSig(JSON.stringify([{ qty: '3000', due: '2026-09-28' }, DEFAULT_MATERIALS]));
      setStatus(blocked.length > 0 ? 'partial' : 'done');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && currentSig !== sig;

  const left = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="订单数量（台）">
          <input
            type="number"
            min={1}
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
            className="w-full num"
          />
        </Field>
        <Field label="计划开工日">
          <input
            type="date"
            value={draft.due}
            onChange={(e) => setDraft({ ...draft, due: e.target.value })}
            className="w-full num"
          />
        </Field>
      </div>
      {!valid && <p className="text-[12px] text-cat-production">订单数量需为正整数。</p>}

      <div>
        <p className="label mb-2">物料库存与在途（可编辑）</p>
        <div className="space-y-2">
          {mats.map((x) => (
            <div key={x.key} className="panel px-2.5 py-2">
              <div className="flex items-baseline justify-between">
                <span className="num text-[11.5px] text-cream">{x.code}</span>
                <span className="text-[11px] text-muted">{x.name}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                <label className="block">
                  <span className="label">单台用量</span>
                  <input
                    type="number"
                    min="0"
                    value={x.per}
                    onChange={(e) => set(x.key, 'per', e.target.value)}
                    className="num w-full px-2 py-1 text-[11.5px]"
                  />
                </label>
                <label className="block">
                  <span className="label">库存</span>
                  <input
                    type="number"
                    min="0"
                    value={x.stock}
                    onChange={(e) => set(x.key, 'stock', e.target.value)}
                    className="num w-full px-2 py-1 text-[11.5px]"
                  />
                </label>
                <label className="block">
                  <span className="label">已分配</span>
                  <input
                    type="number"
                    min="0"
                    value={x.allocated}
                    onChange={(e) => set(x.key, 'allocated', e.target.value)}
                    className="num w-full px-2 py-1 text-[11.5px]"
                  />
                </label>
                <label className="block">
                  <span className="label">在途</span>
                  <input
                    type="number"
                    min="0"
                    value={x.inbound}
                    onChange={(e) => set(x.key, 'inbound', e.target.value)}
                    className="num w-full px-2 py-1 text-[11.5px]"
                  />
                </label>
                <label className="col-span-4 block">
                  <span className="label">预计到料日期（留空 = 无到料计划）</span>
                  <input
                    type="date"
                    value={x.eta}
                    onChange={(e) => set(x.key, 'eta', e.target.value)}
                    className="num w-full px-2 py-1 text-[11.5px]"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const right =
    status === 'idle' ? (
      <IdleCard text="点击「载入示例」载入一张示例订单，或修改左侧数量与库存后「运行演示」。" />
    ) : status === 'running' || !snap ? (
      <RunningCard text="正在按 BOM 展开需求，扣除已分配库存并检查在途到料…" />
    ) : (
      <div className={`space-y-5 ${stale ? 'opacity-60' : ''}`}>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="panel px-3.5 py-2.5">
            <p className="label">缺料物料</p>
            <p className="num mt-1 text-[16px] text-cream">
              {snap.rows.filter((r) => r.gap > 0).length}
              <span className="ml-1 text-[11.5px] text-muted">/ {snap.rows.length}</span>
            </p>
          </div>
          <div className="panel px-3.5 py-2.5">
            <p className="label">阻塞物料</p>
            <p className="num mt-1 text-[16px] text-cat-production">{snap.blocked.length}</p>
          </div>
          <div className="panel px-3.5 py-2.5">
            <p className="label">预计齐套</p>
            <p className="num mt-1 text-[16px] text-teal">
              {snap.blocked.length > 0 ? '无法齐套' : snap.ready}
            </p>
          </div>
        </section>

        <section className="panel px-3.5 py-2">
          <KV k="订单数量" v={`${int(snap.qty)} 台`} />
          <KV k="计划开工日" v={`${draft.due}（${weekday(draft.due)}）`} />
          <KV
            k="齐套结论"
            v={
              snap.blocked.length > 0
                ? `存在 ${snap.blocked.length} 项阻塞物料，无法给出齐套日期`
                : snap.ready === DEMO_TODAY
                  ? '现有库存即可齐套'
                  : `预计 ${snap.ready} 齐套`
            }
            tone={snap.blocked.length > 0 ? 'text-cat-production' : 'text-teal'}
          />
          {snap.blocked.length === 0 && snap.ready !== DEMO_TODAY && (
            <KV
              k="相对计划开工日"
              v={
                diffDays(draft.due, snap.ready) <= 0
                  ? `提前 ${-diffDays(draft.due, snap.ready)} 天`
                  : `晚 ${diffDays(draft.due, snap.ready)} 天`
              }
              tone={diffDays(draft.due, snap.ready) > 0 ? 'text-cat-production' : 'text-teal'}
            />
          )}
        </section>

        <section>
          <p className="label mb-2">需求展开与缺口</p>
          <TableWrap min={660}>
            <thead className="bg-ink-800/60">
              <tr>
                <Th>物料</Th>
                <Th right>需求</Th>
                <Th right>可用</Th>
                <Th right>缺口</Th>
                <Th right>在途</Th>
                <Th>预计到料</Th>
                <Th>状态</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {snap.rows.map((r) => (
                <tr key={r.code}>
                  <td className="px-2 py-1.5">
                    <span className="num block text-[12px] text-cream">{r.code}</span>
                    <span className="block text-[10.5px] text-muted">{r.name}</span>
                  </td>
                  <Td right>{int(r.need)}</Td>
                  <Td right>{int(r.available)}</Td>
                  <Td right tone={r.gap > 0 ? 'text-cat-production' : 'text-muted'}>
                    {r.gap > 0 ? int(r.gap) : '—'}
                  </Td>
                  <Td right>{r.inbound > 0 ? int(r.inbound) : '—'}</Td>
                  <td className="num px-2 py-1.5 text-[12px] text-body">{r.eta || '无到料计划'}</td>
                  <td className="px-2 py-1.5">
                    {r.gap === 0 ? (
                      <span className="text-[11.5px] text-teal">充足</span>
                    ) : r.blocking ? (
                      <span className="text-[11.5px] text-cat-production">阻塞</span>
                    ) : (
                      <span className="text-[11.5px] text-body">在途可覆盖</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </section>

        <section>
          <p className="label mb-2">建议跟进对象</p>
          <NoteList
            items={snap.rows
              .filter((r) => r.gap > 0)
              .map(
                (r) =>
                  `${r.code}：缺口 ${int(r.gap)}，${r.blocking ? '无在途可覆盖，需立即下单' : `在途 ${int(r.inbound)}，预计 ${r.eta} 到料`} → ${r.owner}`,
              )}
          />
          {snap.rows.every((r) => r.gap === 0) && (
            <p className="text-[12px] text-teal">全部物料可用量充足，当前库存即可齐套。</p>
          )}
        </section>

        <p className="text-[11.5px] leading-relaxed text-muted">
          可用库存 = 现有库存 − 已分配；本演示未扣除安全库存。齐套日期取所有缺口物料中最晚的预计到料日；存在阻塞物料时不出齐套日期。
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。物料、库存与在途数据均为匿名化模拟数据，不来自任何真实 ERP。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={
          snap
            ? snap.blocked.length
              ? `${snap.blocked.length} 项阻塞，无法齐套`
              : '齐套日期已给出'
            : undefined
        }
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          `需求 = 单台用量 × 订单数量（${snap ? int(snap.qty) : qty} 台）。`,
          '可用库存 = 现有库存 − 已分配（本演示不扣安全库存）。',
          '缺口 = max(0, 需求 − 可用)。',
          '在途可覆盖 = 缺口 > 0 且 在途数量 ≥ 缺口 且有预计到料日期；否则标记为阻塞。',
          `预计齐套日期 = 所有非阻塞缺口物料中最晚的预计到料日；基准日 ${DEMO_TODAY}。`,
          `示例：${addDays(DEMO_TODAY, 5).toISOString().slice(0, 10)} 为一个到料日样例（基准日 +5 天）。`,
          '本演示只做数量口径的齐套判断，不含金额计算。',
        ]}
      />
    </div>
  );
}
