// ============================================================
// ppt-outline/scripts/main.ts
// 读取 analysis.json，生成结构化 PPT 演讲大纲（ppt-outline.md）
// 遵循金字塔原理 + SCQA + Action Title 设计原则
// ============================================================

import { parseCli } from "../../../shared/cli";
import { readJson, readText, writeText, workspacePaths } from "../../../shared/fs";
import { loadOrgContext, orgContextBlock } from "../../../shared/context";
import { toChineseOrdinal } from "../../../shared/chinese";
import { validateDocAnalysis, type DocAnalysis, type ReportAnalysis, type MinutesAnalysis, type SpeechAnalysis, type NoticeAnalysis, type FinancialAnalysis, type BudgetPreparationAnalysis } from "../../../shared/types";
import { resolve } from "path";

// ── 通用 Slide 接口 ──

interface SlideOutline {
  /** 幻灯片编号 */
  num: number;
  /** 页面类型 */
  type: "title-slide" | "executive-summary" | "section-header" | "content" | "chart" | "table" | "comparison" | "roadmap" | "call-to-action" | "quote" | "appendix";
  /** 行动标题（完整句子结论，非标签） */
  actionTitle: string;
  /** 副标题（可选） */
  subtitle?: string;
  /** 核心信息（一句话，读者离开后唯一记得的） */
  keyMessage?: string;
  /** 要点列表（≤4条，每条10-15字） */
  bullets?: string[];
  /** 可视化建议 */
  visual?: string;
  /** 讲解词引导（Speaker Notes，2-4句话） */
  speakerNotes?: string;
}

// ── 标题格式化 ──

function slideBlock(s: SlideOutline): string {
  const parts = [
    ``,
    `## Slide ${s.num} | ${slideTypeLabel(s.type)}`,
    ``,
    s.subtitle ? `- **副标题**：${s.subtitle}` : "",
    `- **行动标题**：${s.actionTitle}`,
    `- **类型**：${s.type}`,
    s.keyMessage ? `- **核心信息**：${s.keyMessage}` : "",
    s.bullets?.length ? [
      `- **要点**（≤${s.bullets.length}条）：`,
      ...s.bullets.map((b, i) => `  ${i + 1}. ${b}`),
    ].join("\n") : "",
    s.visual ? `- **可视化建议**：${s.visual}` : "",
    s.speakerNotes ? `- **讲解词引导**：${s.speakerNotes}` : "",
  ].filter(Boolean).join("\n");
  return parts;
}

function slideTypeLabel(t: SlideOutline["type"]): string {
  const map: Record<string, string> = {
    "title-slide": "封面",
    "executive-summary": "执行摘要",
    "section-header": "转场页",
    "content": "正文",
    "chart": "图表",
    "table": "表格",
    "comparison": "对比",
    "roadmap": "路线图",
    "call-to-action": "行动号召",
    "quote": "金句",
    "appendix": "附录",
  };
  return map[t] ?? t;
}

const FINANCIAL_CHART_MAP: Record<string, string> = {
  "收入趋势": "柱状图+折线图叠加（实际 vs 预算双线，含趋势线，标注各月同比变化）",
  "成本结构": "瀑布图（各环节成本贡献分解：收寄→运输→处理→投递→管理，标注每环节占比和同比变化）",
  "业务占比": "环形图（各业务板块收入/利润占比，内环为收入结构，外环为利润贡献）",
  "对标分析": "雷达图（本省 vs 全国平均 vs 先进省份，六维：收入增速/利润率/成本收入比/欠费率/件均收入/人工利润率）",
  "进度监控": "仪表盘/温度计图（预算执行进度，绿色=正常±5%，黄色=偏差5-15%，红色=偏差>15%）",
  "同比环比": "双柱状图（本期/同期并排，附环比折线标注关键拐点原因）",
  "预算执行": "子弹图（实际 vs 预算 vs 预警线，三色带标注完成质量）",
};

