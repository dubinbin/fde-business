/**
 * 有限规则的自然语言解析（演示用）
 *
 * 只识别四类字段：产品、数量、目标毛利、税率。
 * 解析不出来的字段会明确提示，由表单补全 —— 不假装能理解任意自然语言。
 */

export interface ParsedField<T> {
  value: T | null;
  /** 命中的原文片段 */
  raw?: string;
}

export interface NlpResult {
  product: ParsedField<string>;
  quantities: { values: number[]; raw: string[] };
  marginPct: ParsedField<number>;
  taxPct: ParsedField<number>;
  /** 未识别、需要表单补全的字段 */
  unresolved: string[];
  /** 是否至少识别出一个有效字段 */
  anyHit: boolean;
}

const CN_NUM: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

/** 把「一万五千」这类中文数字转成 15000；不支持则返回 null */
function cnNumber(s: string): number | null {
  if (!/^[零一二两三四五六七八九十百千万]+$/.test(s)) return null;
  let total = 0;
  let section = 0;
  let cur = 0;
  for (const ch of s) {
    if (ch in CN_NUM) {
      cur = CN_NUM[ch];
    } else if (ch === '十') {
      section += (cur === 0 ? 1 : cur) * 10;
      cur = 0;
    } else if (ch === '百') {
      section += (cur === 0 ? 1 : cur) * 100;
      cur = 0;
    } else if (ch === '千') {
      section += (cur === 0 ? 1 : cur) * 1000;
      cur = 0;
    } else if (ch === '万') {
      section = (section + cur) * 10000;
      total += section;
      section = 0;
      cur = 0;
    }
  }
  total += section + cur;
  return total > 0 ? total : null;
}

/** 从文本中抽取所有数量候选 */
function extractQuantities(text: string): { values: number[]; raw: string[] } {
  const values: number[] = [];
  const raw: string[] = [];
  const push = (v: number, r: string) => {
    if (v > 0 && v <= 10_000_000 && !values.includes(v)) {
      values.push(v);
      raw.push(r);
    }
  };

  // 阿拉伯数字 + 量词
  const reArabic = /(\d[\d,\s]*)\s*(件|台|个|只|套|pcs|PCS|片)/g;
  let m: RegExpExecArray | null;
  while ((m = reArabic.exec(text))) {
    const v = parseInt(m[1].replace(/[,\s]/g, ''), 10);
    push(v, m[0].trim());
  }

  // 中文数字 + 量词：一万五千件 / 五千台
  const reCn = /([零一二两三四五六七八九十百千万]+)\s*(件|台|个|只|套|片)/g;
  while ((m = reCn.exec(text))) {
    const v = cnNumber(m[1]);
    if (v) push(v, m[0].trim());
  }

  // 纯中文数字（无量词），如「先看一下一万和五千」
  if (values.length === 0) {
    const reBare = /([零一二两三四五六七八九十千万]{2,})/g;
    while ((m = reBare.exec(text))) {
      const v = cnNumber(m[1]);
      if (v) push(v, m[0].trim());
    }
  }
  return { values, raw };
}

export function parseInquiry(text: string): NlpResult {
  const t = text.replace(/\s+/g, ' ');

  // 产品
  let product: ParsedField<string> = { value: null };
  if (/CTRL\s*-?\s*001/i.test(t)) {
    product = { value: 'CTRL-001', raw: t.match(/CTRL\s*-?\s*001/i)![0] };
  } else if (/控制器/.test(t)) {
    product = { value: 'CTRL-001', raw: '控制器' };
  }

  // 数量
  const quantities = extractQuantities(t);

  // 目标毛利：优先「毛利 15%」/「毛利率15%」，其次「15% 毛利」
  let marginPct: ParsedField<number> = { value: null };
  let mm = t.match(/毛利(?:率)?\s*(?:目标)?\s*(?:为|是|:|：)?\s*(\d+(?:\.\d+)?)\s*%/);
  if (!mm) mm = t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:的)?\s*毛利/);
  if (mm) {
    const v = parseFloat(mm[1]);
    marginPct = { value: v, raw: mm[0] };
  }

  // 税率
  let taxPct: ParsedField<number> = { value: null };
  const tm = t.match(/(?:销项)?税(?:率)?\s*(?:为|是|:|：)?\s*(\d+(?:\.\d+)?)\s*%/);
  if (tm) {
    const v = parseFloat(tm[1]);
    taxPct = { value: v, raw: tm[0] };
  }

  const unresolved: string[] = [];
  if (!product.value) unresolved.push('产品');
  if (quantities.values.length === 0) unresolved.push('数量');
  if (marginPct.value === null) unresolved.push('目标毛利率');

  const anyHit =
    !!product.value || quantities.values.length > 0 || marginPct.value !== null || taxPct.value !== null;

  return { product, quantities, marginPct, taxPct, unresolved, anyHit };
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateQuoteInput(qty: number, marginPct: number, taxPct: number, amortQty: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(qty) || qty <= 0) {
    issues.push({ field: '数量', message: '数量必须是正整数。' });
  } else if (qty > 1_000_000) {
    issues.push({ field: '数量', message: '演示范围：数量不超过 1,000,000。' });
  }
  if (!Number.isFinite(marginPct) || marginPct <= 0 || marginPct >= 100) {
    issues.push({ field: '目标毛利率', message: '毛利率必须大于 0% 且小于 100%。' });
  }
  if (!Number.isFinite(taxPct) || taxPct < 0 || taxPct >= 100) {
    issues.push({ field: '税率', message: '演示税率需在 0% – 100% 之间。' });
  }
  if (!Number.isInteger(amortQty) || amortQty <= 0) {
    issues.push({ field: '模具摊销数量', message: '摊销数量必须是正整数。' });
  }
  return issues;
}
