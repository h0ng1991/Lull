'use strict';
// 由文件路径/事件推断技术栈。v1 用后缀;后续可叠加读 package.json 等清单做加权。
const path = require('path');

// 后缀 → 技术栈 id。.tsx/.jsx 归 react(比 typescript/javascript 更具体)。
const EXT_TO_STACK = {
  '.tsx': 'react',
  '.jsx': 'react',
  '.ts': 'typescript',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.sql': 'sql',
};

function detectStackFromPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_STACK[ext] || null;
}

// 一组路径 → 出现次数最多的技术栈(并列取先出现的)。
function detectDominantStack(paths) {
  const counts = {};
  for (const p of paths || []) {
    const s = detectStackFromPath(p);
    if (s) counts[s] = (counts[s] || 0) + 1;
  }
  let best = null, bestN = 0;
  for (const [s, n] of Object.entries(counts)) {
    if (n > bestN) { best = s; bestN = n; }
  }
  return best;
}

module.exports = { detectStackFromPath, detectDominantStack, EXT_TO_STACK };
