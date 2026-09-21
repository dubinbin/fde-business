import { useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, EmptyState, Field, Pill } from '../components/ui';
import { IdleCard, NoteList, RunningCard } from './common';

interface Record {
  id: string;
  date: string;
  phenomenon: string;
  process: string;
  productType: string;
  keywords: string[];
  /** 是否已闭环确认根因 */
  confirmed: boolean;
  rootCause: string | null;
  possibleCauses: string[];
  action: string;
  docs: { doc: string; version: string; section: string }[];
  checks: string[];
}

const PROCESSES = ['SMT 贴片', '回流焊', '波峰焊', '手工补焊', '整机组装', '功能测试'];
const PRODUCT_TYPES = ['控制器', '驱动板', '电源板'];

const RECORDS: Record[] = [
  {
    id: 'QA-2418',
    date: '2026-03-14',
    phenomenon: '波峰焊后焊点虚焊、锡量不足',
    process: '波峰焊',
    productType: '控制器',
    keywords: ['虚焊', '锡量', '焊点', '波峰焊', '少锡'],
    confirmed: true,
    rootCause: '助焊剂喷涂量偏低，叠加预热温度不足（实测 85℃，要求 ≥100℃）',
    possibleCauses: [],
    action: '调整助焊剂喷涂参数并将预热温度提升至 110℃；该批次全检后放行',
    docs: [
      { doc: 'WI-焊接-003 波峰焊作业指导', version: 'v2.1', section: '§4.2 预热与喷涂参数' },
      { doc: '8D-2418 异常处理报告', version: '终版', section: '第 5 节 根因与验证' },
    ],
    checks: [
      '核对波峰焊预热温度实测值与 WI-焊接-003 v2.1 §4.2 要求值',
      '核对助焊剂喷涂量设定与喷嘴状态',
      '抽取该批次 20 件做焊点切片或 X-Ray 抽检',
    ],
  },
  {
    id: 'QA-2261',
    date: '2025-11-02',
    phenomenon: '回流焊后焊盘周围出现锡珠残留',
    process: '回流焊',
    productType: '驱动板',
    keywords: ['锡珠', '残留', '回流焊', '锡球'],
    confirmed: true,
    rootCause: '锡膏印刷厚度偏厚（实测 0.18mm，要求 0.12–0.15mm），回流曲线升温段过快',
    possibleCauses: [],
    action: '钢网厚度改为 0.12mm，回流曲线升温速率调整为 1.5℃/s',
    docs: [
      { doc: 'WI-SMT-001 锡膏印刷作业指导', version: 'v3.0', section: '§3.1 钢网与厚度' },
      { doc: '8D-2261 异常处理报告', version: '终版', section: '第 4 节 原因分析' },
    ],
    checks: [
      '测量锡膏印刷厚度并与 WI-SMT-001 v3.0 §3.1 比对',
      '导出本次回流焊温度曲线，检查升温速率',
      '检查钢网清洗频次记录',
    ],
  },
  {
    id: 'QA-2388',
    date: '2026-01-20',
    phenomenon: '手工补焊后焊盘脱落',
    process: '手工补焊',
    productType: '控制器',
    keywords: ['焊盘', '脱落', '补焊', '剥离'],
    confirmed: false,
    rootCause: null,
    possibleCauses: [
      '烙铁温度设定过高（候选）',
      '单点停留时间过长（候选）',
      'PCB 板材耐热等级不足（候选）',
    ],
    action: '记录中仅登记了临时围堵措施（暂停该工位作业并隔离在制品），根因未确认',
    docs: [
      { doc: 'WI-补焊-002 手工补焊作业指导', version: 'v1.4', section: '§2.3 烙铁温度与停留时间' },
      { doc: 'QR-2388 不合格品记录', version: '草稿', section: '第 2 节 现象描述' },
    ],
    checks: [
      '核对烙铁温度设定与 WI-补焊-002 v1.4 §2.3 要求',
      '调取该工位近 7 天作业记录与人员',
      '确认 PCB 板材型号与耐热等级证明',
    ],
  },
  {
    id: 'QA-2302',
    date: '2025-12-08',
    phenomenon: '功能测试继电器不吸合',
    process: '功能测试',
    productType: '控制器',
    keywords: ['继电器', '不吸合', '失效', '测试'],
    confirmed: true,
    rootCause: '继电器来料批次线圈电阻偏差超差（供应商批次 M24-31）',
    possibleCauses: [],
    action: '隔离该批次继电器并要求供应商提供 8D；更换批次后复测通过',
    docs: [
      { doc: 'WI-测试-011 功能测试作业指导', version: 'v2.2', section: '§5.1 继电器动作判定' },
      { doc: 'IQC-2302 来料检验记录', version: '终版', section: '第 3 节 线圈电阻实测' },
    ],
    checks: [
      '按 WI-测试-011 v2.2 §5.1 复测继电器动作电压',
      '追溯继电器批次号并核对来料检验记录',
      '确认同批次物料在其他工单的使用情况',
    ],
  },
  {
    id: 'QA-2455',
    date: '2026-06-27',
    phenomenon: '波峰焊后引脚连锡、短路',
    process: '波峰焊',
    productType: '电源板',
    keywords: ['连锡', '短路', '桥接', '波峰焊'],
    confirmed: false,
    rootCause: null,
    possibleCauses: [
      '引脚间距小于工艺允许最小值（候选）',
      '传送带角度偏小导致脱锡不良（候选）',
      '锡炉温度偏低（候选）',
    ],
    action: '临时提高锡炉温度 5℃ 并增加目检工位；根因待工艺验证',
    docs: [
      { doc: 'WI-焊接-003 波峰焊作业指导', version: 'v2.1', section: '§4.5 传送带角度' },
      { doc: 'QR-2455 不合格品记录', version: '草稿', section: '第 2 节 现象描述' },
    ],
    checks: [
      '核对设计引脚间距与工艺能力表',
      '核对传送带角度设定与 WI-焊接-003 v2.1 §4.5',
      '抽取样品做焊点金相检查',
    ],
  },
];

