# period-comparison — 多期对比合并输出

## 职责

读取多个 workspace 目录的 `analysis.json`，合并生成跨期对比报告。

## 前置条件

- 每个目标目录下已有完整的 `analysis.json`（经过 content-analyzer + Agent 填写）
- 所有 analysis.json 须为同一 `type`（目前仅支持 `financial-analysis`）

## 调用方式

```powershell
bun skills\period-comparison\scripts\main.ts --dirs workspace\2026Q1,workspace\2026Q2 --type financial-analysis
```

## 参数

| 参数 | 说明 |
|---|---|
| `--dirs <路径列表>` | 逗号分隔的 workspace 目录列表 |
| `--type <类型>` | 文档类型（目前仅支持 `financial-analysis`） |
| `--verbose` / `-v` | 输出调试日志 |

## 输出

- `workspace/consolidated/consolidated_report.md` — 跨期对比报告（含趋势分析和图表建议）

## 错误处理

- 任一目录的 analysis.json 不存在或类型不匹配时，跳过并输出警告
- 有效目录数 < 2 时，报错退出
