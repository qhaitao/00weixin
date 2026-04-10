# 微信公众号内容工厂 — 操作手册

> 从素材到发布的全流程自动化流水线，5个步骤完成一篇高质量微信文章。

---

## 快速导航

| 步骤 | 动作 | 触发方式 |
|------|------|----------|
| 0 | 输入素材（YouTube/URL/本地文件/关键词） | `/input-processor` |
| 1 | 准备 workspace 目录 + 放入素材 | 手动操作 |
| 2 | 内容分析 → analysis.json | `/content-analyzer` |
| 3 | 生成草稿骨架 | `/article-writer` |
| 4 | [Agent AI] 写正文 | 自动触发 |
| 5 | Review + 配图（可选）+ 发布 | `/baoyu-post-to-wechat` |

---

## 一、环境准备（首次使用）

### 1.1 安装 Bun 运行时

```powershell
# Windows 安装 Bun
npm install -g bun

# 验证安装
bun --version   # 应显示 ≥ 1.3.x
```

### 1.2 安装项目依赖

```powershell
# 在 baoyu-skills 目录下安装依赖
cd e:\AI\antigravity\00weixin\baoyu-skills
npm install
```

### 1.3 配置微信 API 凭证

微信 API 凭证存放于 `.baoyu-skills/.env`（已加入 `.gitignore`，不会上传 GitHub）。

**获取凭证步骤**：
1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com)
2. 进入 **开发 → 基本配置**
3. 复制 `AppID` 和 `AppSecret`（需要扫码验证）

**配置文件内容**（`.baoyu-skills/.env`）：

```ini
# ── 微信公众号凭证（必填）──
WECHAT_APP_ID=wxXXXXXXXXXXXXXXXX
WECHAT_APP_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ── 文章生成参数（可选，有默认值）──
ARTICLE_WORD_TARGET=2000    # 目标字数，默认 2000
ARTICLE_STYLE=default       # 文章风格，默认 default
IMG_PER_ARTICLE=3           # 每篇配图数，默认 3

# ── 生图 API Key（可选，按需配置）──
GOOGLE_API_KEY=             # 用于 baoyu-imagine（Gemini Imagen）
OPENAI_API_KEY=             # 用于 baoyu-imagine（DALL·E）
```