// ── Report → PPT 大纲 ──

function buildReportOutline(a: ReportAnalysis, org: ReturnType<typeof loadOrgContext>): SlideOutline[] {
  const slides: SlideOutline[] = [];

  slides.push({
    num: 1, type: "title-slide",
    actionTitle: `${a.period}工作报告`,
    subtitle: `${org.name} | ${a.author || ""}`,
    speakerNotes: "开场自我介绍，说明汇报主题和时间范围。",
  });

  slides.push({
    num: 2, type: "executive-summary",
    actionTitle: a.key_metrics && Object.keys(a.key_metrics).length > 0
      ? Object.entries(a.key_metrics).map(([k, v]) => `${k}${v}`).slice(0, 3).join("，")
      : `${a.period}重点工作全面完成，关键指标符合预期`,
    keyMessage: Object.entries(a.key_metrics).slice(0, 3).map(([k, v]) => `${k}达到${v}`).join("；") || "各项工作按计划推进",
    bullets: a.completed_items.slice(0, 4),
    visual: "关键指标仪表盘（3-4个核心指标卡片并排）",
    speakerNotes: "用 60 秒概括本期最核心的 3 个亮点，让领导迅速建立对本期工作的整体印象。",
  });

  if (a.completed_items.length > 0) {
    slides.push({
      num: 3, type: "content",
      actionTitle: `${a.completed_items.length}项重点工作按期完成，关键数据表现亮眼`,
      bullets: a.completed_items.slice(0, 4),
      visual: a.completed_items.length >= 3 ? "分栏卡片布局，每项一个卡片（事项名称 + 核心数据）" : "带数据标注的流程图",
      speakerNotes: "逐项展开说明完成情况。每项控制在 30 秒内，先讲结果再讲过程。数据要具体到金额/百分比/时间节点。",
    });
  }

  if (a.ongoing_items.length > 0) {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "roadmap",
      actionTitle: "在途工作按计划推进中，关键节点可控",
      bullets: a.ongoing_items.slice(0, 4),
      visual: "甘特图或进度条（每项标注当前进度%和预计完成月份）",
      speakerNotes: "重点说明：①当前进度 ②下个里程碑 ③预计完成时间 ④是否需要领导协调资源。",
    });
  }

  if (a.blockers.length > 0) {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "content",
      actionTitle: `${a.blockers.length}个问题需要关注，已制定应对方案`,
      bullets: a.blockers.slice(0, 4).map(b => `${b}（已制定应对措施）`),
      visual: "红黄绿风险矩阵（问题严重度 vs 影响范围）",
      speakerNotes: "客观陈述问题，不回避矛盾。每个问题说明：①现状 ②影响 ③建议方案。",
    });
  }

  if (a.next_period_plan.length > 0) {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "roadmap",
      actionTitle: "下期聚焦重点任务，明确时间节点和预期产出",
      bullets: a.next_period_plan.slice(0, 5),
      visual: "时间线（标注未来4周/月的关键节点）",
      speakerNotes: "按优先级排序。每项任务说明：①目标产出 ②负责人/部门 ③完成时限。",
    });
  }

  {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "call-to-action",
      actionTitle: "请领导审议本次报告，并就下期重点方向给予指导",
      speakerNotes: "简短收尾，表达对领导时间的感谢，开放性邀请提问。",
    });
  }

  return slides;
}

// ── Minutes → PPT 大纲 ──

