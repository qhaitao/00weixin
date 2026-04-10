# workspace 文章模板

在此目录下新建子目录来创建一篇新文章。

## 命名规范

```
workspace/YYYYMMDD主题名/
```

例：`workspace/20260410notebooklm/`

## 每篇文章的标准结构

```
YYYYMMDD主题名/
├── source/              # 放原始素材（必须）
│   ├── transcript.md    # 视频字幕、录音转写
│   └── references.md    # 参考文章（可选）
├── imgs/                # 配图（封面图须手动提供）
│   └── cover.png        # 封面图（发布必须）
├── prompts/             # 配图提示词（article-writer 自动生成）
│   ├── 01-xxx.md
│   └── 02-xxx.md
├── analysis.json        # 结构化分析（content-analyzer 生成）
└── draft.md             # 文章草稿（article-writer 生成）
```

## 快速开始

```powershell
# 1. 新建文章目录
New-Item -ItemType Directory "workspace\20260410主题名\source"

# 2. 放入素材后分析
bun "baoyu-skills\skills\content-analyzer\scripts\main.ts" --dir "workspace\20260410主题名"

# 3. 生成草稿
bun "baoyu-skills\skills\article-writer\scripts\main.ts" --dir "workspace\20260410主题名"

# 4. 发布（需 imgs/cover.png）
bun "baoyu-skills\skills\baoyu-post-to-wechat\scripts\wechat-api.ts" "workspace\20260410主题名\draft.md" --theme default --color blue
```