**⚠️ IP 白名单**：微信 API 要求调用方 IP 在白名单。如报 `access_token` 或 IP 错误，需：
- 进入 **开发 → 基本配置 → IP 白名单**
- 添加本机公网 IP（可访问 [myip.la](https://myip.la) 查询）

### 1.4 配置发布偏好（可选）

编辑 `.baoyu-skills/baoyu-post-to-wechat/EXTEND.md`：

```yaml
default_theme: default          # 主题：default / grace / simple / modern
default_color: blue             # 主色：blue / green / vermilion / purple / red...
default_publish_method: api    # 发布方式：api（快）/ browser（慢）
default_author: 你的署名        # 文章署名（空则不显示）
need_open_comment: 1           # 开启评论：1=是 0=否
only_fans_can_comment: 0       # 仅粉丝评论：1=是 0=否
```

---

## 二、生产一篇文章（完整流程）

### Step 0：输入处理（可选）

如果素材来自 YouTube、网页 URL 或关键词搜索，先用 `input-processor` 生成获取指令：

```powershell
# YouTube 视频转录
bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\00input-processor\scripts\main.ts" `
  --dir "workspace\20260410主题名" `
  --input "https://www.youtube.com/watch?v=xxxxx"

# 网页抓取
bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\00input-processor\scripts\main.ts" `
  --dir "workspace\20260410主题名" `
  --input "https://example.com/article"

# 关键词搜索
bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\00input-processor\scripts\main.ts" `
  --dir "workspace\20260410主题名" `
  --input "心智模型"

# 本地文件导入
bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\00input-processor\scripts\main.ts" `
  --dir "workspace\20260410主题名" `
  --input "C:\path\to\notes.md"
```

脚本会在 `workspace\20260410主题名\source\` 目录下生成对应的指令文件（`_youtube_instruction.md` / `_url_instruction.md` / `_keyword_instruction.md`），由 Agent AI 读取后执行实际抓取。

如果素材已在手边，跳过此步直接进入 Step 1。

---

### Step 1：准备 Workspace 目录

每篇文章一个目录，命名格式：`workspace\YYYYMMDD主题名\`

```powershell
# 新建文章目录（在 00weixin 根目录下执行）
New-Item -ItemType Directory "workspace\20260410主题名\source" -Force
New-Item -ItemType Directory "workspace\20260410主题名\imgs" -Force
```

将素材文件放入 `source\` 目录：

| 素材类型 | 建议文件名 | 来源 |
|---------|-----------|------|
| 视频字幕/转录 | `transcript.md` | YouTube 字幕导出、录音转写 |
| 参考文章 | `references.md` | 网页正文、PDF 摘录 |
| 写作方向/主题 | `topic.md` | 自己归纳的核心议题 |
| 其他素材 | 任意 `.md`/`.txt` | 笔记、摘录等 |

**注意事项**：
- 以 `_` 开头的文件（如 `_notes.md`）会被跳过，可用于存放不纳入分析的草稿
- 支持多个素材文件，content-analyzer 会自动合并读取
- 单文件超过 8000 字会触发"长文本分段处理"模式

---

### Step 2：内容分析

```powershell
# 所有命令均在 e:\AI\antigravity\00weixin 目录下执行
bun "baoyu-skills\skills\00content-analyzer\scripts\main.ts" --dir "workspace\20260410主题名"

# 调试模式（显示详细日志）
bun "baoyu-skills\skills\00content-analyzer\scripts\main.ts" --dir "workspace\20260410主题名" --verbose
```

**执行结果**：

| 文件 | 说明 |
|------|------|
| `workspace\20260410主题名\_analysis_instruction.md` | AI 分析指令（Agent 读取执行） |
| `workspace\20260410主题名\analysis.json` | 空模板，等待 Agent 填充 |

**Agent 填充后的 analysis.json 格式**：

```json
{
  "topic": "心智模型",
  "source_type": "youtube",
  "key_points": [
    "心智模型是认知世界的内部框架",
    "第一性原理是最强大的心智模型之一"
  ],
  "insights": [
    "大多数人用地图替代地形，而非不断更新地图",
    "掌握20个核心心智模型比掌握200个表浅的更有价值"
  ],
  "data_facts": [
    "查理·芒格持有约100个心智模型",
    "认知偏误已记录超过180种"
  ],
  "suggested_structure": {
    "title": "你的大脑在用什么操作系统？",
    "sections": ["认知的底层逻辑", "5个必备心智模型", "如何构建思维框架", "实战应用"]
  },
  "word_count_target": 2000,
  "references": ["https://example.com/source"]
}
```

---

### Step 3：生成草稿

```powershell
bun "baoyu-skills\skills\00article-writer\scripts\main.ts" --dir "workspace\20260410主题名"

# 调试模式
bun "baoyu-skills\skills\00article-writer\scripts\main.ts" --dir "workspace\20260410主题名" --verbose
```

**执行结果**：

| 文件 | 说明 |
|------|------|
| `draft.md` | 文章骨架（标题 + 各节占位符） |
| `_write_instruction.md` | 写作指令（Agent 读取执行） |
| `prompts/01-xxx.md` | 第1个配图提示词 |
| `prompts/02-xxx.md` | 第2个配图提示词 |
| `prompts/03-xxx.md` | 第3个配图提示词（`IMG_PER_ARTICLE=3` 时） |

---

### Step 4：AI 写正文

Agent AI 读取 `_write_instruction.md`，补全 `draft.md` 中每个 `<!-- 请在此展开论述 -->` 占位符。

**直接对话触发**（在 00weixin 目录下）：
> "读取 `workspace/20260410主题名/_write_instruction.md`，補全 draft.md"

**写作质量要求**（写作指令中包含）：
- **有料**：每节至少引用一个具体数据或案例
- **有用**：给读者可执行的行动建议
- **有洞见**：触达问题本质，不写表面现象
- **有温度**：避免 AI 腔调（禁用"总之"、"这意味着"等套语）

---

### Step 5：Review 草稿

打开 `workspace/20260410主题名/draft.md` 检查：

```
Review Checklist：
- [ ] 标题是否吸引人（能让人停下来）
- [ ] 导读是否清楚交代读者收益
- [ ] 每节论述是否够充分（建议 ≥ 300 字）
- [ ] 数据/案例是否真实具体（非泛泛而谈）
- [ ] 有没有 AI 腔（总之/这意味着/综上所述）
- [ ] 图片占位符位置是否合理
- [ ] 整体字数是否达标（目标 2000 字）
```

有修改意见直接告诉 Antigravity 修改即可。

---

### Step 6：配图（可选）

查看 `prompts/` 中的提示词，按需生图：

```powershell
# 方式 A：直接触发（Antigravity 自动读取提示词）
# 在对话中说："/baoyu-imagine 基于 workspace/20260410主题名/prompts/01-xxx.md 生图"

# 方式 B：手动运行脚本
bun "baoyu-skills\skills\baoyu-imagine\scripts\main.ts" `
  --prompt "极简风格，表达认知升级的抽象场景，4:3比例" `
  --image "workspace\20260410主题名\imgs\01-section.png" `
  --ar 4:3
```

**⚠️ 封面图必须手动提供** — 脚本无法自动生成封面：
- 路径：`workspace\20260410主题名\imgs\cover.png`
- 尺寸：**1280×720**（16:9）或 900×383（微信传统规格）
- 来源：AI 生图工具（Midjourney、Stable Diffusion、Gemini）、Canva 设计、Unsplash 图库

---

### Step 7：格式整理（可选）

发布前对 Markdown 进行格式清理：

```powershell
# 在对话中说："/baoyu-format-markdown workspace/20260410主题名/draft.md"

# 或直接运行（自动修复中英文间距 + 粗体标点问题）
bun "baoyu-skills\skills\baoyu-format-markdown\scripts\main.ts" `
  "workspace\20260410主题名\draft.md"
```

---

### Step 8：发布到微信

**推荐方式：API 发布（快，需凭证）**

```powershell
# 基本用法
bun "baoyu-skills\skills\baoyu-post-to-wechat\scripts\wechat-api.ts" `
  "workspace\20260410主题名\draft.md" `
  --theme default `
  --color blue

# 带完整参数
bun "baoyu-skills\skills\baoyu-post-to-wechat\scripts\wechat-api.ts" `
  "workspace\20260410主题名\draft.md" `
  --theme default `
  --color blue `
  --author "你的名字" `
  --cover "workspace\20260410主题名\imgs\cover.png"
```

**备用方式：浏览器发布（慢，需 Chrome 登录）**

```powershell
bun "baoyu-skills\skills\baoyu-post-to-wechat\scripts\wechat-article.ts" `
  --markdown "workspace\20260410主题名\draft.md" `
  --theme default `
  --color blue
```

**发布后**：
1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com)
2. 进入 **内容管理 → 草稿箱**
3. 预览确认 → 点击"发布"