const SAMPLES = ['焊点虚焊', '锡珠残留', '焊盘脱落', '继电器不吸合', '连锡短路', '来料尺寸超差（无匹配示例）'];

interface Hit {
  rec: Record;
  score: number;
  reasons: string[];
}

function match(text: string, process: string, productType: string): Hit[] {
  const t = text.trim();
  const hits: Hit[] = [];
  for (const r of RECORDS) {
    let score = 0;
    const reasons: string[] = [];
    const kw = r.keywords.filter((k) => t.includes(k));
    if (t && kw.length) {
      score += kw.length * 2;
      reasons.push(`现象关键词命中：${kw.join('、')}`);
    }
    if (process && r.process === process) {
      score += 2;
      reasons.push(`工序一致：${process}`);
    }
    if (productType && r.productType === productType) {
      score += 1;
      reasons.push(`产品类型一致：${productType}`);
    }
    if (score > 0) hits.push({ rec: r, score, reasons });
  }
  return hits.sort((a, b) => b.score - a.score);
}

export default function QualityEvidenceDemo() {
  const [draft, setDraft] = useState({ text: '焊点虚焊', process: '波峰焊', type: '控制器' });
  const [snap, setSnap] = useState<Hit[] | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [sig, setSig] = useState('');

  const currentSig = JSON.stringify(draft);

  const run = () => {
    setStatus('running');
    const hits = match(draft.text, draft.process, draft.type);
    window.setTimeout(() => {
      setSnap(hits);
      setSig(currentSig);
      setStatus(hits.length ? 'done' : 'partial');
    }, 440);
  };

  const reset = () => {
    setDraft({ text: '焊点虚焊', process: '波峰焊', type: '控制器' });
    setSnap(null);
    setSig('');
    setStatus('idle');
  };

  const loadSample = () => {
    const d = { text: '波峰焊后焊点虚焊、锡量不足', process: '波峰焊', type: '控制器' };
    setDraft(d);
    setStatus('running');
    const hits = match(d.text, d.process, d.type);
    window.setTimeout(() => {
      setSnap(hits);
      setSig(JSON.stringify(d));
      setStatus(hits.length ? 'done' : 'partial');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && currentSig !== sig;

  const left = (
    <div className="space-y-4">
      <Field label="不良现象描述">
        <textarea
          rows={3}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          className="w-full resize-y leading-relaxed"
          placeholder="例如：波峰焊后焊点虚焊、锡量不足"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="工序">
          <select
            value={draft.process}
            onChange={(e) => setDraft({ ...draft, process: e.target.value })}
            className="w-full"
          >
            {PROCESSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="产品类型">
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            className="w-full"
          >
            {PRODUCT_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div>
        <p className="label mb-2">示例现象</p>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDraft({ ...draft, text: s })}
              className={`rounded-md border px-2.5 py-1 text-[11.5px] transition-colors ${
                draft.text === s
                  ? 'border-teal/60 bg-teal/10 text-teal'
                  : 'border-line text-body hover:border-line-strong'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const right =
    status === 'idle' ? (
      <IdleCard text="点击「载入示例」或直接在左侧描述不良现象后「运行演示」，会检索模拟历史记录。" />
    ) : status === 'running' || !snap ? (
      <RunningCard text="正在按现象、工序、产品类型匹配历史异常记录与作业文件…" />
    ) : snap.length === 0 ? (
      <EmptyState
        title="没有匹配的历史记录"
        desc="当前现象、工序与产品类型的组合在模拟记录库中没有命中项。可尝试更换关键词，或由质量工程师登记为新案例。"
      />
    ) : (
      <div className={`space-y-5 ${stale ? 'opacity-60' : ''}`}>
        <section className="flex flex-wrap items-center gap-2">
          <Pill color="#3FD6B0" variant="soft">
            命中 {snap.length} 条
          </Pill>
          <Pill>{snap.filter((h) => h.rec.confirmed).length} 条已闭环</Pill>
          <Pill color="#E0A23C" variant="soft">
            {snap.filter((h) => !h.rec.confirmed).length} 条根因未确认
          </Pill>
        </section>

        {snap.map((h) => (
          <section key={h.rec.id} className="card px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="num text-[13px] text-cream">{h.rec.id}</span>
                <span className="num text-[11px] text-muted">{h.rec.date}</span>
              </div>
              <Pill color={h.rec.confirmed ? '#3FD6B0' : '#E0A23C'} variant="soft">
                {h.rec.confirmed ? '已闭环 · 根因已确认' : '未闭环 · 根因待确认'}
              </Pill>
            </div>

            <p className="mt-2 text-[12.5px] text-body">{h.rec.phenomenon}</p>
            <p className="num mt-1 text-[11.5px] text-muted">
              {h.rec.process} · {h.rec.productType}
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="label mb-1.5">已确认根因</p>
                {h.rec.confirmed ? (
                  <p className="text-[12px] leading-relaxed text-body">{h.rec.rootCause}</p>
                ) : (
                  <p className="text-[12px] leading-relaxed text-cat-production">
                    无。该记录尚未闭环，不能当作根因使用。
                  </p>
                )}
                {h.rec.possibleCauses.length > 0 && (
                  <>
                    <p className="label mb-1.5 mt-3">候选可能原因（非结论）</p>
                    <NoteList items={h.rec.possibleCauses} className="text-cat-production" />
                  </>
                )}
              </div>
              <div>
                <p className="label mb-1.5">依据来源</p>
                <ul className="space-y-1">
                  {h.rec.docs.map((d) => (
                    <li key={d.doc} className="text-[11.5px] leading-relaxed text-body">
                      <span className="num">{d.doc}</span> · {d.version} · {d.section}
                    </li>
                  ))}
                </ul>
                <p className="label mb-1.5 mt-3">当时处理</p>
                <p className="text-[11.5px] leading-relaxed text-muted">{h.rec.action}</p>
              </div>
            </div>

            <div className="mt-3 border-t border-line-soft pt-3">
              <p className="label mb-1.5">建议检查项（按顺序）</p>
              <ol className="space-y-1">
                {h.rec.checks.map((c, i) => (
                  <li key={c} className="num flex gap-2 text-[12px] leading-relaxed text-body">
                    <span className="text-teal/70">{i + 1}.</span>
                    <span className="min-w-0">{c}</span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-2.5 text-[11px] text-muted">命中依据：{h.reasons.join('；')}</p>
          </section>
        ))}

        <p className="text-[11.5px] leading-relaxed text-muted">
          候选可能原因与已确认根因严格分开展示；所有引用均标注文件编号、版本与章节位置，便于回到原件核对。
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。历史记录、作业指导与 8D 报告编号均为模拟数据，不对应任何真实企业文件。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={snap ? (snap.length ? `命中 ${snap.length} 条` : '无匹配结果') : undefined}
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          '匹配规则：现象文本中包含记录关键词（权重 2 / 词）+ 工序一致（权重 2）+ 产品类型一致（权重 1）。',
          '结果按总分降序排列；总分为 0 的记录不展示，返回「无匹配结果」。',
          '已确认根因只取自标记「已闭环」的记录；未闭环记录只展示候选可能原因。',
          '所有输出必须带文件编号、版本与章节位置，便于回到原件核对。',
        ]}
      />
    </div>
  );
}
