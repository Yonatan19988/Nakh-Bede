// «کدوم درسته؟» — words that sound the same but are spelt differently (هم‌آواها), like حیاط and حیات.
// A sentence with a gap comes up with the two spellings under it; pick the right one before the time runs out.
// After every answer Nakhi says what both words mean. Ten sentences a round.
// Needs: homodata.js (HOMO_PAIRS, HOMO_TYPOS), app.js (el, LS, faNum, state, render, loadProfile, saveProfile, sfx*, goBack, accountTouch)
// and daily.js (wgIcon, wgRibbonText, wgConfetti, wgReduced).

// Every question, built from js/homodata.js. Each is [word 0, its meaning, word 1, its meaning, sentence, sentence]
// (the sentence twice, so item[4 + ans] is it), with .ans the right word and .typo for a misspelling.
const HOMO_ITEMS = [];
HOMO_PAIRS.forEach(([a, ma, b, mb, sa, sb]) => {
  sa.forEach(t => { const it = [a, ma, b, mb, t, t]; it.ans = 0; HOMO_ITEMS.push(it); });
  sb.forEach(t => { const it = [a, ma, b, mb, t, t]; it.ans = 1; HOMO_ITEMS.push(it); });
});
HOMO_TYPOS.forEach(([right, wrong, ss]) => ss.forEach(t => {
  const it = [right, 'املای درست', wrong, 'غلط املایی', t, t]; it.ans = 0; it.typo = true; HOMO_ITEMS.push(it);
}));
// every question: [item, which word is right (0 or 1)]
const HOMO_QS = HOMO_ITEMS.map((it, i) => [i, it.ans]);
const HOMO_ROUND = 10, HOMO_SECS = 12;

// a shuffled order of the questions for this phone, so a sentence does not come back until all were asked
function homoNextQs(n){
  let o = LS.get('homoOrder', null);
  const out = [];
  while(out.length < n){
    if(!o || !Array.isArray(o.ix) || o.len !== HOMO_QS.length || o.at >= o.ix.length){
      const ix = HOMO_QS.map((_, i) => i);
      for(let i = ix.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; }
      o = { len: HOMO_QS.length, ix, at: 0 };
    }
    out.push(o.ix[o.at++]);
  }
  LS.set('homoOrder', o);
  return out;
}
function homoStats(){ return Object.assign({ best: 0, played: 0, streak: 0 }, LS.get('homoStats', null) || {}); }

let ho = null;     // the round being played
function homoNewRound(){
  ho = { qs: homoNextQs(HOMO_ROUND), i: 0, right: 0, points: 0, run: 0, bestRun: 0, picked: -1, t0: 0, flip: Math.random() < .5, done: false, coins: 0 };
}
function homoQ(){ const [p, ans] = HOMO_QS[ho.qs[ho.i]]; return { p: HOMO_ITEMS[p], ans }; }

let homoTimer = null;
function homoStopTimer(){ clearTimeout(homoTimer); homoTimer = null; }
function homoStartTimer(){
  homoStopTimer();
  ho.t0 = Date.now();
  homoTimer = setTimeout(() => { if(state.screen === 'homo' && ho && ho.picked < 0) homoPick(-2); }, HOMO_SECS * 1000);
}
// -2: the time ran out
function homoPick(k){
  if(!ho || ho.picked !== -1 || ho.done) return;
  homoStopTimer();
  const { ans } = homoQ();
  ho.picked = k;
  if(k === ans){
    const left = Math.max(0, HOMO_SECS - (Date.now() - ho.t0) / 1000);
    ho.right++; ho.run++; ho.bestRun = Math.max(ho.bestRun, ho.run);
    ho.points += 10 + Math.ceil(left);
    sfxWin();
  } else {
    ho.run = 0;
    sfxWrong();
  }
  render();
}
function homoNext(){
  if(!ho) return;
  if(ho.i + 1 >= HOMO_ROUND){
    ho.done = true;
    ho.coins = ho.right * 2 + (ho.right === HOMO_ROUND ? 10 : 0);
    try{ const p = loadProfile(); p.coins += ho.coins; saveProfile(p); }catch(e){}
    const st = homoStats();
    st.played++; ho.newBest = ho.points > st.best; st.best = Math.max(st.best, ho.points);
    LS.set('homoStats', st);
    if(typeof accountTouch === 'function') accountTouch();
    ho.celebrate = true;
  } else {
    ho.i++; ho.picked = -1; ho.flip = Math.random() < .5;
  }
  render();
}

