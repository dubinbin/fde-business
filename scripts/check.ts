import { computeQuote, DEFAULT_QUOTE_INPUT } from '../src/lib/quote';
import { round } from '../src/lib/money';
import { parseInquiry } from '../src/lib/nlp';

let fail = 0;
function ok(name: string, cond: boolean, extra = '') {
  if (!cond) fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
}

for (const qty of [1000, 5000, 10000, 2500, 12345]) {
  const r = computeQuote({ ...DEFAULT_QUOTE_INPUT, qty });
  const sumMat = round(
    r.materials.reduce((s, m) => s + (m.amount ?? 0), 0),
    2,
  );
  const sumProc = round(
    r.process.reduce((s, p) => s + p.amount, 0),
    2,
  );
  const sumAll = round(
    r.materialCost + r.processCost + r.scrap + r.packFreight + r.overhead + r.tooling,
    2,
  );
  ok(`[${qty}] 材料明细和 = 材料成本`, sumMat === r.materialCost, `${sumMat} vs ${r.materialCost}`);
  ok(`[${qty}] 加工明细和 = 加工成本`, sumProc === r.processCost);
  ok(`[${qty}] 成本构成和 = 单位总成本`, sumAll === r.unitCost, `${sumAll} vs ${r.unitCost}`);
  const expectEx = round(r.unitCost! / (1 - 0.15), 2);
  ok(`[${qty}] 未税单价公式`, r.unitPriceExTax === expectEx, `${r.unitPriceExTax} vs ${expectEx}`);
  const expectTax = round(r.unitPriceExTax! * 1.13, 2);
  ok(`[${qty}] 含税单价公式`, r.unitPriceTax === expectTax);
  const grossPct = round(((r.unitPriceExTax! - r.unitCost!) / r.unitPriceExTax!) * 100, 4);
  ok(`[${qty}] 毛利率回算 ≈ 15%`, Math.abs(grossPct - 15) < 0.02, `${grossPct}%`);
  ok(`[${qty}] 订单含税总额 = 含税单价 × 数量`, r.totalTaxIncl === round(r.unitPriceTax! * qty, 2));
}

// 缺价
const miss = computeQuote({ ...DEFAULT_QUOTE_INPUT, dataState: 'missing' });
ok('缺价：不出单位总成本', miss.unitCost === null);
ok('缺价：blocked', miss.blocked && miss.missing.length === 1);
ok(
  '缺价：材料成本 = 已知项之和',
  miss.materialCost === round(miss.materials.reduce((s, m) => s + (m.amount ?? 0), 0), 2),
);
ok('缺价：已知小计 > 0', miss.unitCostPartial > 0);

// 过期
const exp = computeQuote({ ...DEFAULT_QUOTE_INPUT, dataState: 'expired' });
ok('过期：标记为待确认且 blocked', exp.blocked && exp.expired.length === 2);
ok('过期：仍算出参考值', exp.unitCost !== null && exp.unitPriceTax !== null);

// 采购方案系数
for (const planId of ['agreement', 'negotiation', 'spot'] as const) {
  const a = computeQuote({ ...DEFAULT_QUOTE_INPUT, planId });
  ok(`方案 ${planId} 一致性`, a.unitCost === round(a.materialCost + a.processCost + a.scrap + a.packFreight + a.overhead + a.tooling, 2));
}

// 交付条件
for (const deliveryId of ['exw', 'dap', 'install'] as const) {
  const a = computeQuote({ ...DEFAULT_QUOTE_INPUT, deliveryId });
  ok(`交付 ${deliveryId} 一致性`, a.packFreight === round(a.packDetail.pack + a.packDetail.freight + a.packDetail.delivery, 2));
}

// 自然语言
const p = parseInquiry('给客户A报5000件控制器，目标毛利15%，分别看一下1000件和10000件的价格。');
ok('NL 产品', p.product.value === 'CTRL-001');
ok('NL 数量', JSON.stringify(p.quantities.values) === '[5000,1000,10000]', JSON.stringify(p.quantities.values));
ok('NL 毛利', p.marginPct.value === 15);
ok('NL 税率未识别', p.taxPct.value === null);

const p2 = parseInquiry('控制器报一万五千件，毛利率 12%，税率 13%');
ok('NL 中文数字', p2.quantities.values[0] === 15000, String(p2.quantities.values[0]));
ok('NL 税率', p2.taxPct.value === 13);

const p3 = parseInquiry('你好');
ok('NL 无法解析时不假装理解', p3.unresolved.length === 3 && !p3.anyHit);

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
