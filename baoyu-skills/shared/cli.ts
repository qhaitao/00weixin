// ============================================================
// shared/cli.ts — 统一 CLI 参数解析
// ============================================================

export interface CliArgs {
  dir: string;
  verbose: boolean;
  [key: string]: string | boolean | undefined;
}

export function parseCli(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { dir: "", verbose: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--verbose" || arg === "-v") {
      result.verbose = true;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    } else if (!result.dir) {
      // 第一个非 flag 参数作为 dir
      result.dir = arg;
    }
  }

  if (!result.dir) {
    console.error("错误：请提供 --dir 参数，指定 workspace 目录路径");
    process.exit(1);
  }

  return result;
}

export function log(verbose: boolean, ...args: unknown[]): void {
  if (verbose) console.log("[verbose]", ...args);
}