function homoSay(){
  const { p, ans } = homoQ();
  if(ho.picked === -1) return ho.i === 0 ? 'مواظب باش، شبیه همن!' : (ho.run >= 3 ? `${faNum(ho.run)} تا پشت‌هم! ادامه بده…` : 'کدومش درسته؟');
  if(ho.picked === ans) return ['آفرین!', 'دقیقاً همینه!', 'ایول، درسته!', 'حرف نداری!'][ho.i % 4];
  if(ho.picked === -2) return `وقت تموم شد! درستش «${p[ans * 2]}» بود.`;
  return `اِی… درستش «${p[ans * 2]}» بود.`;
}

function renderHomo(){
  if(hd) return renderHomoDuel();
  if(!ho) return renderHomoChoose();
  const wrap = el(`<div class="wg hm"><div class="wg-bg" aria-hidden="true"></div></div>`);
  const hud = el(`<div class="wg-hud"><span class="wg-coin">${wgIcon('coin')}<b></b></span>${wgRibbonText('کدوم درسته؟')}<button type="button" class="wg-back" aria-label="بازگشت">${wgIcon('back')}</button></div>`);
  hud.querySelector('.wg-coin b').textContent = faNum(loadProfile().coins);
  hud.querySelector('.wg-back').addEventListener('click', () => { homoStopTimer(); ho = null; render(); });
  wrap.appendChild(hud);
  if(ho.done){ wrap.appendChild(homoResult()); return wrap; }

  const { p, ans } = homoQ();
  const answered = ho.picked !== -1;
  // progress, the time left, the run of right answers
  const top = el(`<div class="hm-top"><span class="hm-n"></span><span class="hm-time"><i></i></span><span class="wg-streak">${wgIcon('flame')}<span></span></span></div>`);
  top.querySelector('.hm-n').textContent = `${faNum(ho.i + 1)} از ${faNum(HOMO_ROUND)}`;
  top.querySelector('.wg-streak span').textContent = faNum(ho.run);
  wrap.appendChild(top);

  const stage = el(`<div class="hm-stage"></div>`);
  // the sentence, with the gap filled once answered
  const card = el(`<div class="hm-sent"><span class="hm-lbl">جای خالی رو پر کن</span><p></p></div>`);
  const [before, after] = p[4 + ans].split('___');
  const pp = card.querySelector('p');
  pp.append(before);
  const gap = el(`<span class="hm-gap${answered ? ' is-fill' : ''}"></span>`);
  if(answered) gap.textContent = p[ans * 2];
  pp.append(gap, after || '');
  stage.appendChild(card);

  const say = el(`<div class="hm-say"><img src="assets/${answered && ho.picked === ans ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true" decoding="async"><div class="wg-bub hm-bub" role="status" aria-live="polite"></div></div>`);
  say.querySelector('.hm-bub').textContent = homoSay();
  stage.appendChild(say);

  // the two spellings, in a random order
  const opts = el(`<div class="hm-opts"></div>`);
  const order = ho.flip ? [1, 0] : [0, 1];
  order.forEach(k => {
    const b = el(`<button type="button" class="hm-opt"><b></b><small></small></button>`);
    b.querySelector('b').textContent = p[k * 2];
    if(answered){
      b.disabled = true;
      b.querySelector('small').textContent = p[k * 2 + 1];
      if(k === ans) b.classList.add('is-ok');
      else if(k === ho.picked) b.classList.add('is-bad');
    }
    b.addEventListener('click', () => homoPick(k));
    opts.appendChild(b);
  });
  stage.appendChild(opts);

  if(answered){
    const mean = el(`<div class="hm-mean"></div>`);
    mean.innerHTML = '<b></b> <span></span>';
    mean.querySelector('b').textContent = `«${p[0]}»`;
    mean.querySelector('span').textContent = p.typo ? `درسته؛ «${p[2]}» غلط املاییه.` : `یعنی ${p[1]}؛ «${p[2]}» یعنی ${p[3]}.`;
    stage.appendChild(mean);
  }
  wrap.appendChild(stage);

  const foot = el(`<div class="hm-foot"></div>`);
  if(answered){
    const next = el(`<button type="button" class="wg-btn wg-btn--next"><b>${ho.i + 1 >= HOMO_ROUND ? 'نتیجه' : 'بعدی'}</b></button>`);
    next.addEventListener('click', homoNext);
    foot.appendChild(next);
  }
  wrap.appendChild(foot);

  if(!answered){
    // the bar empties over the seconds left; a redraw keeps the time already used
    const used = ho.t0 ? (Date.now() - ho.t0) / 1000 : 0;
    if(!ho.t0 || !homoTimer) homoStartTimer();
    const bar = top.querySelector('.hm-time i');
    const left = Math.max(0, HOMO_SECS - (ho.t0 && homoTimer ? used : 0));
    bar.style.width = (left / HOMO_SECS * 100) + '%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `width ${left}s linear`; bar.style.width = '0%'; }));
  } else {
    ho.t0 = 0;
    top.querySelector('.hm-time i').style.width = '0%';
  }
  return wrap;
}

