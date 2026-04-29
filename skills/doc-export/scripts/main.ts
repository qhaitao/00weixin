// ============================================================
// doc-export/scripts/main.ts
// 将 draft.md 渲染为格式规范的 Word DOCX 文件
//
// 可选 --fix-typography：在转换前对 draft.md 执行排版修复
//   - CJK 与英文之间自动加空格（autocorrect-node）
//   - 修复中文强调标点边界（remark-cjk-friendly）
//   委托给 baoyu-format-markdown/scripts/main.ts，graceful 降级
// ============================================================

import { parseCli } from "../../../shared/cli";
import { readText, ensureDir, workspacePaths } from "../../../shared/fs";
import { loadOrgContext } from "../../../shared/context";
import { defaultTheme } from "../../../shared/docx-theme";
import { resolve, basename } from "path";
import { writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";

// docx 通过 require 引入
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber,
} = require("docx");

// ── 排版修复（可选，委托给 baoyu-format-markdown） ──

/**
 * 调用 baoyu-format-markdown/scripts/main.ts 对 draft.md 执行原地排版修复：
 *  1. remark-cjk-friendly：修复 **中文** 强调标点边界
 *  2. autocorrect-node：CJK 与英文/数字之间自动插入空格
 *
 * 若脚本或依赖不存在则跳过，不影响主流程。
 */
function fixTypography(draftPath: string): void {
  // 从当前脚本所在目录向上两级找到兄弟 skill
  const formatScript = resolve(
    // Bun 提供 import.meta.dir（当前文件所在目录）
    // @ts-expect-error — import.meta.dir 是 Bun 扩展字段
    import.meta.dir,
    "../../baoyu-format-markdown/scripts/main.ts"
  );

  if (!existsSync(formatScript)) {
    console.warn("  ⚠️  baoyu-format-markdown 未找到，跳过排版修复");
    return;
  }

  // --no-quotes：保留原始引号，仅修复间距和强调标点
  const result = spawnSync("bun", [formatScript, draftPath, "--no-quotes"], {
    stdio: "inherit",
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    console.warn("  ⚠️  排版修复执行失败，继续使用原始内容");
  }
}

// ── 样式常量 ──
const T = defaultTheme;
const bd = () => ({ style: BorderStyle.SINGLE, size: 1, color: T.colors.border });
const cellBd = { top: bd(), bottom: bd(), left: bd(), right: bd() };

// ── 行内格式解析 ──

interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * 将含有 **bold** 和 *italic* 标记的文本解析为 span 数组。
 * 用于将 Markdown 行内格式还原为 DOCX TextRun。
 */
function parseInline(text: string): InlineSpan[] {
  const result: InlineSpan[] = [];
  // 匹配 **bold** 或 *italic*，其余作为普通文本
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      result.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      result.push({ text: match[2], italic: true });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex) });
  }
  return result.length > 0 ? result : [{ text }];
}

function hasInlineFormatting(text: string): boolean {
  return /\*\*[^*]+\*\*|\*[^*]+\*/.test(text);
}

// ── Markdown → DOCX 元素解析器 ──

interface ParsedBlock {
  type: "h1" | "h2" | "h3" | "body" | "quote" | "blank" | "hr" | "table" | "frontmatter" | "list";
  text?: string;
  spans?: InlineSpan[];   // 行内格式化内容（body / quote）
  rows?: string[][];
  items?: string[];
  ordered?: boolean;      // true = 有序列表（1. 2. 3.），false = 无序（- * •）
  bold?: boolean;         // 整行加粗（公文节标题如 **一、会议时间**）
}

