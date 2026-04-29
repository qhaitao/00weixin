// ============================================================
// doc-writer/scripts/main.ts
// 消费 analysis.json，生成：
//   - draft.md              文档草稿骨架（Agent 补全正文）
//   - _write_instruction.md 写作指令（Agent 执行）
// ============================================================

import { parseCli, log } from "../../../shared/cli";
import { readJson, writeText, workspacePaths } from "../../../shared/fs";
import { env } from "../../../shared/env";
import { loadOrgContext, orgContextBlock } from "../../../shared/context";
import { toChineseOrdinal } from "../../../shared/chinese";
import { calcSpeechWords, SPEECH_TONES, SPEECH_STRUCTURES, PYRAMID_WRITING_GUIDE, GOLDEN_QUOTE_FORMULAS } from "../../../shared/prompts";
import {
  validateDocAnalysis,
  type DocAnalysis,
  type ReportAnalysis,
  type MinutesAnalysis,
  type SpeechAnalysis,
  type NoticeAnalysis,
  type FinancialAnalysis,
  type RequestForApprovalAnalysis,
  type BudgetPreparationAnalysis,
} from "../../../shared/types";
import { resolve } from "path";

// ══════════════════════════════════════════════════════════
// draft.md 骨架生成
// ══════════════════════════════════════════════════════════

function buildReportDraft(a: ReportAnalysis, org: ReturnType<typeof loadOrgContext>): string {
  const date = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const author = a.author || env("AUTHOR_NAME", "");

  const metricsTable = Object.keys(a.key_metrics).length > 0 ? [
    `## 五、关键数据`,
    ``,
    `| 指标 | 数值 |`,
    `| --- | --- |`,
    ...Object.entries(a.key_metrics).map(([k, v]) => `| ${k} | ${v} |`),
    ``,
  ].join("\n") : "";

  return [
    `---`,
    `type: report`,
    `period: ${a.period}`,
    `author: ${author}`,
    `org: ${org.shortName}`,
    `date: ${date}`,
    `---`,
    ``,
    `# ${a.period}工作报告`,
    ``,
    author ? `**汇报人：** ${author}　　**单位：** ${org.name}　　**日期：** ${date}` :
             `**单位：** ${org.name}　　**日期：** ${date}`,
    ``,
    `---`,
    ``,
    `## 一、本期工作完成情况`,
    ``,
    `<!-- 请展开论述，逐项说明完成结果和关键数据；参考 completed_items：`,
    a.completed_items.map((item, i) => `     ${i + 1}. ${item}`).join("\n"),
    `-->`,
    ``,
    `## 二、在途工作进展`,
    ``,
    `<!-- 请展开论述，说明各事项当前进度和预计完成时间；参考 ongoing_items：`,
    a.ongoing_items.length
      ? a.ongoing_items.map((item, i) => `     ${i + 1}. ${item}`).join("\n")
      : `     （暂无在途事项）`,
    `-->`,
    ``,
    `## 三、存在问题及建议`,
    ``,
    `<!-- 如本期无明显问题，可写"本期工作推进顺畅，暂无明显阻碍"；`,
    `     如有问题，须说明：①问题描述 ②影响范围 ③建议解决方案`,
    a.blockers.length
      ? `     参考 blockers：\n` + a.blockers.map((b, i) => `     ${i + 1}. ${b}`).join("\n")
      : `     参考 blockers：（空）`,
    `-->`,
    ``,
    `## 四、下期工作计划`,
    ``,
    `<!-- 请展开论述，说明下期计划的优先级和预期目标，须含时间节点；参考 next_period_plan：`,
    a.next_period_plan.map((item, i) => `     ${i + 1}. ${item}`).join("\n"),
    `-->`,
    ``,
    metricsTable,
    `---`,
    ``,
    `以上报告，请审阅。`,
    ``,
    author ? `汇报人：${author}` : `汇报人：`,
    ``,
    `${org.shortName}`,
    ``,
    date,
  ].filter((s) => s !== undefined).join("\n");
}

