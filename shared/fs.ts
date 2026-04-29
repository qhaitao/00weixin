// ============================================================
// shared/fs.ts — 文件系统工具（路径约定 + 读写封装）
// ============================================================

import { resolve, join } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

// ---------- workspace 路径约定 ----------
//
// workspace/YYYYMMDD主题/
//   source/          ← 原始素材（transcript.md / references.md）
//   analysis.json    ← 结构化分析（content-analyzer 生成，Agent 填写）
//   draft.md         ← 文档草稿（doc-writer 生成骨架，Agent 写正文）
//   output/          ← 最终输出（YYYYMMDD-主题.docx）
//
// 所有 Skill 通过 workspacePaths() 获取路径，修改路径约定只需改此处

export interface WorkspacePaths {
  root: string;
  source: string;
  transcript: string;     // source/transcript.md（录音转写 / 会议记录）
  references: string;     // source/references.md（参考资料）
  financialData: string;  // source/financial_data.json（Excel/CSV 导入的结构化数据）
  analysis: string;
  draft: string;
  output: string;         // output/ 目录（DOCX 输出）
}

export function workspacePaths(dir: string): WorkspacePaths {
  const root = resolve(dir);
  return {
    root,
    source:        join(root, "source"),
    transcript:    join(root, "source", "transcript.md"),
    references:    join(root, "source", "references.md"),
    financialData: join(root, "source", "financial_data.json"),
    analysis:      join(root, "analysis.json"),
    draft:         join(root, "draft.md"),
    output:        join(root, "output"),
  };
}

export async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// ---------- 文本读写 ----------

export async function readText(path: string): Promise<string | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  return file.text();
}

export async function writeText(path: string, content: string): Promise<void> {
  await ensureDir(resolve(path, ".."));
  await Bun.write(path, content);
}

// ---------- JSON 读写 ----------

export async function readJson<T = unknown>(path: string): Promise<T | null> {
  const text = await readText(path);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeJson<T = unknown>(path: string, data: T): Promise<void> {
  await writeText(path, JSON.stringify(data, null, 2));
}