function parseMd(md: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = md.split("\n");
  let i = 0;
  let inFrontmatter = false;
  let frontmatterDone = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // frontmatter
    if (!frontmatterDone && trimmed === "---") {
      if (!inFrontmatter) { inFrontmatter = true; i++; continue; }
      else { inFrontmatter = false; frontmatterDone = true; i++; continue; }
    }
    if (inFrontmatter) { i++; continue; }

    // hr（frontmatter 结束后的 ---）
    if (/^---+$/.test(trimmed)) { blocks.push({ type: "hr" }); i++; continue; }

    // headings
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); i++; continue; }

    // blockquote
    if (line.startsWith("> ")) {
      const text = line.slice(2).trim();
      if (hasInlineFormatting(text)) {
        blocks.push({ type: "quote", spans: parseInline(text) });
      } else {
        blocks.push({ type: "quote", text });
      }
      i++; continue;
    }

    // HTML comment（跳过占位注释）
    if (trimmed.startsWith("<!--")) {
      while (i < lines.length && !lines[i].includes("-->")) i++;
      i++; continue;
    }

    // table
    if (trimmed.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|---")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (/^\|[-\s|]+\|$/.test(lines[i].trim())) { i++; continue; }
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }

    // 有序列表（1. 2. 3. 格式）
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items, ordered: true });
      continue;
    }

    // 无序列表（- * 格式）
    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items, ordered: false });
      continue;
    }

    // 空行
    if (trimmed === "") { blocks.push({ type: "blank" }); i++; continue; }

    // 独立整行粗体（公文节标题，如 **一、会议时间** 或 **单位：** xxx）
    if (/^\*\*[^*]+\*\*\s*$/.test(trimmed) || /^\*\*[^*]+[：:]\*\*/.test(trimmed)) {
      blocks.push({ type: "body", text: trimmed.replace(/\*\*/g, ""), bold: true });
      i++; continue;
    }

    // 含行内格式的正文
    if (hasInlineFormatting(trimmed)) {
      blocks.push({ type: "body", spans: parseInline(trimmed) });
      i++; continue;
    }

    // 普通正文
    blocks.push({ type: "body", text: trimmed });
    i++;
  }
  return blocks;
}

// ── DOCX 元素构建 ──

function makeH1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    indent: { firstLine: 440 },
    children: [new TextRun({ text, bold: true, size: 32, color: T.colors.h1, font: T.font })],
  });
}
function makeH2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    indent: { firstLine: 440 },
    children: [new TextRun({ text, bold: true, size: 28, color: T.colors.h2, font: T.font })],
  });
}
function makeH3(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    indent: { firstLine: 440 },
    children: [new TextRun({ text, bold: true, size: 24, color: T.colors.h3, font: T.font })],
  });
}

/**
 * 正文段落，支持行内格式（InlineSpan 数组）和整行加粗（公文节标题）。
 * 首行缩进 2 字符（11pt × 2 × 20 twips = 440 twips）。
 */
function makeBody(block: Pick<ParsedBlock, "text" | "spans" | "bold">, indent = true) {
  const isFullBold = block.bold === true;
  const children = block.spans?.length
    ? block.spans.map((s) =>
        new TextRun({
          text: s.text,
          size: T.bodySize,
          font: T.font,
          bold: isFullBold || (s.bold ?? false),
          italics: s.italic ?? false,
        })
      )
    : [new TextRun({ text: block.text ?? "", size: T.bodySize, font: T.font, bold: isFullBold })];

  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: indent ? { firstLine: 440 } : undefined,
    children,
  });
}

function makeBlank() {
  return new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun("")] });
}
function makeHr() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: T.colors.border } },
    spacing: { before: 120, after: 120 },
    children: [new TextRun("")],
  });
}
function makeQuote(block: Pick<ParsedBlock, "text" | "spans">) {
  const children = block.spans?.length
    ? block.spans.map((s) =>
        new TextRun({ text: s.text, size: T.bodySize, font: T.font, italics: true, bold: s.bold ?? false, color: T.colors.h3 })
      )
    : [new TextRun({ text: block.text ?? "", size: T.bodySize, font: T.font, italics: true, color: T.colors.h3 })];
  return new Paragraph({
    indent: { left: 480 },
    spacing: { before: 60, after: 60 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: T.colors.h2 } },
    children,
  });
}

function makeListItem(text: string, ref: string) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: T.bodySize, font: T.font })],
  });
}

function makeTable(rows: string[][]) {
  if (!rows.length) return makeBlank();
  const colCount = rows[0].length;
  const totalW = 9000;
  const colW = Math.floor(totalW / colCount);
  const widths = Array(colCount).fill(colW);

  return new Table({
    columnWidths: widths,
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: rows.map((row, ri) =>
      new TableRow({
        tableHeader: ri === 0,
        children: row.map((cell, ci) =>
          new TableCell({
            borders: cellBd,
            width: { size: widths[ci], type: WidthType.DXA },
            shading: {
              fill: ri === 0 ? T.colors.tblHdr : ri % 2 === 0 ? "FFFFFF" : "F2F7FD",
              type: ShadingType.CLEAR,
            },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                alignment: ri === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [new TextRun({ text: cell, size: T.bodySize, font: T.font, bold: ri === 0 })],
              }),
            ],
          })
        ),
      })
    ),
  });
}

