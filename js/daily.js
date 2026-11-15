// «حدس کلمه» — guess a hidden word in six tries, as many words as you like, one after another.
// Every guess shows which letters are right (green), in the word but elsewhere (amber) or absent (grey).
// (It began as the daily challenge, so the code keeps the «daily» names.)
// Needs: app.js (el, LS, faNum, state, render, NBSafety, nbNorm), data.js (WORD_LIST) and dailywords.js (DAILY_WORDS).

const DAILY_TRIES = 6;

// the Persian layout, plus the two actions
const DAILY_KEYS = [
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج','چ'],
  ['ش','س','ی','ب','ل','ا','ت','ن','م','ک','گ'],
  ['ظ','ط','ژ','ز','ر','ذ','د','پ','و'],
];

function dailyLetters(w){ return Array.from(nbNorm(w)); }
// the words to guess: the hand-picked list plus every single word of 4 to 6 letters from the main deck
let wordsPool = null;
function dailyPool(){
  if(wordsPool) return wordsPool;
  const seen = new Set(), out = [];
  const add = (w) => { const n = nbNorm(w); if(!/^[آ-ی]+$/.test(n)) return; const L = Array.from(n).length; if(L < 4 || L > 6 || seen.has(n)) return; seen.add(n); out.push(w); };
  DAILY_WORDS.forEach(add);
  if(typeof WORD_LIST !== 'undefined') WORD_LIST.forEach(add);
  return (wordsPool = out);
}
// a shuffled order of the pool for this phone, so a word does not come back until all have been played
function dailyNextWord(){
  const pool = dailyPool();
  let o = LS.get('wordsOrder', null);
  if(!o || !Array.isArray(o.ix) || o.len !== pool.length || o.at >= o.ix.length){
    const ix = pool.map((_, i) => i);
    for(let i = ix.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; }
    o = { len: pool.length, ix, at: 0 };
  }
  const w = pool[o.ix[o.at]]; o.at++;
  LS.set('wordsOrder', o);
  return w;
}
function dailyWord(){ return dailyLoad().word; }

// green / amber / grey for each letter of a guess
function dailyFeedback(guess, answer){
  const g = dailyLetters(guess), a = dailyLetters(answer), res = g.map(() => 'x');
  const left = {};
  a.forEach((ch, i) => { if(g[i] === ch) res[i] = 'g'; else left[ch] = (left[ch] || 0) + 1; });
  g.forEach((ch, i) => { if(res[i] === 'x' && left[ch] > 0){ res[i] = 'y'; left[ch]--; } });
  return res;
}

// ---- what this phone remembers: the word being played and the run of words in a row ----
function dailyLoad(){
  const s = LS.get('words', null);
  if(s && typeof s.word === 'string' && Array.isArray(s.guesses)) return s;
  const fresh = { word: dailyNextWord(), guesses: [], done: false, won: false };
  LS.set('words', fresh);
  return fresh;
}
function dailySave(s){ LS.set('words', s); }
function dailyNewWord(){ LS.set('words', { word: dailyNextWord(), guesses: [], done: false, won: false }); }
function dailyStats(){ return Object.assign({ n: 0, best: 0, won: 0, played: 0 }, LS.get('wordsStats', null) || {}); }
// kept for the home screen: the run of words guessed in a row
function dailyStreak(){ return dailyStats(); }
function dailyBumpStreak(won){
  const st = dailyStats();
  st.played++;
  if(won){ st.won++; st.n++; st.best = Math.max(st.best, st.n); } else st.n = 0;
  LS.set('wordsStats', st);
  if(typeof accountTouch === 'function') accountTouch();
}

let dl = { cur: '', msg: '', shake: false, revealRow: -1 };

