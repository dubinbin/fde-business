export type CategoryId = 'sales' | 'sourcing' | 'engineering' | 'production' | 'quality';

export type PreviewKind =
  | 'quote'
  | 'compare'
  | 'bom'
  | 'kit'
  | 'schedule'
  | 'quality'
  | 'eco'
  | 'cost'
  | 'ticket';

export interface Metric {
  name: string;
  method: string;
}

export interface Scenario {
  id: string;
  name: string;
  category: CategoryId;
  /** 一句具体业务问题 */
  question: string;
  /** 一句能交付什么 */
  delivers: string;
  tags: string[];
  /** 适用角色 */
  roles: string[];
  /** 交互深度 */
  level: '完整交互' | '轻量交互';
  preview: PreviewKind;
  /** 处理流程 */
  flow: { title: string; desc: string }[];
  /** 典型输入 */
  inputs: string[];
  /** 输出物 */
  outputs: string[];
  /** 落地到企业需要什么 */
  landing: {
    data: string[];
    rules: string[];
    human: string[];
    metrics: Metric[];
  };
  /** 演示区上方的口径提示 */
  caveat?: string;
}

export const CATEGORIES: { id: CategoryId | 'all'; name: string; color: string }[] = [
  { id: 'all', name: '全部', color: '#3FD6B0' },
  { id: 'sales', name: '销售与报价', color: '#5A9BD8' },
  { id: 'sourcing', name: '采购与供应链', color: '#4C8FE8' },
  { id: 'engineering', name: '工程与数据', color: '#7FB2E5' },
  { id: 'production', name: '生产与交付', color: '#E0A23C' },
  { id: 'quality', name: '质量与售后', color: '#A98BE0' },
];

export const CATEGORY_COLOR: Record<CategoryId, string> = {
  sales: '#5A9BD8',
  sourcing: '#4C8FE8',
  engineering: '#7FB2E5',
  production: '#E0A23C',
  quality: '#A98BE0',
};

