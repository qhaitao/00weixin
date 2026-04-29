// ============================================================
// content-analyzer/scripts/main.ts
// 读取 source/ 素材，按 --type 生成类型化分析指令 + analysis.json 空模板
// ============================================================

import { parseCli, log } from "../../../shared/cli";
import { readText, writeText, writeJson, workspacePaths, ensureDir, readJson } from "../../../shared/fs";
import { env } from "../../../shared/env";
import { loadOrgContext, orgContextBlock } from "../../../shared/context";
import type { DocType, ReportAnalysis, MinutesAnalysis, SpeechAnalysis, NoticeAnalysis, FinancialAnalysis, RequestForApprovalAnalysis, BudgetPreparationAnalysis } from "../../../shared/types";
import { resolve } from "path";
import { readdirSync } from "fs";

const VALID_TYPES: DocType[] = ["report", "minutes", "speech", "notice", "financial-analysis", "request-for-approval", "budget-preparation"];

// ── 读取素材 ──

async function collectSources(sourceDir: string, verbose: boolean): Promise<string> {
  const files = readdirSync(sourceDir).filter(
    (f) => (f.endsWith(".md") || f.endsWith(".txt")) && !f.startsWith("_")
  );
  if (files.length === 0) {
    console.error("错误：source/ 目录下无素材文件，请先放入素材或运行 input-processor");
    process.exit(1);
  }
  let combined = "";
  for (const file of files) {
    const content = await readText(resolve(sourceDir, file));
    if (content) {
      log(verbose, `读取素材: ${file} (${content.length} 字符)`);
      combined += `\n\n--- ${file} ---\n\n${content}`;
    }
  }
  return combined.trim();
}

// ── prompt 模板 ──

function buildReportPrompt(source: string, orgBlock: string, org: ReturnType<typeof loadOrgContext>, wordTarget: number): string {
  return [
    `# 分析指令 — 周期性报告（report）`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请基于以下工作记录素材，提炼结构化信息，填写 analysis.json。`,
    `生成的报告将供 **${org.leader}** 或相关领导审阅，须符合工作汇报文体规范。`,
    ``,
    `## 输出格式（严格 JSON，直接写入 analysis.json）`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "type": "report",`,
    `  "period": "报告周期，如'2026年4月第4周'，从素材中提取",`,
    `  "author": "${env("AUTHOR_NAME", "")}",`,
    `  "completed_items": [`,
    `    "每条格式：[事项名称]+[完成结果]+[关键数据]，如'完成XX系统上线，节省人工成本约XX万元/月'",`,
    `    "数据优先：提取金额/数量/比率/时间节点等可量化指标"`,
    `  ],`,
    `  "ongoing_items": [`,
    `    "每条格式：[事项名称]+[当前进度]+[预计完成时间]，如'XX方案编制，已完成70%，预计5月10日提交'"`,
    `  ],`,
    `  "blockers": ["阻碍须点名具体问题及影响范围，没有则填空数组 []"],`,
    `  "next_period_plan": [`,
    `    "每条格式：[时间节点]+[事项]+[预期目标]，如'5月底前完成XX评审，确保6月正式推行'"`,
    `  ],`,
    `  "key_metrics": {`,
    `    "指标名（如完成任务数/同比增长率/节省成本）": "指标值（须含单位，如'12项''8.5%''23.6万元'）"`,
    `  },`,
    `  "word_target": ${wordTarget}`,
    `}`,
    `\`\`\``,
    ``,
    `## 分析要求`,
    ``,
    `**语言风格**`,
    `- 采用汇报文体：简洁、客观、精炼，避免空话套话`,
    `- 动词开头：用"完成""推进""落实""部署"等行动词`,
    `- 数据为王：有数字支撑的结论优于定性描述`,
    ``,
    `**结构层次**`,
    `- completed_items 对应"一、本期完成情况"`,
    `- ongoing_items 对应"二、在途工作进展"`,
    `- blockers 对应"三、存在问题"（简短直接）`,
    `- next_period_plan 对应"四、下步工作打算"（须含时限）`,
    ``,
    `## 素材内容`,
    ``,
    source,
  ].join("\n");
}