function buildMinutesOutline(a: MinutesAnalysis, org: ReturnType<typeof loadOrgContext>): SlideOutline[] {
  const slides: SlideOutline[] = [];

  slides.push({
    num: 1, type: "title-slide",
    actionTitle: `${a.meeting_title}纪要`,
    subtitle: `${a.date}${a.venue ? ` | ${a.venue}` : ""} | ${org.shortName}`,
    speakerNotes: "说明会议背景、目的和主要参会人员。",
  });

  slides.push({
    num: 2, type: "executive-summary",
    actionTitle: a.summary_for_leader || `会议形成${a.decisions.length}项决议、${a.action_items.length}项行动`,
    keyMessage: a.decisions.slice(0, 3).join("；"),
    bullets: [
      `参会人员：${a.attendees.slice(0, 5).join("、")}${a.attendees.length > 5 ? "等" : ""}`,
      a.chair ? `主持人：${a.chair}` : "",
      `主要议程：${a.agenda.map((item, i) => `${toChineseOrdinal(i + 1)}.${item}`).join("；")}`,
    ].filter(Boolean),
    speakerNotes: "30 秒概括会议全貌：什么时候、谁参加了、讨论了什么、决定了什么。",
  });

  slides.push({
    num: 3, type: "content",
    actionTitle: `会议围绕${a.agenda.length}项议题展开讨论`,
    bullets: a.agenda,
    visual: "议题流程图（议程 → 讨论要点 → 决议）",
    speakerNotes: "逐项议题说明讨论要点和结论走向。",
  });

  if (a.decisions.length > 0) {
    slides.push({
      num: 4, type: "content",
      actionTitle: `会议形成${a.decisions.length}项决议`,
      bullets: a.decisions.slice(0, 4),
      visual: "决议清单（编号 + 决议内容，带图标强调）",
      speakerNotes: "逐条宣读决议内容，每条约 15 秒。强调决议的约束力和落实要求。",
    });
  }

  if (a.action_items.length > 0) {
    const idx = slides.length + 1;
    const tableBullets = a.action_items.slice(0, 6).map(
      ai => `${ai.action} | ${ai.owner} | ${ai.deadline} | ${ai.priority ?? "中"}`
    );
    slides.push({
      num: idx, type: "table",
      actionTitle: `${a.action_items.length}项行动已明确责任人和截止日期`,
      bullets: tableBullets,
      visual: "行动项追踪表格（行动事项 | 责任人 | 截止日期 | 优先级 | 状态）",
      speakerNotes: "逐项确认责任人是否明确、截止日期是否合理。对高优先级行动项重点提醒。",
    });
  }

  {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "call-to-action",
      actionTitle: a.next_meeting ? `下次会议：${a.next_meeting}` : "请各责任人在截止日期前完成行动项",
      speakerNotes: "重申关键截止日期，确认下次会议的初步安排。",
    });
  }

  return slides;
}

// ── Speech → PPT 大纲 ──