export const CATEGORY_NAME: Record<CategoryId, string> = {
  sales: '销售与报价',
  sourcing: '采购与供应链',
  engineering: '工程与数据',
  production: '生产与交付',
  quality: '质量与售后',
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'quote',
    name: '从客户询价到可追溯报价',
    category: 'sales',
    question: '客户要 5000 件，采购价格刚变，这一单该报多少？',
    delivers: '把一次询价变成可追溯、可复核的成本拆解与报价草稿。',
    tags: ['BOM', '动态成本', '报价'],
    roles: ['总经理', '销售负责人', '报价工程师'],
    level: '完整交互',
    preview: 'quote',
    flow: [
      { title: '识别需求', desc: '从询价文本或表单中提取产品、数量、目标毛利、税率与交付条件。' },
      { title: '匹配 BOM', desc: '按产品编号绑定当前生效版本的 BOM 与替代料关系。' },
      { title: '获取有效价格', desc: '按数量阶梯取价，并校验价格来源与生效 / 失效日期。' },
      { title: '计算加工与费用', desc: '叠加工序工时、损耗、包装物流、管理费用与模具摊销。' },
      { title: '检查异常', desc: '识别缺价、价格过期、数量越界等阻塞项，决定是否可出正式报价。' },
      { title: '生成报价草稿', desc: '输出成本拆解、数量阶梯对比、客户版报价单与待确认事项。' },
    ],
    inputs: ['产品编号 / 名称', '订货数量', '目标毛利率', '销项税率', '采购价格方案', '交付条件'],
    outputs: [
      '单位成本拆解（材料 / 加工 / 损耗 / 物流 / 管理 / 模具）',
      '三种数量阶梯的报价对比',
      '每项材料的价格来源与有效期',
      '缺价与过期异常清单',
      '客户版报价单（不含内部成本）',
    ],
    landing: {
      data: [
        'ERP / 报价系统中的物料主数据与 BOM 版本',
        '采购提供的供应商报价单或框架协议（含税别、生效日期）',
        '工艺路线与工序工时、制造费率',
        '历史报价记录与成交价格',
      ],
      rules: [
        '数量阶梯取价规则与价格的生效 / 失效判定口径',
        '损耗率与管理费用的计算基数（本演示：损耗基数 = 材料成本，管理基数 = 材料 + 加工）',
        '模具费用的一次性金额与摊销数量',
        '目标毛利的审批区间，以及低于区间时的审批人',
        '缺价、过期价格是否允许暂算，由谁确认',
      ],
      human: [
        '采购确认价格来源与有效期',
        '工程确认 BOM 版本与替代料',
        '报价负责人确认毛利与最终报价',
        '客户版报价单发出前的人工复核',
      ],
      metrics: [
        { name: '报价周期', method: '试点前后各取 20 个真实询价单，统计从接收到发出报价的小时数中位数' },
        { name: '报价一版通过率', method: '统计无需返工复核的报价单占比，返工以报价单版本号计' },
        { name: '价格异常拦截数', method: '统计被系统标出、且人工确认确实需要更新的价格条目数' },
        { name: '成本拆解可追溯率', method: '抽查报价单，检查每一项材料是否都能回溯到来源单据与日期' },
      ],
    },
  },
  {
    id: 'sourcing-compare',
    name: '供应商报价归一与比价',
    category: 'sourcing',
    question: '三家报价的税、运费、MOQ 都不同，哪家更合适？',
    delivers: '把口径不同的报价折算成可比总额，并给出带依据的推荐。',
    tags: ['采购比价', 'MOQ', '交期'],
    roles: ['采购负责人', '总经理', '计划员'],
    level: '完整交互',
    preview: 'compare',
    flow: [
      { title: '统一口径', desc: '把不同税别、不同运费条款的报价折算到同一可比口径。' },
      { title: '检查约束', desc: '校验起订量、交期是否满足需求日期，计算超采数量。' },
      { title: '比较方案', desc: '在可行方案内比较可比总额，而不是单纯比较单价。' },
      { title: '给出依据', desc: '输出推荐理由、被否决原因与需要人工判断的项。' },
    ],
    inputs: ['采购数量', '需求日期', '三家供应商的单价、税别、运费、MOQ、交期'],
    outputs: [
      '可比采购总额（统一税别与运费口径）',
      '超采数量与超采占用金额',
      '交期差异与是否满足需求日期',
      '推荐方案与推荐依据',
    ],
    landing: {
      data: [
        '供应商报价单（纸质、PDF 或邮件正文均可，需先结构化）',
        '物料主数据中的包装倍数与起订量规则',
        '采购需求日期与生产计划',
        '历史合作记录与质量异常记录（作为非价格因素）',
      ],
      rules: [
        '可比口径定义：本演示统一为「含税到岸可比总额 = 未税货值 ×(1+税率) + 运费」',
        '超采数量的处理方式：按 MOQ 采购，超出部分计入库存占用',
        '交期不可行时的处置规则（是否允许拆分、是否启用备选供应商）',
        '价格之外的权重：质量、账期、历史交付表现',
      ],
      human: [
        '采购确认报价单原件与录入值一致',
        '交期不可行时由计划与销售协商需求日期',
        '最终供应商选择由采购负责人确认',
      ],
      metrics: [
        { name: '比价准备耗时', method: '试点前后各取 15 次比价，统计从收集报价到形成比价表的分钟数' },
        { name: '口径错误次数', method: '统计比价表中税别、运费录入错误导致重算的次数' },
        { name: '超采识别率', method: '统计系统标出的 MOQ 超采条目占实际发生超采条目的比例' },
      ],
    },
  },
  {
    id: 'bom-diff',
    name: 'BOM 版本差异与缺项检查',
    category: 'engineering',
    question: '研发发来了新版 BOM，到底改了哪里，会影响多少钱？',
    delivers: '输出两版 BOM 的差异表、已知成本影响与待确认清单。',
    tags: ['BOM 校验', '工程变更', '成本影响'],
    roles: ['工程 / 研发负责人', '采购负责人', '信息化负责人'],
    level: '完整交互',
    preview: 'bom',
    flow: [
      { title: '匹配物料', desc: '按物料号对齐两版 BOM，识别新增与删除项。' },
      { title: '对比变化', desc: '逐项比较用量、规格与单价的变化。' },
      { title: '检查缺价', desc: '价格缺失的项标记为待确认，不按 0 参与计算。' },
      { title: '汇总影响', desc: '在已有价格范围内计算已知成本差异，并列出待工程确认项。' },
    ],
    inputs: ['两版 BOM（物料号、名称、规格、用量、单价）', '可编辑的物料 / 数量 / 单价'],
    outputs: [
      '差异表（新增 / 删除 / 用量变化 / 规格变化 / 价格变化）',
      '已知成本差异金额',
      '缺失价格清单（待确认）',
      '待工程确认事项',
    ],
    caveat: '缺价项一律显示「待确认」，不会按 0 计入成本差异。',
    landing: {
      data: [
        'PLM / 研发系统中的 BOM 版本记录',
        'ERP 中的物料主数据与最新采购价',
        '替代料关系与认证状态',
      ],
      rules: [
        '物料对齐口径：以物料号为准，物料号变更时视为删除 + 新增',
        '规格差异是否构成实质变更的判定规则',
        '缺价项的处理：标记待确认，不得默认 0',
        '成本影响的计算边界：仅统计已知价格部分',
      ],
      human: [
        '工程确认新增 / 删除项是否为预期变更',
        '采购补充缺失价格',
        '成本影响超过阈值时由总经理确认',
      ],
      metrics: [
        { name: 'BOM 差异核对耗时', method: '试点前后各取 10 次版本变更，统计人工核对到出差异表的小时数' },
        { name: '缺价拦截数', method: '统计在报价或下单前被标出的缺价物料条目数' },
        { name: '差异漏项数', method: '在系统输出后，由工程复核补充的差异条目数（越低越好）' },
      ],
    },
  },
  {
    id: 'kit-shortage',
    name: '订单齐套与缺料预警',
    category: 'sourcing',
    question: '下周这批订单能不能开工？具体缺什么？',
    delivers: '按 BOM 展开需求，算出缺料清单、阻塞物料与预计齐套日期。',
    tags: ['库存', '齐套', '缺料'],
    roles: ['生产负责人', '采购负责人', '计划员'],
    level: '轻量交互',
    preview: 'kit',
    flow: [
      { title: '展开需求', desc: '按订单数量与 BOM 用量展开各物料的总需求。' },
      { title: '计算可用', desc: '扣除已分配库存，得到当前可用量与缺口。' },
      { title: '区分齐套', desc: '区分「现有库存可齐套」与「预计到料后可齐套」。' },
      { title: '标记缺料', desc: '无到料日期的缺口标记为阻塞物料，给出跟进对象。' },
    ],
    inputs: ['订单数量', '各物料库存', '已分配库存', '预计到料日期'],
    outputs: ['缺料清单与缺口数量', '阻塞物料', '预计齐套日期', '建议跟进对象'],
    landing: {
      data: ['ERP 库存与已分配量', '采购在途 PO 与预计到料日期', 'BOM 与订单数量'],
      rules: [
        '可用库存口径：现有库存 − 已分配（安全库存是否扣除需明确）',
        '在途到料的置信度分级（已发货 / 已下单 / 待下单）',
        '齐套判定：全部物料可用量 ≥ 需求',
      ],
      human: ['采购确认在途到料日期真实性', '计划确认是否调整开工顺序'],
      metrics: [
        { name: '缺料识别覆盖率', method: '试点期内，系统提前标出的缺料条目 ÷ 实际发生缺料条目' },
        { name: '齐套判断耗时', method: '统计每周齐套排查会议与人工核对的总工时' },
      ],
    },
  },
  {
    id: 'insert-order',
    name: '插单影响与交期评估',
    category: 'production',
    question: '临时插入 1000 件急单，会影响哪些已有订单？',
    delivers: '按简化产能规则试排，输出受影响订单与延后天数。',
    tags: ['插单', '产能', '交付'],
    roles: ['生产负责人', '计划员', '销售负责人'],
    level: '轻量交互',
    preview: 'schedule',
    flow: [
      { title: '取产能', desc: '读取各工作中心的剩余可用工时。' },
      { title: '试排', desc: '按明确的简化规则把急单插到最早可完成的位置。' },
      { title: '比较', desc: '对比插单前后各订单的完工日期与延后天数。' },
      { title: '给选项', desc: '输出可选安排，交计划人工决策。' },
    ],
    inputs: ['急单数量与需求日期', '各工作中心剩余产能', '已有订单队列'],
    outputs: ['受影响订单清单', '各订单延后天数', '可选安排（插前 / 插后 / 分批）'],
    caveat: '本演示使用简化产能规则，不是真实工厂的最优排程结果。',
    landing: {
      data: ['MES / 工单系统的工序工时与工作中心产能', '订单交期与优先级规则', '设备可用日历'],
      rules: [
        '产能口径：可用工时是否扣除换型、保养与良率损失',
        '插单优先级规则（客户等级 / 毛利 / 违约成本）',
        '延后天数的可接受阈值与升级机制',
      ],
      human: ['计划员确认试排结果可行', '销售与客户确认新交期'],
      metrics: [
        { name: '插单评估耗时', method: '统计从接到插单请求到给出影响评估的小时数' },
        { name: '交期承诺偏差', method: '统计系统预估完工日与实际完工日的偏差天数分布' },
      ],
    },
  },
  {
    id: 'quality-evidence',
    name: '质量异常与历史证据检索',
    category: 'quality',
    question: '同类焊接不良以前发生过吗？当时怎样处理？',
    delivers: '检索历史异常记录与作业文件，输出证据、候选原因与排查顺序。',
    tags: ['质量异常', '历史案例', '作业指导'],
    roles: ['质量负责人', '生产负责人', '工艺工程师'],
    level: '轻量交互',
    preview: 'quality',
    flow: [
      { title: '匹配记录', desc: '按现象、工序、产品类型匹配模拟历史异常记录。' },
      { title: '展示证据', desc: '列出记录摘要、文件版本与来源位置。' },
      { title: '区分结论', desc: '把「已确认根因」与「候选可能原因」严格分开。' },
      { title: '整理排查', desc: '输出建议检查项与排查顺序。' },
    ],
    inputs: ['不良现象描述', '工序', '产品类型'],
    outputs: ['相似历史记录', '依据来源与文件版本', '候选可能原因', '建议检查项与排查顺序'],
    caveat: '「可能原因」为候选，不等同于已确认根因。',
    landing: {
      data: ['质量异常记录（8D / 客诉 / 内部不合格品记录）', '作业指导书与检验标准（含版本号）', '工艺参数记录'],
      rules: [
        '相似度判定口径：现象关键词、工序、产品类型的匹配权重',
        '已确认根因的认定标准：需有闭环的 8D 记录',
        '文件版本的有效性规则',
      ],
      human: ['质量工程师确认候选原因', '工艺工程师确认排查顺序'],
      metrics: [
        { name: '历史案例命中率', method: '在 N 次新异常中，检索出的历史记录被质量工程师判定为相关的比例' },
        { name: '证据可追溯率', method: '抽查输出结果，检查每条结论是否都带文件编号与版本' },
      ],
    },
  },
  {
    id: 'eco-impact',
    name: '工程变更影响追踪',
    category: 'engineering',
    question: '这个元器件停产了，替换后会影响哪些产品和订单？',
    delivers: '追溯物料关联，输出影响清单、潜在呆滞库存与跟进任务。',
    tags: ['替代料', '变更影响', '追溯'],
    roles: ['工程 / 研发负责人', '采购负责人', '计划员'],
    level: '轻量交互',
    preview: 'eco',
    flow: [
      { title: '查询关联', desc: '按物料号查询使用该物料的 BOM 与产品。' },
      { title: '识别影响', desc: '扩展到库存、在制工单与未交订单。' },
      { title: '匹配替代', desc: '列出候选替代料，标注验证状态。' },
      { title: '汇总任务', desc: '生成工程验证与采购跟进任务清单。' },
    ],
    inputs: ['原物料号', '模拟替代方案', '现有库存与在制数量'],
    outputs: ['受影响产品与 BOM 清单', '潜在呆滞库存金额', '候选替代料（待验证）', '工程验证与采购跟进任务'],
    caveat: '替代料仅标记为候选，是否可用必须由工程验证确认。',
    landing: {
      data: ['PLM / ERP 的物料-BOM 反查关系', '库存与在制工单', '未交销售订单', '替代料认证记录'],
      rules: [
        '替代料的等效判定规则（谁有权批准）',
        '呆滞库存的认定口径与处理周期',
        '在制工单的切换规则',
      ],
      human: ['工程验证替代料并签字', '采购确认原厂停产信息与最后采购机会', '计划确认在制工单切换方案'],
      metrics: [
        { name: '影响面统计耗时', method: '统计一次变更从提出到列出完整影响清单的小时数' },
        { name: '漏统计项数', method: '系统输出后由人工复核补充的受影响条目数' },
      ],
    },
  },
  {
    id: 'cost-review',
    name: '报价成本与实际成本复盘',
    category: 'sales',
    question: '报价时毛利看起来不错，交货后为什么少赚了？',
    delivers: '对齐口径后按材料、加工、损耗、物流归因，输出差异表与需更新的报价参数。',
    tags: ['成本复盘', '毛利', '差异分析'],
    roles: ['总经理', '销售负责人', '财务 / 成本会计'],
    level: '轻量交互',
    preview: 'cost',
    flow: [
      { title: '对齐口径', desc: '把报价成本与实际成本对齐到同一数量与成本范围。' },
      { title: '归因', desc: '按材料、加工、损耗、物流四个维度拆分差异。' },
      { title: '校验', desc: '确保各维度归因金额之和等于总差异。' },
      { title: '输出参数', desc: '给出需要更新的报价参数。' },
    ],
    inputs: ['同一订单的报价成本', '实际采购价', '实际工时', '报废数量', '实际物流费用'],
    outputs: ['成本差异表（含归因）', '毛利变化', '需要更新的报价参数'],
    caveat: '各维度归因金额之和严格等于总差异，不做分摊余数。',
    landing: {
      data: ['报价单成本拆解', '实际采购入库价', 'MES 实际工时', '报废与返工记录', '物流费用'],
      rules: [
        '口径对齐规则：数量、成本范围、是否含税',
        '归因维度定义与优先级（避免重复归因）',
        '差异超过阈值时的复盘触发条件',
      ],
      human: ['成本会计确认归因口径', '报价负责人决定是否调整报价参数'],
      metrics: [
        { name: '毛利偏差', method: '统计订单实际毛利率与报价毛利率的差值分布' },
        { name: '复盘覆盖率', method: '统计已完成成本归因的订单占交付订单的比例' },
      ],
    },
  },
  {
    id: 'service-ticket',
    name: '售后工单与服务交接',
    category: 'quality',
    question: '客户只说设备不工作，怎样快速补全信息并交给合适的人？',
    delivers: '把模糊描述补成结构化工单，匹配维修记录并建议分派。',
    tags: ['售后', '工单', '知识检索'],
    roles: ['售后负责人', '质量负责人', '服务工程师'],
    level: '轻量交互',
    preview: 'ticket',
    flow: [
      { title: '识别缺失', desc: '对照工单模板找出缺失字段。' },
      { title: '生成追问', desc: '输出需要向客户追问的问题清单。' },
      { title: '匹配记录', desc: '按型号与故障码匹配模拟维修记录。' },
      { title: '建议分派', desc: '按保修状态与故障类型给出优先级与分派建议。' },
    ],
    inputs: ['客户描述', '产品型号', '故障码', '保修状态'],
    outputs: ['结构化工单', '追问清单', '处理优先级', '交接摘要'],
    caveat: '涉及设备操作时只引用批准的作业指引，不生成带电维修等危险操作步骤。',
    landing: {
      data: ['客服 / 工单系统的历史工单', '产品型号与保修规则', '批准的作业指导书（含版本号）'],
      rules: [
        '工单必填字段清单',
        '优先级判定规则（保修状态、停机影响、安全风险）',
        '分派规则（技能矩阵、区域、负荷）',
        '安全红线：不得生成带电维修、旁通安全装置等操作步骤',
      ],
      human: ['客服确认补全信息', '售后负责人确认分派', '涉及安全的操作必须由持证人员执行'],
      metrics: [
        { name: '工单一次补全率', method: '统计首次派单即信息完整的工单占比' },
        { name: '交接返工次数', method: '统计因信息缺失导致的二次派单次数' },
      ],
    },
  },
];

export function getScenario(id: string | undefined): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/** 搜索：匹配名称、问题描述、标签 */
export function filterScenarios(keyword: string, category: CategoryId | 'all'): Scenario[] {
  const kw = keyword.trim().toLowerCase();
  return SCENARIOS.filter((s) => {
    if (category !== 'all' && s.category !== category) return false;
    if (!kw) return true;
    const haystack = [s.name, s.question, s.delivers, ...s.tags, ...s.roles]
      .join(' ')
      .toLowerCase();
    return haystack.includes(kw);
  });
}
