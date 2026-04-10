---
name: input-processor
triggers:
  zh: ["输入处理", "解析输入", "处理输入"]
  en: ["input", "process input"]
inputs:
  - name: dir
    type: string
    description: workspace 文章目录路径
    required: true
  - name: input
    type: string
    description: 用户原始输入（URL/关键词/文件路径）
    required: true
outputs:
  - name: source_files
    type: file
    description: source/ 目录下的素材文件
---
# input-processor — 多源输入处理器

## 职责

识别用户输入类型（YouTube/URL/关键词/本地文件），路由到对应处理器，输出标准化素材至 source/ 目录。

## 前置条件

- [ ] workspace 目录已创建
- [ ] notebooklm-mcp 已安装（YouTube 场景）
- [ ] TAVILY_API_KEY 已配置（关键词场景）

## 执行步骤

- [ ] 解析输入，识别类型
- [ ] 路由到对应处理函数
- [ ] 保存处理结果到 source/ 目录

## CLI 调用

bun baoyu-skills\skills\00input-processor\scripts\main.ts --dir workspace\YYYYMMDD主题 --input "用户输入"

## 错误处理

| 错误场景         | 处理策略                                      |
| ---------------- | --------------------------------------------- |
| YouTube 提取失败 | 提示用户手动粘贴文字稿至 source/transcript.md |
| 网页抓取失败     | Playwright JS 渲染重试 → 提示用户粘贴正文    |
| 搜索无结果       | 直接基于关键词进入写作流程                    |
