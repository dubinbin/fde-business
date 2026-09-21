import {
  ASSUMPTIONS,
  DELIVERY_TERMS,
  PROCESS,
  PURCHASE_PLANS,
  PRODUCT,
  TIERS,
  checkPrice,
  deriveBom,
  tierIndex,
  type BomItem,
  type DataStateId,
  type DeliveryTerm,
  type PurchasePlan,
} from '../data/quote';
import { round } from './money';

export interface QuoteInput {
  qty: number;
  /** 目标毛利率（百分比，0 < margin < 100） */
  marginPct: number;
  /** 演示销项税率（百分比） */
  taxPct: number;
  planId: PurchasePlan['id'];
  deliveryId: DeliveryTerm['id'];
  dataState: DataStateId;
  /** 模具摊销数量 */
  amortQty: number;
}

export interface MaterialLine {
  code: string;
  name: string;
  spec: string;
  qtyPer: number;
  unit: string;
  /** 阶梯未税单价（含采购方案系数），null = 缺价 */
  unitPrice: number | null;
  /** 原始阶梯价（未加系数） */
  basePrice: number | null;
  amount: number | null;
  tierLabel: string;
  source: string;
  validFrom: string;
  validTo: string;
  priceState: 'ok' | 'missing' | 'expired';
  priceLabel: string;
}

export interface ProcessLine {
  name: string;
  hoursPerUnit: number;
  rate: number;
  amount: number;
}

export interface QuoteResult {
  qty: number;
  tierIdx: number;
  tierLabel: string;
  plan: PurchasePlan;
  delivery: DeliveryTerm;
  materials: MaterialLine[];
  process: ProcessLine[];
  materialCost: number;
  materialKnownOnly: boolean;
  missing: MaterialLine[];
  expired: MaterialLine[];
  processCost: number;
  scrap: number;
  scrapBase: number;
  packFreight: number;
  packDetail: { pack: number; freight: number; delivery: number };
  overhead: number;
  overheadBase: number;
  tooling: number;
  toolingTotal: number;
  amortQty: number;
  /** 单位总成本：存在缺价时为 null */
  unitCost: number | null;
  /** 已知部分单位成本小计（缺价时可用） */
  unitCostPartial: number;
  unitPriceExTax: number | null;
  unitPriceTax: number | null;
  totalExTax: number | null;
  taxAmount: number | null;
  totalTaxIncl: number | null;
  unitGross: number | null;
  blocked: boolean;
  blockReasons: string[];
  statusText: string;
  basis: string[];
}

/** 有效单价：小于 1 保留 3 位，否则 2 位，保证「显示单价 × 用量 ≈ 显示金额」 */
function effectivePrice(v: number): number {
  return Math.abs(v) < 1 ? round(v, 3) : round(v, 2);
}

export function buildMaterials(
  items: BomItem[],
  qty: number,
  factor: number,
): MaterialLine[] {
  const idx = tierIndex(qty);
  return items.map((it) => {
    const chk = checkPrice(it);
    const base = it.tiers ? it.tiers[idx] : null;
    const unitPrice = base === null ? null : effectivePrice(base * factor);
    return {
      code: it.code,
      name: it.name,
      spec: it.spec,
      qtyPer: it.qtyPer,
      unit: it.unit,
      unitPrice,
      basePrice: base,
      amount: unitPrice === null ? null : round(unitPrice * it.qtyPer, 2),
      tierLabel: TIERS[idx].label,
      source: it.source,
      validFrom: it.validFrom,
      validTo: it.validTo,
      priceState: chk.state,
      priceLabel: chk.label,
    };
  });
}

