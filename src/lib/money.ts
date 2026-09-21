/**
 * 金额与数值工具
 *
 * 口径约定：
 * - 所有中间计算使用完整精度（number），只在「展示」与「出报价单」两个环节做舍入。
 * - 为了保证「明细之和 === 合计」，聚合值一律由「已舍入的明细项」相加得到，
 *   而不是由未舍入的中间值相加后再舍入。
 */

/** 四舍五入到指定小数位（half-up，避免 toFixed 的银行家舍入歧义） */
export function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, digits);
  // 处理浮点误差：先放大到整数附近再做判定
  const scaled = value * f;
  const r = Math.round(scaled + (scaled >= 0 ? 1e-9 : -1e-9));
  return r / f;
}

/** 两位小数金额：1,234.50 */
export function money(v: number): string {
  const n = round(v, 2);
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 单价：小于 1 保留 3 位，否则 2 位 */
export function price(v: number): string {
  const abs = Math.abs(v);
  const digits = abs < 1 ? 3 : 2;
  return round(v, digits).toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 整数：1,234 */
export function int(v: number): string {
  return Math.round(v).toLocaleString('zh-CN');
}

/** 百分比：15.0% */
export function pct(v: number, digits = 1): string {
  return `${round(v, digits).toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** 安全数字解析，失败返回 fallback */
export function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

/** 正整数校验 */
export function isPositiveInt(v: number): boolean {
  return Number.isInteger(v) && v > 0;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** ISO 日期 YYYY-MM-DD */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(base: Date | string, days: number): Date {
  const d = base instanceof Date ? new Date(base.getTime()) : new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

/** 两个 YYYY-MM-DD 相差天数 */
export function diffDays(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86400000);
}

/** 中文星期 */
export function weekday(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(`${d}T00:00:00`);
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
}
