// ============================================================
// article-writer/scripts/main.ts
// 消费 analysis.json，生成：
//   - draft.md        文章草稿（骨架 + 待 Agent 填写）
//   - prompts/        配图提示词 .md 文件（每 H2 节一个）
//   - _write_instruction.md  供 Agent 执行写作的指令
// 注意：不调用 AI 图像生成，仅输出提示词供人工/Agent 按需生图
// ============================================================

import { parseCli, log } from "../../../shared/cli";
import { readJson, writeText, ensureDir, workspacePaths } from "../../../shared/fs";
import { env } from "../../../shared/env";
import type { Analysis } from "../../../shared/types";
import { validateAnalysis } from "../../../shared/types";
import { resolve } from "path";


// 为每个章节生成配图提示词
function buildImagePrompt(
  topic: string,
  sectionTitle: string,
  sectionIndex: number,
  insights: string[],
  style: string
): string {
  const relevantInsight = insights[sectionIndex] ?? insights[0] ?? "";
  return [
    `---`,
    `section: "${sectionTitle}"`,
    `index: ${sectionIndex + 1}`,
    `style: ${style}`,
    `---`,
    ``,
    `# 配图提示词 — 第${["一", "二", "三", "四", "五"][sectionIndex] ?? sectionIndex + 1}节`,
    ``,
    `## 主题`,
    `${topic} · ${sectionTitle}`,
    ``,
    `## 核心洞见（融入图中）`,
    `${relevantInsight}`,
    ``,
    `## 建议图类型`,
    sectionIndex === 0
      ? `场景图（scene）：为读者建立情境感，引发共鸣`
      : `信息图（infographic）：可视化本节核心观点或数据`,
    ``,
    `## 提示词草稿`,
    ``,
    `> 请根据以下要求生成图片提示词：`,
    `> - 风格：${style === "default" ? "极简插图，知识类，notion 风格" : style}`,
    `> - 内容：围绕「${sectionTitle}」，体现「${relevantInsight.slice(0, 40)}」`,
    `> - 比例：4:3（公众号正文图）`,
    `> - 不要出现文字`,
    ``,
    `**最终提示词（可直接用于 /baoyu-imagine）：**`,
    ``,
    `\`\`\``,
    `（请由 Agent 或人工补全具体提示词）`,
    `\`\`\``,
  ].join("\n");
}

