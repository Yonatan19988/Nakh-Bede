// «نخ‌چین»: one player picks up to ten clues out of fifty words for a hidden word; the clues then turn up one by one
// and the partner picks the word out of five close answers. The sooner the guess, the more points.
// Alone, Nakhi picks the clues and you guess. Needs: nakhchindata.js, daily.js (wg*), app.js.

const NC_ROUNDS = 5, NC_REVEAL_MS = 3000, NC_MAX = 10;

function ncSplit(s){ return String(s).split(' ').map(x => x.replace(/^‌+|‌+$/g, '')).filter(Boolean); }
// one word ready to play: its answer, clue lists and decoys, with the decoys kept off the board
function ncEntry(i){
  const [a, s, l, d] = NC_WORDS[i];
  const D = ncSplit(d).filter(x => x !== a).slice(0, 4);
  const ok = (x) => x !== a && !D.includes(x);
  const S = [...new Set(ncSplit(s).filter(ok))];
  const L = [...new Set(ncSplit(l).filter(ok))].filter(x => !S.includes(x));
  return { i, answer: a, strong: S, loose: L, decoys: D };
}
function ncShuffle(a){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// the fifty words on the board: every clue, then everyday words that have nothing to do with it
function ncBoard(e){
  const words = [...e.strong, ...e.loose];
  const pool = ncShuffle(NC_POOL.filter(x => x !== e.answer && !e.decoys.includes(x) && !words.includes(x)));
  return ncShuffle(words.concat(pool.slice(0, Math.max(0, 50 - words.length)))).slice(0, 50);
}
function ncOptions(e){ return ncShuffle([e.answer, ...e.decoys]); }
// Nakhi's clues: three loose ones to warm up, then the strong ones from the least to the most telling
function ncNakhiClues(e){
  const loose = ncShuffle(e.loose).slice(0, 3);
  const strong = e.strong.slice(0, NC_MAX - loose.length).reverse();
  return loose.concat(strong).slice(0, NC_MAX);
}
// points for a right guess after n clues were shown; fewer clues picked earn a bonus
function ncPoints(shown, picked){ return Math.max(10, 100 - 10 * (shown - 1)) + 10 * Math.max(0, NC_MAX - picked); }

// a shuffled order of the words for this phone
function ncNextWords(n){
  let o = LS.get('ncOrder', null);
  const out = [];
  while(out.length < n){
    if(!o || !Array.isArray(o.ix) || o.len !== NC_WORDS.length || o.at >= o.ix.length){
      o = { len: NC_WORDS.length, ix: ncShuffle(NC_WORDS.map((_, i) => i)), at: 0 };
    }
    out.push(o.ix[o.at++]);
  }
  LS.set('ncOrder', o);
  return out;
}
function ncStats(){ return Object.assign({ best: 0, played: 0 }, LS.get('ncStats', null) || {}); }

// ---- the solo game ----
let nc = null, ncT = null;
function ncStop(){ clearTimeout(ncT); ncT = null; }
function ncNewGame(){
  ncStop();
  nc = { words: ncNextWords(NC_ROUNDS), r: 0, total: 0, rights: 0, done: false };
  ncStartRound();
}
function ncStartRound(){
  const e = ncEntry(nc.words[nc.r]);
  nc.e = e; nc.clues = ncNakhiClues(e); nc.opts = ncOptions(e);
  nc.phase = 'pick'; nc.shown = 0; nc.pick = null; nc.pts = 0;
  ncStop();
  ncT = setTimeout(() => { if(nc && nc.phase === 'pick'){ nc.phase = 'reveal'; ncReveal(); } }, 1700);
  if(state.screen === 'nakhchin') render();
}
function ncReveal(){
  if(!nc || nc.phase !== 'reveal') return;
  if(nc.shown < nc.clues.length){ nc.shown++; sfxTap(); }
  if(state.screen === 'nakhchin') ncPaint();
  if(nc.shown < nc.clues.length) ncT = setTimeout(ncReveal, NC_REVEAL_MS);
}
function ncGuess(w){
  if(!nc || nc.phase !== 'reveal') return;
  ncStop();
  nc.pick = w; nc.phase = 'res';
  if(w === nc.e.answer){ nc.pts = ncPoints(Math.max(1, nc.shown), nc.clues.length); nc.total += nc.pts; nc.rights++; sfxWin(); }
  else { nc.pts = 0; sfxWrong(); }
  render();
}
function ncNextRound(){
  if(nc.r + 1 >= NC_ROUNDS){
    nc.done = true;
    nc.coins = Math.floor(nc.total / 25);
    try{ const p = loadProfile(); p.coins += nc.coins; saveProfile(p); }catch(e){}
    const st = ncStats(); st.played++; nc.newBest = nc.total > st.best; st.best = Math.max(st.best, nc.total);
    LS.set('ncStats', st);
    if(typeof accountTouch === 'function') accountTouch();
    nc.celebrate = true;
    render();
    return;
  }
  nc.r++;
  ncStartRound();
}
// redraw only the clues and the points line while they turn up
function ncPaint(){
  const box = document.querySelector('.nc-thr');
  if(!box) return render();
  box.replaceWith(ncThreads());
  const pts = document.querySelector('.nc-pts b');
  if(pts) pts.textContent = `اگه الان حدس بزنی: ${faNum(ncPoints(Math.max(1, nc.shown), nc.clues.length))} امتیاز`;
  const n = document.querySelector('.nc-pts .wg-streak span');
  if(n) n.textContent = `${faNum(nc.shown)} از ${faNum(nc.clues.length)} نخ`;
}
function ncThreads(){
  const box = el(`<div class="nc-thr"></div>`);
  nc.clues.forEach((w, i) => {
    const on = i < nc.shown || nc.phase === 'res';
    const t = el(`<div class="nc-th ${on ? 'is-on' : ''}${nc.phase === 'res' && i >= nc.shown ? ' is-late' : ''}"><em>${faNum(i + 1)}</em><span></span></div>`);
    t.querySelector('span').textContent = on ? w : '…';
    if(i === nc.shown - 1 && nc.phase === 'reveal') t.classList.add('is-new');
    box.appendChild(t);
  });
  return box;
}

function ncHud(title, back){
  const hud = el(`<div class="wg-hud"><span class="wg-coin">${wgIcon('coin')}<b></b></span>${wgRibbonText(title)}<button type="button" class="wg-back" aria-label="بازگشت">${wgIcon('back')}</button></div>`);
  hud.querySelector('.wg-coin b').textContent = faNum(loadProfile().coins);
  hud.querySelector('.wg-back').addEventListener('click', back);
  return hud;
}
function renderNakhchin(){
  if(!nc) return renderNcChoose();
  const wrap = el(`<div class="wg nc"><div class="wg-bg" aria-hidden="true"></div></div>`);
  wrap.appendChild(ncHud(nc.done ? 'نتیجه' : `دور ${faNum(nc.r + 1)} از ${faNum(NC_ROUNDS)}`, () => { ncStop(); nc = null; render(); }));
  if(nc.done){ wrap.appendChild(ncFinal()); return wrap; }
  if(nc.phase === 'pick'){
    wrap.appendChild(el(`<div class="nc-wait"><img src="assets/mascot.webp" alt="" aria-hidden="true"><h2>نخی داره نخ می‌چینه…</h2><p>آماده باش! نخ‌ها یکی‌یکی رو می‌شن.<br>هرچی زودتر حدس بزنی امتیاز بیشتری می‌گیری.</p></div>`));
    return wrap;
  }
  const stage = el(`<div class="nc-stage"></div>`);
  if(nc.phase === 'reveal'){
    const pts = el(`<div class="nc-pts"><b></b><span class="wg-streak"><span></span></span></div>`);
    pts.querySelector('b').textContent = `اگه الان حدس بزنی: ${faNum(ncPoints(Math.max(1, nc.shown), nc.clues.length))} امتیاز`;
    pts.querySelector('.wg-streak span').textContent = `${faNum(nc.shown)} از ${faNum(nc.clues.length)} نخ`;
    stage.appendChild(pts);
  } else {
    const ok = nc.pick === nc.e.answer;
    const res = el(`<div class="nc-res ${ok ? 'is-ok' : 'is-bad'}"><img src="assets/${ok ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true"><div><b></b><small></small></div></div>`);
    res.querySelector('b').textContent = ok ? `آفرین! +${faNum(nc.pts)} امتیاز` : 'اِی… اشتباه بود!';
    res.querySelector('small').textContent = ok ? `با ${faNum(nc.shown)} نخ پیداش کردی.` : `جواب «${nc.e.answer}» بود.`;
    stage.appendChild(res);
  }
  stage.appendChild(ncThreads());
  wrap.appendChild(stage);
  // the five answers
  const five = el(`<div class="nc-five"></div>`);
  nc.opts.forEach(w => {
    const b = el(`<button type="button" class="hm-opt nc-opt"><b></b></button>`);
    b.querySelector('b').textContent = w;
    if(nc.phase === 'res'){
      b.disabled = true;
      if(w === nc.e.answer) b.classList.add('is-ok'); else if(w === nc.pick) b.classList.add('is-bad');
    }
    b.addEventListener('click', () => ncGuess(w));
    five.appendChild(b);
  });
  wrap.appendChild(five);
  if(nc.phase === 'res'){
    const foot = el(`<div class="hm-foot"><button type="button" class="wg-btn wg-btn--next"><b>${nc.r + 1 >= NC_ROUNDS ? 'نتیجه‌ی بازی' : 'دور بعد'}</b></button></div>`);
    foot.querySelector('button').addEventListener('click', ncNextRound);
    wrap.appendChild(foot);
  }
  return wrap;
}
function ncFinal(){
  const st = ncStats();
  const box = el(`<div class="hm-res">
    <img class="hm-res__nk" src="assets/${nc.rights >= 3 ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true">
    <div class="hm-res__card"><div class="wg-res__t"></div><div class="hm-res__big"></div>
      <div class="wg-res__sub"><span class="wg-res__coin">${wgIcon('coin')}<b></b></span></div><div class="hm-res__best"></div></div>
    <div class="wg-res__btns"></div></div>`);
  box.querySelector('.wg-res__t').textContent = nc.rights >= 5 ? 'حرف نداری!' : nc.rights >= 3 ? 'آفرین، خوب بود!' : 'دفعه‌ی بعد بهتر می‌شه!';
  box.querySelector('.hm-res__big').textContent = `${faNum(nc.total)} امتیاز`;
  box.querySelector('.wg-res__coin b').textContent = `+${faNum(nc.coins)} سکه · ${faNum(nc.rights)} از ${faNum(NC_ROUNDS)} درست`;
  box.querySelector('.hm-res__best').textContent = nc.newBest ? 'رکورد تازه!' : `رکورد ${faNum(st.best)}`;
  const again = el(`<button type="button" class="wg-btn wg-btn--next"><b>یه بازی دیگه</b></button>`);
  again.addEventListener('click', () => { ncNewGame(); render(); });
  const back = el(`<button type="button" class="wg-btn wg-btn--share" aria-label="برگشت">${wgIcon('back')}</button>`);
  back.addEventListener('click', () => { nc = null; render(); });
  box.querySelector('.wg-res__btns').append(again, back);
  if(nc.celebrate){ nc.celebrate = false; if(nc.rights >= 3) setTimeout(() => { const w = document.querySelector('.wg'); if(w) wgConfetti(w); }, 60); }
  return box;
}

// ---- first: alone or with friends ----
function renderNcChoose(){
  const wrap = el(`<div class="wg hm"><div class="wg-bg" aria-hidden="true"></div></div>`);
  wrap.appendChild(ncHud('نخ‌چین', goBack));
  const st = ncStats();
  const box = el(`<div class="hm-choose">
    <div class="hm-say"><img src="assets/mascot.webp" alt="" aria-hidden="true"><div class="wg-bub">از بین ۵۰ کلمه، بهترین نخ‌ها رو بچین!</div></div>
    <button type="button" class="hm-pick hm-pick--solo"><b>تک‌نفره</b><small></small></button>
    <button type="button" class="hm-pick hm-pick--duel" disabled><b>آنلاین با دوستان</b><small>به‌زودی: اتاق بساز، لینکش رو بفرست؛ هر دور یکی نخ می‌چینه و یارش حدس می‌زنه.</small></button>
  </div>`);
  box.querySelector('.hm-pick--solo small').textContent = `نخی نخ‌ها رو می‌چینه، تو حدس بزن. ${faNum(NC_ROUNDS)} دور؛ زودتر حدس بزنی امتیاز بیشتری می‌گیری.${st.best ? ` رکوردت ${faNum(st.best)}ه.` : ''}`;
  box.querySelector('.hm-pick--solo').addEventListener('click', () => { ncNewGame(); render(); });
  wrap.appendChild(box);
  return wrap;
}

function openNakhchin(){
  ncStop(); nc = null;
  state.screen = 'nakhchin';
  render();
}