// ── blocks → DOCX children ──

interface ListRefEntry {
  ref: string;
  ordered: boolean;
}

function blocksToChildren(blocks: ParsedBlock[], listRefCounter: { n: number }) {
  const children: unknown[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "h1":    children.push(makeH1(block.text!)); break;
      case "h2":    children.push(makeH2(block.text!)); break;
      case "h3":    children.push(makeH3(block.text!)); break;
      case "body":  children.push(makeBody(block)); break;
      case "blank": children.push(makeBlank()); break;
      case "hr":    children.push(makeHr()); break;
      case "quote": children.push(makeQuote(block)); break;
      case "table": children.push(makeTable(block.rows!)); break;
      case "list": {
        const ref = `list-ref-${listRefCounter.n++}`;
        block.items!.forEach((item) => children.push(makeListItem(item, ref)));
        break;
      }
    }
  }
  return children;
}

// ── DOCX 文档组装 ──

function buildDocument(
  blocks: ParsedBlock[],
  title: string,
  org: ReturnType<typeof loadOrgContext>,
  listRefs: ListRefEntry[]
) {
  return new Document({
    styles: {
      default: { document: { run: { font: T.font, size: T.bodySize } } },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, color: T.colors.h1, font: T.font },
          paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, color: T.colors.h2, font: T.font },
          paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, color: T.colors.h3, font: T.font },
          paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: listRefs.length > 0
        ? listRefs.map((lr) => ({
            reference: lr.ref,
            levels: [
              {
                level: 0,
                format: lr.ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
                text: lr.ordered ? "%1." : "•",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 480, hanging: 240 } } },
              },
            ],
          }))
        : [
            {
              reference: "list-ref-placeholder",
              levels: [
                {
                  level: 0,
                  format: LevelFormat.BULLET,
                  text: "•",
                  alignment: AlignmentType.LEFT,
                  style: { paragraph: { indent: { left: 480, hanging: 240 } } },
                },
              ],
            },
          ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1296, bottom: 1440, left: 1296 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: T.colors.border } },
                children: [
                  new TextRun({ text: `${org.shortName} · ${title}`, size: 18, color: T.colors.light, font: T.font }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "第 ", size: 18, color: T.colors.light, font: T.font }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: T.colors.light }),
                  new TextRun({ text: " 页 / 共 ", size: 18, color: T.colors.light, font: T.font }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: T.colors.light }),
                  new TextRun({ text: " 页", size: 18, color: T.colors.light, font: T.font }),
                ],
              }),
            ],
          }),
        },
        // @ts-expect-error — docx children 类型与 ts 定义略有偏差，运行时正常
        children: blocksToChildren(blocks, { n: 0 }),
      },
    ],
  });
}

// ── 主函数 ──

async function main() {
  const args = parseCli();
  const { dir } = args;
  const paths = workspacePaths(dir);
  const org = loadOrgContext();

  // 可选排版修复（--fix-typography）：CJK 间距 + 强调标点，原地修改 draft.md
  if (args["fix-typography"]) {
    console.log("🔧 修复排版（CJK 间距 + 强调标点）...");
    fixTypography(paths.draft);
  }

  const mdContent = await readText(paths.draft);
  if (!mdContent) {
    console.error("错误：draft.md 不存在，请先运行 doc-writer 并由 Agent 补全正文");
    process.exit(1);
  }

  // 提取标题（第一个 # 行）
  const titleMatch = mdContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : basename(dir);

  console.log(`📄 解析 draft.md（${mdContent.length} 字符）...`);
  const blocks = parseMd(mdContent);

  // 预收集列表引用（有序/无序信息用于 numbering config）
  const listRefs: ListRefEntry[] = [];
  let lc = 0;
  blocks.forEach((b) => {
    if (b.type === "list") {
      listRefs.push({ ref: `list-ref-${lc}`, ordered: b.ordered ?? false });
      lc++;
    }
  });

  const doc = buildDocument(blocks, title, org, listRefs);

  await ensureDir(paths.output);
  const dirName = basename(resolve(dir));
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "").trim();
  const outName = safeTitle && safeTitle !== dirName ? safeTitle : dirName;
  const outPath = resolve(paths.output, `${outName}.docx`);

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outPath, buffer);

  console.log(`\n✅ DOCX 已生成：${outPath}`);
}

main().catch((err) => {
  console.error("❌ doc-export 执行失败:", err.message);
  process.exit(1);
});
