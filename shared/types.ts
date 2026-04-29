// ============================================================
// shared/types.ts — 跨 Skill 共享类型定义（单一真相源）
// ============================================================

// ── 材料类型 ──

export type DocType = "report" | "minutes" | "speech" | "notice" | "financial-analysis" | "request-for-approval" | "budget-preparation";

// ══════════════════════════════════════════════════════════
// A. report — 周期性报告（周报 / 月报 / 工作总结）
// ══════════════════════════════════════════════════════════

export interface ReportAnalysis {
  type: "report";
  /** 报告周期，如"2026年4月第4周" */
  period: string;
  /** 作者姓名（可留空，读 .env AUTHOR_NAME） */
  author: string;
  /** 本周期已完成事项（每条含可量化结果） */
  completed_items: string[];
  /** 仍在推进的事项（含当前进度百分比或阶段说明） */
  ongoing_items: string[];
  /** 阻碍 / 问题（可为空数组；含影响范围描述） */
  blockers: string[];
  /** 下一周期计划（每条含时间节点） */
  next_period_plan: string[];
  /** 关键指标键值对，如 { "完成任务数": "12项" } */
  key_metrics: Record<string, string>;
  /** 目标字数（可留空，读 .env ARTICLE_WORD_TARGET） */
  word_target: number;
}

export function validateReport(a: ReportAnalysis): string[] {
  const e: string[] = [];
  if (!a.period)                   e.push("period 为空");
  if (!a.completed_items?.length)  e.push("completed_items 为空");
  if (!a.next_period_plan?.length) e.push("next_period_plan 为空");
  return e;
}

// ══════════════════════════════════════════════════════════
// B. minutes — 会议纪要
// ══════════════════════════════════════════════════════════

export interface ActionItem {
  /** 行动描述（动词开头，如"完成XX方案报批"） */
  action: string;
  /** 责任人姓名或部门 */
  owner: string;
  /** 截止日期，如"2026-05-07" */
  deadline: string;
  /** 优先级：高 / 中 / 低 */
  priority?: "高" | "中" | "低";
}

export interface MinutesAnalysis {
  type: "minutes";
  /** 会议名称 */
  meeting_title: string;
  /** 会议日期，如"2026-04-28" */
  date: string;
  /** 会议地点 */
  venue?: string;
  /** 主持人姓名 */
  chair?: string;
  /** 记录人姓名 */
  recorder?: string;
  /** 参会人员 */
  attendees: string[];
  /** 议程列表 */
  agenda: string[];
  /** 决议事项（动词开头，如"决定于X日前完成XX"） */
  decisions: string[];
  /** 行动项（含责任人 + 截止日，可为空数组） */
  action_items: ActionItem[];
  /** 下次会议时间/说明（可为空） */
  next_meeting?: string;
  /** 一段话摘要，供领导快读（可为空） */
  summary_for_leader?: string;
}

export function validateMinutes(a: MinutesAnalysis): string[] {
  const e: string[] = [];
  if (!a.meeting_title)     e.push("meeting_title 为空");
  if (!a.date)              e.push("date 为空");
  if (!a.attendees?.length) e.push("attendees 为空");
  if (!a.decisions?.length) e.push("decisions 为空");
  // action_items 允许为空（纯汇报类会议无需行动项）
  return e;
}

// ══════════════════════════════════════════════════════════
// C. speech — 会议发言稿
// ══════════════════════════════════════════════════════════

export interface SpeechAnalysis {
  type: "speech";

  // ── 标题 ──
  /** 建议的完整讲话标题，如"在2026年财务工作会议上的讲话" */
  title_suggestion?: string;
  /** 标题类型：场合型 / 主题型 / 任务型 / 述职型 */
  title_type?: "场合型" | "主题型" | "任务型" | "述职型";

  // ── 基础字段 ──
  /** 发言核心主题，4-8个字，用于骨架回退标题 */
  topic: string;
  /** 发言场合全称，如"2026年广东邮政财务工作会议" */
  occasion: string;
  /** 发言时长（分钟），用于字数控制 */
  duration_min: number;
  /** 听众描述，如"各地市分公司领导班子及财务负责人" */
  audience: string;

