---
name: doc-writer
triggers:
  zh: ["生成文档", "写文档", "生成草稿", "doc-writer"]
  en: ["doc-writer", "generate doc"]
inputs:
  - name: dir
    type: string
    description: workspace 任务目录路径（需包含已填写的 analysis.json）
    required: true
outputs:
  - name: draft
    type: file
    description: draft.md 文档草稿骨架
  - name: write_instruction
    type: file
    description: _write_instruction.md 写作指令
---
# doc-writer — 职场文档草稿生成器

## 职责

消费 analysis.json，按材料类型（report / minutes / speech）生成对应的 draft.md 骨架和写作指令，交 Agent AI 补全正文。

## 前置条件

- [ ] analysis.json 已由 Agent AI 填写完整（运行 content-analyzer 后执行）

## 执行步骤

- [ ] 读取 analysis.json，校验必填字段
- [ ] 按 type 字段生成对应 draft.md 骨架（含单位信息、章节结构、占位注释）
- [ ] 生成 _write_instruction.md（含单位背景 + 写作要求）
- [ ] 暂停，等待 Agent AI 补全正文及用户 Review

## CLI 调用

```bash
# 从 e:\AI\00work 下执行
bun "skills\doc-writer\scripts\main.ts" --dir "workspace\YYYYMMDD主题"
```

## 错误处理

| 错误场景 | 处理策略 |
| --- | --- |
| analysis.json 不存在 | 报错退出，提示先运行 content-analyzer |
| type 字段缺失或非法 | 报错退出，提示重新运行 content-analyzer --type |
| 必填字段为空 | 列出所有空字段后退出，提示 Agent 补填 |