function homoResult(){
  const st = homoStats();
  const box = el(`<div class="hm-res">
    <img class="hm-res__nk" src="assets/${ho.right >= 7 ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true" decoding="async">
    <div class="hm-res__card">
      <div class="wg-res__t"></div>
      <div class="hm-res__big"></div>
      <div class="wg-res__sub"><span class="wg-res__coin">${wgIcon('coin')}<b></b></span><span class="wg-res__st">${wgIcon('flame')}<span></span></span></div>
      <div class="hm-res__best"></div>
    </div>
    <div class="wg-res__btns"></div>
  </div>`);
  box.querySelector('.wg-res__t').textContent = ho.right >= 9 ? 'استاد املا!' : ho.right >= 7 ? 'آفرین، خیلی خوب بود!' : ho.right >= 4 ? 'بد نبود!' : 'دفعه‌ی بعد بهتر می‌شه!';
  box.querySelector('.hm-res__big').textContent = `${faNum(ho.right)} از ${faNum(HOMO_ROUND)} درست`;
  box.querySelector('.wg-res__coin b').textContent = `+${faNum(ho.coins)} سکه`;
  box.querySelector('.wg-res__st span').textContent = `${faNum(ho.bestRun)} پشت‌هم`;
  box.querySelector('.hm-res__best').textContent = ho.newBest ? `رکورد تازه: ${faNum(ho.points)} امتیاز!` : `امتیاز ${faNum(ho.points)} · رکورد ${faNum(st.best)}`;
  const again = el(`<button type="button" class="wg-btn wg-btn--next"><b>یه دور دیگه</b></button>`);
  again.addEventListener('click', () => { homoNewRound(); render(); });
  const home = el(`<button type="button" class="wg-btn wg-btn--share" aria-label="برگشت">${wgIcon('back')}</button>`);
  home.addEventListener('click', () => { ho = null; render(); });
  box.querySelector('.wg-res__btns').append(again, home);
  if(ho.celebrate){
    ho.celebrate = false;
    if(ho.right >= 7) setTimeout(() => { const w = document.querySelector('.wg'); if(w) wgConfetti(w); }, 60);
  }
  return box;
}

function openHomo(){
  homoStopTimer(); clearTimeout(hdT);
  ho = null; hd = null;
  state.screen = 'homo';
  render();
}