function buildSpeechOutline(a: SpeechAnalysis, org: ReturnType<typeof loadOrgContext>): SlideOutline[] {
  const slides: SlideOutline[] = [];
  const structure = a.structure ?? "并列式";

  slides.push({
    num: 1, type: "title-slide",
    actionTitle: a.title_suggestion || `在${a.occasion}上的讲话`,
    subtitle: `${org.name} | ${a.duration_min}分钟 | 听众：${a.audience}`,
    speakerNotes: "开场自我介绍（如需要），说明讲话背景和主题。",
  });

  // SCQA 导入页
  if (structure === "SCQA式") {
    slides.push({
      num: 2, type: "section-header",
      actionTitle: "当前形势与挑战",
      keyMessage: "我们正处在一个关键时期，既面临机遇也面临挑战",
      visual: "S-C-Q 递进图（数据支撑的形势分析）",
      speakerNotes: a.opening_quote
        ? `引用「${a.opening_quote}」定基调。说明当前形势（S），指出挑战（C），提出问题（Q），亮明答案（A）。用数据建立紧迫感。`
        : "说明当前形势（S）→ 指出挑战（C）→ 提出问题（Q）→ 亮明答案（A）。SCQA 导入需 60-90 秒，用数据建立紧迫感。",
    });
  }

  // 正文论点 = 核心 slides
  const keyPointStartIdx = structure === "SCQA式" ? 3 : 2;
  a.key_points.forEach((kp, i) => {
    const num = keyPointStartIdx + i;
    slides.push({
      num, type: "content",
      actionTitle: kp,
      keyMessage: kp,
      bullets: a.data_to_cite[i]?.trim()
        ? [`数据支撑：${a.data_to_cite[i]}`, "举措一：……", "举措二：……", "举措三：……"]
        : ["举措一：……", "举措二：……", "举措三：……"],
      visual: i === 0 ? "金字塔结构图（结论在上，支撑在下）" : "三栏布局（举措 | 目标 | 时间）",
      speakerNotes: [
        a.golden_quote_seeds?.[i]
          ? `金句素材：「${a.golden_quote_seeds[i]}」→ 加工为排比/对仗金句作为本节开场。`
          : "以一句金句开场，定调本节核心观点。",
        "然后展开数据支撑 + 三条举措。每条约 30-40 秒。语气：坚定有力，节奏由慢到快。",
      ].join(" "),
    });
  });

  // 结语页
  {
    const lastIdx = keyPointStartIdx + a.key_points.length;
    slides.push({
      num: lastIdx, type: "call-to-action",
      actionTitle: "号召与展望",
      keyMessage: a.golden_quote_seeds?.length
        ? `基于「${a.golden_quote_seeds[a.golden_quote_seeds.length - 1]}」加工为收尾金句`
        : "让我们齐心协力，共同推进目标落地",
      speakerNotes: "1-2 句总结性金句收尾。语气从坚定到激昂，最后停顿 2 秒，然后致谢。全程控制在 30 秒内。",
    });
  }

  return slides;
}

// ── Notice → PPT 大纲 ──

function buildNoticeOutline(a: NoticeAnalysis, org: ReturnType<typeof loadOrgContext>): SlideOutline[] {
  const slides: SlideOutline[] = [];

  slides.push({
    num: 1, type: "title-slide",
    actionTitle: `关于召开${a.meeting_title}的通知`,
    subtitle: a.doc_number || org.name,
    speakerNotes: "宣读会议通知。",
  });

  slides.push({
    num: 2, type: "content",
    actionTitle: `定于${a.meeting_time}在${a.venue}召开${a.meeting_title}`,
    bullets: [
      `时间：${a.meeting_time}`,
      `地点：${a.venue}`,
      `参会人员：${a.attendees.join("、")}`,
    ],
    visual: "会议信息卡片（时间 | 地点 | 参会人员三栏布局）",
    speakerNotes: "用 30 秒清晰宣读会议基本信息，确保所有参会者明确时间和地点。",
  });

  if (a.agenda.length > 0) {
    slides.push({
      num: 3, type: "content",
      actionTitle: `会议主要议程（${a.agenda.length}项）`,
      bullets: a.agenda.slice(0, 5).map((item, i) => `${toChineseOrdinal(i + 1)}、${item}`),
      visual: "议程时间线（标注每项议题的预计讨论时长）",
      speakerNotes: "逐项说明议程安排和预计时间分配。",
    });
  }

  if (a.requirements.length > 0) {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "content",
      actionTitle: "请参会人员提前做好准备",
      bullets: a.requirements.slice(0, 4),
      visual: "清单式布局（带勾选框图标）",
      speakerNotes: a.contact ? `强调关键要求，告知联系人：${a.contact}` : "强调关键要求和截止日期。",
    });
  }

  return slides;
}

// ── Financial Analysis → PPT 大纲 ──

