/**
 * 报价演示的模拟数据（匿名化）
 * 产品：CTRL-001 空调室外机电子控制器
 *
 * 说明：以下全部为演示用模拟数据，不代表任何真实企业的价格、BOM 或工艺参数。
 */

export interface BomItem {
  code: string;
  name: string;
  spec: string;
  /** 单台用量 */
  qtyPer: number;
  unit: string;
  /** 数量阶梯未税单价：<1000 / 1000–4999 / 5000–9999 / ≥10000；null 表示缺价 */
  tiers: [number, number, number, number] | null;
  /** 价格来源 */
  source: string;
  validFrom: string;
  validTo: string;
}

export interface ProcessStep {
  name: string;
  /** 单台工时（小时） */
  hoursPerUnit: number;
  /** 费率（元/小时） */
  rate: number;
}

export interface PurchasePlan {
  id: 'agreement' | 'negotiation' | 'spot';
  name: string;
  /** 材料单价系数 */
  factor: number;
  note: string;
}

export interface DeliveryTerm {
  id: 'exw' | 'dap' | 'install';
  name: string;
  /** 单台交付附加费（元） */
  perUnit: number;
  note: string;
}

/** 演示基准日：所有生效 / 失效判断以此为参照，保证结果确定性 */
export const DEMO_TODAY = '2026-09-21';

export const PRODUCT = {
  code: 'CTRL-001',
  name: '空调室外机电子控制器',
  spec: '主控板 + 继电器驱动，适用于 1.5–3 匹室外机',
};

export const TIERS = [
  { min: 1, label: '< 1,000', short: '基准价' },
  { min: 1000, label: '1,000 – 4,999', short: '阶梯 2' },
  { min: 5000, label: '5,000 – 9,999', short: '阶梯 3' },
  { min: 10000, label: '≥ 10,000', short: '阶梯 4' },
];

export function tierIndex(qty: number): number {
  if (qty >= 10000) return 3;
  if (qty >= 5000) return 2;
  if (qty >= 1000) return 1;
  return 0;
}

