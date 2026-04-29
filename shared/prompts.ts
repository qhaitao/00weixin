// ============================================================
// shared/prompts.ts — 写作规范与工具函数（跨 skill 共享）
// ============================================================

// ── 风格词汇（content-analyzer 和 doc-writer 共用） ──

export const REPORT_STYLE = {
  tone: "汇报文体：简洁、客观、精炼，动词开头（完成/推进/落实/部署）",
  dataFirst: "数据优先：有数字支撑的结论优于定性描述，金额/比率/时间节点须写明",
  noFluff: "避免空话套话：\"高度重视\"\"强化意识\"等无内容支撑的表述须删除",
} as const;

export const MINUTES_STYLE = {
  tone: "纪要文体：客观中立，不加主观评价",
  standard: "标准表述：用\"与会人员认为…\"\"会议认为…\"\"经讨论，会议决定…\"等规范句式",
  byTopic: "按议题分段记录，每段首句点明议题名称",
} as const;

export const SPEECH_STYLE = {
  genre: "口语化书面体，句子较短（15-25字/句），节奏感强，适合朗读",
};

// ── 发言稿结构说明（content-analyzer 和 doc-writer 共用） ──

export const SPEECH_STRUCTURES = {
  parallel: {
    name: "并列式",
    description: "三节彼此独立、同等重要，均用金字塔三层展开。每节开头结论句须各有侧重，不能是同一意思的三种说法。",
    indicator: "三项工作任务彼此独立 → 并列式",
  },
  progressive: {
    name: "递进式",
    description: "三节按\"认识→行动→目标\"层层推进。第一节提高认识（Why），第二节明确部署（How），第三节展望目标（Where to）。每节首句结论必须呼应递进关系，不能写成并列。",
    indicator: "逐步深化推进 → 递进式",
  },
  scqa: {
    name: "SCQA式",
    description: "先在\"一、总体形势\"中用 S→C→Q→A 导入，亮明总论点；再在后续各节用金字塔展开分项部署。\"一\"中的 A（答案）须是后续各节的浓缩版，读者读完\"一\"就能掌握全篇核心。",
    indicator: "分析研判类（先讲大形势再部署）→ SCQA 式",
  },
} as const;

// ── 发言稿语气描述 ──

export const SPEECH_TONES = {
  confident: {
    name: "自信坚定",
    description: "多用\"坚决\"\"切实\"\"全力以赴\"\"不折不扣\"\"务必\"等词",
    opening: "同志们，大家好！今天，我就${topic}，讲几点意见。",
    closing: "我们将坚决落实各项部署，以实际行动回应期望，谢谢！",
  },
  humble: {
    name: "谦逊务实",
    description: "多用\"不足\"\"有差距\"\"努力方向\"\"在今后工作中\"等词",
    opening: "各位领导、同志们，大家好！借此机会，我就${topic}作简要汇报，请批评指正。",
    closing: "以上是我的汇报，不当之处请领导和同志们批评指正，谢谢！",
  },
  neutral: {
    name: "平实陈述",
    description: "多用\"积极推进\"\"持续深化\"\"扎实落实\"\"下一步将\"等词",
    opening: "各位领导、同志们，大家好！下面，我就${topic}作简要汇报。",
    closing: "以上汇报，请领导审阅，谢谢！",
  },
} as const;

// ── 金字塔三层写法（发言稿专用，但内容分析阶段也会参考） ──

export const PYRAMID_WRITING_GUIDE = {
  intro: "每节内部结构须按以下三层展开，第①层最重要，须优先写好",
  layer1: "①结论句（金句）—— 置于节首，15-20字。这是整节最重要的一句话，读者只记得住这一句。它必须是完整的观点陈述，有力、精炼、可独立传播。",
  layer2: "②支撑——1-2句，比结论句更具体。用数据、事实、对比说明为什么这个论点重要。必须比①层更具体，不能是①层的换句话说。",
  layer3: "③举措——三条具体行动。固定格式：\"一要…；二要…；三要…\"。每条均为可执行的具体动作，不能是口号或愿景。动词开头：推进、建立、完善、强化、落实…",
} as const;

