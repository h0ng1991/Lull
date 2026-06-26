'use strict';
// 等待引擎:接收统一事件,判定"等待窗口",在合适时机挑卡显示。
// 落实铁律:#1 不阻塞(纯被动观察)#2 agent 需要你时让路 #3 短任务不出卡。
const { detectStackFromPath } = require('./stackDetect');
const { loadDeck } = require('./deckLoader');
const { pickDueCard } = require('./scheduler');

class WaitEngine {
  constructor(opts) {
    opts = opts || {};
    this.decksDir = opts.decksDir;
    this.store = opts.store;
    this.now = opts.now || (() => Date.now());
    this.shortTaskMs = opts.shortTaskMs != null ? opts.shortTaskMs : 8000; // 铁律#3
    this.handlers = opts.handlers || {};
    this._reset();
  }

  _reset() {
    this.waiting = false;
    this.waitStart = 0;
    this.stackCounts = {};
    this.currentCard = null;
    this.shownThisWait = false;
  }

  _startWaitIfNeeded() {
    if (!this.waiting) {
      this.waiting = true;
      this.waitStart = this.now();
      this.stackCounts = {};
      this.currentCard = null;
      this.shownThisWait = false;
    }
  }

  _bump(file) {
    const s = detectStackFromPath(file);
    if (s) this.stackCounts[s] = (this.stackCounts[s] || 0) + 1;
  }

  dominantStack() {
    let best = null, bestN = 0;
    for (const [s, n] of Object.entries(this.stackCounts)) {
      if (n > bestN) { best = s; bestN = n; }
    }
    return best;
  }

  onEvent(evt) {
    if (!evt || !evt.type) return;
    switch (evt.type) {
      case 'session_start':
      case 'user_prompt':
        this._startWaitIfNeeded();
        break;
      case 'tool_edit':
        this._startWaitIfNeeded();
        if (evt.file) this._bump(evt.file);
        break;
      case 'tool_bash':
        this._startWaitIfNeeded();
        break;
      case 'agent_needs_user': // 铁律#2:立刻让路
        if (this.currentCard) this.currentCard = null;
        this._emit('yield', evt);
        break;
      case 'session_end':
        this.waiting = false;
        this._emit('waitEnd', { summary: this.store && this.store.summary && this.store.summary() });
        this._reset();
        break;
    }
  }

  // 由计时器周期调用:满足条件就出一张卡。
  tick() {
    if (!this.waiting || this.shownThisWait || this.currentCard) return;
    if (this.now() - this.waitStart < this.shortTaskMs) return; // 铁律#3
    const stack = this.dominantStack();
    if (!stack) return;
    const deck = loadDeck(stack, this.decksDir);
    if (!deck || !deck.length) return;
    const card = pickDueCard(deck, this.store, this.now());
    if (!card) return;
    this.currentCard = card;
    this.shownThisWait = true;
    this._emit('showCard', { card, stack });
  }

  // 用户评分当前卡(quality 0-5)。
  rate(quality) {
    if (!this.currentCard) return;
    const card = this.currentCard;
    if (this.store) this.store.review(card.id, quality, this.now());
    this.currentCard = null;
    this._emit('rated', { card, quality });
  }

  _emit(name, payload) {
    const h = this.handlers[name];
    if (typeof h === 'function') h(payload);
  }
}

module.exports = { WaitEngine };