function buildMinutesDraft(a: MinutesAnalysis, org: ReturnType<typeof loadOrgContext>): string {
  const actionTable = a.action_items.length > 0 ? [
    `## 五、行动项追踪`,
    ``,
    `| 序号 | 行动事项 | 责任人 | 截止日期 | 优先级 | 状态 |`,
    `| --- | --- | --- | --- | --- | --- |`,
    ...a.action_items.map((item, i) =>
      `| ${i + 1} | ${item.action} | ${item.owner} | ${item.deadline} | ${item.priority ?? "中"} | 待办 |`
    ),
    ``,
  ].join("\n") : "";

  const recorder = a.recorder || env("AUTHOR_NAME", "（签名）");
  const meetingInfo = [
    `**会议时间：** ${a.date}`,
    a.venue ? `**会议地点：** ${a.venue}` : "",
    a.chair ? `**主　持　人：** ${a.chair}` : "",
    `**参会人员：** ${a.attendees.join("、")}`,
    a.recorder ? `**记　录　人：** ${a.recorder}` : "",
  ].filter(Boolean).join("　　");

  return [
    `---`,
    `type: minutes`,
    `meeting: ${a.meeting_title}`,
    `date: ${a.date}`,
    a.venue ? `venue: ${a.venue}` : "",
    a.chair ? `chair: ${a.chair}` : "",
    `org: ${org.shortName}`,
    `---`,
    ``,
    `# ${a.meeting_title}纪要`,
    ``,
    meetingInfo,
    ``,
    `---`,
    ``,
    `## 一、会议议程`,
    ``,
    a.agenda.map((item, i) => `${i + 1}. ${item}`).join("\n"),
    ``,
    `## 二、主要讨论内容`,
    ``,
    `<!-- 请围绕各议题，客观记录主要观点和讨论结论，避免主观评价；`,
    `     格式建议：按议题分段，用"与会人员认为…""会议认为…"等表述 -->`,
    ``,
    `## 三、会议决议`,
    ``,
    a.decisions.map((d, i) => `${i + 1}. ${d}`).join("\n"),
    ``,
    `## 四、下次会议`,
    ``,
    a.next_meeting ? `下次会议时间：${a.next_meeting}` : `（待定）`,
    ``,
    actionTable,
    a.summary_for_leader ? [
      `---`,
      ``,
      `> **【领导摘要】** ${a.summary_for_leader}`,
      ``,
    ].join("\n") : "",
    `---`,
    ``,
    `本纪要经与会人员确认。`,
    ``,
    `记录人：${recorder}`,
  ].filter((s) => s !== undefined && s !== "").join("\n");
}

function buildSpeechDraft(a: SpeechAnalysis, org: ReturnType<typeof loadOrgContext>): string {
  const wc = calcSpeechWords(a.duration_min, a.key_points.length, a.structure, parseInt(env("SPEECH_WORDS_PER_MIN", "160")));
  const structure = a.structure ?? "并列式";

  // 标题：优先用 analysis 给出的 title_suggestion，否则自动组合
  const speechTitle = a.title_suggestion?.trim()
    || `在${a.occasion}上的讲话`;

  // 节号偏移：SCQA式时"一"已被形势导入占用，key_points 从"二"开始
  const pointOffset = structure === "SCQA式" ? 1 : 0;

  // 开场白参考（按 tone）
  const openingRef = {
    confident: `同志们，大家好！今天，我就${a.topic}，讲几点意见。`,
    humble:    `各位领导、同志们，大家好！借此机会，我就${a.topic}作简要汇报，请批评指正。`,
    neutral:   `各位领导、同志们，大家好！下面，我就${a.topic}作简要汇报。`,
  }[a.tone ?? "neutral"];

  // 开场引用提示
  const openingQuoteHint = a.opening_quote?.trim()
    ? `可引用定基调：「${a.opening_quote}」`
    : "可嵌入引用型金句定基调（习近平讲话/权威政策表述）";

  // 各论点骨架（金字塔三层结构）
  const pointsBlock = a.key_points
    .map((p, i) => {
      const sectionNum = toChineseOrdinal(i + pointOffset + 1);
      const seedHint = a.golden_quote_seeds?.[i]
        ? `     金句素材：「${a.golden_quote_seeds[i]}」→ 请加工为15-20字排比/对仗金句置于节首`
        : `     请为本节提炼一句15-20字金句（排比/对仗/数据型），置于节首`;
      const dataHint = a.data_to_cite[i]?.trim()
        ? `     ②支撑数据：${a.data_to_cite[i]}`
        : `     ②支撑：补充1-2个数据或对比事实，说明此论点的重要性`;
      const toneHint = a.tone === "confident"
        ? "坚决、全力以赴、切实、务必"
        : a.tone === "humble" ? "不足、有差距、努力方向、改进" : "积极推进、持续深化、扎实落实";

      return [
        `## ${sectionNum}、${p}`,
        ``,
        `<!-- 金字塔三层写法（约 ${wc.wordsPerPoint} 字）：`,
        `     ①结论句（金句，置于节首，是整节最重要的一句话）：`,
        seedHint,
        dataHint,
        `     ③举措：三条具体行动，格式"一要…；二要…；三要…"，每条可执行，不能是口号`,
        `     语气关键词：${toneHint}`,
        `-->`,
        ``,
      ].filter(Boolean).join("\n");
    })
    .join("\n");

  // SCQA 导入节（仅 SCQA 式结构）
  const scqaBlock = structure === "SCQA式"
    ? [
      `## 一、总体形势`,
      ``,
      `<!-- SCQA 导入（约 ${wc.scqaWords} 字）`,
      `     S（形势）：…正处于…关键时期，总体向好（1句话定基调）`,
      `     C（挑战）：但也面临…（须有数据支撑，如"XXX同比下降X%"）`,
      `     Q（问题）：面对这一形势，如何…？（设问，引出总论点）`,
      `     A（答案）：我们必须…（亮明总论点，推荐用排比金句：要A、要B、更要C）`,
      a.golden_quote_seeds?.length
        ? `     可用金句素材：「${a.golden_quote_seeds[a.golden_quote_seeds.length - 1]}」`
        : "",
      `-->`,
      ``,
    ].filter(Boolean).join("\n")
    : "";

  // 结语金句参考
  const closingQuoteSeed = a.golden_quote_seeds?.length
    ? `基于素材「${a.golden_quote_seeds[a.golden_quote_seeds.length - 1]}」加工为收尾金句`
    : `用排比/号召型金句收尾，如"让我们A、B、C，共同D！"`;
  const closingRef = {
    confident: `我们将坚决落实各项部署，以实际行动回应期望，谢谢！`,
    humble:    `以上是我的汇报，不当之处请领导和同志们批评指正，谢谢！`,
    neutral:   `以上汇报，请领导审阅，谢谢！`,
  }[a.tone ?? "neutral"];

  return [
    `---`,
    `type: speech`,
    `title: ${speechTitle}`,
    `occasion: ${a.occasion}`,
    `duration: ${a.duration_min}分钟（约${wc.targetWords}字）`,
    `audience: ${a.audience}`,
    `structure: ${structure}`,
    `tone: ${a.tone ?? "neutral"}`,
    `org: ${org.shortName}`,
    `---`,
    ``,
    `# ${speechTitle}`,
    ``,
    `> **场合：** ${a.occasion} ｜ **时长：** ${a.duration_min} 分钟（约 ${wc.targetWords} 字） ｜ **听众：** ${a.audience}`,
    ``,
    `---`,
    ``,
    `## 开场白`,
    ``,
    `<!-- 请撰写开场白（约 30 字）`,
    `     参考：${openingRef}`,
    `     ${openingQuoteHint} -->`,
    ``,
    scqaBlock,
    pointsBlock,
    `## 结语`,
    ``,
    `<!-- 请撰写结语（约 30 字），须含一句金句`,
    `     ${closingQuoteSeed}`,
    `     参考结尾：${closingRef} -->`,
    ``,
    `---`,
    ``,
    `*发言人：${env("AUTHOR_NAME", "（姓名）")} ｜ ${org.shortName}*`,
  ].filter((s) => s !== undefined).join("\n");
}

