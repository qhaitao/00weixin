---
name: article-writer
triggers:
  zh: ["写文章", "生成文章", "写作"]
  en: ["write article", "generate article"]
inputs:
  - name: dir
    type: string
    description: workspace 文章目录路径（需包含 analysis.json）
    required: true
outputs:
  - name: draft
    type: file
    description: draft.md 文章草稿
---
# article-writer — AI 文章生成器

## 职责

消费 analysis.json，生成高质量微信公众号文章草稿 draft.md。

## 前置条件

- [ ] analysis.json 已生成且内容完整

## 执行步骤

- [ ] 读取 analysis.json基于结构化分析生成 draft.md 骨架
- [ ] 在合适位置插入图片占位符（路径 imgs/NN-section-N.png）
- [ ] 为每个章节生成配图提示词文件（prompts/NN-xxx.md）
- [ ] 生成写作指令 _write_instruction.md
- [ ] 暂停等待 Agent 写作及用户 Review①

## CLI 调用

```bash
# 从 e:\AI\antigravity\00weixin 下执行
bun "baoyu-skills\skills\00article-writer\scripts\main.ts" --dir "workspace\YYYYMMDD主题"
```

## 错误处理

| 错误场景               | 处理策略                              |
| ---------------------- | ------------------------------------- |
| analysis.json 不存在   | 报错退出，提示先运行 content-analyzer |
| analysis.json 字段为空 | 报错退出，提示重新分析                |
| AI 生成超过字数限制    | 警告，不中断，由用户 Review 处理      |