function buildMinutesPrompt(source: string, orgBlock: string): string {
  return [
    `# 分析指令 — 会议纪要（minutes）`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请基于以下会议记录素材，提炼结构化会议信息，填写 analysis.json。`,
    `会议纪要须客观反映会议决议，文字精炼，责任明确。`,
    ``,
    `## 输出格式（严格 JSON，直接写入 analysis.json）`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "type": "minutes",`,
    `  "meeting_title": "会议名称，从素材中提取，格式如'XX会议'或'关于XX问题的专题会'",`,
    `  "date": "YYYY-MM-DD，从素材中提取",`,
    `  "venue": "会议地点，如'省分公司10楼会议室'，素材无则填'（待补充）'",`,
    `  "chair": "主持人姓名，素材无则留空字符串",`,
    `  "recorder": "记录人姓名，素材无则留空字符串",`,
    `  "attendees": ["参会人员列表，格式：姓名（职务），如无职务信息则只填姓名"],`,
    `  "agenda": ["议题1（动词短语，15字以内）", "议题2"],`,
    `  "decisions": [`,
    `    "决议须使用完成式表述：'会议决定…''一致同意…''明确要求…'",`,
    `    "每条决议是明确结论，不是讨论过程"`,
    `  ],`,
    `  "action_items": [`,
    `    {`,
    `      "action": "具体行动，动词开头，如'完成XX方案并提交审批'",`,
    `      "owner": "责任人姓名或责任部门",`,
    `      "deadline": "YYYY-MM-DD（必填，素材无明确日期则合理推断）",`,
    `      "priority": "高"`,
    `    }`,
    `  ],`,
    `  "next_meeting": "下次会议时间，如无则填null",`,
    `  "summary_for_leader": "领导摘要：3-5句话，含核心决议+关键行动项+责任人，100字以内"`,
    `}`,
    `\`\`\``,
    ``,
    `## 分析要求`,
    ``,
    `**决议提炼原则**`,
    `- 只提炼明确结论，不记录讨论过程`,
    `- 使用"会议决定""一致同意""明确要求"等标准表述`,
    `- 每条决议独立完整，可单独阅读`,
    ``,
    `**行动项原则**`,
    `- 每条行动项对应唯一责任人（不能多人并列）`,
    `- 截止日期必须具体到日（如 2026-05-10）`,
    `- 优先级：高=本周内/紧急，中=本月内，低=季度内`,
    `- 纯汇报类会议（无明确下一步任务）action_items 可填空数组`,
    ``,
    `## 素材内容`,
    ``,
    source,
  ].join("\n");
}