function buildNoticeDraft(a: NoticeAnalysis, org: ReturnType<typeof loadOrgContext>): string {
  const issuer = a.issuer || org.name;
  const issueDate = a.issue_date || new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric"
  });

  // 议题列表：（一）（二）（三）格式
  const agendaBlock = a.agenda
    .map((item, i) => `（${toChineseOrdinal(i + 1)}）${item}`)
    .join("\n");

  // 要求列表：1. 2. 3. 格式
  const reqBlock = a.requirements
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");

  // 参会对象：每行顶格，末尾加冒号（主送机关格式）
  const addressBlock = a.attendees.map((att) => `${att}：`).join("\n");

  return [
    `---`,
    `type: notice`,
    `meeting: ${a.meeting_title}`,
    `time: ${a.meeting_time}`,
    `venue: ${a.venue}`,
    `org: ${org.shortName}`,
    `---`,
    ``,
    a.doc_number ? a.doc_number : "",
    ``,
    `# 关于召开${a.meeting_title}的通知`,
    ``,
    addressBlock,
    ``,
    `<!-- 请撰写正文首句（1-2句），点明召开会议的背景或依据。`,
    `     参考格式："为贯彻落实XXX精神，切实做好XXX工作，经研究，决定召开本次会议。"`,
    `     或："按照年度工作部署，现就XXX有关事项通知如下：" -->`,
    ``,
    `现将有关事项通知如下：`,
    ``,
    `**一、会议时间**`,
    ``,
    a.meeting_time,
    ``,
    `**二、会议地点**`,
    ``,
    a.venue,
    ``,
    `**三、参加人员**`,
    ``,
    a.attendees.map((att) => `- ${att}`).join("\n"),
    ``,
    `**四、会议内容**`,
    ``,
    agendaBlock,
    ``,
    `**五、有关要求**`,
    ``,
    reqBlock,
    ``,
    a.contact ? `联系人及联系方式：${a.contact}` : "",
    ``,
    `特此通知。`,
    ``,
    ``,
    issuer,
    ``,
    issueDate,
  ].filter((s) => s !== undefined).join("\n");
}

