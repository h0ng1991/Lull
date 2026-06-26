'use strict';
// Lull 一键安装(跨平台,被 install.bat / install.sh 调用)。
// 自动检测你装了哪些 agent,把同一个 UserPromptSubmit hook 合并进各自的配置:
//   - Claude Code → ~/.claude/settings.json
//   - Codex CLI   → ~/.codex/hooks.json
// 两家钩子结构与 stdin 字段(prompt/cwd)相同,所以共用 on-prompt.js。
// 永远保留你已有的设置、幂等可重复跑。再建默认 ~/.lull/config.json(已存在则保留)。
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();
const hookJs = path.join(__dirname, 'plugins', 'lull', 'hooks', 'on-prompt.js');
const hookCmd = 'node "' + hookJs.replace(/\\/g, '/') + '"';

// 把 UserPromptSubmit 命令钩子合并进一个 JSON 配置文件(保留其他内容、幂等)。
function mergeHook(filePath) {
  let obj = {};
  if (fs.existsSync(filePath)) {
    try {
      obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      try { fs.copyFileSync(filePath, filePath + '.bak'); } catch (e2) {}
      console.log('  ! ' + filePath + ' 解析失败,已备份 .bak,将新建。');
      obj = {};
    }
  }
  if (!obj.hooks || typeof obj.hooks !== 'object') obj.hooks = {};
  let ups = obj.hooks.UserPromptSubmit;
  if (!Array.isArray(ups)) ups = ups ? [ups] : [];
  const has = ups.some(function (g) {
    return g && Array.isArray(g.hooks) && g.hooks.some(function (h) { return h && h.command && /on-prompt\.js/.test(h.command); });
  });
  if (has) {
    ups.forEach(function (g) {
      if (g && Array.isArray(g.hooks)) g.hooks.forEach(function (h) { if (h && h.command && /on-prompt\.js/.test(h.command)) h.command = hookCmd; });
    });
  } else {
    ups.push({ hooks: [{ type: 'command', command: hookCmd, timeout: 10 }] });
  }
  obj.hooks.UserPromptSubmit = ups;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
  return has ? 'refreshed' : 'added';
}

const claudeDir = path.join(home, '.claude');
const codexDir = path.join(home, '.codex');
const claudeExists = fs.existsSync(claudeDir);
const codexExists = fs.existsSync(codexDir);

const wired = [];
// Claude:已检测到就挂;两个都没检测到时,默认按 Claude 装(旗舰)。
if (claudeExists || (!claudeExists && !codexExists)) {
  const r = mergeHook(path.join(claudeDir, 'settings.json'));
  wired.push('Claude Code (' + r + ')  -> ' + path.join(claudeDir, 'settings.json'));
}
// Codex:检测到才挂。
if (codexExists) {
  const r = mergeHook(path.join(codexDir, 'hooks.json'));
  wired.push('Codex CLI (' + r + ')   -> ' + path.join(codexDir, 'hooks.json'));
}

// 默认用户配置(已存在则保留 key/license/lang)
const lullDir = path.join(home, '.lull');
fs.mkdirSync(lullDir, { recursive: true });
const userCfg = path.join(lullDir, 'config.json');
let cfgNote = 'kept yours';
if (!fs.existsSync(userCfg)) {
  let cfg = { lang: 'en', enabledCategories: ['writing', 'productivity', 'health', 'money', 'psychology', 'science', 'history', 'english'] };
  try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'plugins', 'lull', 'skills', 'lull', 'config.json'), 'utf8')); } catch (e) {}
  fs.writeFileSync(userCfg, JSON.stringify(cfg, null, 2));
  cfgNote = 'created';
}

console.log('');
console.log('  Lull installed. Hooked into:');
wired.forEach(function (w) { console.log('    OK  ' + w); });
if (!codexExists) console.log('    --  Codex CLI not detected (skipped). Install Codex, then re-run this.');
console.log('    OK  Config -> ' + userCfg + ' (' + cfgNote + ')');
console.log('');
console.log('  Just use Claude Code or Codex as usual — send a real coding task and a');
console.log('  flashcard pops at your screen corner during the wait. Toggle EN/中 on the card.');
console.log('  (Other agents: double-click overlay\\start-overlay.bat to use it standalone.)');
console.log('');
