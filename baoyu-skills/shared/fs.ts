// ============================================================
// shared/fs.ts — 文件系统工具（路径约定 + 读写封装）
// ============================================================

import { resolve, join } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

// ---------- workspace 路径约定 ----------
//
// workspace/YYYYMMDD主题/
//   source/          ← 原始素材
//   analysis.json    ← 内容分析结果
//   draft.md         ← 文章草稿（article-writer 生成骨架，Agent 写正文）
//   imgs/            ← 配图目录（cover.png 须手动放置）
//   prompts/         ← 配图提示词（article-writer 自动生成）
//
// 所有 Skill 通过 workspacePaths() 获取路径，修改路径约定只需改此处

export interface WorkspacePaths {
  root: string;
  source: string;
  analysis: string;
  draft: string;
  imgs: string;
  cover: string;
  prompts: string;
}

export function workspacePaths(dir: string): WorkspacePaths {
  const root = resolve(dir);
  return {
    root,
    source:   join(root, "source"),
    analysis: join(root, "analysis.json"),
    draft:    join(root, "draft.md"),
    imgs:     join(root, "imgs"),
    cover:    join(root, "imgs", "cover.png"),
    prompts:  join(root, "prompts"),
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

export async function writeJson(path: string, data: unknown): Promise<void> {
  await writeText(path, JSON.stringify(data, null, 2));
}