  // ── 内容结构 ──
  /** 正文结构类型：并列式 / 递进式 / SCQA式 */
  structure?: "并列式" | "递进式" | "SCQA式";
  /** 核心论点（3–4 条，结论性完整陈述，20字内，支撑金字塔各节） */
  key_points: string[];
  /** 各论点对应的可引用数据/案例（与 key_points 等长，无数据填空字符串） */
  data_to_cite: string[];
  /** 发言基调：confident=自信坚定 / humble=谦逊务实 / neutral=平实陈述 */
  tone?: "confident" | "humble" | "neutral";
  /** 发言背景：会议主题、发言人角色、关键约束 */
  background?: string;

  // ── 金句素材 ──
  /** 可发展为金句的原始素材（每条对应一个 key_point，多余的给结语用） */
  golden_quote_seeds?: string[];
  /** 开场引用语，如习近平讲话原文或权威政策表述（可留空） */
  opening_quote?: string;
}

export function validateSpeech(a: SpeechAnalysis): string[] {
  const e: string[] = [];
  if (!a.topic)              e.push("topic 为空");
  if (!a.occasion)           e.push("occasion 为空");
  if (!a.duration_min)       e.push("duration_min 为空或为 0");
  if (!a.audience)           e.push("audience 为空");
  if (!a.key_points?.length) e.push("key_points 为空");
  return e;
}

// ══════════════════════════════════════════════════════════
// D. notice — 会议通知
// ══════════════════════════════════════════════════════════

export interface NoticeAnalysis {
  type: "notice";
  /** 发文字号，如"粤邮分〔2026〕12号"（可留空） */
  doc_number?: string;
  /** 会议名称，如"2026年第二季度财务分析会" */
  meeting_title: string;
  /** 会议时间，含星期，如"2026年5月15日（星期四）下午14:00" */
  meeting_time: string;
  /** 会议地点，如"省分公司10楼大会议室" */
  venue: string;
  /** 参会人员范围（用职能范围描述，不列具体姓名），如["各地市分公司财务部负责人"] */
  attendees: string[];
  /** 会议议题列表（每条15字以内） */
  agenda: string[];
  /** 具体要求（携带材料、回复截止、差旅食宿、请假说明等） */
  requirements: string[];
  /** 联系人及联系方式 */
  contact?: string;
  /** 是否需要提前回复/报名确认 */
  rsvp?: boolean;
  /** 发文机关（留空则取 org.name） */
  issuer?: string;
  /** 发文日期（留空则取当天，中文年月日格式） */
  issue_date?: string;
}

export function validateNotice(a: NoticeAnalysis): string[] {
  const e: string[] = [];
  if (!a.meeting_title)     e.push("meeting_title 为空");
  if (!a.meeting_time)      e.push("meeting_time 为空");
  if (!a.venue)             e.push("venue 为空");
  if (!a.attendees?.length) e.push("attendees 为空");
  if (!a.agenda?.length)    e.push("agenda 为空");
  return e;
}

// ══════════════════════════════════════════════════════════
// E. financial-analysis — 财务分析报告
// ══════════════════════════════════════════════════════════

export interface MetricItem {
  /** 指标实际完成值 */
  actual: string;
  /** 预算目标值 */
  budget?: string;
  /** 同比变化（百分比字符串，如 "+8.5%"） */
  yoy_change?: string;
  /** 环比变化（百分比字符串，如 "+2.1%"） */
  mom_change?: string;
  /** 补充说明 */
  note?: string;
}

export interface SegmentAnalysis {
  /** 业务板块/环节名称，如"寄递业务""代理金融" */
  segment: string;
  /** 收入完成情况 */
  revenue: string;
  /** 成本发生情况 */
  cost: string;
  /** 利润 */
  profit: string;
  /** 关键驱动因素或变化原因 */
  key_drivers: string[];
}

export interface RiskItem {
  /** 风险事项名称 */
  item: string;
  /** 严重程度 */
  severity: "高" | "中" | "低";
  /** 涉及金额（可为空） */
  amount?: string;
  /** 应对建议 */
  suggestion: string;
}