export const BOM: BomItem[] = [
  {
    code: 'PCB-A1',
    name: '主控 PCB 板',
    spec: 'FR-4 双层 120×90mm 沉金',
    qtyPer: 1,
    unit: 'pcs',
    tiers: [18.6, 16.8, 15.4, 14.2],
    source: '年度框架协议 · 供应商 S-01',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  {
    code: 'IC-MCU-01',
    name: '主控 MCU',
    spec: '32位 MCU 64KB Flash LQFP-48',
    qtyPer: 1,
    unit: 'pcs',
    tiers: [42.5, 39.8, 37.2, 35.6],
    source: '季度报价单 · 供应商 S-02',
    validFrom: '2026-07-01',
    validTo: '2026-10-31',
  },
  {
    code: 'RLY-16A',
    name: '功率继电器',
    spec: '16A 250VAC 线圈 12VDC',
    qtyPer: 3,
    unit: 'pcs',
    tiers: [12.4, 11.6, 10.8, 10.2],
    source: '季度报价单 · 供应商 S-03',
    validFrom: '2026-04-01',
    validTo: '2026-12-31',
  },
  {
    code: 'CAP-470U',
    name: '铝电解电容',
    spec: '470µF 25V 105℃ Φ8×12',
    qtyPer: 4,
    unit: 'pcs',
    tiers: [2.35, 2.1, 1.92, 1.8],
    source: '年度框架协议 · 供应商 S-04',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  {
    code: 'RES-10K',
    name: '贴片电阻',
    spec: '10KΩ ±1% 0603',
    qtyPer: 12,
    unit: 'pcs',
    tiers: [0.09, 0.08, 0.075, 0.07],
    source: '年度框架协议 · 供应商 S-04',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  {
    code: 'CONN-6P',
    name: '接插件',
    spec: '6P 2.54mm 弯针座',
    qtyPer: 2,
    unit: 'pcs',
    tiers: [3.6, 3.25, 3.05, 2.9],
    source: '季度报价单 · 供应商 S-05',
    validFrom: '2026-03-01',
    validTo: '2026-12-31',
  },
  {
    code: 'HS-AL-01',
    name: '铝散热片',
    spec: '型材 45×25×12mm 阳极氧化',
    qtyPer: 1,
    unit: 'pcs',
    tiers: [6.8, 6.2, 5.8, 5.5],
    source: '年度框架协议 · 供应商 S-06',
    validFrom: '2026-02-01',
    validTo: '2026-12-31',
  },
  {
    code: 'SCR-M3',
    name: '不锈钢螺钉',
    spec: 'M3×8 十字盘头',
    qtyPer: 4,
    unit: 'pcs',
    tiers: [0.12, 0.11, 0.1, 0.095],
    source: '辅材均价 · 历史采购',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
];

export const PROCESS: ProcessStep[] = [
  { name: 'SMT 贴片', hoursPerUnit: 0.12, rate: 60 },
  { name: 'DIP 插件与波峰焊', hoursPerUnit: 0.08, rate: 55 },
  { name: '整机组装', hoursPerUnit: 0.15, rate: 45 },
  { name: '老化与功能测试', hoursPerUnit: 0.1, rate: 50 },
];

export const PURCHASE_PLANS: PurchasePlan[] = [
  {
    id: 'agreement',
    name: '现有协议价',
    factor: 1,
    note: '按已签署的年度框架 / 季度报价单价格，无需额外假设。',
  },
  {
    id: 'negotiation',
    name: '年度谈判预估价',
    factor: 0.97,
    note: '演示假设：新一轮年度谈判后整体降价 3%。实际生效需采购确认。',
  },
  {
    id: 'spot',
    name: '现货市场预估价',
    factor: 1.06,
    note: '演示假设：现货渠道溢价 6%。为预估口径，不是供应商实际报价。',
  },
];

export const DELIVERY_TERMS: DeliveryTerm[] = [
  { id: 'exw', name: '出厂价（EXW）', perUnit: 0, note: '客户自提，不含运输与保险。' },
  { id: 'dap', name: '送到客户指定仓（DAP）', perUnit: 1.6, note: '含国内运输与保险附加。' },
  { id: 'install', name: '含现场安装调试', perUnit: 4.8, note: '含调试人工与差旅分摊。' },
];

/** 损耗 / 管理 / 包装 的演示假设 */
export const ASSUMPTIONS = {
  /** 损耗率，基数 = 材料成本 */
  scrapRate: 0.025,
  scrapBase: '材料成本',
  /** 管理费率，基数 = 材料成本 + 加工成本 */
  overheadRate: 0.08,
  overheadBase: '材料成本 + 加工成本',
  /** 包装与物流（元/台，不含交付附加） */
  packUnit: 1.8,
  freightUnit: 1.4,
  /** 模具总额与默认摊销数量 */
  toolingTotal: 120000,
  toolingAmortQty: 10000,
};

export type DataStateId = 'complete' | 'missing' | 'expired';

export const DATA_STATES: { id: DataStateId; name: string; desc: string }[] = [
  { id: 'complete', name: '数据完整', desc: '全部物料有有效价格，可直接出正式报价。' },
  {
    id: 'missing',
    name: '关键物料缺价',
    desc: '主控 MCU 无有效价格，成本待补全，不能出正式报价。',
  },
  {
    id: 'expired',
    name: '报价已过期',
    desc: '继电器与电解电容报价已过失效日期，需采购更新或确认。',
  },
];

/** 按数据状态派生 BOM（不改变原始数据） */
export function deriveBom(state: DataStateId): BomItem[] {
  const items = BOM.map((it) => ({ ...it }));
  if (state === 'missing') {
    const ic = items.find((i) => i.code === 'IC-MCU-01');
    if (ic) {
      ic.tiers = null;
      ic.source = '待采购补充（无有效报价记录）';
      ic.validFrom = '—';
      ic.validTo = '—';
    }
  }
  if (state === 'expired') {
    const a = items.find((i) => i.code === 'RLY-16A');
    if (a) a.validTo = '2026-09-10';
    const b = items.find((i) => i.code === 'CAP-470U');
    if (b) b.validTo = '2026-09-05';
  }
  return items;
}

export type PriceState = 'ok' | 'missing' | 'expired';

export interface PriceCheck {
  state: PriceState;
  label: string;
}

export function checkPrice(item: BomItem): PriceCheck {
  if (!item.tiers) return { state: 'missing', label: '缺价' };
  if (item.validTo !== '—' && item.validTo < DEMO_TODAY) {
    return { state: 'expired', label: `已于 ${item.validTo} 失效` };
  }
  return { state: 'ok', label: `有效至 ${item.validTo}` };
}