function buildFinancialAnalysisOutline(a: FinancialAnalysis, org: ReturnType<typeof loadOrgContext>): SlideOutline[] {
  const slides: SlideOutline[] = [];

  slides.push({
    num: 1, type: "title-slide",
    actionTitle: `${a.period}财务分析报告`,
    subtitle: `${org.name} | ${a.author || ""}`,
    speakerNotes: "开场自我介绍，说明报告周期和分析范围。",
  });

  slides.push({
    num: 2, type: "executive-summary",
    actionTitle: a.overview || `${a.period}经营总体平稳，关键指标符合预期`,
    bullets: a.metrics.slice(0, 4).map(m =>
      `${m.note || "核心指标"}：实际${m.actual}${m.budget ? `，预算${m.budget}` : ""}${m.yoy_change ? `，同比${m.yoy_change}` : ""}`
    ),
    visual: "关键指标仪表盘（4-6个核心指标卡片，红黄绿三色标识完成质量）",
    speakerNotes: "用 60 秒概括本期财务全景：最主要的变化是什么？最值得关注的风险是什么？核心建议是什么？",
  });

  slides.push({
    num: 3, type: "chart",
    actionTitle: `收入完成${a.metrics.length > 0 ? "情况" : ""}：实际 vs 预算 vs 同期`,
    bullets: a.metrics.filter(m => m.actual).slice(0, 4).map(m =>
      `${m.note || ""}：实际${m.actual}，预算${m.budget || "-"}，同比${m.yoy_change || "-"}`
    ),
    visual: FINANCIAL_CHART_MAP["收入趋势"],
    speakerNotes: "逐项说明收入指标的完成进度和增长趋势。对偏离预算超过10%的项目重点解释原因。",
  });

  slides.push({
    num: 4, type: "chart",
    actionTitle: "成本结构分析：各环节成本贡献与变化趋势",
    bullets: a.segments.slice(0, 5).map(s =>
      `${s.segment}：成本${s.cost}，利润${s.profit}`
    ),
    visual: FINANCIAL_CHART_MAP["成本结构"],
    speakerNotes: "说明各环节成本占比和同比变化。重点分析超预算环节的原因和改进空间。",
  });

  // Segments deep dive
  a.segments.forEach((seg, i) => {
    slides.push({
      num: 5 + i, type: "content",
      actionTitle: `${seg.segment}：收入${seg.revenue}，利润${seg.profit}`,
      bullets: seg.key_drivers.slice(0, 4),
      visual: "分栏布局：左侧收入趋势折线图，右侧成本构成环形图",
      speakerNotes: `展开分析${seg.segment}板块：主要驱动因素是什么？趋势可持续吗？下一步改善空间在哪里？`,
    });
  });

  const nextIdx = 5 + a.segments.length;

  if (a.risks.length > 0) {
    slides.push({
      num: nextIdx, type: "table",
      actionTitle: `风险提示：${a.risks.filter(r => r.severity === "高").length}项高风险需重点关注`,
      bullets: a.risks.map(r =>
        `${r.severity === "高" ? "🔴" : r.severity === "中" ? "🟡" : "🟢"} ${r.item}：${r.suggestion}${r.amount ? `（涉及${r.amount}）` : ""}`
      ),
      visual: "风险矩阵（严重程度 × 发生概率，四象限布局）",
      speakerNotes: "逐项说明风险事项的影响和应对措施。高风险项需明确责任人和解决时限。",
    });
  } else {
    slides.push({
      num: nextIdx, type: "section-header",
      actionTitle: "本期无重大财务风险",
      speakerNotes: "简述风险管理情况，说明主要风险指标均在可控范围内。",
    });
  }

  const afterRisks = nextIdx + 1;

  if (a.highlights.length > 0) {
    slides.push({
      num: afterRisks, type: "content",
      actionTitle: "工作亮点与存在问题的平衡分析",
      bullets: [
        ...a.highlights.slice(0, 2).map(h => `✅ ${h}`),
        ...a.problems.slice(0, 2).map(p => `⚠️ ${p}`),
      ],
      visual: "双栏对比布局（左侧亮点绿色，右侧问题黄色）",
      speakerNotes: "既讲成绩也讲不足。亮点须有数据支撑，问题须有改进方向。",
    });
  }

  const afterHighlights = a.highlights.length > 0 ? afterRisks + 1 : afterRisks;

  if (a.suggestions.length > 0) {
    slides.push({
      num: afterHighlights, type: "roadmap",
      actionTitle: "下一步工作建议与时间节点",
      bullets: a.suggestions.slice(0, 5),
      visual: "时间线（标注Q2/Q3/Q4关键里程碑和量化目标）",
      speakerNotes: "按优先级排序说明建议事项。每条含：①目标 ②责任主体 ③完成时限 ④预期效果。",
    });
  }

  {
    const lastIdx = a.suggestions.length > 0 ? afterHighlights + 1 : afterHighlights;
    slides.push({
      num: lastIdx, type: "call-to-action",
      actionTitle: "请领导审议本次财务分析，并就重点事项给予指导",
      speakerNotes: "简短收尾，重申最关键的1-2个需要领导决策的事项，开放性邀请讨论。",
    });
  }

  return slides;
}