export interface FinancialAnalysis {
  type: "financial-analysis";
  /** 分析周期，如"2026年第一季度" */
  period: string;
  /** 作者姓名 */
  author: string;
  /** 核心财务指标 */
  metrics: MetricItem[];
  /** 总体评价（一段话，概述本期经营特点，30-50字） */
  overview: string;
  /** 分业务/分环节分析 */
  segments: SegmentAnalysis[];
  /** 关键风险提示 */
  risks: RiskItem[];
  /** 工作亮点（每条含数据和结论） */
  highlights: string[];
  /** 存在问题 */
  problems: string[];
  /** 下一步建议（每条含具体措施和时间节点） */
  suggestions: string[];
  /** 目标字数 */
  word_target: number;
}

export function validateFinancialAnalysis(a: FinancialAnalysis): string[] {
  const e: string[] = [];
  if (!a.period)                  e.push("period 为空");
  if (!a.metrics?.length)        e.push("metrics 为空");
  if (!a.segments?.length)       e.push("segments 为空");
  if (!a.suggestions?.length)    e.push("suggestions 为空");
  return e;
}

// ══════════════════════════════════════════════════════════
// F. request-for-approval — 请示
// ══════════════════════════════════════════════════════════

export interface RequestForApprovalAnalysis {
  type: "request-for-approval";
  /** 请示标题，如"关于追加2026年设备采购预算的请示" */
  title: string;
  /** 主送机关 */
  recipient: string;
  /** 请示事由（核心事项，一文一事） */
  subject: string;
  /** 请示依据（政策/文件/会议决定等） */
  basis: string[];
  /** 涉及金额（可为空，如不涉及经费） */
  amount?: string;
  /** 已征求意见的部门或单位 */
  opinions_solicited: string[];
  /** 会签意见 */
  countersign_opinions: string[];
  /** 附件清单 */
  attachments: string[];
  /** 联系人姓名 */
  contact: string;
  /** 联系人电话 */
  contact_phone: string;
  /** 作者姓名 */
  author: string;
  /** 目标字数 */
  word_target: number;
}

export function validateRequestForApproval(a: RequestForApprovalAnalysis): string[] {
  const e: string[] = [];
  if (!a.title)          e.push("title 为空");
  if (!a.recipient)      e.push("recipient 为空");
  if (!a.subject)        e.push("subject 为空");
  if (!a.basis?.length)  e.push("basis 为空");
  return e;
}

// ══════════════════════════════════════════════════════════
// G. budget-preparation — 预算编制说明
// ══════════════════════════════════════════════════════════

export interface BudgetItem {
  /** 项目名称 */
  name: string;
  /** 本期预算金额 */
  amount: string;
  /** 上期金额 */
  lastPeriodAmount?: string;
  /** 变动百分比，如 "+15%" */
  changePct?: string;
  /** 测算依据 */
  rationale: string;
}

export interface BudgetPreparationAnalysis {
  type: "budget-preparation";
  /** 预算年度，如"2027年" */
  fiscal_year: string;
  /** 编制单位 */
  unit: string;
  /** 编制依据说明 */
  preparation_basis: string[];
  /** 收入预算项目 */
  revenue_items: BudgetItem[];
  /** 成本预算项目 */
  cost_items: BudgetItem[];
  /** 项目预算 */
  project_items: BudgetItem[];
  /** 特别说明事项 */
  special_notes: string[];
  /** 作者姓名 */
  author: string;
  /** 目标字数 */
  word_target: number;
}

export function validateBudgetPreparation(a: BudgetPreparationAnalysis): string[] {
  const e: string[] = [];
  if (!a.fiscal_year)            e.push("fiscal_year 为空");
  if (!a.preparation_basis?.length) e.push("preparation_basis 为空");
  if (!a.cost_items?.length)     e.push("cost_items 为空");
  return e;
}

// ══════════════════════════════════════════════════════════
// 联合类型 + 通用校验入口
// ══════════════════════════════════════════════════════════

export type DocAnalysis = ReportAnalysis | MinutesAnalysis | SpeechAnalysis | NoticeAnalysis | FinancialAnalysis | RequestForApprovalAnalysis | BudgetPreparationAnalysis;

export function validateDocAnalysis(a: DocAnalysis): string[] {
  switch (a.type) {
    case "report":                return validateReport(a);
    case "minutes":               return validateMinutes(a);
    case "speech":                return validateSpeech(a);
    case "notice":                return validateNotice(a);
    case "financial-analysis":    return validateFinancialAnalysis(a);
    case "request-for-approval":  return validateRequestForApproval(a);
    case "budget-preparation":    return validateBudgetPreparation(a);
  }
}
