// ============================================================
// shared/financial-metrics.ts — 邮政财务指标库与计算工具
// ============================================================

// ── 基础计算 ──

/** 同比变化率：100 * (current - previous) / previous */
export function calcYoY(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/** 环比变化率：100 * (current - previous) / previous */
export function calcMoM(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/** 格式化变化率为展示字符串，如 "+12.3%"、"-5.0万元" */
export function formatChange(change: number, unit?: string): string {
  const sign = change >= 0 ? "+" : "";
  const u = unit ?? "%";
  if (u === "%") {
    return `${sign}${change.toFixed(1)}%`;
  }
  return `${sign}${change.toFixed(0)}${u}`;
}

/**
 * 差异分析结果
 */
export interface VarianceResult {
  /** 差异额（实际 - 预算） */
  amount: number;
  /** 差异率（差异额 / 预算 * 100） */
  rate: number;
  /** 方向："超支" | "节约" | "持平" */
  direction: "超支" | "节约" | "持平";
  /** 是否有利差异 */
  favorable: boolean;
}

/** 差异分析：实际 vs 预算 */
export function analyzeVariance(actual: number, budget: number, isCost: boolean = false): VarianceResult {
  const amount = actual - budget;
  const rate = budget !== 0 ? (amount / budget) * 100 : 0;
  let direction: VarianceResult["direction"];
  if (Math.abs(rate) < 1) {
    direction = "持平";
  } else if (amount > 0) {
    direction = isCost ? "超支" : "节约";
  } else {
    direction = isCost ? "节约" : "超支";
  }
  // 成本类指标：节约是有利；收入类指标：超预算是有利
  const favorable = isCost ? amount < 0 : amount > 0;
  return { amount, rate, direction, favorable };
}

/** 格式化差异分析为中文摘要 */
export function formatVariance(v: VarianceResult): string {
  const absAmount = Math.abs(v.amount).toFixed(0);
  return `${v.direction}${absAmount}万元（差异率${v.rate.toFixed(1)}%）`;
}

// ── 邮政财务核心 KPI 定义 ──

export interface PostalKPI {
  /** KPI 名称 */
  name: string;
  /** 计算公式说明 */
  formula: string;
  /** 单位 */
  unit: string;
  /** 行业基准值或目标值 */
  benchmark: string;
  /** KPI 说明 */
  description: string;
}

export const POSTAL_FINANCE_KPIS: Record<string, PostalKPI> = {
  budgetCompletion: {
    name: "预算完成率",
    formula: "实际收入 / 预算收入 × 100%",
    unit: "%",
    benchmark: "≥100%",
    description: "衡量预算编制准确性和执行效率的核心指标",
  },
  perItemRevenue: {
    name: "件均收入",
    formula: "业务收入 / 业务量",
    unit: "元/件",
    benchmark: "同比提升",
    description: "反映业务单价水平和产品结构优化成效",
  },
  arCollectionRate: {
    name: "欠费收缴率",
    formula: "本期实收欠费 / 期初欠费余额 × 100%",
    unit: "%",
    benchmark: "≥95%",
    description: "衡量应收账款回收效率，影响现金流质量",
  },
  perItemCost: {
    name: "分环节件均成本",
    formula: "各环节成本 / 业务量",
    unit: "元/件",
    benchmark: "同比下降",
    description: "按收寄、运输、处理、投递、管理五环节核算单位成本",
  },
  laborCostProfitRate: {
    name: "人工成本利润率",
    formula: "利润总额 / 人工成本总额 × 100%",
    unit: "%",
    benchmark: "≥150%",
    description: "衡量人力投入产出效率",
  },
  revenueGrowth: {
    name: "收入增长率",
    formula: "(本期收入 - 同期收入) / 同期收入 × 100%",
    unit: "%",
    benchmark: "≥8%",
    description: "衡量收入增长速度和市场拓展成效",
  },
  costIncomeRatio: {
    name: "成本收入比",
    formula: "总成本 / 总收入 × 100%",
    unit: "%",
    benchmark: "≤85%",
    description: "反映每单位收入对应的成本投入，是效率核心指标",
  },
  profitMargin: {
    name: "利润率",
    formula: "利润 / 收入 × 100%",
    unit: "%",
    benchmark: "≥5%",
    description: "综合盈利能力的最终体现",
  },
};

// ── 分环节成本分解模板 ──

export const SEGMENT_COST_BREAKDOWN = {
  stages: [
    { key: "pickup",    label: "收寄环节",  description: "营业网点揽收、收寄人员薪酬、收寄设备折旧" },
    { key: "transport", label: "运输环节",  description: "干线运输费、市内转趟、车辆折旧、燃油费" },
    { key: "processing",label: "处理环节",  description: "邮件处理中心分拣、装卸、场地租赁" },
    { key: "delivery",  label: "投递环节",  description: "投递人员薪酬、投递车辆、末端驿站" },
    { key: "admin",     label: "管理环节",  description: "管理人员薪酬、办公费、信息系统维护" },
  ],
  template: "分环节成本分析：按 [环节] 核算，实际 XX 万元/月（件均 XX 元），同比 ±XX%，预算差异 ±XX%",
} as const;

// ── "三把尺子"对标框架 ──

export const THREE_RULERS_FRAMEWORK = {
  description: `邮政财务分析"三把尺子"对标方法论`,
  rulers: [
    {
      name: "与预算比",
      question: "完成预算多少？",
      usage: "评估预算执行进度和编制质量",
      formula: "差异率 = (实际 - 预算) / 预算 × 100%",
      green: "±5%以内",
      yellow: "±5%~15%",
      red: "±15%以上",
    },
    {
      name: "与同期比",
      question: "比去年好多少？",
      usage: "评估业务发展趋势和成长性",
      formula: "同比 = (本期 - 同期) / |同期| × 100%",
      green: "增长≥8%",
      yellow: "增长0%~8%",
      red: "负增长",
    },
    {
      name: "与标杆比",
      question: "在全国/行业什么水平？",
      usage: "评估竞争力和改善空间",
      formula: "对标差异 = 本省指标 - 全国平均（或先进省份）",
      green: "高于全国平均",
      yellow: "接近全国平均（±3%）",
      red: "低于全国平均",
    },
  ],
} as const;

// ── 邮政收入结构模板 ──

export const POSTAL_REVENUE_STRUCTURE = {
  categories: [
    { key: "letter",       label: "函件业务",  share: "≈5%",  trend: "结构性下降" },
    { key: "parcel",       label: "包裹业务",  share: "≈15%", trend: "平稳增长" },
    { key: "express",      label: "快递物流",  share: "≈35%", trend: "高速增长" },
    { key: "financial",    label: "代理金融",  share: "≈30%", trend: "稳定贡献" },
    { key: "other",        label: "其他业务",  share: "≈15%", trend: "多元拓展" },
  ],
  template: "收入结构分析：XX 业务占比 XX%（XX 万元），同比 ±XX 个百分点，主要驱动因素是 [归因]",
} as const;