function buildBudgetPreparationOutline(a: BudgetPreparationAnalysis, org: ReturnType<typeof loadOrgContext>): SlideOutline[] {
  const slides: SlideOutline[] = [];

  slides.push({
    num: 1, type: "title-slide",
    actionTitle: `${a.fiscal_year}预算编制说明`,
    subtitle: `${a.unit || org.name}`,
    speakerNotes: "说明预算编制背景、政策依据和总体思路。",
  });

  slides.push({
    num: 2, type: "executive-summary",
    actionTitle: `${a.fiscal_year}预算总体安排：收入${a.revenue_items.length}项，成本${a.cost_items.length}项，项目${a.project_items.length}项`,
    bullets: a.preparation_basis.slice(0, 4),
    visual: "预算全景图（收入/成本/项目三栏总览，标注同比变化幅度）",
    speakerNotes: "30 秒概括预算全貌：总盘子多少？比去年增减多少？主要变化在哪几个领域？",
  });

  if (a.revenue_items.length > 0) {
    slides.push({
      num: 3, type: "table",
      actionTitle: "收入预算：逐项列明测算依据和增长率",
      bullets: a.revenue_items.slice(0, 6).map(item =>
        `${item.name}：${item.amount}${item.changePct ? `（${item.changePct}）` : ""}`
      ),
      visual: "柱状图叠加折线图（各收入项目本期 vs 上期，标注增长率）",
      speakerNotes: "逐项说明收入预算的测算依据。对增长超过20%或下降的项目须重点解释。",
    });
  }

  if (a.cost_items.length > 0) {
    const idx = a.revenue_items.length > 0 ? 4 : 3;
    slides.push({
      num: idx, type: "table",
      actionTitle: "成本预算：分项列示上期实际 vs 本期预算 vs 增减幅度",
      bullets: a.cost_items.slice(0, 6).map(item =>
        `${item.name}：本期${item.amount}${item.lastPeriodAmount ? `，上期${item.lastPeriodAmount}` : ""}${item.changePct ? `（${item.changePct}）` : ""}`
      ),
      visual: FINANCIAL_CHART_MAP["成本结构"],
      speakerNotes: "逐项说明成本预算编制逻辑。对增幅超过10%的项目须说明理由和节约潜力。",
    });
  }

  if (a.project_items.length > 0) {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "content",
      actionTitle: `项目预算：${a.project_items.length}个项目，须说明投资回报预期`,
      bullets: a.project_items.slice(0, 4).map(item =>
        `${item.name}：${item.amount} — ${item.rationale}`
      ),
      visual: "气泡图（x=金额，y=预期回报率，气泡大小=周期）",
      speakerNotes: "重点说明每个项目的必要性、预期产出和回报周期。",
    });
  }

  if (a.special_notes.length > 0) {
    const idx = slides.length + 1;
    slides.push({
      num: idx, type: "content",
      actionTitle: "特别说明事项",
      bullets: a.special_notes,
      visual: "图标列表（每项带 ⚠️ 或 ℹ️ 图标）",
      speakerNotes: "逐项说明特别事项的背景和影响范围。",
    });
  }

  {
    const lastIdx = slides.length + 1;
    slides.push({
      num: lastIdx, type: "call-to-action",
      actionTitle: "请审议本次预算编制方案，提出修改意见",
      speakerNotes: "说明后续审批流程和时间节点要求。",
    });
  }

  return slides;
}

