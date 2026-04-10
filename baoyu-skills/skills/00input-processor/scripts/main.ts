import { parseCli, log } from "../../../shared/cli";
import { ensureDir, writeText, readText, workspacePaths } from "../../../shared/fs";
import { resolve } from "path";

// ── 输入类型识别 ──

type InputType = "youtube" | "url" | "keyword" | "file";

function detectInputType(input: string): InputType {
  if (/https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(input)) return "youtube";
  if (/https?:\/\//.test(input)) return "url";
  const ext = input.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "txt") {
    try {
      const f = Bun.file(resolve(input));
      if (f.size > 0) return "file";
    } catch { /* fall through to keyword */ }
  }
  return "keyword";
}

// ── 各类型处理器 ──

async function handleYoutube(url: string, paths: ReturnType<typeof workspacePaths>, verbose: boolean) {
  log(verbose, "YouTube 模式，URL:", url);
  // notebooklm-mcp 调用由 Antigravity Agent 层完成
  // 此处生成指令文件，供 Agent 读取执行
  const instruction = [
    `## NotebookLM MCP 指令`,
    ``,
    `请依次执行：`,
    `1. \`notebook_create\` — 传入 URL: ${url}`,
    `2. 获取 notebook_id`,
    `3. \`notebook_get\` — 提取文字稿`,
    `4. 将文字稿保存至: ${paths.transcript}`,
    ``,
    `> 若提取失败，请用户手动将文字稿粘贴至 ${paths.transcript}`,
  ].join("\n");
  await writeText(resolve(paths.source, "_youtube_instruction.md"), instruction);
  console.log("📋 YouTube 指令已生成，等待 Agent 执行 notebooklm-mcp");
  console.log(`   指令文件: ${resolve(paths.source, "_youtube_instruction.md")}`);
}

async function handleUrl(url: string, paths: ReturnType<typeof workspacePaths>, verbose: boolean) {
  log(verbose, "网页 URL 模式，URL:", url);
  // Playwright 抓取由 Agent 层或后续脚本完成
  const instruction = [
    `## 网页抓取指令`,
    ``,
    `目标 URL: ${url}`,
    ``,
    `请使用 Playwright 抓取正文内容并保存为 Markdown:`,
    `保存至: ${paths.references}`,
    ``,
    `> 若抓取失败，请用户手动将正文粘贴至 ${paths.references}`,
  ].join("\n");
  await writeText(resolve(paths.source, "_url_instruction.md"), instruction);
  console.log("📋 网页抓取指令已生成");
}

async function handleKeyword(keyword: string, paths: ReturnType<typeof workspacePaths>, verbose: boolean) {
  log(verbose, "关键词模式，关键词:", keyword);
  const instruction = [
    `## 关键词搜索指令`,
    ``,
    `关键词: ${keyword}`,
    ``,
    `请执行：`,
    `1. 使用 Tavily Search 搜索 5-8 篇高质量文章`,
    `2. 过滤：优先知乎/公众号/行业媒体，正文 > 500 字`,
    `3. 批量抓取正文内容`,
    `4. 去重 + 聚合`,
    `5. 保存至: ${paths.references}（含来源 URL）`,
  ].join("\n");
  await writeText(resolve(paths.source, "_keyword_instruction.md"), instruction);
  console.log("📋 关键词搜索指令已生成");
}

async function handleFile(filePath: string, paths: ReturnType<typeof workspacePaths>, verbose: boolean) {
  log(verbose, "本地文件模式，路径:", filePath);
  const absPath = resolve(filePath);
  const content = await readText(absPath);
  if (!content) {
    console.error(`错误：文件不存在或为空: ${absPath}`);
    process.exit(1);
  }
  const ext = filePath.split(".").pop()?.toLowerCase();
  const targetName = ext === "md" ? "transcript.md" : "references.md";
  await writeText(resolve(paths.source, targetName), content);
  console.log(`✅ 本地文件已复制至 source/${targetName}`);
}

// ── 主函数 ──

async function main() {
  const args = parseCli();
  const { dir, verbose, input } = args;

  if (!input) {
    console.error("错误：必须指定 --input <用户输入>");
    process.exit(1);
  }

  const paths = workspacePaths(dir);
  await ensureDir(paths.source);

  const inputType = detectInputType(input);
  console.log(`🔍 识别输入类型: ${inputType}`);

  switch (inputType) {
    case "youtube":
      await handleYoutube(input, paths, verbose);
      break;
    case "url":
      await handleUrl(input, paths, verbose);
      break;
    case "keyword":
      await handleKeyword(input, paths, verbose);
      break;
    case "file":
      await handleFile(input, paths, verbose);
      break;
  }

  console.log(`\n📁 素材目录: ${paths.source}`);
}

main().catch((err) => {
  console.error("❌ input-processor 执行失败:", err.message);
  process.exit(1);
});
