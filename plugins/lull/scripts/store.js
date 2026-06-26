'use strict';
// 本地持久化:SM-2 卡状态 + 积累统计(今日卡数/连胜/总数/保持率)。纯本地,不联网。
const fs = require('fs');
const path = require('path');
const { review } = require('./scheduler');

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}
function dayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
function isYesterday(prevKey, todayKey) {
  if (!prevKey) return false;
  const [py, pm, pd] = prevKey.split('-').map(Number);
  const prev = new Date(py, pm - 1, pd);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const today = new Date(ty, tm - 1, td);
  return (today - prev) === 24 * 60 * 60 * 1000;
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.statePath = path.join(dir, 'state.json');
    this.progressPath = path.join(dir, 'progress.json');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    this.state = readJson(this.statePath, { cards: {} });
    this.progress = readJson(this.progressPath, {
      total: 0, correct: 0, today: 0, todayKey: null, streak: 0,
    });
  }

  getState(cardId) { return this.state.cards[cardId]; }

  // 评分一张卡:更新 SM-2 状态 + 积累统计,落盘。
  review(cardId, quality, now) {
    this.state.cards[cardId] = review(this.state.cards[cardId], quality, now);
    this._recordProgress(quality, now);
    this._save();
    return this.state.cards[cardId];
  }

  _recordProgress(quality, now) {
    const k = dayKey(now);
    const p = this.progress;
    if (p.todayKey !== k) {
      // 新的一天:连胜按是否"昨天有学"延续或重置
      p.streak = isYesterday(p.todayKey, k) ? (p.streak + 1) : 1;
      p.today = 0;
      p.todayKey = k;
    }
    p.today += 1;
    p.total += 1;
    if (quality >= 3) p.correct += 1;
  }

  summary() {
    const p = this.progress;
    const retention = p.total ? Math.round((p.correct / p.total) * 100) : 0;
    return { today: p.today, total: p.total, streak: p.streak, retention };
  }

  _save() {
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(this.state));
      fs.writeFileSync(this.progressPath, JSON.stringify(this.progress));
    } catch (e) {}
  }
}

module.exports = { Store };
