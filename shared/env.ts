// ============================================================
// shared/env.ts — 环境变量读取（带默认值）
// 首次调用 env() 时自动加载 .baoyu-skills/.env，不覆盖已有环境变量
// ============================================================

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function parseDotEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) return null;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  // 去除首尾引号
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return key ? [key, value] : null;
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const parsed = parseDotEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      // 已设置的环境变量优先（不覆盖 shell 传入的值）
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // 静默失败，不影响主流程
  }
}

let envLoaded = false;

function ensureEnvLoaded(): void {
  if (envLoaded) return;
  loadEnvFile(resolve(process.cwd(), ".baoyu-skills", ".env"));
  envLoaded = true;
}

export function env(key: string, defaultValue: string = ""): string {
  ensureEnvLoaded();
  return process.env[key] ?? defaultValue;
}
