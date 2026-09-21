import { useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Field, Pill } from '../components/ui';
import { DEMO_TODAY } from '../data/quote';
import { addDays, diffDays, int, num, round } from '../lib/money';
import { IdleCard, KV, RunningCard, TableWrap, Td, Th } from './common';

interface Order {
  id: string;
  product: string;
  qty: string;
  due: string;
}

interface Wc {
  id: string;
  name: string;
  /** 单台工时 */
  hours: string;
  /** 每日可用工时 */
  cap: string;
}

const ORDERS: Order[] = [
  { id: 'O-2601', product: 'CTRL-001', qty: '2000', due: '2026-09-30' },
  { id: 'O-2602', product: 'CTRL-004', qty: '1200', due: '2026-10-08' },
  { id: 'O-2603', product: 'CTRL-002', qty: '3000', due: '2026-10-15' },
  { id: 'O-2604', product: 'CTRL-001', qty: '1500', due: '2026-10-22' },
];

const WCS: Wc[] = [
  { id: 'smt', name: 'SMT 贴片线', hours: '0.02', cap: '16' },
  { id: 'asm', name: '组装线', hours: '0.05', cap: '24' },
  { id: 'test', name: '测试线', hours: '0.03', cap: '16' },
];

interface QueueItem {
  id: string;
  label: string;
  product: string;
  qty: number;
  due?: string;
  urgent?: boolean;
}

/** 简化产能试排：按队列顺序累加负荷，各工作中心独立累计，完工日取最晚者 */
function schedule(queue: QueueItem[], wcs: Wc[]): Record<string, number> {
  const finish: Record<string, number> = {};
  const cap = wcs.map((w) => Math.max(1, num(w.cap)));
  const cum = wcs.map(() => 0);
  for (const item of queue) {
    let day = 0;
    wcs.forEach((w, i) => {
      cum[i] += item.qty * num(w.hours);
      const d = Math.ceil(round(cum[i] / cap[i], 6));
      if (d > day) day = d;
    });
    finish[item.id] = day;
  }
  return finish;
}

function dateOf(day: number): string {
  return addDays(DEMO_TODAY, day).toISOString().slice(0, 10);
}

interface Option {
  id: 'front' | 'back' | 'split';
  name: string;
  desc: string;
  finish: Record<string, number>;
  urgentDay: number;
  urgentDate: string;
  urgentOk: boolean;
  maxDelay: number;
  delays: Record<string, number>;
}