function buildSpeechPrompt(source: string, orgBlock: string): string {
  return [
    `# 分析指令 — 领导讲话 / 会议发言稿（speech）`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请基于以下素材，深度分析并填写 analysis.json，为撰写高质量领导讲话稿提供完整蓝图。`,
    `重点完成：①确定最佳标题 ②提取金句素材 ③判断最适合的结构类型。`,
    ``,
    `## 输出格式（严格 JSON，直接写入 analysis.json）`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "type": "speech",`,
    `  "title_suggestion": "建议的完整讲话标题（见【标题设计】），如'在2026年XXX工作会议上的讲话'",`,
    `  "title_type": "场合型（可选值：场合型/主题型/任务型/述职型）",`,
    `  "topic": "核心主题，4-8个字，如'财务改革部署'",`,
    `  "occasion": "发言场合全称，如'2026年广东邮政财务工作会议'",`,
    `  "duration_min": 10,`,
    `  "audience": "听众描述，如'各地市分公司领导班子及财务负责人'",`,
    `  "structure": "SCQA式（可选值：并列式/递进式/SCQA式，见【结构判断】）",`,
    `  "key_points": [`,
    `    "结论性论点，须是完整的主谓宾陈述，20字内，如'以战略财务为引领，做好顶层设计'",`,
    `    "每条独立可读，是该节内容的核心结论",`,
    `    "建议3条，SCQA式结构时论点是SCQA之后的分项部署"`,
    `  ],`,
    `  "golden_quote_seeds": [`,
    `    "【见【金句识别】】从素材中提取的原始素材，每条对应一个key_point",`,
    `    "格式：原始事实/数据/对比/三要素，不必加工成完整句子",`,
    `    "最后一条用于结语金句素材"`,
    `  ],`,
    `  "data_to_cite": ["各节可引用的具体数字，格式'X指标达到Y值'，如'全省利润增长8.5%'，无则填空字符串"],`,
    `  "tone": "neutral（见【语气判断】：confident/humble/neutral）",`,
    `  "opening_quote": "可选的开场引用语：权威政策表述或习近平讲话原文，可直接引用，没有则填空字符串",`,
    `  "background": "发言背景：会议主题、发言人角色、关键约束（时长要求、特殊背景等）"`,
    `}`,
    `\`\`\``,
    ``,
    `---`,
    ``,
    `## 【标题设计】`,
    ``,
    `领导讲话标题须精确体现场合和性质，判断标准如下：`,
    ``,
    `| 类型 | 格式 | 适用场景 | 示例 |`,
    `| --- | --- | --- | --- |`,
    `| 场合型（最常用） | 在[会议名称]上的讲话 | 有明确会议场合的正式讲话 | 在2026年财务工作会议上的讲话 |`,
    `| 主题型 | 关于[核心主题]的几点意见 | 无固定会议、专题性发言 | 关于加强财务内控建设的几点意见 |`,
    `| 任务型 | 在[场合]上关于[主题]的讲话 | 场合+专项任务双重强调 | 在部署会上关于降本增效的讲话 |`,
    `| 述职型 | [时间段]工作述职报告 | 个人工作回顾汇报 | 2026年上半年述职报告 |`,
    ``,
    `**判断优先级**：有明确会议名称 → 场合型；有核心政策主题 → 主题型；两者皆有且各占一半重要性 → 任务型；个人回顾汇报 → 述职型。`,
    ``,
    `---`,
    ``,
    `## 【金句识别】`,
    ``,
    `金句是讲话中最容易被记住的句子。请从素材中识别以下类型的原始素材（填入 golden_quote_seeds）：`,
    ``,
    `| 金句类型 | 识别特征 | 示例素材（原始形态） |`,
    `| --- | --- | --- |`,
    `| 数据型 | 有对比/增长/时间跨度的量化 | "三年内利润从亏损到盈利2亿" |`,
    `| 对比型 | 前后反差、新旧对比、预期与现实 | "过去靠经验，现在靠数据" |`,
    `| 三要素型 | 三个并列的关键词/动作/目标 | "抓质量、提效率、防风险" |`,
    `| 对仗型 | 两个相对应的方面 | "既要防范风险，也要激发活力" |`,
    ``,
    `**注意**：golden_quote_seeds 填入的是原始素材，不必加工成完整金句，后续由写作 AI 打磨。`,
    `条数建议：与 key_points 等长+1（最后一条用于结语）。`,
    ``,
    `---`,
    ``,
    `## 【结构判断】`,
    ``,
    `| 结构类型 | 适用场景 | 内部逻辑 |`,
    `| --- | --- | --- |`,
    `| 并列式 | 三条论点彼此独立、同等重要 | 一是…；二是…；三是… |`,
    `| 递进式 | 从认识→行动→目标，层层深入 | 提高认识→明确部署→展望目标 |`,
    `| SCQA式 | 先讲形势挑战，再给答案和部署 | 形势（S）→挑战（C）→问题（Q）→答案（A）+分项部署 |`,
    ``,
    `**判断原则**：`,
    `- 分析研判类（先讲大形势再部署）→ SCQA 式`,
    `- 三项工作任务彼此独立 → 并列式`,
    `- 逐步深化推进 → 递进式`,
    `- 不确定时默认并列式`,
    ``,
    `---`,
    ``,
    `## 【语气判断】`,
    ``,
    `| tone | 适用场合 | 常用词汇 |`,
    `| --- | --- | --- |`,
    `| confident | 动员部署、表态承诺、工作汇报 | 坚决、切实、全力以赴、不折不扣 |`,
    `| neutral | 情况说明、数据汇报、总结陈述 | 目前、已完成、下一步将、积极推进 |`,
    `| humble | 述职检查、问题剖析、自我反思 | 不足、有差距、努力方向、改进 |`,
    ``,
    `## 素材内容`,
    ``,
    source,
  ].join("\n");
}

