'use strict';
// Phase 0 Spike 验证:不依赖真实 Claude Code,用模拟事件 + 模拟时钟驱动核心管线,
// 断言 技术栈识别 → 挑卡 → 评分(SM-2)→ 积累,以及铁律 #2(让路)/#3(短任务不出卡)。
const os = require('os');
const path = require('path');
const fs = require('fs');

const { detectStackFromPath, detectDominantStack } = require('../scripts/stackDetect');
const { review } = require('../scripts/scheduler');
const { Store } = require('../scripts/store');
const { WaitEngine } = require('../scripts/engine');

const DECKS = path.join(__dirname, '..', 'decks', 'en');
let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

// ── 模拟时钟 ──
let t = 1700000000000;
const now = () => t;

// 临时 store
const tmp = path.join(os.tmpdir(), 'lull-spike-' + Date.now());
const store = new Store(tmp);

console.log('\nLull Phase 0 Spike\n==================');

// 1) 技术栈识别
console.log('\n[1] stackDetect');
ok('.tsx → react', detectStackFromPath('src/Button.tsx') === 'react');
ok('.ts  → typescript', detectStackFromPath('src/util.ts') === 'typescript');
ok('.py  → python', detectStackFromPath('a/b/c.py') === 'python');
ok('dominant(2×tsx,1×ts) = react', detectDominantStack(['a.tsx', 'b.tsx', 'c.ts']) === 'react');

// 2) 引擎:短任务不出卡(#3)+ 等待够久出卡 + dominant 正确
console.log('\n[2] engine: 短任务隐身 / 出卡 / 评分');
let shown = null, yielded = false;
const engine = new WaitEngine({
  decksDir: DECKS, store, now, shortTaskMs: 8000,
  handlers: {
    showCard: (p) => { shown = p; },
    yield: () => { yielded = true; },
  },
});
const T0 = t;
engine.onEvent({ type: 'user_prompt' });
engine.onEvent({ type: 'tool_edit', file: 'src/Button.tsx' });
engine.onEvent({ type: 'tool_edit', file: 'src/Card.tsx' });

t = T0 + 3000; engine.tick();
ok('等待 3s(<8s)不出卡 [#3]', shown === null);

t = T0 + 9000; engine.tick();
ok('等待 9s(>8s)出卡 [#3 边界]', shown !== null);
ok('挑中的技术栈 = react(dominant)', shown && shown.stack === 'react');
ok('卡片来自 react 卡库', shown && require('../scripts/deckLoader').loadDeck('react', DECKS).some((c) => c.id === shown.card.id));

// 评分(模拟用户揭晓后按"记得"=quality4)
const cardId = shown.card.id;
engine.rate(4);
ok('评分后写入 SM-2 状态', !!store.getState(cardId));
ok('评分后当前卡清空', engine.currentCard === null);
const sum = store.summary();
ok('积累:今日 = 1', sum.today === 1);
ok('积累:连胜 = 1', sum.streak === 1);
ok('积累:保持率 = 100%(quality≥3)', sum.retention === 100);

// 3) 铁律 #2:agent 需要你时立刻让路
console.log('\n[3] engine: agent 需要你 → 让路 [#2]');
let shown2 = null, yielded2 = false;
const e2 = new WaitEngine({
  decksDir: DECKS, store, now, shortTaskMs: 8000,
  handlers: { showCard: (p) => { shown2 = p; }, yield: () => { yielded2 = true; } },
});
const T1 = (t = 1700000100000);
e2.onEvent({ type: 'user_prompt' });
e2.onEvent({ type: 'tool_edit', file: 'src/util.ts' });
t = T1 + 9000; e2.tick();
ok('出卡(typescript)', shown2 && shown2.stack === 'typescript');
e2.onEvent({ type: 'agent_needs_user' });
ok('收到 agent_needs_user → 触发 yield', yielded2 === true);
ok('让路后当前卡被清空', e2.currentCard === null);

// 4) SM-2 调度算法
console.log('\n[4] scheduler SM-2');
const s1 = review(undefined, 5, t);
ok('新卡 quality5 → reps=1, interval=1', s1.reps === 1 && s1.interval === 1);
const s2 = review(s1, 5, t);
ok('再 quality5 → reps=2, interval=6', s2.reps === 2 && s2.interval === 6);
const s3 = review(s2, 2, t);
ok('quality<3 → reps 重置=0, interval=1', s3.reps === 0 && s3.interval === 1);
ok('ef 不低于 1.3', s3.ef >= 1.3);

// 清理
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

console.log('\n==================');
console.log(`结果: ${pass} 通过, ${fail} 失败\n`);
process.exitCode = fail ? 1 : 0;