// ---- first: alone, or a duel on one phone ----
function renderHomoChoose(){
  const wrap = el(`<div class="wg hm"><div class="wg-bg" aria-hidden="true"></div></div>`);
  const hud = el(`<div class="wg-hud"><span class="wg-coin">${wgIcon('coin')}<b></b></span>${wgRibbonText('کدوم درسته؟')}<button type="button" class="wg-back" aria-label="بازگشت">${wgIcon('back')}</button></div>`);
  hud.querySelector('.wg-coin b').textContent = faNum(loadProfile().coins);
  hud.querySelector('.wg-back').addEventListener('click', goBack);
  wrap.appendChild(hud);
  const st = homoStats();
  const box = el(`<div class="hm-choose">
    <div class="hm-say"><img src="assets/mascot.webp" alt="" aria-hidden="true" decoding="async"><div class="wg-bub">حیاط یا حیات؟ صد یا سد؟ چطوری بازی کنیم؟</div></div>
    <button type="button" class="hm-pick hm-pick--solo"><b>تک‌نفره</b><small></small></button>
    <button type="button" class="hm-pick hm-pick--duel"><b>دوئل دونفره</b><small>گوشی رو بذارید وسط؛ هر کی زودتر املای درست رو بزنه امتیاز می‌گیره. اول به ${faNum(HOMO_DUEL_TO)} برسی، بردی!</small></button>
  </div>`);
  box.querySelector('.hm-pick--solo small').textContent = `${faNum(HOMO_ROUND)} جمله، ${faNum(HOMO_SECS)} ثانیه برای هر کدوم.${st.best ? ` رکوردت ${faNum(st.best)} امتیازه.` : ''}`;
  box.querySelector('.hm-pick--solo').addEventListener('click', () => { homoNewRound(); render(); });
  box.querySelector('.hm-pick--duel').addEventListener('click', () => { homoNewDuel(); render(); });
  wrap.appendChild(box);
  return wrap;
}

