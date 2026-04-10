# 00weixin — 微信公众号内容工厂

微信公众号内容生产与发布的根目录。本 workspace 基于 [JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) 构建，在其之上增加了自定义的 `shared/` 工具层与三个本地改造的核心 skill（`00input-processor`、`00content-analyzer`、`00article-writer`）。

---

## 目录结构

```
00weixin/
├── .baoyu-skills/                     # 项目级机密配置（已 gitignore）
│   ├── .env                           # 微信 API 凭证（APP_ID / APP_SECRET）
│   └── baoyu-post-to-wechat/
│       └── EXTEND.md                  # 发布偏好（theme、color、作者、评论开关）
│
├── baoyu-skills/                      # baoyu-skills 本地部署（v1.56.1）
│   ├── shared/                        # ★ 自建共享工具层（本项目独有）
│   │   ├── cli.ts                     # CLI 参数解析（parseCli + log）
│   │   ├── env.ts                     # 环境变量读取（带默认值）
│   │   └── fs.ts                      # workspace 路径约定 + 读写封装
│   │
│   ├── packages/                      # 内部 npm 包（baoyu-skills 原生）
│   │   ├── baoyu-chrome-cdp/          # Chrome DevTools Protocol 封装
│   │   ├── baoyu-fetch/               # 网页抓取工具
│   │   └── baoyu-md/                  # Markdown 处理工具
│   │
│   └── skills/                        # 所有 skill 脚本
│       ├── 00input-processor/         # ① 素材输入处理（本地改造版）
│       ├── 00content-analyzer/        # ② 内容分析 → analysis.json（本地改造版）
│       ├── 00article-writer/          # ③ 草稿生成 + 配图提示词（本地改造版）
│       ├── baoyu-post-to-wechat/      # ④ 发布到微信（API / 浏览器）
│       ├── baoyu-markdown-to-html/    # ⑤ MD → 微信样式 HTML
│       ├── baoyu-imagine/             # ⑥ AI 图像生成（Gemini / DALL·E）
│       ├── baoyu-format-markdown/     # ⑦ 微信 Markdown 格式化
│       ├── baoyu-translate/           # ⑧ 文章翻译
│       ├── baoyu-cover-image/         # ⑨ 封面图生成
│       ├── baoyu-image-gen/           # 通用图像生成
│       ├── baoyu-image-cards/         # 图文卡片生成
│       ├── baoyu-infographic/         # 信息图生成
│       ├── baoyu-article-illustrator/ # 文章配图建议
│       ├── baoyu-compress-image/      # 图片压缩
│       ├── baoyu-comic/               # 漫画生成
│       └── baoyu-xhs-images/          # 小红书图文生成
│
├── workspace/                         # 文章工作目录
│   ├── README.md                      # workspace 快速开始说明
│   └── YYYYMMDD主题名/               # 单篇文章目录（.gitignore 排除 workspace/202*/）
│       ├── source/                    # 原始素材（.md / .txt）
│       │   ├── transcript.md          # 视频字幕 / 录音转写
│       │   └── references.md          # 参考资料（可选）
│       ├── imgs/                      # 配图目录
│       │   └── cover.png             # 封面图（★ 发布必须，须手动放置）
│       ├── prompts/                   # 配图提示词（article-writer 自动生成）
│       │   ├── 01-xxx.md
│       │   └── 02-xxx.md
│       ├── analysis.json              # 结构化分析（content-analyzer 生成 → Agent 填写）
│       └── draft.md                   # 文章草稿（article-writer 生成骨架 → Agent 写正文）
│
├── .gitignore                         # 保护凭证；排除 workspace/202*/ 文章目录
├── CLAUDE.md                          # 本文档（架构镜像）
└── README.md                          # 操作手册（面向用户）
```

---

## 核心流水线

```
素材放入 workspace/YYYYMMDD/source/
     │
     ▼ 00input-processor（可选，处理 YouTube/URL/关键词输入）
     │
     ▼ 00content-analyzer
     │   生成：_analysis_instruction.md（交 Agent AI 执行）
     │   生成：analysis.json（空模板，Agent 填写）
     │
     ▼ [Agent AI 分析] → 填充 analysis.json
     │
     ▼ 00article-writer
     │   生成：draft.md（结构骨架）
     │   生成：prompts/*.md（配图提示词，每节一个）
     │   生成：_write_instruction.md（交 Agent AI 执行）
     │
     ▼ [Agent AI 写作] → 补全 draft.md 正文
     │
     ▼ [用户 Review] draft.md
     │
     ▼ [可选] baoyu-imagine → imgs/*.png（按 prompts/ 提示词生图）
     │         baoyu-format-markdown → 格式整理
     │         baoyu-translate → 翻译版本
     │
     ▼ baoyu-post-to-wechat
         发布到微信草稿箱（需 imgs/cover.png）
         方式 A：API（快，需凭证）
         方式 B：浏览器 Chrome CDP（慢，需登录 session）
```

---

## shared 模块

所有本地 skill 脚本（`skills/00*/scripts/`）通过 `../../../shared/xxx` 引用共享层：

