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

// ---------------- the screen ----------------
// Nakhi peeks over a cream board of raised tiles; under it a wool tray holds a keyboard of sewn-on patches laid
// out like the phone's Persian keyboard, with the scissors («پاک») after «چ» and a wide «ثبت» under them. «یه حرف» (Nakhi gives away
// a letter for coins) sits under the board.
const WORDS_HINT_PRICE = 20;
const WORDS_WIN_COINS = [0, 15, 12, 10, 8, 6, 5];          // by the number of tries
// the Persian keyboard's letters, in its order
const WORDS_KEYS = ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج','ش','س','ی','ب','ل','ا','ت','ن','م','ک','گ','ظ','ط','ژ','ز','ر','ذ','د','پ','و','چ'];

let dl = { row: null, at: 0, say: '', shake: false, pop: -1, revealing: false, celebrate: false, help: false, k: null };

function wgIcon(name){
  const I = {
    back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6 L8 12 L14 18"/></svg>',
    coin: '<svg viewBox="0 0 30 30" width="28" height="28" aria-hidden="true"><circle cx="15" cy="15" r="12.5" fill="#F7A81B" stroke="#4a1a06" stroke-width="2.5"/><circle cx="15" cy="15" r="8.5" fill="#FFD447" stroke="#C4650C" stroke-width="1.5"/><path d="M15 9.6l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#F08A12"/></svg>',
    flame: '<svg viewBox="0 0 24 26" width="16" height="18" aria-hidden="true"><path d="M12 1.5c1.2 4.3 6.5 6.6 6.5 13.2a6.5 6.5 0 0 1-13 0c0-3.3 1.7-5.3 3.2-6.7.3 2.3 1.4 3.6 2.9 4-.8-4.1-.2-7.6.4-10.5z" fill="#FFE27A" stroke="#4a1a06" stroke-width="2" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cut: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.7L20 18M8.6 16.3L20 6"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>'
  };
  return I[name] || '';
}
// the banner on top: «کلمه‌ی ۲۴»
function wgRibbon(num){
  return `<svg class="wg-rib" viewBox="0 0 176 50" width="176" height="50" role="img" aria-label="کلمه‌ی ${faNum(num)}"><defs><linearGradient id="wgRibG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB040"/><stop offset="1" stop-color="#E5600F"/></linearGradient></defs><path d="M4 16h30v28H4l9-14z" fill="#B8500A" stroke="#4a1a06" stroke-width="3" stroke-linejoin="round"/><path d="M172 16h-30v28h30l-9-14z" fill="#B8500A" stroke="#4a1a06" stroke-width="3" stroke-linejoin="round"/><path d="M24 38l10 6V38zM152 38l-10 6V38z" fill="#4a1a06"/><rect x="22" y="4" width="132" height="35" rx="7" fill="url(#wgRibG)" stroke="#4a1a06" stroke-width="3"/><rect x="28" y="8" width="120" height="7" rx="3.5" fill="#fff" opacity=".3"/><text x="88" y="31" text-anchor="middle" font-family="Lalezar, Vazirmatn, sans-serif" font-size="21" fill="#fff" stroke="#4a1a06" stroke-width="4" paint-order="stroke" stroke-linejoin="round">کلمه‌ی ${faNum(num)}</text></svg>`;
}

