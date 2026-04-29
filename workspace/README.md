# workspace — 工作材料目录

在此目录下新建子目录来创建一项新的工作材料任务。

## 命名规范

```
workspace/YYYYMMDD主题名/
```

例：`workspace/20260428周报/`

## 每项任务的标准结构

```
YYYYMMDD主题名/
├── source/              # 放原始素材（必须）
│   ├── transcript.md    # 录音转写、会议记录草稿
│   └── references.md    # 参考资料（可选）
├── analysis.json        # 结构化分析（content-analyzer 生成）
├── draft.md             # 文档草稿（doc-writer 生成）
└── output/              # 最终输出
    └── YYYYMMDD-主题.docx
```

## 支持的材料类型（--type 参数）

| 类型 | 说明 | 典型输出 |
| --- | --- | --- |
| `report` | 周报 / 月报 / 工作总结 | 结构化工作报告 |
| `minutes` | 会议纪要 + 行动项 | 会议纪要 + 追踪表 |
| `speech` | 会议发言稿 / 汇报稿 | 可朗读发言稿 |

## 快速开始

```powershell
# 1. 新建任务目录并放入素材
New-Item -ItemType Directory "workspace\20260428周报\source"
# 将工作记录保存到 workspace\20260428周报\source\transcript.md

# 2. 内容分析
bun skills\00content-analyzer\scripts\main.ts --dir "workspace\20260428周报" --type report

# 3. 生成草稿（Agent AI 写作后）
bun skills\00doc-writer\scripts\main.ts --dir "workspace\20260428周报"

# 4. 导出 DOCX
bun skills\00doc-export\scripts\main.ts --dir "workspace\20260428周报"
```
