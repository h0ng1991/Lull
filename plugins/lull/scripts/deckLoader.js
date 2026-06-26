'use strict';
// 按技术栈加载预制卡库(纯本地 JSON,零 LLM)。带简单缓存。
const fs = require('fs');
const path = require('path');

const cache = new Map();

// 返回卡数组 [{id, front, back, tags, difficulty}],找不到返回 null。
function loadDeck(stack, decksDir) {
  if (!stack) return null;
  const key = decksDir + '::' + stack;
  if (cache.has(key)) return cache.get(key);

  const file = path.join(decksDir, stack + '.json');
  let cards = null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    cards = Array.isArray(data) ? data : (data.cards || null);
  } catch (e) {
    cards = null;
  }
  cache.set(key, cards);
  return cards;
}

function clearCache() { cache.clear(); }

module.exports = { loadDeck, clearCache };