// what Nakhi says over the board
function wgSay(){
  if(dl.say) return dl.say;
  const s = dailyLoad(), n = dailyLetters(s.word).length;
  if(s.done) return s.won ? 'ایول! پیداش کردی!' : `اِی وای! کلمه «${s.word}» بود.`;
  if(!s.guesses.length) return `یه کلمه‌ی ${faNum(n)} حرفی! حدس بزن…`;
  const fb = dailyFeedback(s.guesses[s.guesses.length - 1], s.word);
  const g = fb.filter(c => c === 'g').length, y = fb.filter(c => c === 'y').length;
  if(DAILY_TRIES - s.guesses.length === 1) return 'آخرین شانس! دقت کن…';
  if(g === n - 1) return 'وای! فقط یکی مونده…';
  if(g + y >= 3) return 'داری نزدیک می‌شی!';
  if(g + y === 0) return 'هیچ‌کدوم نبود! حرف‌های دیگه رو بزن.';
  return 'خوبه، ادامه بده!';
}
// the best colour seen for each letter (a letter Nakhi gave away counts as green)
function wgKeyColours(){
  const s = dailyLoad(), best = {}, rank = { x: 1, y: 2, g: 3 };
  const seen = dl.revealing ? s.guesses.slice(0, -1) : s.guesses;
  seen.forEach(gs => {
    const fb = dailyFeedback(gs, s.word);
    Array.from(gs).forEach((ch, i) => { if(!best[ch] || rank[fb[i]] > rank[best[ch]]) best[ch] = fb[i]; });
  });
  const L = dailyLetters(s.word);
  (s.hints || []).forEach(i => { best[L[i]] = 'g'; });
  return best;
}

