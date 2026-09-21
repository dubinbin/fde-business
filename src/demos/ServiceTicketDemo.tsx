import { useState } from 'react';
import DemoShell, { type DemoStatus } from '../components/DemoShell';
import { DemoNotice, Field, Pill } from '../components/ui';
import { IdleCard, NoteList, RunningCard } from './common';

const MODELS = ['', 'CTRL-001', 'CTRL-002', 'CTRL-004'];
const FAULTS = ['', 'E-07', 'E-12', 'E-21', 'E-33'];
const WARRANTY = ['待确认', '保内', '保外'];

interface RepairRecord {
  id: string;
  fault: string;
  model: string;
  phenomenon: string;
  category: '电气' | '机械' | '通讯 / 软件';
  keywords: string[];
  action: string;
  guide: { doc: string; version: string; section: string };
}

const RECORDS: RepairRecord[] = [
  {
    id: 'R-118',
    fault: 'E-12',
    model: 'CTRL-002',
    phenomenon: '上电后无输出，继电器不吸合',
    category: '电气',
    keywords: ['不工作', '无输出', '继电器', '上电'],
    action: '现场检查端子电压与继电器模块，确认后更换模块并复测',
    guide: { doc: 'WI-服务-021 控制器现场检查', version: 'v3.2', section: '§2 上与电前检查' },
  },
  {
    id: 'R-104',
    fault: 'E-07',
    model: 'CTRL-001',
    phenomenon: '显示面板无显示',
    category: '电气',
    keywords: ['显示', '黑屏', '无显示', '面板'],
    action: '检查排线压接状态与供电电压，重新压接后复测',
    guide: { doc: 'WI-服务-011 显示模块检查', version: 'v2.0', section: '§3 排线与供电' },
  },
  {
    id: 'R-132',
    fault: 'E-21',
    model: 'CTRL-004',
    phenomenon: '上位机通讯中断',
    category: '通讯 / 软件',
    keywords: ['通讯', '中断', '连不上', '上位机'],
    action: '核对通讯参数与线缆，必要时升级固件后复测',
    guide: { doc: 'WI-服务-033 通讯排查', version: 'v1.1', section: '§4 参数核对' },
  },
  {
    id: 'R-127',
    fault: 'E-33',
    model: 'CTRL-001',
    phenomenon: '风机不转并伴随异响',
    category: '机械',
    keywords: ['异响', '不转', '噪音', '风机'],
    action: '断电后检查风机轴承与动平衡，确认后更换',
    guide: { doc: 'WI-服务-045 风机检修', version: 'v2.4', section: '§5 断电后检修' },
  },
];

const DEFAULTS = {
  text: '设备不工作，昨天开始就没反应了',
  model: '',
  fault: '',
  warranty: '待确认',
  occurred: '',
  serial: '',
};

interface Snapshot {
  missing: string[];
  questions: string[];
  hits: RepairRecord[];
  priority: { level: string; reasons: string[] };
  dispatch: string;
  team: string;
}

function analyze(d: typeof DEFAULTS): Snapshot {
  const t = d.text.trim();
  const missing: string[] = [];
  const questions: string[] = [];

  if (!d.model) {
    missing.push('产品型号');
    questions.push('请确认设备型号（机身铭牌上的产品编号，如 CTRL-001）');
  }
  if (!d.fault) {
    missing.push('故障码');
    questions.push('请提供控制器显示的故障码（如 E-12），或拍下显示屏照片');
  }
  if (d.warranty === '待确认') {
    missing.push('保修状态');
    questions.push('请提供设备出厂编号或购买凭证，用于确认是否在保修期内');
  }
  if (!d.occurred) {
    missing.push('发生时间');
    questions.push('故障是何时首次出现的？是偶发还是持续？');
  }
  if (!d.serial) {
    missing.push('设备编号');
    questions.push('请提供设备出厂编号（S/N）');
  }
  if (!t) {
    missing.push('故障描述');
    questions.push('请描述故障现象：上电后有什么反应、有无异响或气味');
  }
  questions.push('如现场条件允许，请提供现场照片或 10 秒左右视频（本演示不支持上传，仅列出需求）');

  const hits = RECORDS.filter((r) => {
    if (d.fault && r.fault === d.fault) return true;
    if (d.model && r.model === d.model && r.keywords.some((k) => t.includes(k))) return true;
    return r.keywords.some((k) => t.includes(k));
  });

  const reasons: string[] = [];
  let score = 0;
  if (d.fault === 'E-12' || d.fault === 'E-33') {
    score += 2;
    reasons.push(`故障码 ${d.fault} 属于高优先级类别`);
  } else if (d.fault === 'E-07' || d.fault === 'E-21') {
    score += 1;
    reasons.push(`故障码 ${d.fault} 属于中优先级类别`);
  }
  if (t.includes('停机') || t.includes('停产')) {
    score += 1;
    reasons.push('描述中提及停机影响');
  }
  if (d.warranty === '保内') {
    score += 1;
    reasons.push('设备在保修期内');
  }
  if (hits.length === 0 && d.fault) reasons.push('无匹配维修记录，按故障码默认级别处理');

  const level = score >= 2 ? '高' : score === 1 ? '中' : '待定（信息不足）';

  const cat = hits[0]?.category;
  const team =
    cat === '电气'
      ? '售后二组 · 现场服务工程师'
      : cat === '机械'
        ? '售后一组 · 机械维修工程师'
        : cat === '通讯 / 软件'
          ? '技术支持组 · 固件工程师'
          : '客服组（先补全信息，再分派）';

  return {
    missing,
    questions,
    hits,
    priority: { level, reasons },
    dispatch: team,
    team,
  };
}

