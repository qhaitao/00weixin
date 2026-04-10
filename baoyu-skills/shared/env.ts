// ============================================================
// shared/env.ts — 环境变量读取（带默认值）
// ============================================================

export function env(key: string, defaultValue: string = ""): string {
  return process.env[key] ?? defaultValue;
}