// ── 指令文件生成 ──

function buildInstruction(a: DocAnalysis, outlinePath: string, org: ReturnType<typeof loadOrgContext>): string {
  const orgBlock = orgContextBlock(org);
  const slideCounts: Record<string, string> = {
    report: "20-30 页",
    minutes: "5-8 页",
    speech: "30-50 页",
    notice: "3-5 页",
    "financial-analysis": "12-18 页",
    "budget-preparation": "12-15 页",
  };

  return [
    `# PPT 大纲定制指令`,
    ``,
    orgBlock,
    ``,
    `## 任务`,
    ``,
    `请审阅并完善 ppt-outline.md 中的幻灯片大纲。`,
    `**大纲路径**：${outlinePath}`,
    ``,
    `## 设计原则（咨询级标准）`,
    ``,
    `1. **行动标题**：每页标题必须是完整句子结论，不能是标签。`,
    `   读完全部标题应能理解全篇逻辑（"标题浏览测试"）。`,
    `2. **MECE 原则**：同级论点相互独立、完全穷尽——无重叠、无遗漏。`,
    `3. **≤4 条要点/页**：超过 4 条考虑拆页。每条 10-15 字，结构平行。`,
    `4. **可视化优先**：能用图表就不用文字。建议：`,
    `   - 趋势 → 折线图`,
    `   - 占比 → 饼图/环形图`,
    `   - 对比 → 柱状图/表格`,
    `   - 流程 → 箭头流程图`,
    `   - 结构 → 金字塔/树形图`,
    `5. **讲解词不照念**：Speaker Notes 补充叙事、案例、过渡语，不能是 slide 文字的重复。`,
    ``,
    `## 定制任务`,
    ``,
    `- 检查每个行动标题是否准确反映了 analysis.json 中的数据`,
    `- 补充每页的**可视化建议**（当前为占位符），根据内容类型推荐具体图表形式`,
    `- 完善每页的**讲解词引导**（当前为模板），加入具体的过渡话术和金句`,
    `- 确保全篇页数在 ${slideCounts[a.type] ?? "8-12 页"} 范围内`,
    `- 对于演讲型（speech），检查每页讲解时间分配是否与 ${a.type === "speech" ? (a as SpeechAnalysis).duration_min : "X"} 分钟总时长匹配`,
    ``,
    `## 完成后`,
    ``,
    `直接修改 ppt-outline.md。`,
    `如需生成实际 PPTX 文件，可使用此大纲交给 Agent 渲染。`,
  ].join("\n");
}

// ── 主函数 ──