function buildNoticePrompt(source: string, orgBlock: string): string {
  return [
    `# 分析指令 — 会议通知（notice）`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请基于以下素材，提炼召开会议所需的关键信息，填写 analysis.json。`,
    `生成的会议通知将以正式公文形式发出，须符合党政机关公文格式规范。`,
    ``,
    `## 输出格式（严格 JSON，直接写入 analysis.json）`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "type": "notice",`,
    `  "doc_number": "发文字号，如'粤邮分〔2026〕12号'，素材无则填空字符串",`,
    `  "meeting_title": "会议全称，格式：[年份]+[范围]+[主题]+会议，如'2026年广东邮政财务工作会议'",`,
    `  "meeting_time": "含星期，格式：'XXXX年X月X日（星期X）上午/下午XX:XX'",`,
    `  "venue": "会议地点，精确到会议室，如'省分公司10楼第一会议室'",`,
    `  "attendees": ["参会对象用职能范围描述，不列具体姓名，如'各地市分公司财务部负责人'"],`,
    `  "agenda": ["议题须简洁精炼，15字以内，用动词短语，如'听取XX工作汇报''审议XX方案'"],`,
    `  "requirements": [`,
    `    "请参会人员提前准备XX材料",`,
    `    "请于XX日前将XX发至XX（联系方式）",`,
    `    "如因故不能出席，请提前向XX请假并指派代表参加",`,
    `    "差旅费用自理（如适用）"`,
    `  ],`,
    `  "contact": "联系人：XXX，电话：XXXX（素材有则填入，无则填空字符串）",`,
    `  "rsvp": false,`,
    `  "issuer": "（留空，由系统自动填写单位名称）",`,
    `  "issue_date": "（留空，由系统自动填写当天日期）"`,
    `}`,
    `\`\`\``,
    ``,
    `## 分析要求`,
    ``,
    `**通知要素规范**`,
    `- meeting_title：须含年份，避免使用"临时""紧急"等模糊词`,
    `- meeting_time：须含星期几，便于参会者判断日程冲突`,
    `- attendees：用职能范围描述（不列具体姓名），便于适用范围更新`,
    `- agenda：每条15字以内，格式"动词+宾语"，如"审议年度工作计划"`,
    ``,
    `**requirements 覆盖原则**`,
    `1. 材料准备（需要携带或提前提交的文件）`,
    `2. 回复确认（如需报名，明确截止时间和回复方式）`,
    `3. 差旅安排（如涉及外地参会人员）`,
    `4. 请假说明（不能出席的处理方式）`,
    `- 无相关要求的条目可省略，宁简勿繁`,
    ``,
    `## 素材内容`,
    ``,
    source,
  ].join("\n");
}