export default function ServiceTicketDemo() {
  const [draft, setDraft] = useState(DEFAULTS);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [sig, setSig] = useState('');

  const currentSig = JSON.stringify(draft);

  const run = () => {
    setStatus('running');
    const s = analyze(draft);
    window.setTimeout(() => {
      setSnap(s);
      setSig(currentSig);
      setStatus(s.missing.length > 0 ? 'partial' : 'done');
    }, 440);
  };

  const reset = () => {
    setDraft(DEFAULTS);
    setSnap(null);
    setSig('');
    setStatus('idle');
  };

  const loadSample = () => {
    const d = {
      text: '设备不工作，上电后没有输出，昨天开始的，产线已经停机',
      model: 'CTRL-002',
      fault: 'E-12',
      warranty: '保内',
      occurred: '2026-09-20',
      serial: '',
    };
    setDraft(d);
    setStatus('running');
    const s = analyze(d);
    window.setTimeout(() => {
      setSnap(s);
      setSig(JSON.stringify(d));
      setStatus(s.missing.length > 0 ? 'partial' : 'done');
    }, 300);
  };

  const stale = !!snap && status !== 'idle' && currentSig !== sig;

  const left = (
    <div className="space-y-4">
      <Field label="客户描述">
        <textarea
          rows={3}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          className="w-full resize-y leading-relaxed"
          placeholder="例如：设备不工作，上电后没有输出"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="产品型号">
          <select
            value={draft.model}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            className="w-full"
          >
            <option value="">未知 / 未提供</option>
            {MODELS.filter(Boolean).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="故障码">
          <select
            value={draft.fault}
            onChange={(e) => setDraft({ ...draft, fault: e.target.value })}
            className="w-full"
          >
            <option value="">未知 / 未提供</option>
            {FAULTS.filter(Boolean).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="保修状态">
          <select
            value={draft.warranty}
            onChange={(e) => setDraft({ ...draft, warranty: e.target.value })}
            className="w-full"
          >
            {WARRANTY.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
        <Field label="首次发生时间">
          <input
            type="date"
            value={draft.occurred}
            onChange={(e) => setDraft({ ...draft, occurred: e.target.value })}
            className="w-full num"
          />
        </Field>
      </div>
      <Field label="设备出厂编号 S/N（可留空验证追问逻辑）">
        <input
          value={draft.serial}
          onChange={(e) => setDraft({ ...draft, serial: e.target.value })}
          className="w-full num"
          placeholder="如 SN-2025-08812"
        />
      </Field>
    </div>
  );

  const right =
    status === 'idle' ? (
      <IdleCard text="点击「载入示例」载入一条客户报修，或直接在左侧填写后「运行演示」。" />
    ) : status === 'running' || !snap ? (
      <RunningCard text="正在识别缺失字段、匹配历史维修记录并评估优先级…" />
    ) : (
      <div className={`space-y-5 ${stale ? 'opacity-60' : ''}`}>
        <section className="flex flex-wrap items-center gap-2">
          <Pill color={snap.priority.level === '高' ? '#E0A23C' : snap.priority.level === '中' ? '#5A9BD8' : '#8A948F'} variant="soft">
            优先级 {snap.priority.level}
          </Pill>
          <Pill>建议分派：{snap.dispatch}</Pill>
          <Pill color={snap.missing.length ? '#E0A23C' : '#3FD6B0'} variant="soft">
            {snap.missing.length ? `${snap.missing.length} 项信息待补全` : '信息完整'}
          </Pill>
        </section>

        <section className="panel px-3.5 py-3">
          <p className="label mb-2">结构化工单</p>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <p className="text-[12px] text-body">
              产品型号：
              <span className="num text-cream">{draft.model || '待补充'}</span>
            </p>
            <p className="text-[12px] text-body">
              故障码：
              <span className="num text-cream">{draft.fault || '待补充'}</span>
            </p>
            <p className="text-[12px] text-body">
              保修状态：<span className="text-cream">{draft.warranty}</span>
            </p>
            <p className="text-[12px] text-body">
              首次发生：<span className="num text-cream">{draft.occurred || '待补充'}</span>
            </p>
            <p className="text-[12px] text-body">
              出厂编号：<span className="num text-cream">{draft.serial || '待补充'}</span>
            </p>
            <p className="text-[12px] text-body">
              客户描述：<span className="text-cream">{draft.text.trim() || '待补充'}</span>
            </p>
          </div>
        </section>

        <section>
          <p className="label mb-2">追问清单（{snap.questions.length} 条）</p>
          <NoteList items={snap.questions} className="text-cat-production" />
        </section>

        <section>
          <p className="label mb-2">匹配的模拟维修记录</p>
          {snap.hits.length === 0 ? (
            <p className="text-[12px] leading-relaxed text-muted">
              没有匹配的记录。可由客服补全信息后重新运行，或登记为新案例。
            </p>
          ) : (
            <div className="space-y-2">
              {snap.hits.map((h) => (
                <div key={h.id} className="card px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[12.5px] text-cream">{h.id}</span>
                    <Pill>{h.category}</Pill>
                    <span className="num text-[11px] text-muted">
                      {h.model} · {h.fault}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-body">{h.phenomenon}</p>
                  <p className="mt-1 text-[11.5px] text-muted">{h.action}</p>
                  <p className="num mt-1.5 text-[11px] text-teal/80">
                    依据：{h.guide.doc} · {h.guide.version} · {h.guide.section}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="label mb-2">交接摘要</p>
          <p className="text-[12px] leading-relaxed text-body">
            {draft.model || '型号待确认'} 报修「{draft.text.trim() || '描述待补充'}」，
            优先级 {snap.priority.level}（{snap.priority.reasons.join('；') || '暂无升级因素'}），
            建议分派至 {snap.dispatch}。
            {snap.missing.length > 0
              ? `发出前需向客户补全：${snap.missing.join('、')}。`
              : '信息已完整，可直接派单。'}
          </p>
        </section>

        <div className="rounded-lg border border-cat-production/35 bg-cat-production/[0.07] px-3.5 py-2.5">
          <p className="text-[12px] leading-relaxed text-body">
            安全口径：本演示只引用已批准的作业指引（文件编号 + 版本 + 章节），不生成任何操作步骤；涉及带电、登高、转动部件的作业必须由持证人员按批准文件执行。
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <DemoNotice>
        以下为模拟数据交互演示，可按企业实际流程部署。工单、维修记录与作业指引编号均为模拟数据；涉及设备操作时只引用批准的作业指引，不生成带电维修等危险操作步骤。
      </DemoNotice>
      <DemoShell
        status={status}
        statusText={
          snap ? (snap.missing.length ? `${snap.missing.length} 项待补全` : '信息完整，可派单') : undefined
        }
        stale={stale}
        onRun={run}
        onSample={loadSample}
        onReset={reset}
        left={left}
        right={right}
        basis={[
          '必填字段清单：产品型号、故障码、保修状态、首次发生时间、设备出厂编号、故障描述；缺失项生成对应追问。',
          '现场照片 / 视频始终列入追问（本演示不支持上传，仅记录需求）。',
          '记录匹配：故障码完全一致，或描述中包含记录关键词（型号一致时权重更高）。',
          '优先级：故障码类别（E-12 / E-33 记 2 分，E-07 / E-21 记 1 分）+ 停机影响 1 分 + 保内 1 分；≥2 为高，=1 为中，0 为待定。',
          '分派规则按故障类别映射到团队；无匹配记录时先由客服补全信息。',
          '安全红线：只引用批准的作业指引，不生成操作步骤；带电 / 登高 / 转动部件作业须持证人员执行。',
        ]}
      />
    </div>
  );
}
