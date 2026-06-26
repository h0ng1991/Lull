[English](README.md) | **中文**

# Lull

把 AI 编程助手"思考/干活"时的那段等待,变成一张**一瞥即看的闪卡**。

与其在 10–60 秒的转圈里下意识掏手机,不如复习一张**主动回忆**卡——内容贴着你正在做的事——顺便攒起一个小小的每日连续记录。卡片在助手开始干活的瞬间弹到屏幕角落,干完就让路。

> **状态:** Windows 可用(Claude Code CLI / 桌面版 Code 标签)。
> 免费内核开源;可选的 Pro 附加包能根据你**当前的任务**生成卡片。

---

## 你会得到什么

- 助手一开始干活,屏幕角落就弹出一张小卡。
- 等待时想翻几张翻几张——点一下揭晓答案。
- 卡片来自本地卡库,并按你**当前的技术栈**排序。
- "今日已看"计数,让碎片时间攒成点东西。
- 卡片上一键 **EN / 中文** 切换。
- **Pro:** 一张根据你**真实任务**生成的 AI 卡滑入(用你自己的大模型 key)。

## 运行要求

- [Node.js](https://nodejs.org)
- 下列任一 agent(其它也能用,见下表):
  - **Claude Code** —— CLI 或桌面版 "Code" 标签
  - **Codex CLI**
- **Windows** —— 悬浮窗用系统自带的 PowerShell + WPF,**零额外下载**。
  (mac/Linux:hook 能装上,但可视化悬浮窗目前仅 Windows。)

## 安装(一键)

1. 下载本仓库(绿色 **Code → Download ZIP**,或 `git clone`),解压到一个固定位置。
2. **Windows:** 双击 **`install.bat`**。  **mac/Linux:** `sh install.sh`。
3. 完成。照常用你的 agent —— 发一个实质编码任务,角落就会弹卡。

安装器会**自动检测你装了哪些 agent**,给每个挂上同一个 hook(保留你已有设置、可重复跑):

| Agent | 自动弹卡 | 安装器做什么 |
|---|:---:|---|
| **Claude Code**(CLI / Code 标签) | ✅ | 把 hook 加进 `~/.claude/settings.json` |
| **Codex CLI** | ✅ | 把 hook 加进 `~/.codex/hooks.json` |
| Cursor / Gemini CLI / Goose / 其它 | 即将 | 暂未自动——用下面的常驻悬浮窗 |

> 之后又装了新 agent?**重跑一次 `install.bat`** 就会把它也挂上。
> 安装器还会创建默认 `~/.lull/config.json`(语言、类别,以及 Pro 的 key/license)。

> **任何其它 agent,现在就能用:**双击 `overlay/start-overlay.bat`,把卡片当成常驻角落窗,等待时手动翻。

## 怎么用

1. 给 Claude Code 发一个实质任务。
2. 右下角弹出闪卡——**先出问题**,在脑子里想想。
3. 趁助手干活,点 **看答案 / 下一张** 翻阅。
4. *(Pro)* 一张为你这个任务定制的紫色 **✨** 卡滑到最前。
5. 寒暄、一句话的小回合会自动跳过。

## 免费 vs Pro

|                                         | 免费(开源) | Pro |
|-----------------------------------------|:---:|:---:|
| 角落悬浮窗、翻阅、每日连续记录          | ✓ | ✓ |
| 17 套内置卡库(开发 + 生活)、类别与语言可选 | ✓ | ✓ |
| **按你当前任务生成的 AI 卡**            | — | ✓ |
| 精选 / 专家卡库包                        | — | ✓ |

Pro = 一个离线 license key + 一个小的 `pro/` 模块(买后单独发)。它调用**你自己的** DeepSeek/Claude key —— 没有中间服务器,你的代码只发给你选的那个大模型。

## 类别与语言

编辑 `~/.lull/config.json`:

- `enabledCategories` —— 可选:`writing`、`productivity`、`excel`、`money`、`health`、
  `psychology`、`science`、`history`、`english`、`tech-basics`、`dev`。
  `dev` 展开为 react / typescript / python / node / git / css / sql。
- `lang` —— `"en"` 或 `"zh"`(或直接点卡片上的 **EN / 中** 按钮)。

## 开发

```bash
node plugins/lull/test/spike.js     # 核心逻辑回归测试
```

## License

内核:**MIT**。`pro/` 模块与精选卡库为专有内容。
