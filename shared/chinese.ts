// ============================================================
// shared/chinese.ts — 中文序号工具
// ============================================================

const CHINESE_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const TENS_PREFIX = ["", "十", "二十", "三十", "四十", "五十", "六十", "七十", "八十", "九十"];

/**
 * 将数字转为中文序号（如 1→"一", 11→"十一", 23→"二十三"）
 * 仅支持 1-99，超出范围返回数字字符串
 */
export function toChineseOrdinal(n: number): string {
  if (n < 1 || n > 99) return `${n}`;
  if (n <= 10) return CHINESE_DIGITS[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const onesStr = CHINESE_DIGITS[ones]!;
  return `${TENS_PREFIX[tens]!}${onesStr}`;
}