function buildFinancialAnalysisPrompt(source: string, orgBlock: string, org: ReturnType<typeof loadOrgContext>, wordTarget: number): string {
  return [
    `# 分析指令 — 财务分析报告（financial-analysis）`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请基于以下财务素材，提炼结构化信息，填写 analysis.json。`,
    `生成的财务分析报告将供 **${org.leader}** 及领导班子审阅，须符合财务分析报告文体规范。`,
    ``,
    `## 输出格式（严格 JSON，直接写入 analysis.json）`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "type": "financial-analysis",`,
    `  "period": "分析周期，如'2026年第一季度'",`,
    `  "author": "${env("AUTHOR_NAME", "")}",`,
    `  "overview": "总体评价：一段话概述本期经营特点、主要变化和总体趋势，30-50字",`,
    `  "metrics": [`,
    `    {`,
    `      "actual": "实际值（含单位），如'12,350万元'",`,
    `      "budget": "预算值，如'12,000万元'",`,
    `      "yoy_change": "同比变化，如'+8.5%'，无数据则填空字符串",`,
    `      "mom_change": "环比变化，如'+2.1%'，无数据则填空字符串",`,
    `      "note": "补充说明，如'受季节性因素影响超过预期'"`,
    `    }`,
    `  ],`,
    `  "segments": [`,
    `    {`,
    `      "segment": "业务板块或环节名称，如'寄递业务''代理金融''运输环节'",`,
    `      "revenue": "收入数据（含单位），如'5,200万元'",`,
    `      "cost": "成本数据（含单位），如'4,100万元'",`,
    `      "profit": "利润数据（含单位），如'1,100万元'",`,
    `      "key_drivers": ["驱动因素1：说明业务量/单价/政策等变化原因", "驱动因素2"]`,
    `    }`,
    `  ],`,
    `  "risks": [`,
    `    {`,
    `      "item": "风险事项名称，如'欠费收缴进度滞后'",`,
    `      "severity": "高"`,
    `      "amount": "涉及金额，如'约500万元'，无则填空字符串",`,
    `      "suggestion": "具体应对建议"`,
    `    }`,
    `  ],`,
    `  "highlights": ["亮点1（含数据和结论，如'XXX业务收入同比增长15%，超额完成预算8个百分点'）"],`,
    `  "problems": ["问题1（须具体，不能是笼统表述，如'XX环节成本同比增长12%，超出预算5个百分点'）"],`,
    `  "suggestions": ["建议1（须含具体措施和目标时间节点，如'5月底前完成XX优化方案，预计降本XX万元/月'）"],`,
    `  "word_target": ${wordTarget}`,
    `}`,
    `\`\`\``,
    ``,
    `## 分析要求`,
    ``,
    `**财务分析核心方法论**`,
    `- "三把尺子"对标：与预算比（预算执行率）、与同期比（同比增长）、与标杆比（全国平均水平）`,
    `- 归因导向：差异必须分解到业务板块和驱动因素（量变/价变/政策变/一次性事件）`,
    `- 风险识别：对异常波动和超预算项目标注风险等级（高/中/低）`,
    ``,
    `**指标提取原则**`,
    `- metrics 数组须覆盖：收入、成本、利润、预算完成率、成本收入比等核心指标`,
    `- 每条指标填写 actual 和 budget，有同比/环比数据的填写对应字段`,
    `- segments 按业务板块（寄递/代理金融/集邮/其他）或成本环节（收寄/运输/处理/投递/管理）拆分`,
    ``,
    `**亮点与问题**`,
    `- highlights 必须是可量化成果，如"XX收入增长X%，位列全国第X"`,
    `- problems 必须点名具体差距和影响，不能笼统说"需加强"、"有待提高"`,
    ``,
    `## 素材内容`,
    ``,
    source,
  ].join("\n");
}

