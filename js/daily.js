// «کلمه‌ی امروز» — the daily challenge. One word a day, the same for everybody: guess it in six tries,
// every guess shows which letters are right (green), in the word but elsewhere (amber) or absent (grey).
// Needs: app.js (el, LS, faNum, state, render, srvNow, NBSafety, nbNorm) and dailywords.js (DAILY_WORDS).

const DAILY_TRIES = 6;
const DAILY_TEHRAN_OFFSET = 3.5 * 3600 * 1000;       // the day turns over at midnight in Tehran

// the Persian layout, plus the two actions
const DAILY_KEYS = [
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج','چ'],
  ['ش','س','ی','ب','ل','ا','ت','ن','م','ک','گ'],
  ['ظ','ط','ژ','ز','ر','ذ','د','پ','و'],
];

function dailyDayNum(){ return Math.floor((srvNow() + DAILY_TEHRAN_OFFSET) / 86400000); }
function dailyKeyOf(num){
  const d = new Date(num * 86400000);
  return String(d.getUTCFullYear()) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
}
function dailyKey(){ return dailyKeyOf(dailyDayNum()); }
function dailyWord(){ return DAILY_WORDS[dailyDayNum() % DAILY_WORDS.length]; }
function dailyLetters(w){ return Array.from(nbNorm(w)); }
function dailyDateText(){
  try{ return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'long', timeZone: 'Asia/Tehran' }).format(new Date(srvNow())); }
  catch(e){ return dailyKey(); }
}

// green / amber / grey for each letter of a guess
function dailyFeedback(guess, answer){
  const g = dailyLetters(guess), a = dailyLetters(answer), res = g.map(() => 'x');
  const left = {};
  a.forEach((ch, i) => { if(g[i] === ch) res[i] = 'g'; else left[ch] = (left[ch] || 0) + 1; });
  g.forEach((ch, i) => { if(res[i] === 'x' && left[ch] > 0){ res[i] = 'y'; left[ch]--; } });
  return res;
}
function dailyScore(tries){ return Math.max(0, 100 - 15 * (tries - 1)); }

// ---- what this phone remembers: today's game and the streak ----
function dailyLoad(){
  const k = dailyKey();
  const s = LS.get('daily', null);
  if(s && s.k === k && Array.isArray(s.guesses)) return s;
  return { k, guesses: [], done: false, won: false, t0: 0, tsec: 0, sent: false };
}
function dailySave(s){ LS.set('daily', s); }
function dailyStreak(){
  const st = LS.get('dailyStreak', { last: '', n: 0, best: 0 });
  const today = dailyDayNum();
  // the streak is alive if the last win was today or yesterday
  const alive = st.last === dailyKeyOf(today) || st.last === dailyKeyOf(today - 1);
  return { n: alive ? st.n : 0, best: st.best || 0, last: st.last };
}
function dailyBumpStreak(won){
  const st = LS.get('dailyStreak', { last: '', n: 0, best: 0 });
  const today = dailyDayNum();
  if(won){
    const n = (st.last === dailyKeyOf(today - 1)) ? st.n + 1 : (st.last === dailyKeyOf(today) ? st.n : 1);
    LS.set('dailyStreak', { last: dailyKeyOf(today), n, best: Math.max(st.best || 0, n) });
  } else {
    LS.set('dailyStreak', { last: st.last, n: 0, best: st.best || 0 });
  }
}

let dl = { cur: '', msg: '', board: null, rows: null, shake: false, revealRow: -1, lb: null, lbBusy: false, lbErr: '' };

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
  if(!s.t0) s.t0 = Date.now();
  s.guesses.push(cur.join(''));
  dl.cur = ''; dl.msg = '';
  dl.revealRow = s.guesses.length - 1;
  const win = nbNorm(dailyWord()) === s.guesses[s.guesses.length - 1];
  if(win || s.guesses.length >= DAILY_TRIES){
    s.done = true; s.won = win;
    s.tsec = Math.max(0, Math.min(3600, Math.round((Date.now() - s.t0) / 1000)));
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
  const s = dailyLoad(), answer = dailyWord(), n = dailyLetters(answer).length;
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
  const s = dailyLoad(), answer = dailyWord();
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
  const grid = s.guesses.map(gs => dailyFeedback(gs, dailyWord()).map(c => emo[c]).join('')).join('\n');
  const st = dailyStreak();
  const head = `نخ بده — کلمه‌ی امروز ${dailyDateText()}\n${s.won ? `${faNum(s.guesses.length)}/${faNum(DAILY_TRIES)}` : `✕/${faNum(DAILY_TRIES)}`}${st.n > 1 ? ` 🔥${faNum(st.n)}` : ''}`;
  return `${head}\n\n${grid}\n\n${location.origin}${location.pathname}`;
}

