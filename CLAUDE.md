# 00weixin — 微信公众号内容工厂

微信公众号内容生产与发布的根目录。

## 目录结构

```
00weixin/
├── .baoyu-skills/                     # 项目级配置
│   ├── .env                           # 微信 API 凭证（已配置，已 gitignore）
│   └── baoyu-post-to-wechat/
│       └── EXTEND.md                  # 微信账号发布配置
├── baoyu-skills/                      # JimLiu/baoyu-skills 本地部署（v1.97.0）
│   ├── shared/                        # 自建共享工具层
│   │   ├── cli.ts                     # CLI 参数解析
│   │   ├── env.ts                     # 环境变量读取
│   │   └── fs.ts                      # workspace 路径约定 + 读写封装
│   └── skills/
│       ├── content-analyzer/          # 素材分析 → analysis.json
│       ├── article-writer/            # 草稿生成 + 配图提示词
│       ├── baoyu-post-to-wechat/      # 发布到微信（API/浏览器）
│       ├── baoyu-markdown-to-html/    # MD → 微信样式 HTML（调试用）
│       ├── baoyu-imagine/             # AI 图像生成
│       ├── baoyu-format-markdown/     # 文章格式化
│       └── baoyu-translate/           # 文章翻译
├── workspace/                         # 文章工作目录
│   ├── README.md                      # workspace 使用说明
│   ├── test/                          # 测试目录（进 git）
│   └── YYYYMMDD主题名/               # 文章目录（.gitignore 排除）
│       ├── source/                    # 原始素材
│       ├── imgs/                      # 配图（cover.png 必须手动放置）
│       ├── prompts/                   # 配图提示词（自动生成）
│       ├── analysis.json              # 结构化分析（自动生成）
│       └── draft.md                   # 文章草稿（自动生成）
├── .gitignore                         # 保护凭证，排除 workspace 文章
├── CLAUDE.md                          # 本文档
└── README.md                          # 操作手册
```

## 发布流水线

```
素材(workspace/YYYYMMDD/source/)
  ↓ /content-analyzer  → analysis.json + _analysis_instruction.md
  ↓ [Agent AI 分析]    → 填写 analysis.json
  ↓ /article-writer    → draft.md 骨架 + prompts/*.md + _write_instruction.md
  ↓ [Agent AI 写作]    → 完成 draft.md
  ↓ [用户 Review]
  ↓ /baoyu-post-to-wechat → 微信草稿箱（需 imgs/cover.png）
```

## 快速命令

所有命令在 `e:\AI\antigravity\00weixin` 目录下执行，`--dir` 指向 workspace 子目录：

```powershell
# Step 1: 分析素材
bun "baoyu-skills\skills\content-analyzer\scripts\main.ts" --dir "workspace\YYYYMMDD主题名"

# Step 2: 生成草稿
bun "baoyu-skills\skills\article-writer\scripts\main.ts" --dir "workspace\YYYYMMDD主题名"

# Step 3: 发布（需 workspace\YYYYMMDD\imgs\cover.png）
bun "baoyu-skills\skills\baoyu-post-to-wechat\scripts\wechat-api.ts" "workspace\YYYYMMDD主题名\draft.md" --theme default --color blue
```

## shared 模块路径约定

Skill 脚本导入 shared 模块：`../../../shared/xxx`
（从 `skills/<skill>/scripts/` 向上三级到达 `baoyu-skills/`）

## 环境依赖

| 工具 | 版本 | 用途 |
|------|------|------|
| `bun` | v1.3.11 | TypeScript 运行时（已全局安装） |
| `node/npm` | 系统 | baoyu-skills 依赖安装 |

## 变更日志

- 2026-04-10：创建 workspace/，初始化 shared/ 层，改造 article-writer（去除生图，保留 prompts 生成），配置微信 API 凭证