export default function InsertOrderDemo() {
  const [draft, setDraft] = useState({ qty: '1000', need: '2026-10-02' });
  const [orders, setOrders] = useState(ORDERS);
  const [wcs, setWcs] = useState(WCS);
  const [snap, setSnap] = useState<{ base: Record<string, number>; options: Option[] } | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [sig, setSig] = useState('');

  const qty = Math.round(num(draft.qty, 0));
  const valid = qty > 0 && Number.isInteger(qty);
  const currentSig = JSON.stringify([draft, orders, wcs]);

  const setOrder = (id: string, value: string) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, qty: value } : o)));
  const setWc = (id: string, field: 'hours' | 'cap', value: string) =>
    setWcs((prev) => prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)));

  const build = (q: number, need: string, os: Order[], ws: Wc[]) => {
    const baseQueue: QueueItem[] = os.map((o) => ({
      id: o.id,
      label: o.id,
      product: o.product,
      qty: Math.round(num(o.qty)),
      due: o.due,
    }));
    const base = schedule(baseQueue, ws);

    const mkOption = (id: Option['id'], name: string, desc: string, queue: QueueItem[], urgentIds: string[]): Option => {
      const finish = schedule(queue, ws);
      const urgentDay = Math.max(...urgentIds.map((u) => finish[u] ?? 0));
      const urgentDate = dateOf(urgentDay);
      const delays: Record<string, number> = {};
      os.forEach((o) => {
        delays[o.id] = (finish[o.id] ?? 0) - (base[o.id] ?? 0);
      });
      return {
        id,
        name,
        desc,
        finish,
        urgentDay,
        urgentDate,
        urgentOk: diffDays(need, urgentDate) <= 0,
        maxDelay: Math.max(0, ...Object.values(delays)),
        delays,
      };
    };

    const half = Math.floor(q / 2);
    const rest = q - half;

    const options: Option[] = [
      mkOption(
        'front',
        '急单优先（插在最前）',
        '急单占用最早产能，已有订单整体顺延。',
        [
          { id: 'U-1', label: '急单', product: 'CTRL-001', qty: q, urgent: true },
          ...baseQueue,
        ],
        ['U-1'],
      ),
      mkOption(
        'back',
        '急单排最后',
        '已有订单不受影响，急单完工较晚。',
        [...baseQueue, { id: 'U-1', label: '急单', product: 'CTRL-001', qty: q, urgent: true }],
        ['U-1'],
      ),
      mkOption(
        'split',
        '急单分批（前后各半）',
        '前一半先做以缩短首批交付，后一半排在最末。',
        [
          { id: 'U-1', label: '急单（前半）', product: 'CTRL-001', qty: half, urgent: true },
          ...baseQueue,
          { id: 'U-2', label: '急单（后半）', product: 'CTRL-001', qty: rest, urgent: true },
        ],
        ['U-1', 'U-2'],
      ),
    ];
    return { base, options };
  };

  const run = () => {
    if (!valid) return;
    setStatus('running');
    const built = build(qty, draft.need, orders, wcs);
    window.setTimeout(() => {
      setSnap(built);
      setSig(currentSig);
      setStatus('done');
    }, 440);
  };

  const reset = () => {
    setDraft({ qty: '1000', need: '2026-10-02' });
    setOrders(ORDERS);
    setWcs(WCS);
    setSnap(null);
    setSig('');
    setStatus('idle');
  };

  const loadSample = () => {
    setDraft({ qty: '1000', need: '2026-10-02' });
    setOrders(ORDERS);
    setWcs(WCS);
    setStatus('running');
    const built = build(1000, '2026-10-02', ORDERS, WCS);
    window.setTimeout(() => {
      setSnap(built);
      setSig(JSON.stringify([{ qty: '1000', need: '2026-10-02' }, ORDERS, WCS]));
      setStatus('done');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && currentSig !== sig;

  const left = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="急单数量（台）">
          <input
            type="number"
            min={1}
            value={draft.qty}
            onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
            className="w-full num"
          />
        </Field>
        <Field label="急单需求日期">
          <input
            type="date"
            value={draft.need}
            onChange={(e) => setDraft({ ...draft, need: e.target.value })}
            className="w-full num"
          />
        </Field>
      </div>
      {!valid && <p className="text-[12px] text-cat-production">急单数量需为正整数。</p>}

      <div>
        <p className="label mb-2">工作中心（单台工时 / 每日可用工时）</p>
        <div className="space-y-2">
          {wcs.map((w) => (
            <div key={w.id} className="panel grid grid-cols-2 gap-2 px-2.5 py-2">
              <span className="col-span-2 text-[11.5px] text-cream">{w.name}</span>
              <label className="block">
                <span className="label">单台工时</span>
                <input
                  type="number"
                  step="0.01"
                  value={w.hours}
                  onChange={(e) => setWc(w.id, 'hours', e.target.value)}
                  className="num w-full px-2 py-1 text-[11.5px]"
                />
              </label>
              <label className="block">
                <span className="label">日可用工时</span>
                <input
                  type="number"
                  step="1"
                  value={w.cap}
                  onChange={(e) => setWc(w.id, 'cap', e.target.value)}
                  className="num w-full px-2 py-1 text-[11.5px]"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="label mb-2">已有订单队列（可改数量）</p>
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="panel flex items-center gap-2 px-2.5 py-2">
              <span className="num w-[62px] shrink-0 text-[11.5px] text-cream">{o.id}</span>
              <span className="num flex-1 text-[11px] text-muted">{o.product}</span>
              <input
                type="number"
                min="0"
                value={o.qty}
                onChange={(e) => setOrder(o.id, e.target.value)}
                className="num w-[76px] px-2 py-1 text-[11.5px]"
                aria-label={`${o.id} 数量`}
              />
              <span className="num shrink-0 text-[11px] text-muted">交期 {o.due}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const right =
    status === 'idle' ? (
      <IdleCard text="点击「载入示例」载入一张示例急单，或修改左侧数量与产能后「运行演示」。" />
    ) : status === 'running' || !snap ? (
      <RunningCard text="正在按简化产能规则试排，比较插单前后的完工日期…" />
    ) : (
      <div className={`space-y-5 ${stale ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-2.5 rounded-lg border border-cat-production/35 bg-cat-production/[0.07] px-3.5 py-2.5">
          <span className="mt-[2px] text-cat-production" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.8l6.2 11H1.8L8 1.8z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 6v3.2M8 11.2v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-[12px] leading-relaxed text-body">
            简化产能演示：按「队列顺序 × 单台工时 ÷ 日可用工时」线性累加，未考虑换型、良率、设备日历与物料齐套，不是真实工厂的最优排程结果。
          </p>
        </div>

        <section>
          <p className="label mb-2">可选安排</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {snap.options.map((o) => (
              <div
                key={o.id}
                className={`panel px-3 py-2.5 ${o.urgentOk ? 'border-teal/40' : 'border-cat-production/40'}`}
              >
                <p className="text-[12.5px] text-cream">{o.name}</p>
                <p className="num mt-1 text-[11.5px] text-body">急单完工 {o.urgentDate}</p>
                <p className={`mt-0.5 text-[11.5px] ${o.urgentOk ? 'text-teal' : 'text-cat-production'}`}>
                  {o.urgentOk ? '满足需求日期' : `晚于需求日期 ${diffDays(draft.need, o.urgentDate)} 天`}
                </p>
                <p className="num mt-1 text-[11.5px] text-body">
                  已有订单最大延后 {o.maxDelay} 天
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{o.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="label mb-2">受影响订单（以「急单优先」方案为例）</p>
          <TableWrap min={640}>
            <thead className="bg-ink-800/60">
              <tr>
                <Th>订单</Th>
                <Th>产品</Th>
                <Th right>数量</Th>
                <Th>原交期</Th>
                <Th>插单前完工</Th>
                <Th>插单后完工</Th>
                <Th right>延后</Th>
                <Th right>插最后</Th>
                <Th right>分批</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {orders.map((o) => {
                const front = snap.options[0];
                const back = snap.options[1];
                const split = snap.options[2];
                return (
                  <tr key={o.id}>
                    <td className="num px-2 py-1.5 text-[12px] text-cream">{o.id}</td>
                    <td className="num px-2 py-1.5 text-[12px] text-body">{o.product}</td>
                    <Td right>{int(num(o.qty))}</Td>
                    <td className="num px-2 py-1.5 text-[12px] text-body">{o.due}</td>
                    <td className="num px-2 py-1.5 text-[12px] text-body">
                      {dateOf(snap.base[o.id] ?? 0)}
                    </td>
                    <td className="num px-2 py-1.5 text-[12px] text-cream">
                      {dateOf(front.finish[o.id] ?? 0)}
                    </td>
                    <Td right tone={front.delays[o.id] > 0 ? 'text-cat-production' : 'text-muted'}>
                      {front.delays[o.id] > 0 ? `+${front.delays[o.id]}` : '0'}
                    </Td>
                    <Td right tone={back.delays[o.id] > 0 ? 'text-cat-production' : 'text-muted'}>
                      {back.delays[o.id] > 0 ? `+${back.delays[o.id]}` : '0'}
                    </Td>
                    <Td right tone={split.delays[o.id] > 0 ? 'text-cat-production' : 'text-muted'}>
                      {split.delays[o.id] > 0 ? `+${split.delays[o.id]}` : '0'}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </section>

        <section className="panel px-3.5 py-2">
          <KV k="急单数量" v={`${int(qty)} 台`} />
          <KV k="急单需求日期" v={draft.need} />
          <KV k="产能基准日" v={DEMO_TODAY} />
          <KV
            k="建议"
            v={
              snap.options.find((o) => o.urgentOk && o.maxDelay === Math.min(...snap.options.filter((x) => x.urgentOk).map((x) => x.maxDelay)))?.name ??
              '无方案同时满足需求日期'
            }
            tone="text-teal"
          />
        </section>

        <div className="flex flex-wrap gap-2">
          {snap.options.map((o) => (
            <Pill key={o.id} color={o.urgentOk ? '#3FD6B0' : '#E0A23C'} variant="soft">
              {o.name}：最大延后 {o.maxDelay} 天
            </Pill>
          ))}
        </div>

        <p className="text-[11.5px] leading-relaxed text-muted">
          三个方案仅为供计划员比较的候选，最终安排需结合物料齐套、客户等级与违约成本，由计划与销售共同决定。
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。订单、产能与工时均为匿名化模拟数据；本演示使用简化产能规则，不是真实工厂的最优排程。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={snap ? '三种方案已比较' : undefined}
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          '试排规则：按队列顺序累加各工作中心的负荷，某工作中心的所需天数 = 累计负荷 ÷ 每日可用工时（向上取整）。',
          '订单完工日 = 各工作中心所需天数的最大值；再由基准日 ' + DEMO_TODAY + ' 推算日期。',
          '插单前基准 = 只有已有订单时的完工日；延后天数 = 插单后完工日 − 插单前完工日。',
          '分批方案：急单数量对半拆分，前半插在最前，后半排在最末；急单完工日以后半部分为准。',
          '未考虑：换型时间、良率损失、设备保养日历、物料齐套、人员班次。',
        ]}
      />
    </div>
  );
}
