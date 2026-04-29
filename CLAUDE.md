# 00work — 职场材料生成应用

个人职场工作材料生产工具，支持周期性报告、会议纪要、会议发言稿、会议通知、财务分析、请示、预算编制七类文档的 AI 辅助生成与导出。

---

## 目录结构

```
00work/
├── .baoyu-skills/                     # 项目级机密配置（已 gitignore）
│   └── .env                           # API 凭证与全局配置
│
├── skills/                            # ★ 所有 skill 脚本
│   ├── input-processor/               # ① 素材输入处理
│   ├── content-analyzer/              # ② 内容分析 → analysis.json
│   ├── doc-writer/                    # ③ 职场文档草稿生成
│   ├── doc-export/                    # ④ 导出 DOCX
│   ├── ppt-outline/                   # ⑤ PPT 演讲大纲生成
│   ├── period-comparison/             # ⑥ 跨期财务对比报告
│   └── baoyu-format-markdown/         # Markdown 格式化（保留备用）
│
├── shared/                            # ★ 共享工具层
│   ├── cli.ts                         # CLI 参数解析（parseCli + log）
│   ├── chinese.ts                     # 中文序号工具（toChineseOrdinal）
│   ├── env.ts                         # 环境变量读取（带默认值）
│   ├── fs.ts                          # workspace 路径约定 + 读写封装
│   ├── prompts.ts                     # 写作规范与工具函数（跨 skill 共享）
│   ├── types.ts                       # 共享类型定义
│   └── financial-metrics.ts           # 邮政财务指标库（同比/环比/差异分析/三把尺子）
│
├── workspace/                         # 工作材料目录
│   ├── README.md                      # workspace 快速开始说明
│   └── 任务目录名/                    # 单项任务目录（.gitignore 排除 workspace/*/，仅保留 README.md）
│       ├── source/                    # 原始素材（.md / .txt）
│       │   ├── transcript.md          # 录音转写 / 会议记录草稿
│       │   └── references.md          # 参考资料（可选）
│       ├── analysis.json              # 结构化分析（content-analyzer 生成 → Agent 填写）
│       ├── draft.md                   # 文档草稿（doc-writer 生成骨架 → Agent 写正文）
│       └── output/                    # 最终输出
│           └── YYYYMMDD-主题.docx
│
├── PRD-职场材料生成应用.docx          # 产品需求文档
├── .gitignore
├── CLAUDE.md                          # 本文档
└── README.md                          # 操作手册
```

---

## 核心流水线

```
素材放入 workspace/<任务目录>/source/
     │
     ▼ input-processor --input <文件/URL/关键词/Excel>
     │   （可选，处理本地文件/URL/关键词/Excel 输入）
     │
     ▼ content-analyzer --type [report|minutes|speech|notice|financial-analysis|request-for-approval|budget-preparation]
     │   生成：_analysis_instruction.md（交 Agent AI 执行）
     │   生成：analysis.json（类型化空模板，Agent 填写）
     │   注意：已有内容的 analysis.json 默认不覆盖（加 --force 强制覆盖）
     │
     ▼ [Agent AI 分析] → 填充 analysis.json
     │
     ▼ doc-writer
     │   生成：draft.md（公文格式骨架）
     │   生成：_write_instruction.md（交 Agent AI 执行）
     │
     ▼ [Agent AI 写作] → 补全 draft.md 正文
     │
     ▼ [用户 Review] draft.md
     │
     ▼ doc-export
         输出：output/<标题>.docx
```

---

## 材料类型

| 类型                    | 触发词                         | 核心输出                              |
| ----------------------- | ------------------------------ | ------------------------------------- |
| `report`              | 周报、月报、工作总结、项目汇报 | 结构化工作报告 DOCX                   |
| `minutes`             | 会议纪要、行动项               | 纪要 + 行动项追踪表 DOCX              |
| `speech`              | 发言稿、汇报稿、述职、领导讲话 | 可朗读发言稿 DOCX                     |
| `notice`              | 会议通知、开会通知             | 标准公文格式会议通知 DOCX             |
| `financial-analysis`  | 财务分析、收入分析、成本分析   | 财务分析报告 DOCX + PPT 大纲 + 跨期对比 |
| `request-for-approval` | 请示、经费请示、项目请示      | 标准请示公文 DOCX                     |
| `budget-preparation`  | 预算编制、预算说明             | 预算编制说明 DOCX + PPT 大纲          |

---

## shared 模块

所有 skill 脚本（`skills/*/scripts/`）通过 `../../../shared/xxx` 引用共享层：

| 模块                                     | 职责                                                      |
| ---------------------------------------- | --------------------------------------------------------- |
| `cli.ts` → `parseCli()`             | 泛型 CLI 参数解析，支持 `<T extends CliArgs>`           |
| `chinese.ts` → `toChineseOrdinal()` | 中文序号工具（1→"一"，11→"十一"，支持 1-99）            |
| `prompts.ts`                           | 写作规范与工具函数（STYLE_GUIDE, calcSpeechWords 等）     |
| `financial-metrics.ts` → `calcYoY()` 等 | 邮政财务指标库（同比/环比/差异分析/三把尺子框架）    |
| `env.ts` → `env()`                  | 自动加载 `.baoyu-skills/.env`，读取环境变量，支持默认值 |
| `fs.ts` → `workspacePaths()`        | 统一 workspace 路径约定（单一真相源）                     |
| `fs.ts` → `readText/writeText`      | 文本文件读写（Bun.file）                                  |
| `fs.ts` → `readJson/writeJson`      | JSON 读写（带 null 安全解析）                             |
| `fs.ts` → `ensureDir()`             | 确保目录存在（recursive mkdir）                           |
| `context.ts` → `orgContextBlock()`  | 生成组织背景段落，注入 AI prompt                          |

