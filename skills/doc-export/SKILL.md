---
name: doc-export
triggers:
  zh: ["导出文档", "生成Word", "导出DOCX", "doc-export"]
  en: ["doc-export", "export docx", "generate word"]
inputs:
  - name: dir
    type: string
    description: workspace 任务目录路径（需包含已补全正文的 draft.md）
    required: true
  - name: fix-typography
    type: boolean
    description: 导出前对 draft.md 执行 CJK 排版修复（间距 + 强调标点），默认关闭
    required: false
outputs:
  - name: docx
    type: file
    description: output/<标题>.docx
---
# doc-export — DOCX 导出工具

## 职责

将 `draft.md` 解析为结构化内容，使用 `docx` 渲染为格式规范的 Word DOCX 文件。

支持：H1/H2/H3 标题层级、行内粗体/斜体、正文首行缩进、引用块、有序/无序列表、表格、页眉（单位·标题）、页脚（页码）。

## 前置条件

- [ ] `draft.md` 已由 Agent AI 补全正文（执行 `doc-writer` 后由 AI 写作）
- [ ] 项目根目录已安装依赖（`bun install` 即可，`docx` 已在 `package.json`）

## CLI 调用

```powershell
# 基础用法
bun skills\doc-export\scripts\main.ts --dir workspace\<任务目录>

# 附加排版修复（推荐：中英混排文档时使用）
bun skills\doc-export\scripts\main.ts --dir workspace\<任务目录> --fix-typography
```

## 参数说明

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `--dir <路径>` | ✅ | workspace 任务目录，需包含 `draft.md` |
| `--fix-typography` | 可选 | 执行排版修复后再导出（见下方说明） |
| `--verbose` / `-v` | 可选 | 输出调试日志 |

## `--fix-typography` 排版修复说明

委托 `baoyu-format-markdown` 脚本对 `draft.md` 执行**原地**修复，然后再转换 DOCX：

| 修复项 | 效果示例 |
| --- | --- |
| CJK/英文间距（`autocorrect-node`） | `KPI指标` → `KPI 指标`，`2026年` 保持不变 |
| 强调标点边界（`remark-cjk-friendly`） | `**中文，**` → `**中文**，`（避免标点被吞入加粗范围） |

> **注意**：修复直接修改 `draft.md`，建议在用户 Review 完成后再执行，避免与手工修改冲突。
> 若 `baoyu-format-markdown` 依赖未安装，自动跳过，不影响 DOCX 生成。

## DOCX 输出样式

| 样式项 | 说明 |
| --- | --- |
| 字体 | `Microsoft YaHei`（由 `DOC_FONT` 环境变量控制） |
| 正文字号 | 11pt |
| 首行缩进 | 2 字符（440 twips），标题与正文均适用 |
| 标题颜色 | H1 深蓝 `#1F3864`，H2 蓝 `#2E75B6`，H3 深灰 `#404040` |
| 公文节标题 | `**一、…**` 独立整行 → 无色粗体正文（公文通知格式） |
| 有序列表 | `1. 2. 3.` → DOCX 数字编号 |
| 无序列表 | `- *` → DOCX 圆点符号 |
| 行内粗体/斜体 | `**bold**` / `*italic*` → 对应 TextRun 属性 |
| 页眉 | 右对齐：`单位简称 · 文档标题` |
| 页脚 | 居中：`第 N 页 / 共 M 页` |
| 输出文件名 | 取 `draft.md` 第一个 H1 标题，存入 `output/` |

## 错误处理

| 错误场景 | 处理策略 |
| --- | --- |
| `draft.md` 不存在 | 报错退出，提示先完成 doc-writer 和 Agent 写作步骤 |
| `output/` 目录不存在 | 自动创建 |
| 排版修复失败 | 打印警告，继续使用原始 `draft.md` 转换 DOCX |