---

## 三、快速命令参考

> 所有命令在 `e:\AI\antigravity\00weixin` 目录下执行

```powershell
# ── 完整流水线（核心三步）──

# Step 1: 分析素材
bun "baoyu-skills\skills\00content-analyzer\scripts\main.ts" --dir "workspace\YYYYMMDD主题名"

# Step 2: 生成草稿
bun "baoyu-skills\skills\00article-writer\scripts\main.ts" --dir "workspace\YYYYMMDD主题名"

# Step 3: 发布
bun "baoyu-skills\skills\baoyu-post-to-wechat\scripts\wechat-api.ts" "workspace\YYYYMMDD主题名\draft.md" --theme default --color blue


# ── 辅助工具 ──

# MD → HTML 预览（调试用）
bun "baoyu-skills\skills\baoyu-markdown-to-html\scripts\main.ts" `
  "workspace\YYYYMMDD主题名\draft.md" --theme default --color blue

# 格式整理
bun "baoyu-skills\skills\baoyu-format-markdown\scripts\main.ts" `
  "workspace\YYYYMMDD主题名\draft.md"

# AI 生图
bun "baoyu-skills\skills\baoyu-imagine\scripts\main.ts" `
  --prompt "描述图片内容" --image "workspace\YYYYMMDD主题名\imgs\01.png"

# 翻译文章（中→英）
bun "baoyu-skills\skills\baoyu-translate\scripts\main.ts" `
  --input "workspace\YYYYMMDD主题名\draft.md" --target en
```

---

## 四、Workflow 触发词速查

| 对话触发词 | 对应 Skill | 功能 |
|-----------|-----------|------|
| `/input-processor`、"处理输入" | `00input-processor` | 处理 YouTube/URL/关键词 |
| `/content-analyzer`、"分析素材" | `00content-analyzer` | 素材分析 → analysis.json |
| `/article-writer`、"写文章"、"生成草稿" | `00article-writer` | 生成草稿 + 配图提示词 |
| `/baoyu-post-to-wechat`、"发公众号" | `baoyu-post-to-wechat` | 发布到微信草稿箱 |
| `/baoyu-markdown-to-html`、"md 转 html" | `baoyu-markdown-to-html` | MD → 微信样式 HTML |
| `/baoyu-imagine`、"生成图片" | `baoyu-imagine` | AI 图像生成 |
| `/baoyu-format-markdown`、"格式化文章" | `baoyu-format-markdown` | 修复 MD 格式问题 |
| `/baoyu-translate`、"翻译文章" | `baoyu-translate` | 文章翻译 |
| `/baoyu-cover-image`、"生成封面" | `baoyu-cover-image` | 生成封面图（1280×720） |