| 模块 | 职责 |
|------|------|
| `cli.ts` → `parseCli()` | 解析 `--dir`、`--input`、`--verbose` 等 CLI 参数 |
| `cli.ts` → `log()` | `--verbose` 开关控制的调试日志 |
| `env.ts` → `env()` | 读取环境变量，支持默认值 |
| `fs.ts` → `workspacePaths()` | 统一 workspace 路径约定（单一真相源） |
| `fs.ts` → `readText/writeText` | 文本文件读写（Bun.file） |
| `fs.ts` → `readJson/writeJson` | JSON 读写（带 null 安全解析） |
| `fs.ts` → `ensureDir()` | 确保目录存在（recursive mkdir） |

**路径约定**（`workspacePaths(dir)` 返回）：

```typescript
{
  root:     resolve(dir),
  source:   join(root, "source"),
  analysis: join(root, "analysis.json"),
  draft:    join(root, "draft.md"),
  imgs:     join(root, "imgs"),
  cover:    join(root, "imgs", "cover.png"),
  prompts:  join(root, "prompts"),
}
```

修改路径约定只需改 `shared/fs.ts`，所有 skill 自动生效。

---

## Skill 一览

### 本地改造版（00开头，使用 shared 层）

| Skill | 触发词 | 核心参数 | 输出 |
|-------|--------|----------|------|
| `00input-processor` | `/input-processor` | `--dir` `--input <url/file/关键词>` | `source/` 目录下的指令文件 |
| `00content-analyzer` | `/content-analyzer` | `--dir` `--verbose` | `_analysis_instruction.md` + `analysis.json`（空模板） |
| `00article-writer` | `/article-writer` | `--dir` `--verbose` | `draft.md` + `prompts/*.md` + `_write_instruction.md` |

### baoyu-skills 原生 Skill

| Skill | 触发词 | 职责 |
|-------|--------|------|
| `baoyu-post-to-wechat` | `/baoyu-post-to-wechat`、"发公众号" | 发布文章到微信草稿箱（API/浏览器） |
| `baoyu-markdown-to-html` | `/baoyu-markdown-to-html`、"md 转 html" | MD → 微信样式 HTML（支持 4 套主题） |
| `baoyu-imagine` | `/baoyu-imagine`、"生成图片" | AI 生图（Gemini Imagen / DALL·E） |
| `baoyu-format-markdown` | `/baoyu-format-markdown`、"格式化文章" | 修复微信 MD 格式（粗体标点、中英文间距） |
| `baoyu-translate` | `/baoyu-translate`、"翻译文章" | 翻译文章（中↔英、多语言） |
| `baoyu-cover-image` | `/baoyu-cover-image` | 生成封面图（1280×720） |
| `baoyu-image-cards` | `/baoyu-image-cards` | 生成图文卡片 |
| `baoyu-infographic` | `/baoyu-infographic` | 生成信息图 |
| `baoyu-article-illustrator` | `/baoyu-article-illustrator` | 配图建议 |
| `baoyu-xhs-images` | `/baoyu-xhs-images` | 小红书多图生成 |
| `baoyu-comic` | `/baoyu-comic` | 漫画图文生成 |
| `baoyu-compress-image` | `/baoyu-compress-image` | 图片压缩 |

---

## 发布配置（.baoyu-skills/）

### .env（不入 git）

```ini
WECHAT_APP_ID=wxXXXXXXXXXXXXXXXX      # 微信公众号 AppID
WECHAT_APP_SECRET=XXXXXXXXXXXXXXXX    # 微信公众号 AppSecret
ARTICLE_WORD_TARGET=2000              # 目标字数
ARTICLE_STYLE=default                 # 文章风格（content-analyzer 使用）
IMG_PER_ARTICLE=3                     # 每篇配图数（article-writer 使用）
GOOGLE_API_KEY=                       # Gemini 生图 API Key（按需填写）
OPENAI_API_KEY=                       # DALL·E 生图 API Key（按需填写）
```

### baoyu-post-to-wechat/EXTEND.md（不入 git）

```yaml
default_theme: default
default_color: blue
default_publish_method: api
default_author: Antigravity
need_open_comment: 1
only_fans_can_comment: 0
```

---

## 环境依赖

| 工具 | 版本 | 用途 |
|------|------|------|
| `bun` | ≥ 1.3 | TypeScript 运行时（所有 skill 脚本） |
| `node/npm` | 系统 | baoyu-skills 内部包依赖安装 |
| Chrome | 任意 | 浏览器发布方式（可选） |

---

## .gitignore 规则摘要

| 规则 | 原因 |
|------|------|
| `.baoyu-skills/` | 保护 AppID / AppSecret 凭证 |
| `workspace/202*/` | 文章内容本地存留，不上传 |
| `_analysis_instruction.md` | 临时指令文件 |
| `_write_instruction.md` | 临时指令文件 |
| `node_modules/`、`bun.lockb` | 依赖文件 |

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-04-10 | 初始化 workspace/；创建 shared/ 层（cli.ts + env.ts + fs.ts）；改造三个核心 skill（00前缀）；配置微信 API 凭证 |
| 2026-04-10 | 推送到 GitHub (qhaitao/00weixin)；更新 CLAUDE.md + README.md 完整文档 |
