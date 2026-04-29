# skills/ — AI Skill 目录说明

本目录包含 **00work 职场材料生成应用** 的所有可执行 skill 脚本。每个 skill 是一个独立的 TypeScript 模块，通过 `bun` 运行，共享 `../shared/` 工具层。

---

## Skill 一览

### 核心流水线 Skill

| Skill | 目录 | 职责 | 状态 |
|---|---|---|---|
| 素材输入处理 | `input-processor/` | 接收本地文件/URL/关键词/Excel，整理到 `source/` | ✅ 可用 |
| 内容分析 | `content-analyzer/` | 解析素材，生成结构化 `analysis.json` 模板 + AI 指令 | ✅ 可用 |
| 文档写作 | `doc-writer/` | 读取 `analysis.json`，生成 `draft.md` 骨架 + 写作指令 | ✅ 可用 |
| DOCX 导出 | `doc-export/` | 将 `draft.md` 渲染为格式化 Word 文档 | ✅ 可用 |
| PPT 大纲 | `ppt-outline/` | 读取 analysis.json 生成结构化 PPT 演讲大纲 | ✅ 可用 |
| 多期对比 | `period-comparison/` | 读取多个 period 的 analysis.json 生成跨期对比报告 | ✅ 可用 |

### 辅助 Skill

| Skill | 目录 | 职责 | 状态 |
|---|---|---|---|
| Markdown 格式化 | `baoyu-format-markdown/` | 修复 Markdown 格式、标点、排版 | ✅ 可用 |

---

## 运行方式

所有 skill 均使用 `bun` 直接执行 TypeScript，**无需编译步骤**：

```powershell
# 通用格式
bun skills\<skill名>\scripts\main.ts --dir <workspace目录> [其他参数]

# 示例：分析素材（报告类型）
bun skills\content-analyzer\scripts\main.ts --dir workspace\20260428周报 --type report

# 示例：生成 DOCX
bun skills\doc-export\scripts\main.ts --dir workspace\20260428周报
```

### 公共 CLI 参数（所有 skill 通用）

| 参数 | 说明 |
|---|---|
| `--dir <路径>` | **必填**。workspace 任务目录路径（相对或绝对均可） |
| `--type <类型>` | 文档类型：`report` \| `minutes` \| `speech` |
| `--verbose` / `-v` | 输出调试日志 |

---

## 目录结构规范

每个 skill 目录的标准结构：

```
<skill名>/
├── SKILL.md          # skill 说明文档（职责、前置条件、调用方式、错误处理）
└── scripts/
    └── main.ts       # 主入口，通过 bun 直接执行
```

---

## 共享层引用

所有 skill 的 `scripts/main.ts` 均通过相对路径引用 `../../../shared/`：

```typescript
import { parseCli, log }          from "../../../shared/cli";
import { env }                    from "../../../shared/env";
import { workspacePaths, readText } from "../../../shared/fs";
import { loadOrgContext }          from "../../../shared/context";
import type { DocAnalysis }        from "../../../shared/types";
```

| 模块 | 核心导出 | 用途 |
|---|---|---|
| `cli.ts` | `parseCli()` / `log()` | 解析 CLI 参数、verbose 日志 |
| `env.ts` | `env(key, default?)` | 读取 `.baoyu-skills/.env` 环境变量 |
| `fs.ts` | `workspacePaths()` / `readText` / `writeJson` | workspace 路径约定 + 文件读写 |
| `context.ts` | `loadOrgContext()` / `orgContextBlock()` | 加载单位背景信息并生成 prompt 片段 |
| `types.ts` | `DocType` / `DocAnalysis` / `validateDocAnalysis()` | 文档类型定义与验证 |

---

## 流水线协作关系

```
input-processor        →  source/*.md
content-analyzer       →  analysis.json  +  _analysis_instruction.md
[Agent AI 填写]        →  analysis.json（完整）
doc-writer             →  draft.md       +  _write_instruction.md
[Agent AI 写作]        →  draft.md（正文完整）
doc-export             →  output/<标题>.docx
```

- `_analysis_instruction.md` 和 `_write_instruction.md` 是交给 AI Agent 的操作指令，已加入 `.gitignore`，不纳入版本控制。
- `analysis.json` 和 `draft.md` 也属于过程产物，由 `.gitignore` 的 `workspace/202*/` 规则整体排除。

---

## 文档类型说明

| `--type` 值 | 适用场景 | analysis.json 结构 |
|---|---|---|
| `report` | 周报、月报、工作总结、项目汇报 | `ReportAnalysis` |
| `minutes` | 会议纪要、行动项追踪 | `MinutesAnalysis` |
| `speech` | 领导讲话、发言稿、述职汇报 | `SpeechAnalysis` |
| `notice` | 会议通知、开会通知 | `NoticeAnalysis` |
| `financial-analysis` | 财务分析报告（收入/成本/利润/风险） | `FinancialAnalysis` |
| `request-for-approval` | 请示（一文一事、测算有据） | `RequestForApprovalAnalysis` |
| `budget-preparation` | 预算编制说明（收入/成本/项目预算） | `BudgetPreparationAnalysis` |

---

## DOCX 输出样式（doc-export）

| 样式项 | 说明 |
|---|---|
| 字体 | `Microsoft YaHei`（由 `DOC_FONT` 环境变量控制） |
| 正文字号 | 11pt（size 22） |
| 首行缩进 | 2 字符（440 twips），标题与正文均适用 |
| 页眉 | 右对齐：`单位简称 · 文档标题` |
| 页脚 | 居中：`第 N 页 / 共 M 页` |
| 输出文件名 | 取文档第一个 H1 标题，存入 `output/` 目录 |

---

## 代码风格

- **语言**：TypeScript，Bun 运行时，无需编译
- **异步**：统一使用 `async/await`
- **注释**：只注释非显而易见的意图，不注释显然的逻辑
- **类型**：接口与类型定义集中在 `shared/types.ts`，skill 内部不重复定义
- **错误处理**：遇到致命错误打印中文提示后 `process.exit(1)`

---

## 新增 Skill 规范

1. 在 `skills/` 下新建目录，名称使用小写加连字符（如 `my-skill/`）
2. 创建 `SKILL.md` 和 `scripts/main.ts`
3. `main.ts` 必须通过 `parseCli()` 解析参数，通过 `workspacePaths()` 获取路径
4. 在根目录 `CLAUDE.md` 的"Skill 一览"表格中登记