function dailyAddLetter(ch){
  const s = dailyLoad();
  if(s.done) return;
  if(dl.cur.length >= dailyLetters(dailyWord()).length) return;
  dl.cur += ch; dl.msg = '';
  dailyRepaint();
}
function dailyBackspace(){
  const s = dailyLoad();
  if(s.done || !dl.cur) return;
  dl.cur = Array.from(dl.cur).slice(0, -1).join(''); dl.msg = '';
  dailyRepaint();
}
function dailySubmitGuess(){
  const s = dailyLoad();
  if(s.done) return;
  const need = dailyLetters(dailyWord()).length;
  const cur = Array.from(nbNorm(dl.cur));
  if(cur.length < need){ dl.msg = `کلمه باید ${faNum(need)} حرفی باشه`; dl.shake = true; dailyRepaint(); return; }
  s.guesses.push(cur.join(''));
  dl.cur = ''; dl.msg = '';
  dl.revealRow = s.guesses.length - 1;
  const win = nbNorm(dailyWord()) === s.guesses[s.guesses.length - 1];
  if(win || s.guesses.length >= DAILY_TRIES){
    s.done = true; s.won = win;
    dailyBumpStreak(win);
    if(win) sfxWin(); else sfxWrong();
  } else {
    sfxTap();
  }
  dailySave(s);
  dailyRepaint();
  if(s.done){ setTimeout(() => { if(state.screen === 'daily') render(); }, 1300); }
}

// ---- the board ----
function dailyBuildBoard(){
  const s = dailyLoad(), answer = s.word, n = dailyLetters(answer).length;
  const board = el(`<div class="dl-board${dl.shake ? ' is-shake' : ''}" style="--n:${n}" dir="rtl"></div>`);
  dl.shake = false;
  for(let r = 0; r < DAILY_TRIES; r++){
    const row = el(`<div class="dl-row"></div>`);
    const guess = s.guesses[r];
    const fb = guess ? dailyFeedback(guess, answer) : null;
    const letters = guess ? Array.from(guess) : (r === s.guesses.length && !s.done ? Array.from(nbNorm(dl.cur)) : []);
    for(let i = 0; i < n; i++){
      const t = el(`<span class="dl-tile"></span>`);
      if(letters[i]) { t.textContent = letters[i]; t.classList.add('has'); }
      if(fb){
        t.classList.add('is-' + fb[i]);
        if(r === dl.revealRow) { t.classList.add('is-flip'); t.style.animationDelay = (i * 0.16) + 's'; }
      }
      row.appendChild(t);
    }
    board.appendChild(row);
  }
  dl.revealRow = -1;          // the flip plays once, not again on every key press
  return board;
}
function dailyBuildKeyboard(){
  const s = dailyLoad(), answer = s.word;
  const best = {};                                  // best colour seen for each letter
  const rank = { x: 1, y: 2, g: 3 };
  s.guesses.forEach(gs => {
    const fb = dailyFeedback(gs, answer);
    Array.from(gs).forEach((ch, i) => { if(!best[ch] || rank[fb[i]] > rank[best[ch]]) best[ch] = fb[i]; });
  });
  const kb = el(`<div class="dl-kb" dir="rtl"></div>`);
  DAILY_KEYS.forEach((row, ri) => {
    const r = el(`<div class="dl-kb__row"></div>`);
    row.forEach(ch => {
      const k = el(`<button type="button" class="dl-key${best[ch] ? ' is-' + best[ch] : ''}"></button>`);
      k.textContent = ch; k.disabled = s.done;
      k.addEventListener('pointerdown', (e) => { e.preventDefault(); dailyAddLetter(ch); });
      r.appendChild(k);
    });
    if(ri === 2){
      const back = el(`<button type="button" class="dl-key dl-key--wide" aria-label="پاک کردن">⌫</button>`);
      back.disabled = s.done;
      back.addEventListener('pointerdown', (e) => { e.preventDefault(); dailyBackspace(); });
      r.appendChild(back);
    }
    kb.appendChild(r);
  });
  const enter = el(`<button type="button" class="dl-key dl-key--enter">ثبت حدس</button>`);
  enter.disabled = s.done;
  enter.addEventListener('pointerdown', (e) => { e.preventDefault(); dailySubmitGuess(); });
  kb.appendChild(enter);
  return kb;
}
// redraw only the board, keyboard and message (a full render would restart every animation)
function dailyRepaint(){
  const root = document.querySelector('.dl');
  if(!root) return;
  const b = root.querySelector('.dl-board'), k = root.querySelector('.dl-kb'), m = root.querySelector('.dl-msg');
  if(b) b.replaceWith(dailyBuildBoard());
  if(k) k.replaceWith(dailyBuildKeyboard());
  if(m) m.textContent = dl.msg;
}

