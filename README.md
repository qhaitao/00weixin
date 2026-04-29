# 00work — 职场材料生成应用

> 输入你的工作记录或会议素材，让 AI 自动生成结构化 Word 文档。  
> 支持：周期性报告 / 会议纪要 / 发言稿 / 会议通知 / 财务分析 / 请示 / 预算编制

---

## 一分钟了解工作原理

这不是一个"填表格"工具，而是一条 **AI 协同流水线**：

```
你的素材  →  脚本搭骨架  →  AI 填内容  →  你来审核  →  导出 Word
```

每一步脚本只做"结构化"的事，真正的"理解"和"写作"由你的 AI Agent（如 Claude / Antigravity）来完成。你需要做的只有三件事：

1. **放入素材**（工作记录、会议录音转写等）
2. **复制下方提示词**，粘贴给 AI，让它帮你执行
3. **Review 草稿**，导出 Word

---

## 开始之前

```powershell
# 首次使用，安装依赖（只需一次）
bun install
```

> 需要先安装 [Bun](https://bun.sh/) ≥ 1.3

---

## 完整操作流程

### 第 0 步：新建任务目录，放入素材

在 `workspace\` 下新建一个以日期+主题命名的文件夹，把素材（.md 或 .txt）放入 `source\` 子目录：

```
workspace\
  └── 20260515财务分析会\
        └── source\
              └── transcript.md   ← 把你的工作记录/录音转写放在这里
```

**▶ 对 AI 说这句话：**
```
帮我新建任务目录并放入素材。
工作目录：workspace\20260515财务分析会
素材文件：[把你的内容粘贴进来，或说明文件位置]
```

---

### 第 1 步：内容分析（生成 analysis.json）

脚本读取 `source\` 下所有素材，生成两个文件：
- `_analysis_instruction.md`：给 AI 的分析指令
- `analysis.json`：空模板（等 AI 填写）

**▶ 对 AI 说这句话：**
```
运行内容分析脚本，然后按指令填写 analysis.json。

工作目录：workspace\20260515财务分析会
文档类型：report（可选：report / minutes / speech / notice / financial-analysis / request-for-approval / budget-preparation）

执行命令：
bun skills\content-analyzer\scripts\main.ts --dir workspace\20260515财务分析会 --type report

命令完成后，读取生成的 _analysis_instruction.md，根据指引分析 source\ 下的素材，填写 analysis.json 中的所有字段。
```

> **文档类型速查：**
> - `report` — 周报、月报、工作总结、项目汇报
> - `minutes` — 会议纪要、行动项追踪
> - `speech` — 领导讲话、发言稿、述职汇报
> - `notice` — 会议通知（标准公文格式）
> - `financial-analysis` — 财务分析报告（收入/成本/利润/风险，含三把尺子对标）
> - `request-for-approval` — 请示（一文一事、标准公文格式）
> - `budget-preparation` — 预算编制说明（收入/成本/项目预算）

⏸ **等 AI 填完 analysis.json，检查一遍关键字段是否正确，再进行下一步。**

---

### 第 2 步：生成草稿（补全 draft.md）

脚本读取已填写的 `analysis.json`，生成：
- `draft.md`：文档骨架（章节标题、占位符）
- `_write_instruction.md`：给 AI 的写作指令

**▶ 对 AI 说这句话：**
```
运行草稿生成脚本，然后按指令补全 draft.md。

工作目录：workspace\20260515财务分析会

执行命令：
bun skills\doc-writer\scripts\main.ts --dir workspace\20260515财务分析会

命令完成后，读取 _write_instruction.md，根据指引补全 draft.md 中所有正文内容。
注意：保留骨架格式，不要删除标题层级和占位标记。
```

⏸ **AI 写完后，打开 `draft.md` 仔细审阅。对措辞、数据、语气不满意的地方直接修改，这是最后一次人工把关的机会。**

---

### 第 3 步：导出 Word 文档

**▶ 对 AI 说这句话：**
```
运行导出脚本，将 draft.md 转换为 Word 文档。

工作目录：workspace\20260515财务分析会

执行命令：
bun skills\doc-export\scripts\main.ts --dir workspace\20260515财务分析会

完成后告诉我输出文件的路径。
```

✅ **文档输出至** `workspace\20260515财务分析会\output\<文档标题>.docx`

---

## 常用场景提示词模板

### 🗒 场景一：写周报

```
帮我生成本周工作周报。

工作目录：workspace\20260519周报
文档类型：report

我本周主要做了：
1. [事项1，包含进展和数据]
2. [事项2]
3. [下周计划]

请按流程：① 运行 content-analyzer（--type report）→ ② 填写 analysis.json → ③ 运行 doc-writer → ④ 补全 draft.md
```

---

### 📋 场景二：整理会议纪要

```
帮我整理这次会议的纪要。

工作目录：workspace\20260519财务例会
文档类型：minutes

会议记录如下：
[粘贴你的会议记录或录音转写]

请按流程：① 运行 content-analyzer（--type minutes）→ ② 填写 analysis.json → ③ 运行 doc-writer → ④ 补全 draft.md
注意：重点整理行动项，每项标明责任人和截止日期。
```

---

### 🎤 场景三：写发言稿

```
帮我写一篇发言稿。

工作目录：workspace\20260519汇报发言
文档类型：speech

场合：[如：年终总结大会 / 党委汇报会]
发言时长：[如：10 分钟]
听众：[如：公司领导班子]
核心要点：
1. [要表达的第一个重点]
2. [要表达的第二个重点]

请按流程：① 运行 content-analyzer（--type speech）→ ② 填写 analysis.json → ③ 运行 doc-writer → ④ 补全 draft.md
要求语气庄重、逻辑清晰，适当使用数据支撑。
```

---

### 📢 场景四：发会议通知

```
帮我起草一份会议通知。

工作目录：workspace\20260519财务分析会通知
文档类型：notice

会议名称：[如：2026年第二季度财务分析会]
时间：[如：2026年5月22日（周四）14:30]
地点：[如：行政楼3楼会议室]
参加人员：[如：各部门负责人]
主要议题：[如：审议Q2财务数据、讨论Q3预算调整]
有关要求：[如：请提前准备部门数据，准时出席]

请按流程：① 运行 content-analyzer（--type notice）→ ② 填写 analysis.json → ③ 运行 doc-writer → ④ 补全 draft.md
```

---

### 📊 场景五：写财务分析报告

```
帮我写一份财务分析报告。

工作目录：workspace\2026Q1财务分析
文档类型：financial-analysis

素材文件：[Excel 路径或直接粘贴财务数据]
分析框架：三把尺子（与预算比、与同期比、与标杆比）

请按流程：① 运行 content-analyzer（--type financial-analysis）→ ② 填写 analysis.json → ③ 运行 doc-writer → ④ 补全 draft.md
```

> **Excel 数据导入：** 如有 Excel/CSV 财务数据，先用 input-processor 解析：
> ```
> bun skills\input-processor\scripts\main.ts --dir workspace\2026Q1财务分析 --input "D:\数据\2026Q1.xlsx"
> ```

---

### 📝 场景六：起草请示

```
帮我起草一份请示。

工作目录：workspace\2026设备采购请示
文档类型：request-for-approval

请示事项：[如：关于追加2026年设备采购预算的请示]
主送：[如：省分公司]
测算依据：[如：现有设备缺口50台，单价3000元，合计15万元]
征求意见情况：[如：已征求财务部、技术部意见]
联系人及电话：[如：张三 138xxxx]

请按流程：① 运行 content-analyzer（--type request-for-approval）→ ② 填写 analysis.json → ③ 运行 doc-writer → ④ 补全 draft.md
```

---

### 🏷 场景七：编制预算说明

```
帮我编制预算说明。

工作目录：workspace\2027年度预算
文档类型：budget-preparation

预算年度：2027
编制依据：[如：2026年实际执行数据、2025-2026平均增长率8%]

请按流程：① 运行 content-analyzer（--type budget-preparation）→ ② 填写 analysis.json → ③ 运行 doc-writer → ④ 补全 draft.md
```

---

### 📈 多期对比（跨期分析）

如需对比多个季度的财务数据：

```
bun skills\period-comparison\scripts\main.ts --dirs workspace\2026Q1,workspace\2026Q2,workspace\2026Q3 --type financial-analysis
```

输出到 `workspace\consolidated\consolidated_report.md`。

---

## 遇到问题？

### analysis.json 已有内容，不想覆盖

正常情况下脚本会**自动保护**已填写的数据，不会覆盖。如需强制重新生成：

```
bun skills\content-analyzer\scripts\main.ts --dir workspace\任务目录 --type report --force
```

### 想修复 draft.md 的排版和标点

```
bun skills\baoyu-format-markdown\scripts\main.ts draft.md
```

### 需要从 URL / Excel 抓取素材

**▶ 对 AI 说这句话（URL）：**
```
从以下 URL 抓取素材，保存到工作目录。
工作目录：workspace\YYYYMMDD主题
URL：https://...

执行命令：
bun skills\input-processor\scripts\main.ts --dir workspace\YYYYMMDD主题 --input "https://..."
```

**▶ 对 AI 说这句话（Excel/CSV）：**
```
从 Excel 文件导入财务数据，保存到工作目录。
工作目录：workspace\YYYYMMDD主题
文件路径：D:\数据\2026Q1.xlsx

执行命令：
bun skills\input-processor\scripts\main.ts --dir workspace\YYYYMMDD主题 --input "D:\数据\2026Q1.xlsx"
```

> 支持 `.xlsx` / `.xls` / `.csv` 格式。需要安装 xlsx 依赖：`npm install xlsx`

---

## 环境配置

配置文件位于 `.baoyu-skills\.env`（不入 git，保护隐私）：

```ini
# 单位信息
DOC_ORG=中国邮政集团有限公司广东省分公司
DOC_ORG_SHORT=广东省分公司
DOC_LEADER=陈智泉

# 文档样式
DOC_FONT=Microsoft YaHei         # 输出字体
SPEECH_WORDS_PER_MIN=160         # 发言稿字速（字/分钟，用于推算字数目标）
ARTICLE_WORD_TARGET=1000         # 报告默认字数目标
```

---

## 目录结构

```
00work/
├── skills/                         各类 skill 脚本
│   ├── content-analyzer/           ① 内容分析（支持七种 --type）
│   ├── doc-writer/                 ② 草稿骨架生成（七套文风模板）
│   ├── doc-export/                 ③ DOCX 导出（docx-js 渲染）
│   ├── input-processor/            ④ 多源输入（URL / 本地文件 / 关键词 / Excel）
│   ├── ppt-outline/                ⑤ PPT 演讲大纲（含财务图表映射）
│   ├── period-comparison/          ⑥ 跨期财务对比报告
│   └── baoyu-format-markdown/      Markdown 格式化工具
│
├── shared/                         跨 skill 共享工具层
│   ├── types.ts                    类型定义（七种 DocAnalysis + 财务专用接口）
│   ├── fs.ts                       workspace 路径约定 + 读写封装
│   ├── prompts.ts                  写作规范与样式常量
│   ├── financial-metrics.ts        邮政财务指标库（同比/环比/差异分析/三把尺子）
│   ├── env.ts                      环境变量读取（带默认值）
│   ├── cli.ts                      CLI 参数解析
│   └── context.ts                  组织上下文（单位信息注入 AI prompt）
│
├── workspace/                      工作材料目录（本地存留，不纳入 git）
│   └── YYYYMMDD主题名/
│       ├── source/                 原始素材（.md / .txt / .json）
│       │   └── financial_data.json  （Excel/CSV 导入的结构化数据）
│       ├── analysis.json           结构化分析（content-analyzer 生成，Agent 填写）
│       ├── draft.md                文档草稿（doc-writer 生成骨架，Agent 补全）
│       └── output/                 最终 Word 文档输出目录
│
├── .baoyu-skills/.env              单位信息、字体等配置（不入 git）
├── CLAUDE.md                       项目架构文档（供 AI Agent 读取）
└── README.md                       本文件
```

---

## 注意事项

- `workspace/*/`（排除 `workspace/README.md`）已加入 `.gitignore`，工作材料仅本地存留，不上传
- `.baoyu-skills/.env` 已加入 `.gitignore`，单位信息和凭证不入 git
- `_analysis_instruction.md` 和 `_write_instruction.md` 为临时 AI 指令文件，已加入 `.gitignore`
- 首次克隆后须执行 `bun install` 安装依赖（含 docx）
- 所有 skill 脚本均通过 `bun` 直接运行 TypeScript，无需编译
