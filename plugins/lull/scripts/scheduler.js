'use strict';
// SM-2 间隔重复。评分 quality 0-5;UI 的"重来/一般/记得/简单"映射到 2/3/4/5。
const DAY_MS = 24 * 60 * 60 * 1000;

// 从一副卡里挑一张"该复习的":新卡优先,其次最逾期的。都没到期则返回 null。
function pickDueCard(deck, store, now) {
  let pick = null, pickScore = -Infinity;
  for (const c of deck) {
    const st = store.getState(c.id);
    let score;
    if (!st) {
      score = Number.MAX_SAFE_INTEGER;          // 新卡最高优先
    } else if (st.due <= now) {
      score = now - st.due;                       // 逾期越久越优先
    } else {
      continue;                                   // 还没到期,跳过
    }
    if (score > pickScore) { pickScore = score; pick = c; }
  }
  return pick;
}

// 依据 SM-2 计算下一次状态。state 可为 undefined(新卡)。
function review(state, quality, now) {
  let ef = (state && state.ef) || 2.5;
  let interval = (state && state.interval) || 0;
  let reps = (state && state.reps) || 0;

  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps += 1;
  }

  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  return {
    ef: Math.round(ef * 1000) / 1000,
    interval,
    reps,
    due: now + interval * DAY_MS,
    last: now,
  };
}

module.exports = { pickDueCard, review, DAY_MS };
