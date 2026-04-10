import { parseCli, log } from "../../../shared/cli";
import { readText, writeJson, workspacePaths } from "../../../shared/fs";
import { env } from "../../../shared/env";
import { resolve } from "path";
import { readdirSync } from "fs";

interface Analysis {
  topic: string;
  source_type: string;
  key_points: string[];
  insights: string[];
  data_facts: string[];
  suggested_structure: {
    title: string;
    sections: string[];
  };
  word_count_target: number;
  references: string[];
}

async function collectSources(sourceDir: string, verbose: boolean): Promise<string> {
  const files = readdirSync(sourceDir).filter(
    (f) => f.endsWith(".md") || f.endsWith(".txt")
  );

  if (files.length === 0) {
    console.error("错误：source/ 目录下无素材文件，请先运行 input-processor");
    process.exit(1);
  }

  let combined = "";
  for (const file of files) {
    if (file.startsWith("_")) continue; // 跳过指令文件
    const content = await readText(resolve(sourceDir, file));
    if (content) {
      log(verbose, `读取素材: ${file} (${content.length} 字符)`);
      combined += `\n\n--- ${file} ---\n\n${content}`;
    }
  }

  return combined.trim();
}

async function main() {
  const args = parseCli();
  const { dir, verbose } = args;
  const paths = workspacePaths(dir);

  console.log("🔍 正在读取素材...");
  const sourceContent = await collectSources(paths.source, verbose);

  if (!sourceContent) {
    console.error("错误：素材内容为空");
    process.exit(1);
  }

  console.log(`📝 素材总长度: ${sourceContent.length} 字符`);

  // 长文本分段处理
  const isLong = sourceContent.length > 8000;
  if (isLong) {
    console.log("⚠️  素材超过 8000 字，将分段处理");
  }

  // analysis.json 由 Antigravity Agent 层的 AI 模型生成
  // 此处生成提示指令，供 Agent 读取并填充
  const prompt = [
    `## 内容分析指令`,
    ``,
    `请基于以下素材进行深度分析，输出严格符合 analysis.json 格式的 JSON。`,
    ``,
    `### 输出格式`,
    `\`\`\`json`,
    `{`,
    `  "topic": "2-6个汉字的中文主题名",`,
    `  "source_type": "youtube | url | keyword | file",`,
    `  "key_points": ["核心观点1", "核心观点2", "..."],`,
    `  "insights": ["深层洞见1（非共识视角）", "..."],`,
    `  "data_facts": ["具体数据/案例1", "..."],`,
    `  "suggested_structure": {`,
    `    "title": "建议文章标题",`,
    `    "sections": ["节1主题", "节2主题", "节3主题", "节4主题"]`,
    `  },`,
    `  "word_count_target": ${env("ARTICLE_WORD_TARGET", "2000")},`,
    `  "references": ["来源URL1", "..."]`,
    `}`,
    `\`\`\``,
    ``,
    `### 分析要求`,
    `- **有料**：提取具体数据、案例、方法论`,
    `- **有洞见**：挖掘非共识视角、反直觉结论`,
    `- **有结构**：建议清晰的文章框架`,
    ``,
    isLong ? `### ⚠️ 长文本处理\n素材超过 8000 字，请按章节分段摘要后合并分析。\n` : "",
    `### 素材内容`,
    ``,
    sourceContent,
  ].join("\n");

  // 保存分析指令供 Agent 执行
  const instructionPath = resolve(dir, "_analysis_instruction.md");
  await Bun.write(instructionPath, prompt);

  // 同时生成空的 analysis.json 模板
  const template: Analysis = {
    topic: "",
    source_type: "",
    key_points: [],
    insights: [],
    data_facts: [],
    suggested_structure: { title: "", sections: [] },
    word_count_target: parseInt(env("ARTICLE_WORD_TARGET", "2000")),
    references: [],
  };
  await writeJson(paths.analysis, template);

  console.log("📋 分析指令已生成，等待 Agent 执行 AI 分析");
  console.log(`   指令文件: ${instructionPath}`);
  console.log(`   输出文件: ${paths.analysis}`);
}

main().catch((err) => {
  console.error("❌ content-analyzer 执行失败:", err.message);
  process.exit(1);
});
