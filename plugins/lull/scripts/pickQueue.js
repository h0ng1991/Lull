'use strict';
// 挑卡器(纯本地、零 LLM):据"启用类别"+"当前工作目录技术栈"从卡库挑一批相关卡,
// 写成队列给 overlay 本地翻阅。AI 贴脸卡(Pro)以后只要把生成卡 prepend 进同一队列即可。
// 铁律:永不抛错、永不阻塞(全程 try/catch,出错返回兜底)。
const fs = require('fs');
const path = require('path');
const { detectStackFromPath, detectDominantStack } = require('./stackDetect');

// 类别/技术栈 id → 颜色 + 各语言显示名 + 图标。
// icon = Tabler 图标字体的码位(16 进制字符串);overlay 转成字符、用 tabler-icons 字体渲染。
const META = {
  // 生活/通用(category)
  writing:       { color: '#7F77DD', en: 'Writing',      zh: '职场写作',   icon: 'eb04' },
  productivity:  { color: '#EF9F27', en: 'Productivity', zh: '效率',       icon: 'ea38' },
  excel:         { color: '#2E9E5B', en: 'Spreadsheets', zh: '表格',       icon: 'eba1' },
  money:         { color: '#639922', en: 'Money',        zh: '理财',       icon: 'eb82' },
  health:        { color: '#1D9E75', en: 'Health',       zh: '健康',       icon: 'eabe' },
  psychology:    { color: '#D4537E', en: 'Psychology',   zh: '心理',       icon: 'f59f' },
  science:       { color: '#378ADD', en: 'Science',      zh: '科学',       icon: 'ebd2' },
  history:       { color: '#D85A30', en: 'History',      zh: '历史',       icon: 'ebea' },
  english:       { color: '#E24B4A', en: 'Language',     zh: '英语',       icon: 'ebbe' },
  'tech-basics': { color: '#5B8DEF', en: 'Tech 101',     zh: '科技扫盲',   icon: 'ef8e' },
  // 开发硬核(stack) —— 名字两语相同
  react:      { color: '#3AA0D1', en: 'React',      zh: 'React',      icon: 'f34c' },
  typescript: { color: '#3178C6', en: 'TypeScript', zh: 'TypeScript', icon: 'f5f1' },
  python:     { color: '#3776AB', en: 'Python',     zh: 'Python',     icon: 'ed01' },
  node:       { color: '#539E43', en: 'Node',       zh: 'Node',       icon: 'fae0' },
  git:        { color: '#F05133', en: 'Git',        zh: 'Git',        icon: 'eab2' },
  css:        { color: '#2965F1', en: 'CSS',        zh: 'CSS',        icon: 'ed6b' },
  sql:        { color: '#CC2927', en: 'SQL',        zh: 'SQL',        icon: 'ea88' },
};
const DEV_STACKS = ['react', 'typescript', 'python', 'node', 'git', 'css', 'sql'];

function meta(id) { return META[id] || { color: '#888888', en: id, zh: id, icon: '' }; }
function metaName(id, lang) { const m = meta(id); return m[lang] || m.en || id; }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 读启用类别:优先用户 ~/.lull/config.json,否则仓库默认 config.json,否则全部。
function readEnabled(homeDir, repoConfig) {
  for (const p of [path.join(homeDir, 'config.json'), repoConfig]) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(data.enabledCategories)) return data.enabledCategories;
    } catch (e) {}
  }
  return null; // null = 全部
}

// 读语言:优先用户 config,其次仓库默认,最后默认 en(英文优先)。
function readLang(homeDir, repoConfig) {
  for (const p of [path.join(homeDir, 'config.json'), repoConfig]) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data.lang === 'zh' || data.lang === 'en') return data.lang;
    } catch (e) {}
  }
  return 'en';
}

// 展开启用集合:'dev' 展开为 7 个开发库;null/空/含 'all' = 全部。
function expandEnabled(enabled) {
  if (!enabled || !enabled.length || enabled.includes('all')) return null; // null = 不过滤
  const set = new Set();
  for (const c of enabled) {
    if (c === 'dev') { DEV_STACKS.forEach((s) => set.add(s)); }
    else set.add(c);
  }
  return set;
}

// 浅扫 cwd(根目录 + src/)推断技术栈;只返回我们有 deck 的栈,否则 null。
function detectCwdStack(cwd) {
  if (!cwd) return null;
  try {
    let files = fs.readdirSync(cwd);
    let stack = detectDominantStack(files);
    if (!stack) {
      try {
        const srcDir = path.join(cwd, 'src');
        if (fs.existsSync(srcDir)) stack = detectDominantStack(fs.readdirSync(srcDir));
      } catch (e) {}
    }
    if (stack) return stack;
    if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('setup.py')) return 'python';
    if (files.includes('package.json')) return 'node';
  } catch (e) {}
  return null;
}

// 主函数:返回 [{c,color,icon,q,a}] 队列。decksDir 是 decks 根,实际从 decks/<lang>/ 读。
function pickQueue(opts) {
  opts = opts || {};
  const decksDir = opts.decksDir;
  const cwd = opts.cwd;
  const homeDir = opts.homeDir;
  const repoConfig = opts.repoConfig;
  const limit = opts.limit || 20;
  const lang = opts.lang || readLang(homeDir, repoConfig);

  const enabledSet = expandEnabled(readEnabled(homeDir, repoConfig));
  const detected = detectCwdStack(cwd);

  const listJson = (d) => { try { return fs.readdirSync(d).filter((f) => f.endsWith('.json')); } catch (e) { return []; } };
  let dir = path.join(decksDir, lang);
  let files = listJson(dir);
  if (!files.length) {
    dir = path.join(decksDir, lang === 'en' ? 'zh' : 'en');
    files = listJson(dir);
    if (!files.length) { dir = decksDir; files = listJson(dir); }
  }

  const priority = [];
  const rest = [];
  for (const f of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
    const id = data.category || data.stack;
    if (!id) continue;
    if (enabledSet && !enabledSet.has(id)) continue;
    const cards = Array.isArray(data) ? data : (data.cards || []);
    const m = meta(id);
    const name = m[lang] || m.en || id;
    const mapped = cards.map((c) => ({ c: name, color: m.color, icon: m.icon, q: c.front, a: c.back }));
    if (detected && id === detected) priority.push(...mapped);
    else rest.push(...mapped);
  }

  const queue = shuffle(priority).concat(shuffle(rest)).slice(0, limit);
  return queue;
}

module.exports = { pickQueue, detectCwdStack, META };