async function main() {
  const args = parseCli();
  const { dir, verbose } = args;
  const paths = workspacePaths(dir);

  console.log("📖 读取 analysis.json...");
  const analysis = await readJson<Analysis>(paths.analysis);

  if (!analysis) {
    console.error("错误：analysis.json 不存在，请先运行 content-analyzer");
    process.exit(1);
  }

  const errors = validateAnalysis(analysis);
  if (errors.length) {
    console.error("❌ analysis.json 不完整，请重新执行 content-analyzer 并由 Agent 填写：");
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  log(verbose, "分析数据:", JSON.stringify(analysis, null, 2));

  const style = env("ARTICLE_STYLE", "default");
  const sections = analysis.suggested_structure.sections;
  const sectionLabels = ["一", "二", "三", "四", "五"];
  const imgCount = Math.min(sections.length, parseInt(env("IMG_PER_ARTICLE", "3")));

  // ── Step 1: 生成 draft.md 骨架（占位符，待 Agent 填写正文） ──
  let draftTemplate = `---\ntitle: ${analysis.suggested_structure.title}\ntopic: ${analysis.topic}\n---\n\n`;
  draftTemplate += `# ${analysis.suggested_structure.title}\n\n`;
  draftTemplate += `> 导读：\u3008请在此填写一句话导读\u3009\n\n`;

  for (let i = 0; i < sections.length; i++) {
    const label = sectionLabels[i] ?? `${i + 1}`;
    if (i > 0 && i <= imgCount) {
      draftTemplate += `![配图${i}](imgs/${String(i).padStart(2, "0")}-section-${i}.png)\n\n`;
    }
    draftTemplate += `## ${label}、${sections[i]}\n\n`;
    draftTemplate += `<!-- 请在此展开论述 -->\n\n`;
  }

  draftTemplate += `---\n\n`;
  if (analysis.references.length > 0) {
    draftTemplate += `*参考资料：${analysis.references.map((r) => `[${r}](${r})`).join(" | ")}*\n`;
  }

  await writeText(paths.draft, draftTemplate);
  console.log(`📄 草稿骨架已生成: ${paths.draft}`);

  // ── Step 2: 为每个需要配图的节生成提示词文件 ──
  await ensureDir(paths.prompts);

  const promptFiles: string[] = [];

  for (let i = 0; i < imgCount; i++) {
    const sectionTitle = sections[i + 1] ?? sections[i]; // 配图在节前，对应当前节
    const idx = String(i + 1).padStart(2, "0");
    const slug = sectionTitle
      .replace(/[^\w\u4e00-\u9fa5]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 20);
    const promptFile = resolve(paths.prompts, `${idx}-${slug}.md`);

    const promptContent = buildImagePrompt(
      analysis.topic,
      sectionTitle,
      i,
      analysis.insights,
      style
    );

    await writeText(promptFile, promptContent);
    promptFiles.push(promptFile);
    log(verbose, `提示词已保存: ${promptFile}`);
  }

  console.log(`🖼️  配图提示词已生成 ${promptFiles.length} 个: ${paths.prompts}`);

  // ── Step 3: 生成写作指令供 Agent 执行 ──
  const writeInstruction = [
    `## 文章写作指令`,
    ``,
    `请基于以下分析结果，补全 draft.md 中的正文内容。`,
    ``,
    `### 分析摘要`,
    `- **主题**：${analysis.topic}`,
    `- **目标字数**：${analysis.word_count_target} 字`,
    `- **风格**：${style}`,
    ``,
    `### 核心观点（必须覆盖）`,
    analysis.key_points.map((p, i) => `${i + 1}. ${p}`).join("\n"),
    ``,
    `### 深层洞见（融入行文）`,
    analysis.insights.map((ins, i) => `${i + 1}. ${ins}`).join("\n"),
    ``,
    `### 数据/案例（具体引用）`,
    analysis.data_facts.map((d, i) => `${i + 1}. ${d}`).join("\n"),
    ``,
    `### 质量标准`,
    `- **有料**：每节至少引用一个具体数据或案例`,
    `- **有用**：给读者可执行的行动建议`,
    `- **有洞见**：不写表面现象，触达问题本质`,
    `- **有温度**：避免 AI 腔调，写给真实的人`,
    ``,
    `### 输出要求`,
    `- 直接修改 draft.md，补全每节的 <!-- 请在此展开论述 --> 部分`,
    `- 保留图片占位符 ![配图X](imgs/...) 不动`,
    `- 完成后暂停，等待用户 Review`,
    ``,
    `**draft.md 路径**: ${paths.draft}`,
  ].join("\n");

  const instructionPath = resolve(dir, "_write_instruction.md");
  await writeText(instructionPath, writeInstruction);

  console.log(`\n📋 写作指令已生成: ${instructionPath}`);
  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ article-writer 完成`);
  console.log(`\n   草稿：  ${paths.draft}`);
  console.log(`   提示词：${paths.prompts}/ (${promptFiles.length} 个)`);
  console.log(`   写作指令：${instructionPath}`);
  console.log(`\n⏸️  下一步：`);
  console.log(`   1. Agent 读取 _write_instruction.md 并写作`);
  console.log(`   2. Review draft.md`);
  console.log(`   3. 按需使用 prompts/ 中的提示词让 /baoyu-imagine 生图`);
  console.log(`   4. 发布: /baoyu-post-to-wechat`);
}

main().catch((err) => {
  console.error("❌ article-writer 执行失败:", err.message);
  process.exit(1);
});