function buildFinancialAnalysisDraft(a: FinancialAnalysis, org: ReturnType<typeof loadOrgContext>): string {
  const date = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const author = a.author || env("AUTHOR_NAME", "");

  // 核心指标表格
  const metricsTable = a.metrics.length > 0 ? [
    `| 指标 | 实际完成 | 预算目标 | 差异 | 同比 |`,
    `| --- | --- | --- | --- | --- |`,
    ...a.metrics.map(m => {
      const actual = m.actual || "-";
      const budget = m.budget || "-";
      const yoy = m.yoy_change || "-";
      return `| ${m.note ? `*${m.note}*` : ""} | ${actual} | ${budget} | ${actual} vs ${budget} | ${yoy} |`;
    }),
    ``,
  ].join("\n") : "";

  // 分业务/分环节分析
  const segmentsBlock = a.segments.map((seg, i) => [
    `### ${toChineseOrdinal(i + 1)}、${seg.segment}`,
    ``,
    `<!-- 请展开分析该板块经营情况：收入 ${seg.revenue}，成本 ${seg.cost}，利润 ${seg.profit} -->`,
    `<!-- 关键驱动因素：${seg.key_drivers.join("；")} -->`,
    ``,
  ].join("\n")).join("\n");

  const highlightsBlock = a.highlights.length > 0 ? [
    `## 四、工作亮点`,
    ``,
    ...a.highlights.map((h, i) => `${i + 1}. ${h}`),
    ``,
  ].join("\n") : `## 四、工作亮点\n\n<!-- 请根据素材补充工作亮点 -->\n`;

  const problemsBlock = a.problems.length > 0 ? [
    `## 五、存在问题`,
    ``,
    ...a.problems.map((p, i) => `${i + 1}. ${p}`),
    ``,
  ].join("\n") : `## 五、存在问题\n\n<!-- 请根据素材分析存在的问题 -->\n`;

  const suggestionsBlock = a.suggestions.length > 0 ? [
    `## 六、下一步建议`,
    ``,
    ...a.suggestions.map((s, i) => `${i + 1}. ${s}`),
    ``,
  ].join("\n") : `## 六、下一步建议\n\n<!-- 请提出具体可落地的改进建议 -->\n`;

  const risksBlock = a.risks.length > 0 ? [
    `## 三、风险提示`,
    ``,
    `| 风险事项 | 严重程度 | 涉及金额 | 应对建议 |`,
    `| --- | --- | --- | --- |`,
    ...a.risks.map(r =>
      `| ${r.item} | ${r.severity === "高" ? "🔴" : r.severity === "中" ? "🟡" : "🟢"} ${r.severity} | ${r.amount || "-"} | ${r.suggestion} |`
    ),
    ``,
  ].join("\n") : `## 三、风险提示\n\n<!-- 暂无显著风险 -->\n`;

  return [
    `---`,
    `type: financial-analysis`,
    `period: ${a.period}`,
    `author: ${author}`,
    `org: ${org.shortName}`,
    `date: ${date}`,
    `---`,
    ``,
    `# ${a.period}财务分析报告`,
    ``,
    author ? `**编制人：** ${author}　　**单位：** ${org.name}　　**日期：** ${date}` :
             `**单位：** ${org.name}　　**日期：** ${date}`,
    ``,
    `---`,
    ``,
    `> **总体评价：** ${a.overview || "（请根据素材补充总体评价，30-50字）"}`,
    ``,
    `## 一、核心指标完成情况`,
    ``,
    metricsTable,
    `<!-- 请对上述指标进行详细解读：`,
    `     ①预算执行差异分析（三把尺子：与预算比、与同期比、与标杆比）`,
    `     ②主要变化原因归因（量变/价变/政策变/一次性事件）`,
    `     ③趋势研判（是持续性变化还是短期波动） -->`,
    ``,
    `## 二、分业务/分环节分析`,
    ``,
    segmentsBlock,
    risksBlock,
    highlightsBlock,
    problemsBlock,
    suggestionsBlock,
    `---`,
    ``,
    `以上报告，请审阅。`,
    ``,
    author ? `编制人：${author}` : "",
    ``,
    `${org.shortName}`,
    ``,
    date,
  ].filter((s) => s !== undefined).join("\n");
}

function buildRequestForApprovalDraft(a: RequestForApprovalAnalysis, org: ReturnType<typeof loadOrgContext>): string {
  const date = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const author = a.author || env("AUTHOR_NAME", "");

  const basisBlock = a.basis.length > 0
    ? a.basis.map((b, i) => `${toChineseOrdinal(i + 1)}、${b}`).join("\n")
    : "（请补充请示依据）";

  const opinionsBlock = a.opinions_solicited.length > 0
    ? a.opinions_solicited.map((o, i) => `${i + 1}. ${o}`).join("\n")
    : "（无）";

  const countersignBlock = a.countersign_opinions.length > 0
    ? a.countersign_opinions.map((c, i) => `${i + 1}. ${c}`).join("\n")
    : "（无）";

  const attachmentsBlock = a.attachments.length > 0
    ? a.attachments.map((att, i) => `${i + 1}. ${att}`).join("\n")
    : "（无）";

  return [
    `---`,
    `type: request-for-approval`,
    `title: ${a.title}`,
    `recipient: ${a.recipient}`,
    `org: ${org.shortName}`,
    `date: ${date}`,
    `---`,
    ``,
    a.title ? `# ${a.title}` : "# 关于×××的请示",
    ``,
    a.recipient ? `${a.recipient}：` : "×××：",
    ``,
    `<!-- 请撰写正文首段：点明请示事由。一句话说清请示什么、为什么请示。`,
    `     参考：${a.subject}`,
    `     依据：${a.basis.join("；")}`,
    a.amount ? `     涉及金额：${a.amount}` : "",
    `-->`,
    ``,
    `**一、请示事由**`,
    ``,
    `<!-- 请展开说明：`,
    `     1. 背景和必要性`,
    `     2. 具体事项内容`,
    `     3. 方案概述`,
    a.amount ? `     4. 测算依据：请详细列明金额构成和计算过程` : "",
    `-->`,
    ``,
    a.amount ? [
      `**二、经费测算**`,
      ``,
      `<!-- 请填列明细：项目 | 金额 | 测算依据 -->`,
      ``,
      `| 序号 | 项目 | 金额（万元） | 测算依据 |`,
      `| --- | --- | --- | --- |`,
      `| 1 | | | |`,
      `| 合计 | | ${a.amount} | |`,
      ``,
    ].join("\n") : "",
    `**${a.amount ? "三" : "二"}、征求意见情况**`,
    ``,
    opinionsBlock,
    ``,
    `**${a.amount ? "四" : "三"}、会签意见**`,
    ``,
    countersignBlock,
    ``,
    `妥否，请批示。`,
    ``,
    a.attachments.length > 0 ? [
      `附件：`,
      attachmentsBlock,
      ``,
    ].join("\n") : "",
    `${org.name}`,
    ``,
    date,
    ``,
    a.contact ? `（联系人：${a.contact}　电话：${a.contact_phone}）` : "",
  ].filter((s) => s !== undefined).join("\n");
}

