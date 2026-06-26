---
name: lull
description: Show the user ONE quick active-recall flashcard during the wait while you work on a substantive task — coding, writing, analysis, planning, research, spreadsheets, anything that takes more than a few seconds. Put the QUESTION at the very start of your reply, do the task, then reveal the ANSWER at the end. Draw from the user's chosen categories. Skip for greetings, thanks, or one-line answers.
---

# Lull — micro-learning in the wait

Alongside the user's task, turn the wait while you work into **one quick active-recall flashcard**, so the user learns something during the otherwise-idle wait (instead of doom-scrolling). For everyone — not just programmers.

## When to show a card
Show one when the request is a **substantive task**: coding, writing, analysis, planning, research, spreadsheets, designing, explaining — anything that will take more than a few seconds.

**Skip** for greetings, thanks, yes/no, one-line replies, or when a card would distract from something urgent.

## The three beats
1. **Start — show the QUESTION** (compact block, format below) and invite the user to recall it while you work. **Do not reveal the answer yet.**
2. **Middle — do the user's task** normally.
3. **End — reveal the ANSWER** + a one-line progress note. **This is mandatory and must be the very last thing in your reply** — even after long, tool-heavy tasks, or tasks that produced their own files/visuals. A question with no answer is worse than no card.

This fills the wait automatically: the user thinks while you work; the answer lands right when you finish — whether 5 seconds or 5 minutes.

## Format (keep it tight — the card is a side dish, never overshadow the task)
At the very start of your reply:
```
🧠 Lull · [<类别>] — 趁我干活,先想想:
   Q: <问题>
```
At the very end of your reply:
```
🧠 Lull · 答案
   A: <答案>
   (<一句进度,如 "今日第 2 张" 或 "想换类别就告诉我">)
```

## Choosing the card
- **Enabled categories**: read `config.json` next to this skill (`enabledCategories`). If unreadable, default to `writing, productivity, health, money, psychology, science, history, english`.
- Pick ONE card relevant to an enabled category; **vary** across turns; **don't repeat** one shown this session.
- Source: the matching `decks/<category>.json` next to this skill (for `dev`, use `decks/{react,typescript,python,node,git,css,sql}.json`). If decks aren't readable, use the embedded fallback below.
- **Honor in-chat preferences** ("lull 只要英语和生活类" / "加上 dev 卡"); update `config.json` if you can write files, else honor for the session.
- Plain language — understandable by a non-expert. Avoid unnecessary jargon.

## Embedded fallback cards (use when deck files aren't readable)
- [productivity] 什么是‘两分钟法则’? / 两分钟内能做完的事立刻做掉,别记进清单。
- [health] 20-20-20 护眼法则? / 每 20 分钟,看约 6 米外的东西 20 秒。
- [science] 天为什么是蓝的? / 大气把波长更短的蓝光散射得更多(瑞利散射)。
- [english] affect 和 effect? / affect 多作动词(影响);effect 多作名词(效果)。
- [money] 应急基金存多少? / 一般 3–6 个月生活费,放随时能取的活期。
- [writing] 邮件开头先写什么? / 先写结论或请求,再写理由细节。
- [psychology] 沉没成本陷阱? / 已花掉收不回的成本不该左右决定,只看往后值不值。

## Progress (best-effort, never block the task)
If you have file tools, you may read/append `~/.lull/skill-progress.json` (`{ "date": "YYYY-M-D", "count": N }`) for a daily streak. If not, just give an encouraging one-liner.
