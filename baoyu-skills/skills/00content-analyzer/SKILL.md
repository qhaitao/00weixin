---
name: content-analyzer
triggers:
  zh: ["内容分析", "深度解析", "分析内容"]
  en: ["analyze", "content analysis"]
inputs:
  - name: dir
    type: string
    description: workspace 文章目录路径（需包含 source/ 目录）
    required: true
outputs:
  - name: analysis_json
    type: file
    description: analysis.json 结构化分析结果
---
# content-analyzer — 内容深度解析器

## 职责

读取 source/ 目录下的素材文件，进行内容规整、深度解析和洞见提炼，输出结构化的 analysis.json。

## 前置条件

- [ ] source/ 目录下存在至少一个素材文件（transcript.md 或 references.md）

## 执行步骤

- [ ] 读取 source/ 下所有素材
- [ ] 长文本分段处理（> 8000 字按章节拆分摘要）
- [ ] AI 深度分析，提炼核心观点、洞见、数据
- [ ] 生成 analysis.json

## CLI 调用

```bash
# 从 e:\AI\antigravity\00weixin 下执行
bun "baoyu-skills\skills\00content-analyzer\scripts\main.ts" --dir "workspace\YYYYMMDD主题"
```

## 错误处理

| 错误场景         | 处理策略                             |
| ---------------- | ------------------------------------ |
| source/ 目录为空 | 报错退出，提示先运行 input-processor |
| AI 调用失败      | 重试 × 2 → 报错退出                |
| 内容过长         | 自动分段摘要后合并                   |
