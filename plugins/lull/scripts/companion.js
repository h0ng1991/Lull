#!/usr/bin/env node
'use strict';
// Lull 伴随进程:tail ~/.lull/events.jsonl → 驱动 WaitEngine → 在本终端窗口渲染卡片。
// 这是"方案 B"(独立伴随窗口):用户在等待时瞥这个窗口,按键揭晓/评分。
// 之所以选 B 而非 statusLine:agent 运行期间主终端的输入被占用,无法在等待中做"揭晓/评分"交互。
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { WaitEngine } = require('./engine');
const { Store } = require('./store');

const HOME = path.join(os.homedir(), '.lull');
const EVENTS = path.join(HOME, 'events.jsonl');
const DECKS = path.join(__dirname, '..', 'decks');
fs.mkdirSync(HOME, { recursive: true });

const store = new Store(HOME);
let revealed = false;

const engine = new WaitEngine({
  decksDir: DECKS,
  store,
  shortTaskMs: process.env.LULL_SHORT_MS ? Number(process.env.LULL_SHORT_MS) : 8000, // 验证时可设小,如 LULL_SHORT_MS=3000
  handlers: {
    showCard: ({ card, stack }) => { revealed = false; renderCard(card, stack); },
    yield: () => { revealed = false; render('\n  ⏸  你的 agent 在等你(权限/提问)——先去回它。\n'); },
    rated: ({ quality }) => { render('  ✓ 记下了。' + summaryLine() + '\n'); },
    waitEnd: () => { /* 等待结束:保持上一张卡或清屏,这里留空 */ },
  },
});

function summaryLine() {
  const s = store.summary();
  return `  今日 ${s.today} 张 · 连胜 ${s.streak} 天 · 保持率 ${s.retention}%`;
}
function render(text) { process.stdout.write(text + '\n'); }
function renderCard(card, stack) {
  console.clear();
  render('');
  render('  🧠 Lull · [' + stack + ']');
  render('  ────────────────────────────────');
  render('  ' + card.front);
  render('');
  render('  [空格] 揭晓答案    [s] 跳过');
  render(summaryLine());
}
function renderAnswer(card) {
  render('');
  render('  ' + card.back);
  render('');
  render('  评分:[1] 重来  [2] 一般  [3] 记得  [4] 简单');
}

// ── 键盘交互(方案 B 的核心:在伴随窗口里完成 问→揭晓→评分)──
if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (str, key) => {
    if (key && key.ctrl && key.name === 'c') process.exit(0);
    const card = engine.currentCard;
    if (!card) return;
    if (!revealed && (key.name === 'space')) { revealed = true; renderAnswer(card); return; }
    if (!revealed && (str === 's')) { engine.currentCard = null; render('  (跳过)'); return; }
    if (revealed && ['1', '2', '3', '4'].includes(str)) {
      const q = { '1': 2, '2': 3, '3': 4, '4': 5 }[str];
      engine.rate(q);
    }
  });
}

// ── tail events.jsonl ──
let offset = 0;
try { offset = fs.statSync(EVENTS).size; } catch (e) { offset = 0; }
function poll() {
  try {
    const size = fs.existsSync(EVENTS) ? fs.statSync(EVENTS).size : 0;
    if (size > offset) {
      const buf = Buffer.alloc(size - offset);
      const fd = fs.openSync(EVENTS, 'r');
      fs.readSync(fd, buf, 0, buf.length, offset);
      fs.closeSync(fd);
      offset = size;
      for (const line of buf.toString('utf8').split('\n')) {
        if (!line.trim()) continue;
        try { engine.onEvent(JSON.parse(line)); } catch (e) {}
      }
    } else if (size < offset) {
      offset = size; // 文件被轮转/清空
    }
  } catch (e) {}
  engine.tick();
}
setInterval(poll, 500);

render('  Lull 已启动,正在守候 agent 的等待时间…  (Ctrl+C 退出)');
render(summaryLine());