**路径约定**（`workspacePaths(dir)` 返回）：

```typescript
{
  root:       resolve(dir),
  source:     join(root, "source"),
  transcript:    join(root, "source", "transcript.md"),
  references:    join(root, "source", "references.md"),
  financialData: join(root, "source", "financial_data.json"),  // Excel/CSV 结构化数据
  analysis:      join(root, "analysis.json"),
  draft:      join(root, "draft.md"),
  output:     join(root, "output"),   // DOCX 输出目录
}
```

---

## Skill 一览

### 核心流水线 Skill

| Skill 目录           | 核心参数                           | 输出                                                      |
| -------------------- | ---------------------------------- | --------------------------------------------------------- |
| `input-processor`  | `--dir` `--input`              | `source/` 下的素材文件                                  |
| `content-analyzer` | `--dir` `--type` `[--force]` | `analysis.json`（空模板）+ `_analysis_instruction.md` |
| `doc-writer`       | `--dir`                          | `draft.md`（公文骨架）+ `_write_instruction.md`       |
| `doc-export`       | `--dir`                          | `output/<标题>.docx`                                    |
| `ppt-outline`         | `--dir`                                   | `ppt-outline.md`（PPT 演讲大纲）                        |
| `period-comparison` | `--dirs` `--type`                     | `workspace/consolidated/consolidated_report.md` |

### 辅助 Skill

| Skill 目录                | 职责                           | 状态    |
| ------------------------- | ------------------------------ | ------- |
| `baoyu-format-markdown` | 修复 Markdown 格式、标点、排版 | ✅ 可用 |

---

## 组织背景

| 字段                 | 值                                                     |
| -------------------- | ------------------------------------------------------ |
| 本单位               | 中国邮政集团有限公司广东省分公司（简称"广东省分公司"） |
| 上级单位             | 中国邮政集团有限公司                                   |
| 单位负责人（一把手） | 陈智泉                                                 |
| 分管财务领导         | 杨旻                                                   |

> 以上信息已写入 `.baoyu-skills/.env`，并通过 `shared/context.ts` → `orgContextBlock()` 注入所有 skill 的 prompt，确保生成文档的称谓、汇报对象、语气风格符合实际工作场景。

---

## 环境配置（.baoyu-skills/.env）

```ini
ARTICLE_WORD_TARGET=1000       # 默认字数目标
ARTICLE_STYLE=default          # 文章风格
AUTHOR_NAME=                   # 作者姓名（新增）
DOC_FONT=Microsoft YaHei       # DOCX 输出字体（新增）
DOC_ORG=                       # 组织/部门名称（新增）
SPEECH_WORDS_PER_MIN=160       # 发言稿字速（新增）
```

---

## 环境依赖

| 工具         | 版本   | 用途                                 |
| ------------ | ------ | ------------------------------------ |
| `bun`      | ≥ 1.3 | TypeScript 运行时（所有 skill 脚本） |
| `node/npm` | 系统   | docx-js 依赖（doc-export 使用）      |

---

## .gitignore 规则摘要

| 规则                                             | 原因                                   |
| ------------------------------------------------ | -------------------------------------- |
| `.baoyu-skills/`                               | 保护 API 凭证                          |
| `workspace/*/`（排除 `workspace/README.md`） | 工作材料全部本地存留，不按日期前缀限制 |
| `_analysis_instruction.md`                     | 临时指令文件                           |
| `_write_instruction.md`                        | 临时指令文件                           |
| `node_modules/`、`bun.lockb`                 | 依赖文件                               |

---

## 变更日志

| 日期       | 变更                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-10 | 初始化 workspace/；创建 shared/ 层；改造三个核心 skill；配置微信 API 凭证                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-28 | 改造方向：微信公众号 → 职场材料生成；精简 skills/ 目录；提级目录层级；生成 PRD                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-28 | 新增 notice（会议通知）文档类型；更新 shared/types.ts、content-analyzer、doc-writer；首行缩进 2 字符写入 doc-export                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-29 | 全面优化：① 修复 .gitignore（workspace/*/ 替换 workspace/202*/）；② shared/env.ts 自动加载 .baoyu-skills/.env；③ types.ts 新增 minutes.chair/recorder/venue、notice.doc_number，放宽 action_items 校验；④ content-analyzer 增覆盖保护（--force）、优化四类公文提示词；⑤ doc-writer 重写四类草稿为规范公文格式（通知用黑体节标题、报告补规范结尾、纪要补主持人/地点、发言稿补语气引导）；⑥ doc-export 新增行内粗体/斜体解析、有序/无序列表区分；⑦ CLAUDE.md 修正目录名（去掉 00 前缀） |
| 2026-04-29 | 深度架构审计：识别 P0/P1/P2 技术债（列表双计数器、CRLF 混用、防覆盖硬编码等）                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-29 | 优化：修复 .gitignore lock 规则、提取 shared/chinese.ts 和 shared/prompts.ts、移除冻结 article-writer、parseCli 泛型化、env 惰性加载、docx 主题提取                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-29 | 新增 ppt-outline skill：读取 analysis.json 生成咨询级 PPT 演讲大纲（金字塔原理 + Action Title + SCQA）                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-29 | 邮政财务功能扩展：① 新增 financial-analysis、request-for-approval、budget-preparation 三种文档类型（含类型、验证、prompt、analyzer、writer、outline 全链路）；② input-processor 新增 Excel/CSV 数据接入；③ 新建 shared/financial-metrics.ts 财务指标库（同比/环比/差异分析/三把尺子框架/分环节成本/邮政收入结构）；④ ppt-outline 新增 7 类财务图表映射；⑤ 新建 period-comparison skill 多期跨期对比报告 |