function buildBudgetPreparationDraft(a: BudgetPreparationAnalysis, org: ReturnType<typeof loadOrgContext>): string {
  const date = new Date().toLocaleDateString("zh-CN");
  const title = `${a.fiscal_year}预算编制说明`;

  const revenueRows = a.revenue_items.length > 0
    ? a.revenue_items.map((item, i) =>
        `| ${i + 1} | ${item.name} | ${item.lastPeriodAmount || "-"} | ${item.amount} | ${item.changePct || "-"} | ${item.rationale} |`
      ).join("\n")
    : `| 1 | <!-- 待填列 --> | | | | |`;

  const costRows = a.cost_items.length > 0
    ? a.cost_items.map((item, i) =>
        `| ${i + 1} | ${item.name} | ${item.lastPeriodAmount || "-"} | ${item.amount} | ${item.changePct || "-"} | ${item.rationale} |`
      ).join("\n")
    : `| 1 | <!-- 待填列 --> | | | | |`;

  const projectRows = a.project_items.length > 0
    ? a.project_items.map((item, i) =>
        `| ${i + 1} | ${item.name} | ${item.lastPeriodAmount || "-"} | ${item.amount} | ${item.changePct || "-"} | ${item.rationale} |`
      ).join("\n")
    : `| 1 | <!-- 待填列 --> | | | | |`;

  const notesBlock = a.special_notes.length > 0
    ? a.special_notes.map((n, i) => `${i + 1}. ${n}`).join("\n")
    : "（无）";

  return [
    `---`,
    `type: budget-preparation`,
    `fiscal_year: ${a.fiscal_year}`,
    `unit: ${a.unit}`,
    `org: ${org.shortName}`,
    `date: ${date}`,
    `---`,
    ``,
    `# ${title}`,
    ``,
    `**编制单位：** ${a.unit}`,
    ``,
    `**编制日期：** ${date}`,
    ``,
    `---`,
    ``,
    `## 一、编制依据`,
    ``,
    a.preparation_basis.length > 0
      ? a.preparation_basis.map(b => `- ${b}`).join("\n")
      : `<!-- 请列明预算编制依据：上级文件、会议决定、历史数据等 -->`,
    ``,
    `## 二、收入预算`,
    ``,
    `| 序号 | 项目 | 上期金额（万元） | 本期预算（万元） | 增减% | 测算依据 |`,
    `| --- | --- | --- | --- | --- | --- |`,
    revenueRows,
    ``,
    `<!-- 请补充收入预算总体说明：增长/下降主要原因、关键驱动因素 -->`,
    ``,
    `## 三、成本预算`,
    ``,
    `| 序号 | 项目 | 上期金额（万元） | 本期预算（万元） | 增减% | 测算依据 |`,
    `| --- | --- | --- | --- | --- | --- |`,
    costRows,
    ``,
    `<!-- 请补充成本预算总体说明：增长/下降主要原因、结构变化分析 -->`,
    ``,
    a.project_items.length > 0 ? [
      `## 四、项目预算`,
      ``,
      `| 序号 | 项目 | 上期金额（万元） | 本期预算（万元） | 增减% | 测算依据 |`,
      `| --- | --- | --- | --- | --- | --- |`,
      projectRows,
      ``,
      `<!-- 请补充各项目立项依据和具体经费测算说明 -->`,
      ``,
    ].join("\n") : "",
    `## ${a.project_items.length > 0 ? "五" : "四"}、特别说明`,
    ``,
    notesBlock,
    ``,
    `<!-- 下列事项须特别说明：一次性因素、政策调整影响、不确定性较大的项目等 -->`,
    ``,
    `---`,
    ``,
    `${org.name}`,
    ``,
    date,
  ].join("\n");
}

