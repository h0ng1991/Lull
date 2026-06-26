#!/usr/bin/env node
'use strict';
// UserPromptSubmit hook(本地 CLI / 桌面 Code):用户一提交实质任务,就
//   (1) 给悬浮窗发 wait_start 信号(overlay 监听 ~/.lull/events.jsonl);
//   (2) 若悬浮窗没在运行,自动把它拉起来(Windows / PowerShell)。
// 显示完全交给悬浮窗;本脚本不往对话里注入卡片。纯本地、永远 exit 0(不阻塞 agent)。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pickQueue, detectCwdStack } = require('../scripts/pickQueue');
const { isPro } = require('../scripts/license');

const HOME = path.join(os.homedir(), '.lull');
const OVERLAY = path.join(__dirname, '..', '..', '..', 'overlay', 'overlay.ps1');

let raw = '';
process.stdin.on('data', (d) => raw += d);
process.stdin.on('end', () => {
  try { main(JSON.parse(raw || '{}')); } catch (e) {}
  // 给 cmd /c start 一点时间真正拉起 powershell 再退出(避免父进程秒退的竞态)
  setTimeout(() => process.exit(0), 250);
});
setTimeout(() => process.exit(0), 2000);

function isTrivial(p) {
  if (!p) return true;
  const t = String(p).trim();
  if (t.length < 8) return true;
  if (/^(hi|hello|hey|你好|谢谢|thanks?|ok|okay|好的|嗯|test|测试)\b/i.test(t)) return true;
  return false;
}

function main(j) {
  if (isTrivial(j.prompt)) return;
  try { fs.mkdirSync(HOME, { recursive: true }); } catch (e) {}
  // 1) 据当前上下文挑一批相关卡,写成队列给 overlay(零 LLM、纯本地)
  try {
    const queue = pickQueue({
      decksDir: path.join(__dirname, '..', 'decks'),
      cwd: j.cwd || process.cwd(),
      homeDir: HOME,
      repoConfig: path.join(__dirname, '..', 'skills', 'lull', 'config.json'),
    });
    if (queue && queue.length) {
      fs.writeFileSync(path.join(HOME, 'queue.json'), JSON.stringify(queue));
    }
  } catch (e) {}
  // 2) Pro: 有 aiKey + 有效 license + Pro 模块存在 → 异步生成"贴脸卡"(LLM 慢,绝不在 hook 里等)
  //    免费用户没有 pro/ 模块文件(开源仓库里没有),或没 license → 这里直接跳过,只走静态卡。
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(HOME, 'config.json'), 'utf8'));
    const gen = path.join(__dirname, '..', '..', '..', 'pro', 'generateCard.js');
    if (cfg && cfg.aiKey && isPro(cfg.license) && fs.existsSync(gen)) {
      fs.writeFileSync(path.join(HOME, 'ai-ctx.json'),
        JSON.stringify({ task: j.prompt, stack: detectCwdStack(j.cwd || process.cwd()) }));
      spawn(process.execPath, [gen], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
  } catch (e) {}
  // 3) 发"等待开始"信号(队列已就绪;overlay 收到信号会重载 queue.json)
  try {
    fs.appendFileSync(path.join(HOME, 'events.jsonl'), JSON.stringify({ type: 'wait_start', ts: Date.now() }) + '\n');
  } catch (e) {}
  // 4) 悬浮窗没运行就自动拉起
  //    坑: node 在 Windows 上用 spawn(..., {detached:true}) 启 powershell 会"退出码0却不执行命令"
  //    (实测 detached 下 -Command 完全不跑)。改用 cmd /c start 启动一个独立进程: cmd 立即退出,
  //    被 start 拉起的 powershell 不是 cmd 的子进程, 父进程(本 hook)退出后仍存活。
  try {
    const lock = path.join(HOME, 'overlay.lock');
    if (process.platform === 'win32' && !fs.existsSync(lock) && fs.existsSync(OVERLAY)) {
      const child = spawn('cmd',
        ['/c', 'start', '', 'powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass',
         '-WindowStyle', 'Hidden', '-File', OVERLAY],
        { stdio: 'ignore', windowsHide: true });
      child.unref();
    }
  } catch (e) {}
}
