'use strict';
// 重新生成 ~/.lull/queue.json:切换语言/类别后立即拿到新一批卡。
// overlay 的 EN/中 切换钮会调它;on-prompt 也可复用(目前 on-prompt 直接调 pickQueue)。
// 可选 argv[2]=cwd(用于技术栈相关性);overlay 调用时一般不传,等下条真实指令再带 cwd 提相关卡。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pickQueue } = require('./pickQueue');

const HOME = path.join(os.homedir(), '.lull');
try {
  const queue = pickQueue({
    decksDir: path.join(__dirname, '..', 'decks'),
    cwd: process.argv[2] || undefined,
    homeDir: HOME,
    repoConfig: path.join(__dirname, '..', 'skills', 'lull', 'config.json'),
  });
  if (queue && queue.length) {
    fs.mkdirSync(HOME, { recursive: true });
    fs.writeFileSync(path.join(HOME, 'queue.json'), JSON.stringify(queue));
    console.log('queue refreshed:', queue.length);
  }
} catch (e) {
  console.error((e && e.message) || String(e));
  process.exit(1);
}