function buildRequestForApprovalPrompt(source: string, orgBlock: string): string {
  return [
    `# 分析指令 — 请示（request-for-approval）`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请基于以下素材，提炼请示所需的关键信息，填写 analysis.json。`,
    `请示是正式公文，须严格遵循"一文一事"原则和党政机关请示格式规范。`,
    ``,
    `## 输出格式（严格 JSON，直接写入 analysis.json）`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "type": "request-for-approval",`,
    `  "title": "请示标题，格式：'关于×××的请示'，如'关于追加2026年设备采购预算的请示'",`,
    `  "recipient": "主送机关全称，如'中国邮政集团有限公司'",`,
    `  "subject": "核心事项，一文一事，一句话说清请示什么",`,
    `  "basis": ["依据1：政策/文件名称+文号", "依据2：会议决定/领导批示", "依据3：实际情况/数据测算"],`,
    `  "amount": "涉及金额（含单位），如'追加预算约150万元'，不涉及经费则填null",`,
    `  "opinions_solicited": ["已征求XX部门意见，意见如下：……", "已征求XX单位意见，意见如下：……"],`,
    `  "countersign_opinions": ["会签部门XX：同意/原则同意/提出以下修改意见：……"],`,
    `  "attachments": ["附件1：XX测算明细表", "附件2：XX方案"],`,
    `  "contact": "联系人姓名",`,
    `  "contact_phone": "联系人电话",`,
    `  "author": "${env("AUTHOR_NAME", "")}",`,
    `  "word_target": ${parseInt(env("ARTICLE_WORD_TARGET", "800"))}`,
    `}`,
    `\`\`\``,
    ``,
    `## 分析要求`,
    ``,
    `**一文一事原则**`,
    `- 一份请示只能有一个主送机关和一个核心事项`,
    `- 如有多个独立事项需要报批，应分别发文`,
    ``,
    `**测算有据**`,
    `- 涉及经费的请示，amount 字段须写明金额和测算依据`,
    `- basis 字段应列出政策依据、会议决定或数据测算来源`,
    ``,
    `**征求意见**`,
    `- 涉及其他部门职责的事项，应说明征求意见情况和会签意见`,
    `- opinions_solicited 填写已征求部门及反馈意见`,
    `- countersign_opinions 填写会签部门的具体意见`,
    ``,
    `## 素材内容`,
    ``,
    source,
  ].join("\n");
}

function buildBudgetPreparationPrompt(source: string, orgBlock: string): string {
  return [
    `# 分析指令 — 预算编制说明（budget-preparation）`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请基于以下素材，提炼预算编制所需的关键信息，填写 analysis.json。`,
    `预算编制说明是正式财务文件，须包含编制依据、收支预算明细和测算依据。`,
    ``,
    `## 输出格式（严格 JSON，直接写入 analysis.json）`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "type": "budget-preparation",`,
    `  "fiscal_year": "预算年度，如'2027年'",`,
    `  "unit": "编制单位全称",`,
    `  "preparation_basis": ["依据1：上级文件名称+文号", "依据2：会议决定", "依据3：历年数据趋势/增长率"],`,
    `  "revenue_items": [`,
    `    { "name": "收入项目名称", "amount": "金额（万元）", "lastPeriodAmount": "上期金额", "changePct": "+N%", "rationale": "测算依据说明" }`,
    `  ],`,
    `  "cost_items": [`,
    `    { "name": "成本项目名称", "amount": "金额（万元）", "lastPeriodAmount": "上期金额", "changePct": "+N%", "rationale": "测算依据说明" }`,
    `  ],`,
    `  "project_items": [`,
    `    { "name": "项目名称", "amount": "金额（万元）", "lastPeriodAmount": "上期金额", "changePct": "+N%", "rationale": "立项依据和测算明细" }`,
    `  ],`,
    `  "special_notes": ["特别说明1", "特别说明2"],`,
    `  "author": "${env("AUTHOR_NAME", "")}",`,
    `  "word_target": ${parseInt(env("ARTICLE_WORD_TARGET", "1200"))}`,
    `}`,
    `\`\`\``,
    ``,
    `## 分析要求`,
    ``,
    `**编制依据**`,
    `- preparation_basis 须列出至少2条编制依据：上级文件、会议决定或历史数据`,
    ``,
    `**收支预算**`,
    `- revenue_items：所有收入预算项目，逐项列明本期金额、上期金额、变动百分比和测算依据`,
    `- cost_items：所有成本预算项目，按分环节（收寄/运输/处理/投递/管理）或分科目列示`,
    `- 每个 item 的 rationale 字段须说明"为什么是这个数字"，不能只写金额`,
    ``,
    `**项目预算**`,
    `- project_items：专项项目预算，逐项说明立项依据和经费测算明细`,
    ``,
    `**特别说明**`,
    `- special_notes：预算编制中需要特别说明的事项（如一次性因素、政策调整影响、不确定性较大的项目等）`,
    ``,
    `## 素材内容`,
    ``,
    source,
  ].join("\n");
}

