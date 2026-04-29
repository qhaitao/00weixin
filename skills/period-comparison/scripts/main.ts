// ============================================================
// period-comparison/scripts/main.ts
// 读取多个 workspace 目录的 analysis.json，合并生成跨期对比报告
// ============================================================

import { readJson, writeText, ensureDir } from "../../../shared/fs";
import { loadOrgContext } from "../../../shared/context";
import { resolve, join } from "path";
import type { FinancialAnalysis, MetricItem, SegmentAnalysis, RiskItem } from "../../../shared/types";

interface CliArgs {
  dirs: string;
  type: string;
  verbose?: boolean;
}

function parseCli(): CliArgs {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.replace("--", "");
      const next = args[i + 1];
      const val = next && !next.startsWith("--") ? args[++i]! : "true";
      result[key] = val;
    }
  }
  return result as unknown as CliArgs;
}

async function main() {
  const args = parseCli();
  const { dirs, verbose } = args;
  const docType = args.type;

  if (!dirs) {
    console.error("错误：必须指定 --dirs 参数（逗号分隔的目录列表）");
    console.error("示例：bun skills/period-comparison/scripts/main.ts --dirs workspace/2026Q1,workspace/2026Q2 --type financial-analysis");
    process.exit(1);
  }

  if (!docType || docType !== "financial-analysis") {
    console.error("错误：目前仅支持 --type financial-analysis");
    process.exit(1);
  }

  const dirList = dirs.split(",").map(d => d.trim());
  if (dirList.length < 2) {
    console.error("错误：至少需要 2 个目录进行对比");
    process.exit(1);
  }

  const org = loadOrgContext();

  // 读取各期 analysis.json
  const analyses: { dir: string; period: string; data: FinancialAnalysis }[] = [];
  for (const dir of dirList) {
    const analysisPath = resolve(dir, "analysis.json");
    const data = await readJson<FinancialAnalysis>(analysisPath);
    if (!data || data.type !== "financial-analysis") {
      console.warn(`⚠️  跳过：${dir}（analysis.json 不存在或类型不匹配）`);
      continue;
    }
    analyses.push({ dir, period: data.period, data });
  }

  if (analyses.length < 2) {
    console.error("错误：有效分析数据不足（须 ≥ 2），无法生成对比报告");
    process.exit(1);
  }

  // 合并指标
  const allMetricKeys = new Set<string>();
  const metricMap = new Map<string, Map<string, MetricItem>>();
  for (const a of analyses) {
    const m = new Map<string, MetricItem>();
    for (const metric of a.data.metrics) {
      const key = metric.note || `指标${allMetricKeys.size + 1}`;
      allMetricKeys.add(key);
      m.set(key, metric);
    }
    metricMap.set(a.period, m);
  }

  // 合并板块
  const allSegments = new Set<string>();
  for (const a of analyses) {
    for (const seg of a.data.segments) {
      allSegments.add(seg.segment);
    }
  }

  // 合并风险
  const allRisks: RiskItem[] = [];
  for (const a of analyses) {
    allRisks.push(...a.data.risks);
  }

  // 生成报告
  const periods = analyses.map(a => a.period).join(" vs ");

  // 指标对比表
  const metricKeys = [...allMetricKeys];
  const metricHeader = `| 指标 | ${analyses.map(a => a.period).join(" | ")} | 趋势 |`;
  const metricSep = `| --- | ${analyses.map(() => "---").join(" | ")} | --- |`;
  const metricRows = metricKeys.map(key => {
    const values = analyses.map(a => {
      const m = metricMap.get(a.period)?.get(key);
      return m ? `实际 ${m.actual}${m.yoy_change ? ` (同比${m.yoy_change})` : ""}` : "-";
    });
    // Simple trend detection
    const first = analyses[0]!;
    const last = analyses[analyses.length - 1]!;
    const firstM = metricMap.get(first.period)?.get(key);
    const lastM = metricMap.get(last.period)?.get(key);
    let trend = "→";
    if (firstM && lastM && firstM.actual && lastM.actual) {
      const fv = parseFloat(firstM.actual.replace(/[^0-9.\-]/g, ""));
      const lv = parseFloat(lastM.actual.replace(/[^0-9.\-]/g, ""));
      if (!isNaN(fv) && !isNaN(lv)) {
        trend = lv > fv ? "↑" : lv < fv ? "↓" : "→";
      }
    }
    return `| ${key} | ${values.join(" | ")} | ${trend} |`;
  }).join("\n");

  // 板块对比表
  const segHeader = `| 板块 | ${analyses.map(a => a.period).join(" | ")} |`;
  const segSep = `| --- | ${analyses.map(() => "---").join(" | ")} |`;
  const segRows = [...allSegments].map(seg => {
    const values = analyses.map(a => {
      const s = a.data.segments.find(s => s.segment === seg);
      return s ? `收入${s.revenue}，利润${s.profit}` : "-";
    });
    return `| ${seg} | ${values.join(" | ")} |`;
  }).join("\n");

  // 风险汇总
  const highRisks = allRisks.filter(r => r.severity === "高");
  const medRisks = allRisks.filter(r => r.severity === "中");
  const riskSummary = [
    `| 风险事项 | 严重程度 | 期间 | 涉及金额 | 建议 |`,
    `| --- | --- | --- | --- | --- |`,
    ...allRisks.map(r => {
      const a = analyses.find(aa => aa.data.risks.includes(r));
      return `| ${r.item} | ${r.severity} | ${a?.period || "-"} | ${r.amount || "-"} | ${r.suggestion} |`;
    }),
  ].join("\n");

  // 趋势分析
  const trendAnalysis = [
    `### 收入趋势`,
    analyses.map(a => `${a.period}：${a.data.overview || "无概述"}`).join("\n"),
    ``,
    `### 成本趋势`,
    `对比各期成本变化，识别结构性增长或一次性因素`,
    ``,
    `### 利润趋势`,
    `利润变动趋势和主要驱动因素`,
    ``,
  ].join("\n");

  const consolidatedDir = resolve("workspace", "consolidated");
  await ensureDir(consolidatedDir);

  const report = [
    `# 跨期财务分析对比报告`,
    ``,
    `> **对比期间：** ${periods}`,
    `> **单位：** ${org.name}`,
    `> **生成日期：** ${new Date().toLocaleDateString("zh-CN")}`,
    ``,
    `---`,
    ``,
    `## 一、各期概述`,
    ``,
    ...analyses.map(a => `### ${a.period}\n\n${a.data.overview || "（无概述）"}\n`),
    ``,
    `## 二、核心指标对比`,
    ``,
    metricHeader,
    metricSep,
    metricRows,
    ``,
    `<!-- 趋势分析 -->`,
    `<!-- 请 Agent 补充：①哪些指标持续改善？②哪些指标出现恶化？③哪些指标波动大但无明确趋势？ -->`,
    ``,
    `## 三、分业务/分环节对比`,
    ``,
    segHeader,
    segSep,
    segRows,
    ``,
    `## 四、风险事项汇总`,
    ``,
    riskSummary,
    ``,
    highRisks.length > 0 ? `> ⚠️ 高风险事项 ${highRisks.length} 项，需重点关注` : "",
    ``,
    `## 五、趋势分析与图表建议`,
    ``,
    trendAnalysis,
    ``,
    `### 推荐图表类型`,
    `| 分析内容 | 推荐图表 | 说明 |`,
    `| --- | --- | --- |`,
    `| 收入对比 | 分组柱状图（各期并排） | 叠加折线标注同比增长率 |`,
    `| 成本结构 | 堆叠柱状图 | 展示各环节成本占比变化趋势 |`,
    `| 利润变动 | 瀑布图 | 展示各因素对利润变化的贡献 |`,
    `| 风险分布 | 热力图 | 各期风险等级分布对比 |`,
    ``,
    `## 六、综合建议`,
    ``,
    `<!-- 请 Agent 根据对比分析结果，提出跨周期综合建议：`,
    `     ①结构性改善方向`,
    `     ②需持续跟踪的关键指标`,
    `     ③下一阶段重点关注事项 -->`,
    ``,
    `---`,
    ``,
    `*本报告由 period-comparison 自动生成 | ${org.shortName}*`,
  ].join("\n");

  const outputPath = join(consolidatedDir, "consolidated_report.md");
  await writeText(outputPath, report);

  console.log(`\n✅ 跨期对比报告已生成`);
  console.log(`   报告路径：${outputPath}`);
  console.log(`   对比期间：${periods}`);
  console.log(`   目录数量：${analyses.length}`);
  console.log(`\n⏸️  下一步：Agent 审阅并完善 consolidated_report.md`);
}

main().catch((err) => {
  console.error("❌ period-comparison 执行失败:", err.message);
  process.exit(1);
});
