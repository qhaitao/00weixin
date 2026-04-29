import { parseCli, log } from "../../../shared/cli";
import { ensureDir, writeText, readText, workspacePaths } from "../../../shared/fs";
import { resolve } from "path";

// ── 输入类型识别 ──

type InputType = "youtube" | "url" | "keyword" | "file" | "excel";

function detectInputType(input: string): InputType {
  if (/https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(input)) return "youtube";
  if (/https?:\/\//.test(input)) return "url";
  // Excel/CSV detection (before md/txt check)
  const ext = input.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    try {
      const f = Bun.file(resolve(input));
      if (f.size > 0) return "excel";
    } catch { /* fall through */ }
  }
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

async function handleExcel(filePath: string, paths: ReturnType<typeof workspacePaths>, verbose: boolean) {
  log(verbose, "Excel/CSV 模式，路径:", filePath);
  const absPath = resolve(filePath);
  const ext = filePath.split(".").pop()?.toLowerCase();
  await ensureDir(paths.source);

  if (ext === "csv") {
    // CSV: use Bun native text parsing
    const content = await readText(absPath);
    if (!content) {
      console.error(`错误：CSV 文件不存在或为空: ${absPath}`);
      process.exit(1);
    }
    const lines = content.trim().split("\n");
    const headers = lines[0]!.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });

    // Save structured data
    await import("../../../shared/fs").then(({ writeJson, writeText }) => {
      writeJson(paths.financialData, { headers, rows, source: absPath, format: "csv" });
      // Also save human-readable summary
      const summary = [
        `# CSV 数据导入摘要`,
        ``,
        `**源文件：** ${filePath}`,
        `**行数：** ${rows.length}`,
        `**列数：** ${headers.length}`,
        ``,
        `## 列名`,
        headers.map(h => `- ${h}`).join("\n"),
        ``,
        `## 前5行预览`,
        ``,
        rows.slice(0, 5).map((row, i) =>
          `### 行${i + 2}\n` + headers.map(h => `- **${h}：** ${row[h]}`).join("\n")
        ).join("\n\n"),
      ].join("\n");
      writeText(paths.transcript, summary);
    });
  } else {
    // xlsx/xls: try xlsx npm package, graceful degradation
    try {
      const XLSX = require("xlsx");
      const workbook = XLSX.readFile(absPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      const headers = data.length > 0 ? Object.keys(data[0] as object) : [];
      const rows = data as Record<string, unknown>[];

      const { writeJson, writeText } = await import("../../../shared/fs");
      await writeJson(paths.financialData, { headers, rows: rows.map(r => {
        const out: Record<string, string> = {};
        Object.entries(r).forEach(([k, v]) => { out[k] = String(v ?? ""); });
        return out;
      }), source: absPath, sheet: sheetName, format: "xlsx" });

      const summary = [
        `# Excel 数据导入摘要`,
        ``,
        `**源文件：** ${filePath}`,
        `**工作表：** ${sheetName}`,
        `**行数：** ${rows.length}`,
        `**列数：** ${headers.length}`,
        ``,
        `## 列名`,
        headers.map(h => `- ${h}`).join("\n"),
        ``,
        `## 前5行预览`,
        rows.slice(0, 5).map((row, i) =>
          `### 行${i + 1}\n` + headers.map(h => `- **${h}：** ${row[h] ?? ""}`).join("\n")
        ).join("\n\n"),
      ].join("\n");
      await writeText(paths.transcript, summary);

      console.log("✅ Excel 数据已解析并保存");
      console.log(`   结构化数据：${paths.financialData}`);
      console.log(`   文本摘要：  ${paths.transcript}`);
      return;
    } catch {
      // xlsx package not available, graceful degradation
      console.warn("⚠️  未安装 xlsx 包，无法解析 .xlsx/.xls 文件");
      console.warn("   请运行：npm install xlsx");
      console.warn("   或手动将文件转换为 CSV 格式后重新导入");

      const instruction = [
        `## Excel 文件手动处理指南`,
        ``,
        `源文件：${absPath}`,
        ``,
        `由于 xlsx npm 包未安装，请按以下方式处理：`,
        ``,
        `**方式一：安装 xlsx 包后重试**`,
        `\`\`\``,
        `npm install xlsx`,
        `bun skills/input-processor/scripts/main.ts --dir <任务目录> --input "${filePath}"`,
        `\`\`\``,
        ``,
        `**方式二：手动转换为 CSV**`,
        `1. 用 Excel/WPS 打开文件`,
        `2. 另存为 CSV（逗号分隔）`,
        `3. 重新运行：bun skills/input-processor/scripts/main.ts --dir <任务目录> --input "文件.csv"`,
      ].join("\n");

      const { writeText } = await import("../../../shared/fs");
      await writeText(resolve(paths.source, "_excel_instruction.md"), instruction);
      console.log(`📋 手动处理指南已生成: ${resolve(paths.source, "_excel_instruction.md")}`);
      return;
    }
  }

  console.log(`✅ 数据已解析`);
  console.log(`   结构化数据：${paths.financialData}`);
  console.log(`   文本摘要：  ${paths.transcript}`);
}

// ── 主函数 ──

async function main() {
  const args = parseCli();
  const { dir, verbose, input } = args;

  if (!input) {
    console.error("错误：必须指定 --input <用户输入>");
    process.exit(1);
  }

  const inputStr = input as string;

  const paths = workspacePaths(dir);
  await ensureDir(paths.source);

  const inputType = detectInputType(inputStr);
  console.log(`🔍 识别输入类型: ${inputType}`);

  switch (inputType) {
    case "youtube":
      await handleYoutube(inputStr, paths, verbose);
      break;
    case "url":
      await handleUrl(inputStr, paths, verbose);
      break;
    case "keyword":
      await handleKeyword(inputStr, paths, verbose);
      break;
    case "file":
      await handleFile(inputStr, paths, verbose);
      break;
    case "excel":
      await handleExcel(inputStr, paths, verbose);
      break;
  }

  console.log(`\n📁 素材目录: ${paths.source}`);
}

main().catch((err) => {
  console.error("❌ input-processor 执行失败:", err.message);
  process.exit(1);
});