async function main() {
  const args = parseCli();
  const { dir } = args;
  const paths = workspacePaths(dir);
  const org = loadOrgContext();

  console.log("📖 读取 analysis.json...");
  const analysis = await readJson<DocAnalysis>(paths.analysis);

  if (!analysis || !analysis.type) {
    console.error("错误：analysis.json 不存在或不完整，请先运行 content-analyzer 并由 Agent 填写");
    process.exit(1);
  }

  const errors = validateDocAnalysis(analysis);
  if (errors.length) {
    console.error("❌ analysis.json 不完整：");
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  // 尝试读取 draft.md 作为补充参考
  const draft = await readText(paths.draft);
  if (draft) {
    console.log("📄 已读取 draft.md 作为补充参考");
  }

  // 按类型生成大纲
  let slides: SlideOutline[];
  switch (analysis.type) {
    case "report":              slides = buildReportOutline(analysis, org); break;
    case "minutes":             slides = buildMinutesOutline(analysis, org); break;
    case "speech":              slides = buildSpeechOutline(analysis, org); break;
    case "notice":              slides = buildNoticeOutline(analysis, org); break;
    case "financial-analysis":   slides = buildFinancialAnalysisOutline(analysis, org); break;
    case "budget-preparation":   slides = buildBudgetPreparationOutline(analysis, org); break;
    case "request-for-approval":
      // 请示一般不做 PPT，生成 1 页简报
      slides = [{
        num: 1, type: "executive-summary",
        actionTitle: analysis.title || "请示事项简报",
        subtitle: `${analysis.recipient || ""} | ${org.shortName}`,
        bullets: [analysis.subject, ...analysis.basis],
        speakerNotes: "请示是书面公文，建议以书面形式报送，PPT 仅供参考。",
      }];
      break;
    default:
      console.error(`内部错误：未处理的文档类型 ${(analysis as { type: string }).type}`);
      process.exit(1);
  }

  // 生成 ppt-outline.md
  const typeLabels: Record<string, string> = {
    report: "工作汇报",
    minutes: "会议纪要",
    speech: "领导讲话",
    notice: "会议通知",
    "financial-analysis": "财务分析报告",
    "budget-preparation": "预算编制说明",
    "request-for-approval": "请示",
  };
  const label = typeLabels[analysis.type] || analysis.type;
  const header = [
    `# PPT 大纲：${getOutlineTitle(analysis)}`,
    ``,
    `> **类型**：${label}`,
    `> **单位**：${org.name}`,
    `> **页数**：${slides.length} 页`,
    `> **设计规范**：金字塔原理 · Action Title · ≤4要点/页 · 可视化优先`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const body = slides.map(slideBlock).join("\n");

  const footer = [
    ``,
    `---`,
    ``,
    `## 设计规范检查清单`,
    ``,
    `- [ ] 全部标题均为完整句子结论（Action Title），非标签`,
    `- [ ] 读完全部标题可理解全篇逻辑（标题浏览测试通过）`,
    `- [ ] 同级论点满足 MECE（无重叠、无遗漏）`,
    `- [ ] 每页 ≤ 4 条要点，每条 10-15 字`,
    `- [ ] 每页有可视化建议（具体图表类型）`,
    `- [ ] 讲解词补充叙事而非重复 slide 文字`,
    `- [ ] 全篇页数在合理范围`,
    ``,
    `---`,
    ``,
    `*本大纲由 ppt-outline 自动生成，请 Agent 审阅并完善。*`,
  ].join("\n");

  const outlinePath = resolve(dir, "ppt-outline.md");
  await writeText(outlinePath, header + body + footer);

  // 生成定制指令
  const instruction = buildInstruction(analysis, outlinePath, org);
  const instructionPath = resolve(dir, "_ppt_instruction.md");
  await writeText(instructionPath, instruction);

  console.log(`\n✅ ppt-outline 完成`);
  console.log(`   大纲：    ${outlinePath}`);
  console.log(`   定制指令：${instructionPath}`);
  console.log(`   页数：    ${slides.length}`);
  console.log(`\n⏸️  下一步：Agent 读取 _ppt_instruction.md 并完善 ppt-outline.md`);
}

function getOutlineTitle(a: DocAnalysis): string {
  switch (a.type) {
    case "report":               return a.period ? `${a.period}工作报告` : "工作报告";
    case "minutes":              return a.meeting_title || "会议纪要";
    case "speech":               return a.title_suggestion || a.topic || "发言稿";
    case "notice":               return a.meeting_title || "会议通知";
    case "financial-analysis":   return a.period ? `${a.period}财务分析报告` : "财务分析报告";
    case "budget-preparation":   return a.fiscal_year ? `${a.fiscal_year}预算编制说明` : "预算编制说明";
    case "request-for-approval": return a.title || "请示";
  }
}

main().catch((err) => {
  console.error("❌ ppt-outline 执行失败:", err.message);
  process.exit(1);
});