// ══════════════════════════════════════════════════════════
// 写作指令生成
// ══════════════════════════════════════════════════════════

function buildWriteInstruction(a: DocAnalysis, draftPath: string, org: ReturnType<typeof loadOrgContext>): string {
  const orgBlock = orgContextBlock(org);
  const base = [
    `# 写作指令 — ${a.type}`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请补全 draft.md 中所有 \`<!-- 请在此... -->\` 或 \`<!-- 请撰写... -->\` 占位部分，写出完整的正文内容。`,
    `**draft.md 路径：** ${draftPath}`,
    ``,
  ];

  if (a.type === "report") {
    return [...base,
      `## 写作要求`,
      ``,
      `**风格规范**`,
      `- 汇报文体：简洁、客观、精炼，动词开头（完成/推进/落实/部署）`,
      `- 数据优先：有数字的结论优于定性描述，金额/比率/时间节点须写明`,
      `- 避免空话套话："高度重视""强化意识"等无内容支撑的表述须删除`,
      ``,
      `**各节要求**`,
      `- **一、完成情况**：每项事项说明"做了什么→取得什么结果→关键数据"`,
      `- **二、在途进展**：说明"当前进度→下一里程碑→预计完成时间"`,
      `- **三、存在问题**：直接点名问题，说明影响范围，提出解决方向`,
      `- **四、下期计划**：每条含时间节点，目标可量化，优先级清晰`,
      ``,
      `**结尾**`,
      `- 保留"以上报告，请审阅。"及落款，不得删除`,
      `- 目标字数：约 ${a.word_target} 字（含各节正文，不含骨架标题）`,
      ``,
      `## 完成后`,
      ``,
      `直接修改 draft.md，保留所有 frontmatter 和表格，完成后暂停等待用户 Review。`,
    ].join("\n");
  }

  if (a.type === "minutes") {
    return [...base,
      `## 写作要求`,
      ``,
      `**风格规范**`,
      `- 纪要文体：客观中立，不加主观评价`,
      `- 标准表述：用"与会人员认为…""会议认为…""经讨论，会议决定…"等规范句式`,
      `- 按议题分段记录，每段首句点明议题名称`,
      ``,
      `**各节要求**`,
      `- **二、主要讨论内容**：围绕各议题记录主要观点和分歧（如有），保持客观`,
      `- 行动项追踪表已预填，如素材中有遗漏的行动项可在表格中补充`,
      `- 领导摘要已预填，如需润色请保持100字以内`,
      ``,
      `## 完成后`,
      ``,
      `直接修改 draft.md，完成后暂停等待用户 Review。`,
    ].join("\n");
  }

  if (a.type === "notice") {
    return [...base,
      `## 写作要求`,
      ``,
      `**风格规范**`,
      `- 党政公文体：用词庄重、简洁、准确，不用口语化表达`,
      `- 通知正文简短，引言控制在50字以内`,
      `- 结构化内容（时间/地点/议题/要求）已由骨架预填，请核查准确性`,
      ``,
      `**正文引言写法**`,
      `- 开头交代背景/依据，如"为贯彻落实…精神，经研究，定于…"`,
      `- 或直接说明目的，如"为总结…工作、部署…任务，定于…"`,
      `- 引言末尾接"现将有关事项通知如下："（已在骨架中）`,
      ``,
      `**注意事项**`,
      `- 发文机关和日期已预填，不得修改`,
      `- "特此通知。"为固定结尾，不得删除`,
      `- 如联系人信息缺失，请补充完整（姓名+电话）`,
      ``,
      `## 完成后`,
      ``,
      `直接修改 draft.md，完成后暂停等待用户 Review。`,
    ].join("\n");
  }

  if (a.type === "financial-analysis") {
    return [...base,
      `## 写作要求`,
      ``,
      `**风格规范**`,
      `- 财务分析文体：数据驱动、差异导向、归因清晰、建议可落地`,
      `- 数字优先：实际完成 vs 预算 vs 同期，三把尺子（与预算比、与同期比、与标杆比）`,
      `- 归因分析：差异必须归因到具体业务板块和驱动因素，不能停留在总量层面`,
      `- 风险导向：对异常波动和超预算项目，须明确风险等级和应对建议`,
      ``,
      `**各节要求**`,
      `- **一、核心指标完成情况**：逐项解读指标完成状况，差异分析须回答三个问题：差异多少？为什么？怎么办？`,
      `- **二、分业务/分环节分析**：每板块说明收入、成本、利润变化及关键驱动因素`,
      `- **三、风险提示**：标注严重程度，说明影响范围，提出应对建议`,
      `- **四、工作亮点**：须含可量化数据（金额、增长率、排名）`,
      `- **五、存在问题**：点名具体差距和原因，不能笼统说"需加强"`,
      `- **六、下一步建议**：须含具体措施、量化目标和时间节点`,
      ``,
      `**结尾**`,
      `- 保留"以上报告，请审阅。"及落款，不得删除`,
      `- 目标字数：约 ${a.word_target} 字（含各节正文，不含骨架标题和表格）`,
      ``,
      `## 完成后`,
      ``,
      `直接修改 draft.md，保留所有 frontmatter 和表格，完成后暂停等待用户 Review。`,
    ].join("\n");
  }

  if (a.type === "request-for-approval") {
    return [...base,
      `## 写作要求`,
      ``,
      `**风格规范**`,
      `- 请示公文规范：一文一事、理由充分、测算有据、格式严格`,
      `- 标题格式："关于×××的请示"，不能省略"关于"和"的请示"`,
      `- 正文结构：请示事由 → 测算依据 → 征求意见情况 → 会签意见 → 妥否请批示`,
      `- 结尾固定："妥否，请批示。"（不得省略句号），单独一行`,
      ``,
      `**各节要求**`,
      `- **一、请示事由**：说明背景、必要性、具体事项内容和方案`,
      `- **经费测算**（如涉及）：列表明细，说明测算依据和计算过程`,
      `- **征求意见情况**：逐条列出已征求意见的部门及反馈`,
      `- **会签意见**：逐条列出会签部门意见`,
      ``,
      `**注意事项**`,
      `- 一份请示只能涉及一个事项（一文一事原则）`,
      `- 涉及金额的，须逐项列明测算依据`,
      `- 附件清单须完整，与正文内容对应`,
      `- 联系人及电话为必填项`,
      ``,
      `## 完成后`,
      ``,
      `直接修改 draft.md，保留所有 frontmatter 和格式，完成后暂停等待用户 Review。`,
    ].join("\n");
  }

  if (a.type === "budget-preparation") {
    return [...base,
      `## 写作要求`,
      ``,
      `**风格规范**`,
      `- 预算编制说明文体：数据准确、测算有据、格式规范、说明清晰`,
      `- 编制依据：逐条列出上级文件、会议决定、历史趋势等依据来源`,
      `- 收支预算：按分项列表明细，含上期金额、本期预算、增减百分比和测算依据`,
      `- 项目预算：逐项说明立项依据和经费测算明细`,
      ``,
      `**各节要求**`,
      `- **一、编制依据**：逐条说明预算编制的主要依据，每条须标注文件名称或数据来源`,
      `- **二、收入预算**：逐项说明收入来源、测算方法和增减原因`,
      `- **三、成本预算**：按分环节或分科目列示，说明增减变动原因`,
      `- **四、项目预算**（如有）：逐项说明立项依据、实施方案和经费测算明细`,
      `- **最后、特别说明**：注明一次性因素、政策调整影响及其他需特别说明的事项`,
      ``,
      `**注意事项**`,
      `- 所有金额数据须保持一致性和可追溯性`,
      `- rationale 字段是"为什么是这个数字"的回答，不能只写金额`,
      `- 变动超过 +20% 或 -20% 的项目，须重点说明原因`,
      `- 保留落款（编制单位和日期），不得删除`,
      `- 目标字数：约 ${a.word_target} 字`,
      ``,
      `## 完成后`,
      ``,
      `直接修改 draft.md，保留所有 frontmatter 和表格，完成后暂停等待用户 Review。`,
    ].join("\n");
  }

  // remaining: report | minutes | speech | notice
  if (a.type !== "speech") {
    throw new Error(`Unexpected type in write instruction: ${(a as { type: string }).type}`);
  }
  const wc = calcSpeechWords(a.duration_min, a.key_points.length, a.structure, parseInt(env("SPEECH_WORDS_PER_MIN", "160")));
  const structure = a.structure ?? "并列式";

  const toneDesc = a.tone === "confident"
    ? "自信坚定——多用'坚决''切实''全力以赴''不折不扣''务必'等词"
    : a.tone === "humble"
    ? "谦逊务实——多用'不足''有差距''努力方向''在今后工作中'等词"
    : "平实陈述——多用'积极推进''持续深化''扎实落实''下一步将'等词";

  const structureDesc = structure === "SCQA式"
    ? [
        `**SCQA 结构**：先在"一、总体形势"中用 S→C→Q→A 导入，亮明总论点；`,
        `再在后续各节用金字塔展开分项部署。"一"中的 A（答案）须是后续各节的浓缩版，`,
        `读者读完"一"就能掌握全篇核心。`,
      ].join("\n")
    : structure === "递进式"
    ? [
        `**递进结构**：三节按"认识→行动→目标"层层推进，`,
        `第一节提高认识（Why），第二节明确部署（How），第三节展望目标（Where to）。`,
        `每节首句结论必须呼应递进关系，不能写成并列。`,
      ].join("\n")
    : [
        `**并列结构**：三节彼此独立、同等重要，均用金字塔三层展开。`,
        `每节开头结论句须各有侧重，不能是同一意思的三种说法。`,
      ].join("\n");

  return [...base,
    `## 一、总体写作要求`,
    ``,
    `- **体裁**：口语化书面体，句子较短（15-25字/句），节奏感强，适合朗读`,
    `- **结构**：${structure}（见第三节）`,
    `- **语气**：${toneDesc}`,
    `- **总字数**：约 ${wc.targetWords} 字（开结语各约30字${wc.scqaWords ? `，形势导入约${wc.scqaWords}字` : ""}，各论点节均摊约 ${wc.wordsPerPoint} 字）`,
    ``,
    `---`,
    ``,
    `## 二、金字塔三层写法（每个正文节必须遵循）`,
    ``,
    `每节内部结构须按以下三层展开，**第①层最重要，须优先写好**：`,
    ``,
    `### ①结论句（金句）—— 置于节首，15-20字`,
    ``,
    `- 这是整节最重要的一句话，读者只记得住这一句`,
    `- 它必须是完整的观点陈述，有力、精炼、可独立传播`,
    `- 写完后自问：把这句话单独拿出来，有没有分量？`,
    ``,
    `**金句写作公式（参照 golden_quote_seeds 素材加工）**：`,
    ``,
    `| 类型 | 公式 | 示例 |`,
    `| --- | --- | --- |`,
    `| 排比型（最常用） | 要A、要B、更要C | 要敢想、敢干、更要敢担当 |`,
    `| 对仗型 | 既要A，又要B | 既要防范风险，又要激发活力 |`,
    `| 数据型 | 从A到B，X年/月实现C | 三年间利润从亏损到盈利两亿 |`,
    `| 设问型 | A靠什么？靠B | 转型靠什么？靠改革、靠创新、靠实干 |`,
    `| 号召型 | 让我们A、B，共同C | 让我们齐心协力、攻坚克难，共同书写新篇章 |`,
    ``,
    `**金句嵌入位置**：开场白（引用型定基调）→ 各节首句（排比/对仗型）→ 结语（排比/号召型最高潮）`,
    ``,
    `### ②支撑——1-2句，比结论句更具体`,
    ``,
    `- 用数据、事实、对比说明为什么这个论点重要`,
    `- 必须比①层更具体，不能是①层的换句话说`,
    `- 有量化数据优先使用（参照 data_to_cite）`,
    ``,
    `### ③举措——三条具体行动`,
    ``,
    `- 固定格式："一要…；二要…；三要…"`,
    `- 每条均为可执行的具体动作，不能是口号或愿景`,
    `- 动词开头：推进、建立、完善、强化、落实…`,
    ``,
    `---`,
    ``,
    `## 三、${structure}结构说明`,
    ``,
    structureDesc,
    ``,
    `---`,
    ``,
    `## 完成后`,
    ``,
    `直接修改 draft.md，完成后暂停等待用户 Review。`,
  ].join("\n");
}