// ---- leaderboard (everybody who finished today's word) ----
function dailyMyName(){ return String(LS.get('name', '') || '').trim().slice(0, 20); }
function dailySend(s){
  if(s.sent || !s.won || !window.FB || !window.FB.uid) return Promise.resolve(false);
  const name = dailyMyName();
  if(!name || NBSafety.bad(name)) return Promise.resolve(false);
  return window.FB.set(window.FB.ref(window.FB.db, `daily/${s.k}/${window.FB.uid}`), { n: name, s: dailyScore(s.guesses.length), a: s.guesses.length, t: s.tsec })
    .then(() => { const cur = dailyLoad(); cur.sent = true; dailySave(cur); return true; })
    .catch(() => false);
}
function dailyLoadBoard(){
  if(!window.FB || !window.FB.uid || !window.FB.query){ dl.lb = []; dl.lbErr = 'offline'; if(state.screen === 'daily') render(); return; }
  dl.lbBusy = true;
  const q = window.FB.query(window.FB.ref(window.FB.db, 'daily/' + dailyKey()), window.FB.orderByChild('s'), window.FB.limitToLast(40));
  window.FB.get(q).then(snap => {
    const rows = [];
    snap.forEach(c => { const v = c.val(); if(v && typeof v.n === 'string' && typeof v.s === 'number') rows.push({ uid: c.key, n: v.n, s: v.s, a: v.a | 0, t: v.t | 0 }); });
    rows.sort((x, y) => y.s - x.s || x.t - y.t);
    dl.lb = rows; dl.lbErr = '';
  }).catch(() => { dl.lb = []; dl.lbErr = 'offline'; }).finally(() => { dl.lbBusy = false; if(state.screen === 'daily') render(); });
}
function dailyBuildLeaderboard(s){
  const box = el(`<div class="team-card dl-lb"><h2 class="set-card__title">جدول امروز</h2></div>`);
  if(dl.lb === null){
    box.appendChild(el(`<p class="room-form__lead">در حال بارگذاری…</p>`));
    return box;
  }
  if(dl.lbErr){
    box.appendChild(el(`<p class="room-form__lead">اتصال به اینترنت نیست؛ جدول بعداً نشون داده می‌شه.</p>`));
  } else if(!dl.lb.length){
    box.appendChild(el(`<p class="room-form__lead">هنوز کسی امتیاز نفرستاده. اولین نفر تو باش!</p>`));
  }
  dl.lb.slice(0, 30).forEach((r, i) => {
    const mine = window.FB && r.uid === window.FB.uid;
    const row = el(`<div class="dl-lb__row${mine ? ' is-me' : ''}"><span class="dl-lb__rk"></span><span class="dl-lb__n"></span><span class="dl-lb__s"></span></div>`);
    row.querySelector('.dl-lb__rk').textContent = faNum(i + 1);
    row.querySelector('.dl-lb__n').textContent = NBSafety.clean(r.n) + (mine ? ' (تو)' : '');
    row.querySelector('.dl-lb__s').textContent = `${faNum(r.s)} · ${faNum(r.a)} حدس`;
    box.appendChild(row);
  });
  const refresh = el(`<button type="button" class="lobby-call__rm">تازه‌سازی جدول</button>`);
  refresh.addEventListener('click', () => { dl.lb = null; render(); dailyLoadBoard(); });
  box.appendChild(refresh);
  return box;
}

function dailyCountdown(){
  const next = (dailyDayNum() + 1) * 86400000 - DAILY_TEHRAN_OFFSET;
  const left = Math.max(0, Math.floor((next - srvNow()) / 1000));
  const h = Math.floor(left / 3600), m = Math.floor(left % 3600 / 60);
  return `${faNum(h)} ساعت و ${faNum(m)} دقیقه`;
}