// ---- the duel: the phone lies between two players, the top half turned to face the one across ----
const HOMO_DUEL_TO = 7;
let hd = null, hdT = null;
function homoNewDuel(){
  clearTimeout(hdT);
  hd = { qs: homoNextQs(40), i: 0, sc: [0, 0], lock: [false, false], res: null, done: false, flip: Math.random() < .5 };
}
function hdQ(){ const [p, ans] = HOMO_QS[hd.qs[hd.i % hd.qs.length]]; return { p, ans: ans, pair: HOMO_ITEMS[p] }; }
// player 0 is at the bottom, player 1 at the top
function homoDuelTap(who, k){
  if(!hd || hd.res || hd.done || hd.lock[who]) return;
  const { ans } = hdQ();
  if(k === ans){
    hd.sc[who]++; hd.res = { who, k };
    sfxWin();
    render();
    hdT = setTimeout(homoDuelNext, 1500);
  } else {
    hd.sc[who] = Math.max(0, hd.sc[who] - 1); hd.lock[who] = k + 1;
    sfxWrong();
    if(hd.lock[0] && hd.lock[1]){ hd.res = { who: -1 }; render(); hdT = setTimeout(homoDuelNext, 1900); }
    else render();
  }
}
function homoDuelNext(){
  if(!hd || state.screen !== 'homo') return;
  if(hd.sc[0] >= HOMO_DUEL_TO || hd.sc[1] >= HOMO_DUEL_TO){
    hd.done = true; hd.celebrate = true;
  } else {
    hd.i++; hd.lock = [false, false]; hd.res = null; hd.flip = Math.random() < .5;
  }
  render();
}
function homoDuelHalf(who){
  const { ans, pair } = hdQ();
  const me = who === 0 ? 'آبی' : 'نارنجی';
  const half = el(`<div class="hd-half hd-half--${who ? 'top' : 'bot'}"><div class="hd-score"><b></b><span class="hd-dots" aria-hidden="true"></span></div></div>`);
  half.querySelector('.hd-score b').textContent = `${me} · ${faNum(hd.sc[who])}`;
  for(let i = 0; i < HOMO_DUEL_TO; i++) half.querySelector('.hd-dots').appendChild(el(`<i class="${i < hd.sc[who] ? 'is-on' : ''}"></i>`));
  if(hd.done){
    const won = hd.sc[who] >= HOMO_DUEL_TO;
    const end = el(`<div class="hd-end ${won ? 'is-won' : ''}"><img src="assets/${won ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true"><b></b></div>`);
    end.querySelector('b').textContent = won ? 'بردی!' : 'باختی! دفعه‌ی بعد…';
    end.appendChild(el(`<small>${faNum(hd.sc[who])} — ${faNum(hd.sc[1 - who])}</small>`));
    half.querySelector('.hd-score').remove();
    half.appendChild(end);
    return half;
  }
  const card = el(`<div class="hm-sent hd-sent"><p></p></div>`);
  const [before, after] = pair[4 + ans].split('___');
  const pp = card.querySelector('p');
  const gap = el(`<span class="hm-gap${hd.res && hd.res.who >= 0 ? ' is-fill' : ''}"></span>`);
  if(hd.res) gap.textContent = pair[ans * 2];
  pp.append(before, gap, after || '');
  half.appendChild(card);
  const msg = el(`<div class="hd-msg"></div>`);
  if(hd.res){
    if(hd.res.who === who){ msg.textContent = 'امتیاز مال تو!'; msg.classList.add('is-ok'); }
    else if(hd.res.who >= 0){ msg.textContent = 'حریفت زودتر زد!'; }
    else { msg.textContent = `هیچ‌کدوم! درستش «${pair[ans * 2]}» بود.`; }
  } else if(hd.lock[who]){ msg.textContent = 'اشتباه بود! −۱ — صبر کن تا سؤال بعد.'; msg.classList.add('is-bad'); }
  half.appendChild(msg);
  const opts = el(`<div class="hm-opts hd-opts"></div>`);
  (hd.flip ? [1, 0] : [0, 1]).forEach(k => {
    const b = el(`<button type="button" class="hm-opt"><b></b></button>`);
    b.querySelector('b').textContent = pair[k * 2];
    if(hd.res && k === ans) b.classList.add('is-ok');
    else if(hd.lock[who] === k + 1) b.classList.add('is-bad');
    if(hd.res || hd.lock[who]) b.disabled = true;
    // pointerdown: both players can tap at the same moment
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); homoDuelTap(who, k); });
    opts.appendChild(b);
  });
  half.appendChild(opts);
  return half;
}
function renderHomoDuel(){
  const wrap = el(`<div class="wg hd${hd.done ? ' is-done' : ''}"><div class="wg-bg" aria-hidden="true"></div></div>`);
  wrap.appendChild(homoDuelHalf(1));
  const mid = el(`<div class="hd-mid"><button type="button" class="wg-back hd-back" aria-label="بازگشت">${wgIcon('back')}</button><span class="hd-to"></span><img src="assets/mascot.webp" alt="" aria-hidden="true"></div>`);
  mid.querySelector('.hd-to').textContent = hd.done ? 'تموم شد!' : `تا ${faNum(HOMO_DUEL_TO)}`;
  mid.querySelector('.hd-back').addEventListener('click', () => { clearTimeout(hdT); hd = null; render(); });
  wrap.appendChild(mid);
  wrap.appendChild(homoDuelHalf(0));
  if(hd.done){
    const again = el(`<div class="hd-again"><button type="button" class="wg-btn wg-btn--next"><b>دوباره</b></button></div>`);
    again.querySelector('button').addEventListener('click', () => { homoNewDuel(); render(); });
    wrap.appendChild(again);
    if(hd.celebrate){ hd.celebrate = false; setTimeout(() => { const w = document.querySelector('.wg'); if(w) wgConfetti(w); }, 60); }
  }
  return wrap;
}