// ══════════════════════════════════════════════════════════
// 主函数
// ══════════════════════════════════════════════════════════

async function main() {
  const args = parseCli();
  const { dir, verbose } = args;
  const paths = workspacePaths(dir);
  const org = loadOrgContext();

  console.log("📖 读取 analysis.json...");
  const analysis = await readJson<DocAnalysis>(paths.analysis);

  if (!analysis) {
    console.error("错误：analysis.json 不存在，请先运行 content-analyzer");
    process.exit(1);
  }

  if (!analysis.type) {
    console.error("错误：analysis.json 缺少 type 字段，请重新运行 content-analyzer --type [report|minutes|speech|notice|financial-analysis|request-for-approval|budget-preparation]");
    process.exit(1);
  }

  const errors = validateDocAnalysis(analysis);
  if (errors.length) {
    console.error("❌ analysis.json 不完整，请由 Agent 重新填写：");
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  log(verbose, "analysis:", JSON.stringify(analysis, null, 2));

  // 生成 draft.md
  let draft: string;
  switch (analysis.type) {
    case "report":               draft = buildReportDraft(analysis, org); break;
    case "minutes":              draft = buildMinutesDraft(analysis, org); break;
    case "speech":               draft = buildSpeechDraft(analysis, org); break;
    case "notice":               draft = buildNoticeDraft(analysis, org); break;
    case "financial-analysis":   draft = buildFinancialAnalysisDraft(analysis, org); break;
    case "request-for-approval": draft = buildRequestForApprovalDraft(analysis, org); break;
    case "budget-preparation":   draft = buildBudgetPreparationDraft(analysis, org); break;
    default:
      console.error(`内部错误：未处理的文档类型 ${(analysis as { type: string }).type}`);
      process.exit(1);
  }

  await writeText(paths.draft, draft);
  console.log(`📄 草稿骨架已生成: ${paths.draft}`);

  // 生成写作指令
  const instruction = buildWriteInstruction(analysis, paths.draft, org);
  const instructionPath = resolve(dir, "_write_instruction.md");
  await writeText(instructionPath, instruction);

  console.log(`\n✅ doc-writer [${analysis.type}] 完成`);
  console.log(`   草稿：    ${paths.draft}`);
  console.log(`   写作指令：${instructionPath}`);
  console.log(`\n⏸️  下一步：Agent 读取 _write_instruction.md 并补全 draft.md`);
}

main().catch((err) => {
  console.error("❌ doc-writer 执行失败:", err.message);
  process.exit(1);
});