function renderDaily(){
  // a new day started while the screen was open
  const s = dailyLoad();
  if(dl.k !== s.k){ dl.k = s.k; dl.cur = ''; dl.msg = ''; dl.lb = null; dl.revealRow = -1; }
  const st = dailyStreak();
  const wrap = el(`<div class="setup-page dl"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">کلمه‌ی امروز</div></div>`));
  const info = el(`<div class="dl-info"><span class="dl-info__d"></span><span class="dl-info__s"></span></div>`);
  info.querySelector('.dl-info__d').textContent = dailyDateText();
  info.querySelector('.dl-info__s').textContent = `🔥 ${faNum(st.n)} روز پشت‌هم`;
  wrap.appendChild(info);
  wrap.appendChild(el(`<p class="dl-help">کلمه‌ی امروز ${faNum(dailyLetters(dailyWord()).length)} حرفیه. در ${faNum(DAILY_TRIES)} حدس پیداش کن؛ سبز یعنی حرف درست و سر جاشه، زرد یعنی تو کلمه هست ولی جاش اینجا نیست.</p>`));
  wrap.appendChild(dailyBuildBoard());
  wrap.appendChild(el(`<div class="dl-msg" role="status" aria-live="polite"></div>`));
  wrap.querySelector('.dl-msg').textContent = dl.msg;

  if(!s.done){
    wrap.appendChild(dailyBuildKeyboard());
    return wrap;
  }

  // finished: result, share, leaderboard
  const res = el(`<div class="team-card dl-res"></div>`);
  if(s.won){
    res.appendChild(el(`<h2 class="set-card__title">آفرین! ${faNum(s.guesses.length)} حدس</h2>`));
    res.appendChild(el(`<p class="room-form__lead">امتیاز امروزت ${faNum(dailyScore(s.guesses.length))} شد. ${st.n > 1 ? `🔥 ${faNum(st.n)} روز پشت‌هم!` : ''}</p>`));
  } else {
    const t = el(`<h2 class="set-card__title">این بار نشد</h2>`);
    res.appendChild(t);
    const p = el(`<p class="room-form__lead"></p>`);
    p.textContent = `کلمه‌ی امروز «${dailyWord()}» بود. فردا دوباره امتحان کن!`;
    res.appendChild(p);
  }
  const share = el(`<button type="button" class="setup-start"><span>اشتراک نتیجه</span></button>`);
  share.addEventListener('click', () => {
    const text = dailyShareText(dailyLoad());
    if(navigator.share){ navigator.share({ text }).catch(() => {}); }
    else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => { share.firstChild.textContent = 'کپی شد ✓'; setTimeout(() => { share.firstChild.textContent = 'اشتراک نتیجه'; }, 1500); }).catch(() => {});
    }
  });
  res.appendChild(share);
  res.appendChild(el(`<small class="set-hint">کلمه‌ی بعدی تا ${dailyCountdown()} دیگه</small>`));
  wrap.appendChild(res);

  if(s.won){
    if(!s.sent){
      // the name for the table: the one saved from online play, or ask now
      const saved = dailyMyName();
      if(saved && !NBSafety.bad(saved)){
        dailySend(s).then(ok => { if(ok){ dl.lb = null; if(state.screen === 'daily') render(); } });
      } else {
        const form = el(`<form class="team-card dl-name" novalidate><h2 class="set-card__title">اسمت رو برای جدول بنویس</h2><input class="room-form__input" type="text" maxlength="20" autocomplete="off"><div class="room-form__error" role="alert" style="display:none;"></div><button type="submit" class="setup-addteam"><span>ثبت در جدول</span></button></form>`);
        const inp = form.querySelector('input'), err = form.querySelector('.room-form__error');
        keepInput(inp, 'dailyName');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = inp.value.trim().slice(0, 20);
          if(!name || NBSafety.bad(name)){ err.textContent = !name ? 'اسمت رو بنویس' : 'این اسم مناسب نیست.'; err.style.display = 'block'; return; }
          LS.set('name', name);
          dailySend(dailyLoad()).then(() => { dl.lb = null; render(); });
        });
        wrap.appendChild(form);
      }
    }
    if(dl.lb === null && !dl.lbBusy) setTimeout(dailyLoadBoard, 0);
    wrap.appendChild(dailyBuildLeaderboard(s));
  }
  return wrap;
}

function openDaily(){
  dl.cur = ''; dl.msg = ''; dl.lb = null; dl.revealRow = -1;
  state.screen = 'daily';
  render();
}