export function computeQuote(input: QuoteInput): QuoteResult {
  const plan = PURCHASE_PLANS.find((p) => p.id === input.planId) ?? PURCHASE_PLANS[0];
  const delivery = DELIVERY_TERMS.find((d) => d.id === input.deliveryId) ?? DELIVERY_TERMS[0];
  const bom = deriveBom(input.dataState);

  const materials = buildMaterials(bom, input.qty, plan.factor);
  const missing = materials.filter((m) => m.priceState === 'missing');
  const expired = materials.filter((m) => m.priceState === 'expired');

  // 材料成本 = 已知价格明细之和（缺价项不计入，也不按 0 计入）
  const materialCost = round(
    materials.reduce((s, m) => s + (m.amount ?? 0), 0),
    2,
  );

  const process: ProcessLine[] = PROCESS.map((p) => ({
    name: p.name,
    hoursPerUnit: p.hoursPerUnit,
    rate: p.rate,
    amount: round(p.hoursPerUnit * p.rate, 2),
  }));
  const processCost = round(
    process.reduce((s, p) => s + p.amount, 0),
    2,
  );

  const scrapBase = materialCost;
  const scrap = round(scrapBase * ASSUMPTIONS.scrapRate, 2);

  const packDetail = {
    pack: round(ASSUMPTIONS.packUnit, 2),
    freight: round(ASSUMPTIONS.freightUnit, 2),
    delivery: round(delivery.perUnit, 2),
  };
  const packFreight = round(packDetail.pack + packDetail.freight + packDetail.delivery, 2);

  const overheadBase = round(materialCost + processCost, 2);
  const overhead = round(overheadBase * ASSUMPTIONS.overheadRate, 2);

  const amortQty = Math.max(1, Math.round(input.amortQty));
  const tooling = round(ASSUMPTIONS.toolingTotal / amortQty, 2);

  const unitCostPartial = round(
    materialCost + processCost + scrap + packFreight + overhead + tooling,
    2,
  );
  const hasMissing = missing.length > 0;
  const unitCost = hasMissing ? null : unitCostPartial;

  const marginRatio = input.marginPct / 100;
  const unitPriceExTax =
    unitCost === null ? null : round(unitCost / (1 - marginRatio), 2);
  const unitPriceTax =
    unitPriceExTax === null ? null : round(unitPriceExTax * (1 + input.taxPct / 100), 2);

  // 报价单口径：含税单价 × 数量 = 含税金额；税额 = 含税金额 − 未税金额
  const totalExTax = unitPriceExTax === null ? null : round(unitPriceExTax * input.qty, 2);
  const totalTaxIncl = unitPriceTax === null ? null : round(unitPriceTax * input.qty, 2);
  const taxAmount =
    totalExTax === null || totalTaxIncl === null ? null : round(totalTaxIncl - totalExTax, 2);
  const unitGross = unitPriceExTax === null || unitCost === null ? null : round(unitPriceExTax - unitCost, 2);

  const blockReasons: string[] = [];
  if (hasMissing) {
    blockReasons.push(
      `${missing.map((m) => `${m.code} ${m.name}`).join('、')} 缺少有效价格，成本待补全，不能生成正式报价单。`,
    );
  }
  if (expired.length > 0) {
    blockReasons.push(
      `${expired.map((m) => `${m.code} ${m.name}`).join('、')} 的报价已过失效日期，需采购更新或书面确认后才能作为有效价格。`,
    );
  }

  let statusText: string;
  if (hasMissing) statusText = '成本待补全';
  else if (expired.length > 0) statusText = '存在待确认价格（当前为参考值）';
  else statusText = '可生成正式报价单';

  const basis: string[] = [
    `产品：${PRODUCT.code} ${PRODUCT.name}；数量 ${input.qty.toLocaleString('zh-CN')} 台，取价阶梯「${TIERS[tierIndex(input.qty)].label}」。`,
    `材料成本 = Σ（单台用量 × 阶梯未税单价 × 采购方案系数 ${plan.factor}）= ${materialCost.toFixed(2)} 元。`,
    `加工成本 = Σ（单台工时 × 费率）= ${processCost.toFixed(2)} 元。`,
    `损耗 = 材料成本 ${scrapBase.toFixed(2)} × ${(ASSUMPTIONS.scrapRate * 100).toFixed(1)}% = ${scrap.toFixed(2)} 元（基数：${ASSUMPTIONS.scrapBase}）。`,
    `包装物流 = 包装 ${packDetail.pack.toFixed(2)} + 物流 ${packDetail.freight.toFixed(2)} + 交付附加 ${packDetail.delivery.toFixed(2)}（${delivery.name}）= ${packFreight.toFixed(2)} 元。`,
    `管理费用 = （材料 ${materialCost.toFixed(2)} + 加工 ${processCost.toFixed(2)}）× ${(ASSUMPTIONS.overheadRate * 100).toFixed(1)}% = ${overhead.toFixed(2)} 元（基数：${ASSUMPTIONS.overheadBase}）。`,
    `单位模具摊销 = 模具总额 ${ASSUMPTIONS.toolingTotal.toLocaleString('zh-CN')} 元 ÷ 摊销数量 ${amortQty.toLocaleString('zh-CN')} 台 = ${tooling.toFixed(2)} 元。`,
    `单位总成本 = 材料 + 加工 + 损耗 + 包装物流 + 管理费用 + 模具摊销 = ${unitCostPartial.toFixed(2)} 元${hasMissing ? '（已知部分小计，缺价项未计入）' : ''}。`,
    unitCost === null
      ? '未税单价：因存在缺价，不出计算结果。'
      : `未税单价 = ${unitCost.toFixed(2)} ÷（1 − ${input.marginPct}%）= ${unitPriceExTax!.toFixed(2)} 元；含税单价 = ${unitPriceExTax!.toFixed(2)} ×（1 + ${input.taxPct}%）= ${unitPriceTax!.toFixed(2)} 元。`,
    totalExTax === null || totalTaxIncl === null
      ? '订单金额：因存在缺价，不出计算结果。'
      : `订单金额：未税 ${totalExTax.toFixed(2)} = 未税单价 × 数量；含税 ${totalTaxIncl!.toFixed(2)} = 含税单价 × 数量；税额 = 含税 − 未税 = ${taxAmount!.toFixed(2)} 元。`,
    '所有金额按四舍五入到「分」展示，合计由已舍入的明细相加得到，因此明细与合计一致。',
    '税率、损耗率、管理费率、模具摊销数量均为演示假设，不代表任何企业的实际口径。',
  ];

  return {
    qty: input.qty,
    tierIdx: tierIndex(input.qty),
    tierLabel: TIERS[tierIndex(input.qty)].label,
    plan,
    delivery,
    materials,
    process,
    materialCost,
    materialKnownOnly: hasMissing,
    missing,
    expired,
    processCost,
    scrap,
    scrapBase,
    packFreight,
    packDetail,
    overhead,
    overheadBase,
    tooling,
    toolingTotal: ASSUMPTIONS.toolingTotal,
    amortQty,
    unitCost,
    unitCostPartial,
    unitPriceExTax,
    unitPriceTax,
    totalExTax,
    taxAmount,
    totalTaxIncl,
    unitGross,
    blocked: blockReasons.length > 0,
    blockReasons,
    statusText,
    basis,
  };
}

/** 数量阶梯对比 */
export function compareTiers(input: QuoteInput, quantities: number[]): QuoteResult[] {
  return quantities.map((q) => computeQuote({ ...input, qty: q }));
}

export const DEFAULT_QUOTE_INPUT: QuoteInput = {
  qty: 5000,
  marginPct: 15,
  taxPct: 13,
  planId: 'agreement',
  deliveryId: 'exw',
  dataState: 'complete',
  amortQty: ASSUMPTIONS.toolingAmortQty,
};