// ---- typing: the current row is a set of boxes; a tap on any box moves the caret there ----
function wgRow(){
  const n = dailyLetters(dailyLoad().word).length;
  if(!dl.row || dl.row.length !== n){ dl.row = new Array(n).fill(''); dl.at = 0; }
  return dl.row;
}
function wgResetRow(){ dl.row = null; dl.at = 0; dl.pop = -1; }
// the next empty box after i, else the first empty one, else past the end
function wgNextEmpty(row, i){
  for(let j = i + 1; j < row.length; j++) if(!row[j]) return j;
  const k = row.indexOf('');
  return k < 0 ? row.length : k;
}
function dailyAddLetter(ch){
  const s = dailyLoad();
  if(s.done || dl.revealing) return;
  const row = wgRow();
  if(dl.at >= row.length){ const k = row.indexOf(''); if(k < 0) return; dl.at = k; }
  row[dl.at] = ch; dl.pop = dl.at; dl.say = '';
  dl.at = wgNextEmpty(row, dl.at);
  sfxTap();
  wgPaint();
}
function dailyBackspace(){
  const s = dailyLoad();
  if(s.done || dl.revealing) return;
  const row = wgRow();
  if(dl.at < row.length && row[dl.at]){ row[dl.at] = ''; }
  else {
    let j = Math.min(dl.at, row.length) - 1;
    while(j >= 0 && !row[j]) j--;
    if(j < 0) return;
    row[j] = ''; dl.at = j;
  }
  dl.say = ''; dl.pop = -1;
  wgPaint();
}
function wgMoveCaret(i){
  const s = dailyLoad();
  if(s.done || dl.revealing) return;
  const row = wgRow();
  // a second tap on a box Nakhi gave away writes its letter
  if(i === dl.at && !row[i] && (s.hints || []).includes(i)){ dailyAddLetter(dailyLetters(s.word)[i]); return; }
  dl.at = Math.max(0, Math.min(row.length - 1, i));
  wgPaint();
}
function dailySubmitGuess(){
  const s = dailyLoad();
  if(s.done || dl.revealing) return;
  const typed = wgRow(), n = typed.length;
  if(typed.some(c => !c)){
    dl.say = typed.every(c => !c) ? `یه کلمه‌ی ${faNum(n)} حرفی بنویس!` : 'جای خالی رو پر کن!';
    dl.shake = true; sfxWrong(); wgPaint(); return;
  }
  s.guesses.push(typed.join(''));
  wgResetRow(); dl.say = '';
  const win = nbNorm(s.word) === s.guesses[s.guesses.length - 1];
  if(win || s.guesses.length >= DAILY_TRIES){
    s.done = true; s.won = win;
    dailyBumpStreak(win);
    if(win){
      const c = WORDS_WIN_COINS[s.guesses.length] || 5;
      try{ const p = loadProfile(); p.coins += c; saveProfile(p); }catch(e){}
      s.coins = c;
    }
  }
  dailySave(s);
  // turn the tiles of the new row one by one, then colour the keyboard
  dl.revealing = true;
  const row = s.guesses.length - 1;
  wgPaint(row);
  const fb = dailyFeedback(s.guesses[row], s.word);
  const tiles = document.querySelectorAll(`.wg-row[data-r="${row}"] .wg-t`);
  const step = wgReduced() ? 0 : 230;
  tiles.forEach((t, i) => {
    setTimeout(() => { t.classList.add('is-flip'); }, i * step);
    setTimeout(() => { t.classList.remove('has'); t.classList.add('is-' + fb[i]); }, i * step + (step ? 230 : 0));
  });
  setTimeout(() => {
    dl.revealing = false;
    if(state.screen !== 'daily') return;
    const now = dailyLoad();
    if(now.done){ dl.celebrate = true; if(now.won) sfxWin(); else sfxWrong(); render(); }
    else { wgPaint(); wgPaintKb(); }
  }, tiles.length * step + (step ? 520 : 0));
}
function wgReduced(){ return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

// «یه حرف»: Nakhi gives away one letter that is not known yet, for coins
function dailyHint(){
  const s = dailyLoad();
  if(s.done || dl.revealing) return;
  const L = dailyLetters(s.word);
  const known = new Set(s.hints || []);
  s.guesses.forEach(gs => dailyFeedback(gs, s.word).forEach((c, i) => { if(c === 'g') known.add(i); }));
  const open = L.map((_, i) => i).filter(i => !known.has(i));
  if(!open.length){ dl.say = 'همه‌ی حرف‌ها رو داری! فقط بنویسش.'; wgPaint(); return; }
  const p = loadProfile();
  if(p.coins < WORDS_HINT_PRICE){ dl.say = `${faNum(WORDS_HINT_PRICE)} سکه لازمه؛ با بردن سکه جمع کن!`; sfxWrong(); wgPaint(); return; }
  p.coins -= WORDS_HINT_PRICE; saveProfile(p);
  const i = open[Math.floor(Math.random() * open.length)];
  s.hints = (s.hints || []).concat(i);
  dailySave(s);
  const ord = ['اول','دوم','سوم','چهارم','پنجم','ششم'][i] || faNum(i + 1);
  dl.say = `حرف ${ord} «${L[i]}» هست!`;
  sfxWin();
  wgPaint(); wgPaintKb();
}

// ---- the board ----
function wgBoard(revealRow){
  const s = dailyLoad(), L = dailyLetters(s.word), n = L.length;
  const hints = new Set(s.hints || []);
  const board = el(`<div class="wg-board${dl.shake ? ' is-shake' : ''}" dir="rtl"></div>`);
  dl.shake = false;
  for(let r = 0; r < DAILY_TRIES; r++){
    const row = el(`<div class="wg-row" data-r="${r}"></div>`);
    const guess = s.guesses[r];
    const fb = guess ? dailyFeedback(guess, s.word) : null;
    const cur = r === s.guesses.length && !s.done;
    const letters = guess ? Array.from(guess) : (cur ? wgRow() : []);
    for(let i = 0; i < n; i++){
      const t = el(`<span class="wg-t"><b></b></span>`);
      if(fb){
        t.querySelector('b').textContent = letters[i];
        t.classList.add(r === revealRow ? 'has' : 'is-' + fb[i]);
      } else if(letters[i]){
        t.querySelector('b').textContent = letters[i];
        t.classList.add('has');
        if(cur && i === dl.pop) t.classList.add('is-pop');
      } else if(cur && hints.has(i)){
        t.querySelector('b').textContent = L[i];
        t.classList.add('is-ghost');
      }
      if(cur){
        if(i === dl.at) t.classList.add('is-caret');
        t.classList.add('is-tap');
        t.setAttribute('role', 'button');
        t.setAttribute('aria-label', `خونه‌ی ${faNum(i + 1)}${letters[i] ? '، ' + letters[i] : ''}`);
        t.addEventListener('pointerdown', (e) => { e.preventDefault(); wgMoveCaret(i); });
      }
      row.appendChild(t);
    }
    if(s.done && s.won && dl.celebrate && r === s.guesses.length - 1) row.classList.add('is-win');
    board.appendChild(row);
  }
  dl.pop = -1;
  return board;
}
function wgTries(){
  const s = dailyLoad(), st = dailyStats();
  const left = DAILY_TRIES - s.guesses.length;
  const box = el(`<div class="wg-tries"><span class="wg-streak" aria-label="${faNum(st.n)} کلمه پشت‌هم">${wgIcon('flame')}<span></span></span><span class="wg-balls" role="img" aria-label="${faNum(left)} حدس مونده"></span></div>`);
  box.querySelector('.wg-streak span').textContent = faNum(st.n);
  for(let i = 0; i < DAILY_TRIES; i++) box.querySelector('.wg-balls').appendChild(el(`<i class="${i < left ? '' : 'is-used'}"></i>`));
  if(s.done){
    box.appendChild(el(`<span class="wg-left">رکورد ${faNum(st.best)}</span>`));
  } else {
    // «یه حرف» lives here, away from the letters, so coins are not spent by a stray tap
    const hint = el(`<button type="button" class="wg-hint" aria-label="یه حرف رو لو بده، ${faNum(WORDS_HINT_PRICE)} سکه"><span class="wg-nkh"></span><b>یه حرف</b><span class="wg-hint__p">${wgIcon('coin')}${faNum(WORDS_HINT_PRICE)}</span></button>`);
    hint.addEventListener('click', dailyHint);
    box.appendChild(hint);
  }
  const q = el(`<button type="button" class="wg-q" aria-label="راهنمای بازی">؟</button>`);
  q.addEventListener('click', () => { dl.help = true; render(); });
  box.appendChild(q);
  return box;
}
// redraw the board, Nakhi's words and the tries (a full render would restart every animation)
function wgPaint(revealRow){
  const root = document.querySelector('.wg');
  if(!root) return;
  const b = root.querySelector('.wg-board'); if(b) b.replaceWith(wgBoard(revealRow));
  const say = root.querySelector('.wg-bub'); if(say) say.textContent = wgSay();
  const tr = root.querySelector('.wg-tries'); if(tr) tr.replaceWith(wgTries());
  const coin = root.querySelector('.wg-coin b'); if(coin) coin.textContent = faNum(loadProfile().coins);
}
function wgPaintKb(){
  const k = document.querySelector('.wg-kb'); if(k) k.replaceWith(wgKeyboard());
}

// ---- the keyboard: four rows of sewn-on patches ----
let wgPopT = null;
function wgPopup(btn, ch){
  let pop = document.querySelector('.wg-pop');
  if(!pop){ pop = el(`<div class="wg-pop" aria-hidden="true"></div>`); document.body.appendChild(pop); }
  const r = btn.getBoundingClientRect();
  pop.textContent = ch;
  pop.style.left = (r.left + r.width / 2) + 'px';
  pop.style.top = (r.top - 6) + 'px';
  pop.classList.add('is-on');
  clearTimeout(wgPopT);
  wgPopT = setTimeout(() => pop.classList.remove('is-on'), 320);
}
function wgKeyboard(){
  const s = dailyLoad();
  const tray = el(`<div class="wg-kb"><div class="wg-kb__in"></div></div>`);
  const inner = tray.querySelector('.wg-kb__in');
  if(s.done){ inner.appendChild(wgResult()); return tray; }
  const best = wgKeyColours();
  const press = (b, fn) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  const letter = (ch) => {
    const b = el(`<button type="button" class="wg-k${best[ch] ? ' is-' + best[ch] : ''}"><b></b></button>`);
    b.querySelector('b').textContent = ch;
    b.setAttribute('aria-label', ch);
    press(b, () => { wgPopup(b, ch); dailyAddLetter(ch); });
    return b;
  };
  // the phone's own Persian keyboard: eleven equal keys a row, «چ» at the end of the third row and «پاک»
  // after it, so every letter is where the thumb expects it; «ثبت» is the wide key under them
  [[0, 11], [11, 22], [22, 32]].forEach(([from, to], r) => {
    const row = el(`<div class="wg-kr"></div>`);
    WORDS_KEYS.slice(from, to).forEach(ch => row.appendChild(letter(ch)));
    if(r === 2){
      const cut = el(`<button type="button" class="wg-k wg-k--cut" aria-label="پاک کردن">${wgIcon('cut')}<small>پاک</small></button>`);
      press(cut, dailyBackspace);
      row.appendChild(cut);
    }
    inner.appendChild(row);
  });
  const last = el(`<div class="wg-kr"></div>`);
  const ent = el(`<button type="button" class="wg-k wg-k--ent">${wgIcon('check')}<b>ثبت</b></button>`);
  press(ent, dailySubmitGuess);
  last.appendChild(ent);
  inner.appendChild(last);
  return tray;
}

// the phone's own keyboard works too
document.addEventListener('keydown', (e) => {
  if(typeof state === 'undefined' || state.screen !== 'daily' || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if(e.key === 'Enter'){ e.preventDefault(); dailySubmitGuess(); return; }
  if(e.key === 'Backspace'){ e.preventDefault(); dailyBackspace(); return; }
  if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ e.preventDefault(); wgMoveCaret(Math.min(dl.at, wgRow().length - 1) + (e.key === 'ArrowLeft' ? 1 : -1)); return; }
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

// ---- the end of a word: the result sits where the keyboard was ----
function wgResult(){
  const s = dailyLoad(), st = dailyStats();
  const box = el(`<div class="wg-res"><div class="wg-res__t"></div><div class="wg-res__sub"></div><div class="wg-res__btns"></div></div>`);
  box.querySelector('.wg-res__t').textContent = s.won ? `آفرین! با ${faNum(s.guesses.length)} حدس` : 'این بار نشد!';
  const sub = box.querySelector('.wg-res__sub');
  if(s.won){
    sub.innerHTML = `<span class="wg-res__coin">${wgIcon('coin')}<b></b></span><span class="wg-res__st">${wgIcon('flame')}<span></span></span>`;
    sub.querySelector('.wg-res__coin b').textContent = `+${faNum(s.coins || 0)} سکه`;
    sub.querySelector('.wg-res__st span').textContent = `${faNum(st.n)} پشت‌هم · رکورد ${faNum(st.best)}`;
  } else {
    const word = el(`<span class="wg-res__word"></span>`);
    dailyLetters(s.word).forEach(ch => { const t = el(`<i></i>`); t.textContent = ch; word.appendChild(t); });
    sub.appendChild(word);
  }
  const next = el(`<button type="button" class="wg-btn wg-btn--next"><b>کلمه‌ی بعدی</b></button>`);
  next.addEventListener('click', () => { dailyNewWord(); wgResetRow(); dl.say = ''; render(); });
  const share = el(`<button type="button" class="wg-btn wg-btn--share" aria-label="اشتراک نتیجه">${wgIcon('share')}</button>`);
  share.addEventListener('click', () => {
    const text = dailyShareText(dailyLoad());
    if(navigator.share){ navigator.share({ text }).catch(() => {}); }
    else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => { dl.say = 'نتیجه کپی شد؛ برای دوستات بفرست!'; wgPaint(); }).catch(() => {});
    }
  });
  box.querySelector('.wg-res__btns').append(next, share);
  return box;
}

// falling bits of yarn when a word is found
function wgConfetti(root){
  if(wgReduced()) return;
  const cols = ['#F7A81B', '#FFE27A', '#2DAA43', '#58CDEB', '#FF8A3D', '#FFF6DC'];
  const box = el(`<div class="wg-conf" aria-hidden="true"></div>`);
  for(let i = 0; i < 34; i++){
    const b = el(`<i></i>`);
    b.style.left = (Math.random() * 100) + '%';
    b.style.background = cols[i % cols.length];
    b.style.animationDelay = (Math.random() * .5) + 's';
    b.style.animationDuration = (1.6 + Math.random() * 1.1) + 's';
    b.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    b.style.setProperty('--x', (Math.random() * 80 - 40) + 'px');
    box.appendChild(b);
  }
  root.appendChild(box);
  setTimeout(() => box.remove(), 3200);
}

function wgHelp(){
  const back = el(`<div class="wg-help" role="dialog" aria-modal="true" aria-label="راهنمای حدس کلمه"><div class="wg-help__card">
    <h2>چطور بازی کنیم؟</h2>
    <p>کلمه‌ی پنهان رو در ${faNum(DAILY_TRIES)} حدس پیدا کن. هر حدس باید هم‌اندازه‌ی کلمه باشه.</p>
    <div class="wg-help__ex"><span class="wg-t is-g"><b>گ</b></span><span>حرف درسته و سر جاشه.</span></div>
    <div class="wg-help__ex"><span class="wg-t is-y"><b>س</b></span><span>تو کلمه هست، ولی جای دیگه.</span></div>
    <div class="wg-help__ex"><span class="wg-t is-x"><b>م</b></span><span>تو کلمه نیست.</span></div>
    <p>روی هر خونه‌ی ردیفت بزنی، اون خونه انتخاب می‌شه؛ مثلاً می‌تونی اول حرف آخر رو بنویسی و بعد بقیه رو پر کنی.</p>
    <p>گیر کردی؟ با دکمه‌ی «یه حرف»، نخی در ازای ${faNum(WORDS_HINT_PRICE)} سکه یکی از حرف‌ها رو لو می‌ده. هر کلمه‌ای که پیدا کنی سکه داره؛ هر چی زودتر، بیشتر.</p>
    <button type="button" class="wg-btn wg-btn--next"><b>فهمیدم</b></button>
  </div></div>`);
  const close = () => { dl.help = false; render(); };
  back.querySelector('button').addEventListener('click', close);
  back.addEventListener('click', (e) => { if(e.target === back) close(); });
  return back;
}

function renderDaily(){
  const s = dailyLoad(), st = dailyStats();
  if(dl.k !== s.word){ dl.k = s.word; wgResetRow(); dl.say = ''; }
  const n = dailyLetters(s.word).length;
  const num = st.played + (s.done ? 0 : 1);
  const celebrate = dl.celebrate;
  const wrap = el(`<div class="wg" style="--n:${n}"><div class="wg-bg" aria-hidden="true"></div></div>`);
  // top: coins, the banner, back
  const hud = el(`<div class="wg-hud"><span class="wg-coin">${wgIcon('coin')}<b></b></span>${wgRibbon(Math.max(1, num))}<button type="button" class="wg-back" aria-label="بازگشت">${wgIcon('back')}</button></div>`);
  hud.querySelector('.wg-coin b').textContent = faNum(loadProfile().coins);
  hud.querySelector('.wg-back').addEventListener('click', goBack);
  wrap.appendChild(hud);
  // middle: Nakhi peeking over the board
  const stage = el(`<div class="wg-stage"><div class="wg-plate-w">
    <img class="wg-nk${celebrate && s.won ? ' is-hop' : ''}" src="assets/${s.done && s.won ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true" decoding="async">
    <i class="wg-hand"></i><i class="wg-hand wg-hand--r"></i>
    <div class="wg-bub" role="status" aria-live="polite"></div>
    <div class="wg-plate"></div>
  </div></div>`);
  stage.querySelector('.wg-bub').textContent = wgSay();
  stage.querySelector('.wg-plate').appendChild(wgBoard());
  stage.appendChild(wgTries());
  wrap.appendChild(stage);
  wrap.appendChild(wgKeyboard());
  if(dl.help) wrap.appendChild(wgHelp());
  if(celebrate){
    dl.celebrate = false;
    if(s.won) setTimeout(() => { const w = document.querySelector('.wg'); if(w) wgConfetti(w); }, 60);
  }
  return wrap;
}

function openDaily(){
  dl.say = ''; dl.help = false;
  state.screen = 'daily';
  render();
}
