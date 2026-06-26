#!/usr/bin/env node
'use strict';
// Claude Code hook 适配器。CC 在生命周期事件时以 stdin 传入 JSON,本脚本把它
// 映射成 Lull 统一事件,追加到 ~/.lull/events.jsonl。
// 铁律#1:永远 exit(0),绝不阻塞 agent。
const fs = require('fs');
const os = require('os');
const path = require('path');

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(raw || '{}'); } catch (e) {}
  try {
    const home = path.join(os.homedir(), '.lull');
    fs.mkdirSync(home, { recursive: true });
    const ev = mapEvent(j);
    if (ev) {
      ev.ts = Date.now();
      fs.appendFileSync(path.join(home, 'events.jsonl'), JSON.stringify(ev) + '\n');
    }
  } catch (e) { /* 静默:绝不影响 agent */ }
  process.exit(0);
});
// 万一 stdin 没有 end,也别卡住
setTimeout(() => process.exit(0), 1500);

function mapEvent(j) {
  const name = j.hook_event_name || '';
  if (name === 'UserPromptSubmit') return { type: 'user_prompt', cwd: j.cwd };
  if (name === 'Stop' || name === 'SubagentStop') return { type: 'session_end' };
  if (name === 'Notification') return { type: 'agent_needs_user' };
  if (name === 'PostToolUse' || name === 'PreToolUse') {
    const t = j.tool_name || '';
    const inp = j.tool_input || {};
    if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(t)) {
      return { type: 'tool_edit', file: inp.file_path || inp.notebook_path, cwd: j.cwd };
    }
    if (t === 'Bash') return { type: 'tool_bash', cmd: inp.command, cwd: j.cwd };
  }
  return null;
}