// the phone's own keyboard works too
document.addEventListener('keydown', (e) => {
  if(typeof state === 'undefined' || state.screen !== 'daily' || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if(e.key === 'Enter'){ e.preventDefault(); dailySubmitGuess(); return; }
  if(e.key === 'Backspace'){ e.preventDefault(); dailyBackspace(); return; }
  const ch = nbNorm(e.key);
  if(ch.length === 1 && /[ء-ی]/.test(ch)){ e.preventDefault(); dailyAddLetter(ch); }
});

// ---- sharing ----
function dailyShareText(s){
  const emo = { g: '🟩', y: '🟨', x: '⬛' };
  const grid = s.guesses.map(gs => dailyFeedback(gs, s.word).map(c => emo[c]).join('')).join('\n');
  const st = dailyStats();
  const head = `نخ بده — حدس کلمه\n${s.won ? `${faNum(s.guesses.length)}/${faNum(DAILY_TRIES)}` : `✕/${faNum(DAILY_TRIES)}`}${st.n > 1 ? ` 🔥${faNum(st.n)}` : ''}`;
  return `${head}\n\n${grid}\n\n${gameLink()}`;
}

function renderDaily(){
  const s = dailyLoad();
  if(dl.k !== s.word){ dl.k = s.word; dl.cur = ''; dl.msg = ''; dl.revealRow = -1; }
  const st = dailyStats();
  const wrap = el(`<div class="setup-page dl"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">حدس کلمه</div></div>`));
  const info = el(`<div class="dl-info"><span class="dl-info__d"></span><span class="dl-info__s"></span></div>`);
  info.querySelector('.dl-info__d').textContent = `${faNum(st.won)} کلمه حدس زدی`;
  info.querySelector('.dl-info__s').textContent = `🔥 ${faNum(st.n)} پشت‌هم`;
  wrap.appendChild(info);
  wrap.appendChild(el(`<p class="dl-help">این کلمه ${faNum(dailyLetters(s.word).length)} حرفیه. در ${faNum(DAILY_TRIES)} حدس پیداش کن؛ سبز یعنی حرف درست و سر جاشه، زرد یعنی تو کلمه هست ولی جاش اینجا نیست.</p>`));
  wrap.appendChild(dailyBuildBoard());
  wrap.appendChild(el(`<div class="dl-msg" role="status" aria-live="polite"></div>`));
  wrap.querySelector('.dl-msg').textContent = dl.msg;

  if(!s.done){
    wrap.appendChild(dailyBuildKeyboard());
    return wrap;
  }

  // finished: the result, the next word, share
  const res = el(`<div class="team-card dl-res"></div>`);
  if(s.won){
    res.appendChild(el(`<h2 class="set-card__title">آفرین! ${faNum(s.guesses.length)} حدس</h2>`));
    res.appendChild(el(`<p class="room-form__lead">${st.n > 1 ? `🔥 ${faNum(st.n)} کلمه پشت‌هم! ` : ''}رکوردت ${faNum(st.best)} کلمه‌ست.</p>`));
  } else {
    res.appendChild(el(`<h2 class="set-card__title">این بار نشد</h2>`));
    const p = el(`<p class="room-form__lead"></p>`);
    p.textContent = `کلمه «${s.word}» بود. با کلمه‌ی بعدی دوباره شروع کن!`;
    res.appendChild(p);
  }
  const next = el(`<button type="button" class="setup-start"><span>کلمه‌ی بعدی</span></button>`);
  next.addEventListener('click', () => { dailyNewWord(); render(); });
  res.appendChild(next);
  const share = el(`<button type="button" class="setup-addteam"><span>اشتراک نتیجه</span></button>`);
  share.addEventListener('click', () => {
    const text = dailyShareText(dailyLoad());
    if(navigator.share){ navigator.share({ text }).catch(() => {}); }
    else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => { share.firstChild.textContent = 'کپی شد ✓'; setTimeout(() => { share.firstChild.textContent = 'اشتراک نتیجه'; }, 1500); }).catch(() => {});
    }
  });
  res.appendChild(share);
  wrap.appendChild(res);
  return wrap;
}

function openDaily(){
  dl.cur = ''; dl.msg = ''; dl.revealRow = -1;
  state.screen = 'daily';
  render();
}