---

## 五、主题与样式

`baoyu-markdown-to-html` 和 `baoyu-post-to-wechat` 均支持以下主题和颜色。

### 主题

| 主题名 | 风格描述 |
|--------|---------|
| `default` | 经典 — 居中标题+下划线，H2 白字色底背景 |
| `grace` | 优雅 — 文字阴影，圆角卡片，精致引用块 |
| `simple` | 极简 — 现代简约，不对称圆角，大量留白 |
| `modern` | 现代 — 大圆角，胶囊型标题，宽松行高（搭配 `--color red` 呈现中式红金风） |

### 颜色预设

| 名称 | 色值 | 中文名 |
|------|------|--------|
| `blue` | #0F4C81 | 经典蓝 |
| `green` | #009874 | 翠绿 |
| `vermilion` | #FA5151 | 朱砂红 |
| `yellow` | #FECE00 | 柠檬黄 |
| `purple` | #92617E | 薰衣草紫 |
| `sky` | #55C9EA | 天空蓝 |
| `rose` | #B76E79 | 玫瑰金 |
| `olive` | #556B2F | 橄榄绿 |
| `black` | #333333 | 石墨黑 |
| `gray` | #A9A9A9 | 烟灰 |
| `pink` | #FFB7C5 | 樱花粉 |
| `red` | #A93226 | 中国红 |
| `orange` | #D97757 | 暖橙（modern 主题默认色） |

也可直接传 hex 值：`--color "#1A6B3C"`

---

## 六、常见问题排查

| 报错 / 问题 | 原因 | 解决方案 |
|------------|------|---------|
| `ENOENT: source/` | source/ 目录不存在 | 创建 `workspace\YYYYMMDD\source\` 并放入素材 |
| `article-writer 报 analysis.json 不完整` | Agent 未填写 analysis.json | 让 Agent 读取 `_analysis_instruction.md` 并填写 |
| `No cover image` | 缺封面图 | 在 `imgs\cover.png` 放 1280x720 封面图 |
| `access_token 错误` | API 凭证无效/过期 | 检查 `.baoyu-skills\.env` 中的 `WECHAT_APP_ID` / `WECHAT_APP_SECRET` |
| `IP 不在白名单` | 微信 API IP 限制 | 微信后台 → 开发 → 基本配置 → IP 白名单，添加本机公网 IP |
| `bun: command not found` | Bun 未安装 | `npm install -g bun` |
| 生图失败 | 缺 API Key | 在 `.baoyu-skills\.env` 配置 `GOOGLE_API_KEY` 或 `OPENAI_API_KEY` |
| `analysis.json is null` | 文件存在但 JSON 格式错误 | Agent 重新填写 analysis.json，确保 JSON 合法 |
| Chrome 找不到（浏览器发布） | Chrome 未安装或路径不对 | 安装 Chrome，或设置环境变量 `WECHAT_BROWSER_CHROME_PATH` |
| 发布内容中图片不显示 | 图片路径相对错误 | 确认 `imgs/` 目录存在且 `draft.md` 中的图片路径正确 |

---

## 七、目录结构（执行路径）

**所有脚本相对 `00weixin` 根目录执行**（PowerShell 工作目录设置为 `e:\AI\antigravity\00weixin`）：

```
执行路径: e:\AI\antigravity\00weixin\
           │
           └── baoyu-skills\
                └── skills\
                     └── 00content-analyzer\
                          └── scripts\
                               └── main.ts   ← bun 运行此文件
```

**--dir 参数路径**：传入 workspace 子目录，可以是相对路径或绝对路径：

```powershell
# 相对路径（推荐，更简洁）
--dir "workspace\20260410主题名"

# 绝对路径
--dir "e:\AI\antigravity\00weixin\workspace\20260410主题名"
```

---

## 八、贡献与扩展

- **添加新 Skill**：在 `baoyu-skills/skills/` 下新建目录，参照 `00content-analyzer` 的结构，从 `../../../shared/` 导入工具函数
- **修改路径约定**：只需编辑 `baoyu-skills/shared/fs.ts` 中的 `workspacePaths()` 函数
- **新增环境变量**：在 `.baoyu-skills/.env` 中添加，通过 `shared/env.ts` 的 `env()` 函数读取
- **GitHub 仓库**：[github.com/qhaitao/00weixin](https://github.com/qhaitao/00weixin)
- **上游 baoyu-skills**：[github.com/JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills)