// ── 空模板生成 ──

function emptyReport(): ReportAnalysis {
  return {
    type: "report",
    period: "",
    author: env("AUTHOR_NAME", ""),
    completed_items: [],
    ongoing_items: [],
    blockers: [],
    next_period_plan: [],
    key_metrics: {},
    word_target: parseInt(env("ARTICLE_WORD_TARGET", "1000")),
  };
}

function emptyMinutes(): MinutesAnalysis {
  return {
    type: "minutes",
    meeting_title: "",
    date: "",
    venue: "",
    chair: "",
    recorder: "",
    attendees: [],
    agenda: [],
    decisions: [],
    action_items: [],
    next_meeting: "",
    summary_for_leader: "",
  };
}

function emptySpeech(): SpeechAnalysis {
  return {
    type: "speech",
    title_suggestion: "",
    title_type: "场合型",
    topic: "",
    occasion: "",
    duration_min: 10,
    audience: "",
    structure: "并列式",
    key_points: [],
    data_to_cite: [],
    tone: "neutral",
    background: "",
    golden_quote_seeds: [],
    opening_quote: "",
  };
}

function emptyNotice(): NoticeAnalysis {
  return {
    type: "notice",
    doc_number: "",
    meeting_title: "",
    meeting_time: "",
    venue: "",
    attendees: [],
    agenda: [],
    requirements: [],
    contact: "",
    rsvp: false,
    issuer: "",
    issue_date: "",
  };
}

function emptyFinancialAnalysis(): FinancialAnalysis {
  return {
    type: "financial-analysis",
    period: "",
    author: env("AUTHOR_NAME", ""),
    overview: "",
    metrics: [],
    segments: [],
    risks: [],
    highlights: [],
    problems: [],
    suggestions: [],
    word_target: parseInt(env("ARTICLE_WORD_TARGET", "1500")),
  };
}

function emptyRequestForApproval(): RequestForApprovalAnalysis {
  return {
    type: "request-for-approval",
    title: "",
    recipient: "",
    subject: "",
    basis: [],
    amount: "",
    opinions_solicited: [],
    countersign_opinions: [],
    attachments: [],
    contact: env("AUTHOR_NAME", ""),
    contact_phone: "",
    author: env("AUTHOR_NAME", ""),
    word_target: parseInt(env("ARTICLE_WORD_TARGET", "800")),
  };
}

function emptyBudgetPreparation(): BudgetPreparationAnalysis {
  return {
    type: "budget-preparation",
    fiscal_year: "",
    unit: env("DOC_ORG", ""),
    preparation_basis: [],
    revenue_items: [],
    cost_items: [],
    project_items: [],
    special_notes: [],
    author: env("AUTHOR_NAME", ""),
    word_target: parseInt(env("ARTICLE_WORD_TARGET", "1200")),
  };
}

// ── 主函数 ──