// ── 金句写作公式 ──

export const GOLDEN_QUOTE_FORMULAS = [
  { type: "排比型（最常用）", formula: "要A、要B、更要C", example: "要敢想、敢干、更要敢担当" },
  { type: "对仗型", formula: "既要A，又要B", example: "既要防范风险，又要激发活力" },
  { type: "数据型", formula: "从A到B，X年/月实现C", example: "三年间利润从亏损到盈利两亿" },
  { type: "设问型", formula: "A靠什么？靠B", example: "转型靠什么？靠改革、靠创新、靠实干" },
  { type: "号召型", formula: "让我们A、B，共同C", example: "让我们齐心协力、攻坚克难，共同书写新篇章" },
] as const;

// ── 财务分析样式 ──

export const FINANCIAL_ANALYSIS_STYLE = {
  tone: "财务分析文体：数据驱动、差异导向、归因清晰、建议可落地",
  dataFirst: "数字优先：实际完成 vs 预算 vs 同期，三把尺子（与预算比、与同期比、与标杆比）",
  attribution: "归因分析：差异必须归因到具体业务板块和驱动因素，不能停留在总量层面",
  riskOriented: "风险导向：对异常波动和超预算项目，须明确风险等级和应对建议",
} as const;

// ── 请示公文样式 ──

export const REQUEST_STYLE = {
  tone: "请示公文规范：一文一事、理由充分、测算有据、格式严格",
  structure: "标准结构：标题（关于×××的请示）→ 主送机关 → 正文（事由→测算→征求意见情况→会签意见）→ 妥否请批示 → 附件清单 → 联系人及电话",
  amountRule: "涉及金额须逐项列明测算依据和计算过程",
  oneshot: "一文一事原则：一份请示只涉及一个事项，不夹带其他议题",
} as const;

// ── 差异分析引导模板 ──

export const VARIANCE_ANALYSIS_GUIDE = {
  intro: "差异分析须回答三个问题：差异是多少？为什么产生？该如何应对？",
  steps: [
    "1. 量化差异：实际 XX 万元，预算 XX 万元，差异 XX 万元（差异率 XX%），同比 ±XX%",
    "2. 归因：差异主要来自 [业务板块/环节]，驱动因素是 [量变/价变/政策变/一次性事件]",
    "3. 定性：有利差异（增收节支）/ 不利差异（减收超支），是否可控",
    "4. 建议：对不利差异提出具体改进措施（含量化目标和时间节点）",
  ],
} as const;

// ── 同比环比段落生成模板 ──

export const YOY_MOM_PROMPT = {
  yoy: "同比（与去年同期比）：本期 XX 万元，同期 XX 万元，同比 ±XX%，主要原因为 [归因]",
  mom: "环比（与上期比）：本期 XX 万元，上期 XX 万元，环比 ±XX%，主要受 [季节性/趋势性/一次性] 因素影响",
  combined: "本期 XX 万元，同比 ±XX%（与去年同期的 XX 万元相比），环比 ±XX%（与上期的 XX 万元相比）",
} as const;

// ── 发言稿字数计算工具 ──

export interface SpeechWordCalc {
  wordsPerMin: number;
  targetWords: number;
  scqaWords: number;
  bodyWords: number;
  wordsPerPoint: number;
}

export function calcSpeechWords(
  durationMin: number,
  keyPointsCount: number,
  structure: string | undefined,
  overrideWordsPerMin?: number
): SpeechWordCalc {
  const wordsPerMin = overrideWordsPerMin ?? 160;
  const targetWords = durationMin * wordsPerMin;
  const scqaWords = structure === "SCQA式" ? 200 : 0;
  const bodyWords = targetWords - 60 - scqaWords;
  const wordsPerPoint = Math.floor(bodyWords / Math.max(keyPointsCount, 1));
  return { wordsPerMin, targetWords, scqaWords, bodyWords, wordsPerPoint };
}
