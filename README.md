# 微信公众号内容工厂 - 操作手册

从素材到发布的全流程自动化流水线。

## 系统架构

素材分析 → 草稿生成 → AI写作 → Review → 配图 → 发布

- /content-analyzer  → analysis.json
- /article-writer    → draft.md + prompts/*.md  
- Agent 写作         → draft.md 完整正文
- /baoyu-imagine     → imgs/*.png（可选）
- /baoyu-post-to-wechat → 微信草稿箱

---

## 第一步：准备 Workspace 目录

每篇文章一个目录，命名约定：
e:\AI\antigravity\00微信公众号\workspace\YYYYMMDD主题名\

目录结构：
20260410notebooklm\
├── source\            ← 放原始素材（必须先建）
│   ├── transcript.md  ← 视频转录 / 文章摘录
│   └── references.md  ← 参考资料（可选）
├── analysis.json      ← content-analyzer 生成
├── draft.md           ← article-writer 生成  
├── imgs\              ← 配图目录
│   └── cover.png      ← 封面图（须手动提供！）
└── prompts\           ← 配图提示词
    ├── 01-xxx.md
    └── 02-xxx.md

注意：封面图 imgs/cover.png 必须手动准备，发布时的必要条件。

---

## 第二步：放入素材

在 source/ 下放 .md 或 .txt 文件：

| 素材类型     | 建议文件名      | 来源              |
|-------------|----------------|-------------------|
| 视频字幕     | transcript.md  | YouTube、录音转写  |
| 参考文章     | references.md  | 网页复制、PDF摘录  |
| 写作方向     | topic.md       | 自己写的主题关键词 |

以 _ 开头的文件会被跳过（如 _notes.md）。

---

## 第三步：内容分析（/content-analyzer）

触发：
- /content-analyzer --dir e:\AI\antigravity\00微信公众号\workspace\20260410notebooklm
- 或说："分析这个目录的素材"

脚本输出：
- _analysis_instruction.md → AI 分析指令
- analysis.json → 空模板，等 Agent 填写

Agent 读取指令后填写 analysis.json 格式：
{
  "topic": "2-6字主题",
  "key_points": ["核心观点1", "观点2"],
  "insights": ["非共识洞见"],
  "data_facts": ["具体数据/案例"],
  "suggested_structure": {
    "title": "建议文章标题",
    "sections": ["节1", "节2", "节3"]
  },
  "word_count_target": 2000,
  "references": ["来源URL"]
}

---

## 第四步：生成草稿（/article-writer）

触发：
- /article-writer --dir e:\AI\antigravity\00微信公众号\workspace\20260410notebooklm
- 或说："基于 analysis.json 生成草稿"

脚本输出：
| 文件                     | 内容                      |
|--------------------------|--------------------------|
| draft.md                 | 文章骨架（标题+节+占位符）  |
| _write_instruction.md    | 写作指令（Agent 读取执行）  |
| prompts/01-xxx.md        | 第1节配图提示词            |
| prompts/02-xxx.md        | 第2节配图提示词            |

Agent 读取 _write_instruction.md，补全 draft.md 正文。

---

## 第五步：Review 草稿

检查 draft.md：
- [ ] 标题是否吸引人
- [ ] 每节论述是否够充分（300字以上）
- [ ] 数据/案例是否具体
- [ ] 有没有 AI 腔（"总之"、"这意味着"等套语）
- [ ] 图片占位符位置是否合理

有修改意见直接告诉 Antigravity 修改。

---

## 第六步：配图（可选）

查看 prompts/ 中的提示词文件，按需说：
/baoyu-imagine 基于 workspace/.../prompts/01-xxx.md 生成配图

或手动调用：
bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\baoyu-imagine\scripts\main.ts" --prompt "..." --image "imgs\01.png" --ar 4:3

生图需要配置 GOOGLE_API_KEY 或 OPENAI_API_KEY（见 .env）。
封面图尺寸：1280x720（16:9）或 900x383（微信标准）。

---

## 第七步：发布到微信（/baoyu-post-to-wechat）

触发：
- /baoyu-post-to-wechat 发布 workspace/YYYYMMDD主题/draft.md
- 或说："发布这篇文章"

发布后：登录 mp.weixin.qq.com → 内容管理 → 草稿箱 → 发布

---

## 快速命令参考

bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\content-analyzer\scripts\main.ts" --dir "工作目录"
bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\article-writer\scripts\main.ts" --dir "工作目录"
bun "e:\AI\antigravity\00weixin\baoyu-skills\skills\baoyu-post-to-wechat\scripts\wechat-api.ts" "file.md" --theme default --color blue

---

## 环境变量（e:\AI\antigravity\00weixin\.baoyu-skills\.env）

WECHAT_APP_ID=wx5facf1b3faadd35b（已配置）
WECHAT_APP_SECRET=92188ae9333c0ce619a261b35ae41163（已配置）
ARTICLE_WORD_TARGET=2000（默认）
ARTICLE_STYLE=default（默认）
IMG_PER_ARTICLE=3（默认）
GOOGLE_API_KEY=（按需填写，用于生图）
OPENAI_API_KEY=（按需填写，用于生图）

---

## 常见问题

| 问题                        | 原因           | 解决                          |
|-----------------------------|----------------|-------------------------------|
| content-analyzer 报错 ENOENT | source/ 不存在 | 新建 source/ 并放入素材       |
| article-writer 报错不完整    | AI 分析未执行  | 让 Agent 填写 analysis.json   |
| 发布报错 No cover image      | 缺封面图       | imgs/ 下放 cover.png          |
| 发布报错 access_token        | IP 未白名单    | 微信后台 → 基本配置 → 添加 IP |
| 生图失败                     | 缺 API key     | .env 配置生图 API key         |

---

## Workflow 触发词速查

| 功能     | 触发词                                      |
|----------|---------------------------------------------|
| 素材分析 | /content-analyzer、"分析素材"               |
| 文章生成 | /article-writer、"写文章"、"生成草稿"       |
| MD转HTML | /baoyu-markdown-to-html、"md 转 html"       |
| 发布微信 | /baoyu-post-to-wechat、"发公众号"           |
| AI 生图  | /baoyu-imagine、"生成图片"                  |
| 翻译文章 | /baoyu-translate、"翻译文章"                |
| 格式化   | /baoyu-format-markdown、"格式化文章"        |