async function main() {
  const args = parseCli();
  const { dir, verbose } = args;
  const docType = args.type as string | undefined;

  if (!docType || !VALID_TYPES.includes(docType as DocType)) {
    console.error(`错误：必须指定 --type 参数，可选值：${VALID_TYPES.join(" | ")}`);
    console.error(`示例：bun skills/content-analyzer/scripts/main.ts --dir workspace/YYYYMMDD主题 --type report`);
    process.exit(1);
  }

  const type = docType as DocType;
  const paths = workspacePaths(dir);
  await ensureDir(paths.source);

  // 防止意外覆盖 Agent 已填写的 analysis.json
  if (!args.force) {
    const existing = await readJson(paths.analysis) as Record<string, unknown> | null;
    if (existing && existing.type && (
      (Array.isArray(existing.completed_items) && existing.completed_items.length > 0) ||
      (Array.isArray(existing.decisions) && existing.decisions.length > 0) ||
      (Array.isArray(existing.key_points) && existing.key_points.length > 0) ||
      (Array.isArray(existing.agenda) && existing.agenda.length > 0) ||
      (Array.isArray(existing.metrics) && existing.metrics.length > 0) ||
      (Array.isArray(existing.basis) && existing.basis.length > 0)
    )) {
      console.warn("⚠️  analysis.json 已存在且包含内容，若要重新生成请加 --force 参数");
      console.warn(`   路径：${paths.analysis}`);
      process.exit(0);
    }
  }

  const org = loadOrgContext();
  const orgBlock = orgContextBlock(org);
  const wordTarget = parseInt(env("ARTICLE_WORD_TARGET", "1000"));

  console.log(`🔍 [${type}] 正在读取素材...`);
  const source = await collectSources(paths.source, verbose);

  if (!source) {
    console.error("错误：素材内容为空");
    process.exit(1);
  }

  console.log(`📝 素材总长度: ${source.length} 字符${source.length > 8000 ? "（长文本，请分段阅读）" : ""}`);

  // 按类型生成分析 prompt
  let prompt: string;
  let template: ReportAnalysis | MinutesAnalysis | SpeechAnalysis | NoticeAnalysis | FinancialAnalysis | RequestForApprovalAnalysis | BudgetPreparationAnalysis;

  switch (type) {
    case "report":
      prompt = buildReportPrompt(source, orgBlock, org, wordTarget);
      template = emptyReport();
      break;
    case "minutes":
      prompt = buildMinutesPrompt(source, orgBlock);
      template = emptyMinutes();
      break;
    case "speech":
      prompt = buildSpeechPrompt(source, orgBlock);
      template = emptySpeech();
      break;
    case "notice":
      prompt = buildNoticePrompt(source, orgBlock);
      template = emptyNotice();
      break;
    case "financial-analysis":
      prompt = buildFinancialAnalysisPrompt(source, orgBlock, org, wordTarget);
      template = emptyFinancialAnalysis();
      break;
    case "request-for-approval":
      prompt = buildRequestForApprovalPrompt(source, orgBlock);
      template = emptyRequestForApproval();
      break;
    case "budget-preparation":
      prompt = buildBudgetPreparationPrompt(source, orgBlock);
      template = emptyBudgetPreparation();
      break;
    default:
      console.error(`内部错误：未处理的文档类型 ${type}`);
      process.exit(1);
  }

  // 保存分析指令
  const instructionPath = resolve(dir, "_analysis_instruction.md");
  await writeText(instructionPath, prompt);

  // 保存空模板
  await writeJson(paths.analysis, template);

  console.log(`\n✅ content-analyzer [${type}] 完成`);
  console.log(`   分析指令：${instructionPath}`);
  console.log(`   空模板：  ${paths.analysis}`);
  console.log(`\n⏸️  下一步：读取 _analysis_instruction.md，由 Agent AI 填写 analysis.json`);
}

main().catch((err) => {
  console.error("❌ content-analyzer 执行失败:", err.message);
  process.exit(1);
});
