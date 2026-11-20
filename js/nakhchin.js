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
  if(ncOn) return renderNcOnline();
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
    <button type="button" class="hm-pick hm-pick--duel"><b>آنلاین با دوستان</b><small>اتاق بساز، لینکش رو بفرست؛ هر دور یکی نخ می‌چینه و هم‌تیمی‌هاش حدس می‌زنن.</small></button>
    <form class="nc-join"><input class="nc-join__in" maxlength="5" placeholder="کد اتاق دوستت" autocomplete="off" dir="ltr"><button type="submit" class="nc-mini">ورود</button></form>
  </div>`);
  box.querySelector('.hm-pick--solo small').textContent = `نخی نخ‌ها رو می‌چینه، تو حدس بزن. ${faNum(NC_ROUNDS)} دور؛ زودتر حدس بزنی امتیاز بیشتری می‌گیری.${st.best ? ` رکوردت ${faNum(st.best)}ه.` : ''}`;
  box.querySelector('.hm-pick--solo').addEventListener('click', () => { ncNewGame(); render(); });
  box.querySelector('.hm-pick--duel').addEventListener('click', ncCreateRoom);
  const inp = box.querySelector('.nc-join__in');
  if(state.ncPending){ inp.value = state.ncPending; state.ncPending = null; }
  box.querySelector('.nc-join').addEventListener('submit', (e) => { e.preventDefault(); ncJoinRoom(inp.value); });
  wrap.appendChild(box);
  return wrap;
}

function openNakhchin(){
  ncStop(); nc = null;
  if(ncOn && !ncOn.room) ncOn = null;
  state.screen = 'nakhchin';
  render();
}

// ======================= online with friends =======================
// A room lives at ncrooms/CODE (apart from the board game's rooms):
//   hostId, createdAt, phase: lobby | pick | guess | res | end, r (round), rounds, score {a, b},
//   players {uid: {name, team: 'a' | 'b', av}},
//   turn {team, picker, w (word), board [50], opts [5], pickEnd, clues [..], revealAt, guess {by, w, shown}, pts}
// Every turn one player of a team picks the clues; the other players of that team guess. Teams take turns.
const NC_TEAMS = { a: { name: 'تیم آبی', cls: 'a' }, b: { name: 'تیم نارنجی', cls: 'b' } };
const NC_PICK_MS = 60000, NC_TURNS_EACH = 3;
let ncOn = null;      // { code, room, unsub, key, sel: [] }
let ncTick = null;

function ncRef(path){ return window.FB.ref(window.FB.db, 'ncrooms/' + ncOn.code + (path ? '/' + path : '')); }
function ncMyName(){ try{ return (loadProfile().name || LS.get('name', '') || 'بازیکن').slice(0, 20); }catch(e){ return 'بازیکن'; } }
function ncMe(){ return window.FB && window.FB.uid; }
function ncIsHost(){ return !!(ncOn && ncOn.room && ncOn.room.hostId === ncMe()); }
function ncPlayers(team){
  const pl = (ncOn.room && ncOn.room.players) || {};
  return Object.keys(pl).filter(id => pl[id] && (!team || pl[id].team === team)).sort();
}
function ncActiveTeams(){ return ['a', 'b'].filter(t => ncPlayers(t).length); }

function ncCreateRoom(){
  if(!fbReadyOrWarn()) return;
  const code = genRoomCode(), me = ncMe();
  ncOn = { code, room: null, sel: [] };
  const data = { hostId: me, createdAt: srvNow(), phase: 'lobby', r: 0, rounds: 0, score: { a: 0, b: 0 },
    players: { [me]: { name: ncMyName(), team: 'a', av: myAvatarPayload() } } };
  window.FB.set(ncRef(), data).then(ncSubscribe).catch(err => { ncOn = null; alert(fbErrorText(err)); });
}
function ncJoinRoom(code){
  if(!fbReadyOrWarn()) return;
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if(code.length < 5){ toastHome('کد اتاق ۵ حرفیه'); return; }
  ncOn = { code, room: null, sel: [] };
  window.FB.get(ncRef()).then(snap => {
    const r = snap.exists() ? snap.val() : null;
    if(!r || !r.hostId){ ncOn = null; toastHome('اتاقی با این کد پیدا نشد'); return; }
    if(r.players && r.players[ncMe()]) return ncSubscribe();
    if(r.phase !== 'lobby'){ ncOn = null; toastHome('این بازی شروع شده؛ صبر کن تموم بشه'); return; }
    const cnt = { a: 0, b: 0 };
    Object.values(r.players || {}).forEach(p => { if(p && cnt[p.team] !== undefined) cnt[p.team]++; });
    const team = cnt.b < cnt.a ? 'b' : 'a';
    return window.FB.set(ncRef('players/' + ncMe()), { name: ncMyName(), team, av: myAvatarPayload() }).then(ncSubscribe);
  }).catch(err => { ncOn = null; alert(fbErrorText(err)); });
}
function ncSubscribe(){
  try{ window.FB.onDisconnect(ncRef('players/' + ncMe())).remove(); }catch(e){}
  ncOn.unsub = window.FB.onValue(ncRef(), snap => {
    if(!ncOn) return;
    const r = snap.exists() ? snap.val() : null;
    if(!r || !r.players || !r.players[ncMe()]){
      ncLeaveLocal();
      if(state.screen === 'nakhchin'){ toastHome('از اتاق بیرون اومدی'); }
      return;
    }
    const prev = ncOn.room;
    ncOn.room = r;
    if(!prev || !prev.turn || !r.turn || prev.turn.w !== r.turn.w || prev.r !== r.r) ncOn.sel = [];
    ncHostDuties();
    const t = r.turn || {};
    const key = JSON.stringify([r.phase, r.r, r.hostId, r.score, r.players, t.w, t.clues, t.guess, t.pts]);
    if(key !== ncOn.key){ ncOn.key = key; if(state.screen === 'nakhchin') render(); }
  });
  state.screen = 'nakhchin';
  ncStartTick();
  render();
}
function ncLeaveLocal(){
  if(!ncOn) return;
  try{ if(typeof ncOn.unsub === 'function') ncOn.unsub(); }catch(e){}
  ncOn = null;
  ncStopTick();
  if(state.screen === 'nakhchin') render();
}
function ncLeaveRoom(){
  if(!ncOn) return;
  const r = ncOn.room || {}, me = ncMe(), others = Object.keys(r.players || {}).filter(id => id !== me);
  const done = () => ncLeaveLocal();
  if(!others.length){ window.FB.remove(ncRef()).then(done, done); return; }
  const up = { ['players/' + me]: null };
  if(r.hostId === me) up.hostId = others.sort()[0];
  window.FB.update(ncRef(), up).then(done, done);
}

// ---- the host runs the turns ----
function ncBeginTurn(r){
  const room = ncOn.room, teams = ncActiveTeams();
  const team = teams[r % teams.length];
  const mem = ncPlayers(team);
  const picker = mem[Math.floor(r / teams.length) % mem.length];
  const w = ncNextWords(1)[0], e = ncEntry(w);
  return window.FB.update(ncRef(), {
    phase: 'pick', r,
    turn: { team, picker, w, board: ncBoard(e), opts: ncOptions(e), pickEnd: srvNow() + NC_PICK_MS, clues: null, revealAt: null, guess: null, pts: null }
  });
}
function ncStartGame(){
  const teams = ncActiveTeams();
  if(!teams.length || teams.some(t => ncPlayers(t).length < 2)){ toastHome('هر تیم حداقل ۲ نفر لازم داره'); return; }
  window.FB.update(ncRef(), { rounds: teams.length * NC_TURNS_EACH, score: { a: 0, b: 0 }, paid: null }).then(() => ncBeginTurn(0));
}
function ncNextTurn(){
  const r = ncOn.room;
  if(r.r + 1 >= r.rounds) window.FB.update(ncRef(), { phase: 'end' });
  else ncBeginTurn(r.r + 1);
}
// clues are sent by the picker; if the picker is gone the host closes the turn with none
function ncSendClues(clues){
  const t = ncOn.room.turn;
  if(!t || ncOn.room.phase !== 'pick' || t.clues) return;
  const list = (clues || []).slice(0, NC_MAX);
  if(!list.length) return ncFinish(null, 0);
  window.FB.update(ncRef(), { 'turn/clues': list, 'turn/revealAt': srvNow() + 600, phase: 'guess' });
}
function ncShown(t){
  if(!t || !t.clues || !t.revealAt) return 0;
  return Math.max(0, Math.min(t.clues.length, Math.floor((srvNow() - t.revealAt) / NC_REVEAL_MS) + 1));
}
function ncFinish(guess, pts){
  const r = ncOn.room, t = r.turn;
  const up = { phase: 'res', 'turn/guess': guess, 'turn/pts': pts };
  if(pts) up['score/' + t.team] = ((r.score && r.score[t.team]) || 0) + pts;
  return window.FB.update(ncRef(), up);
}
function ncGuessOnline(w){
  const r = ncOn.room, t = r && r.turn;
  if(!t || r.phase !== 'guess' || t.guess) return;
  const shown = Math.max(1, ncShown(t));
  const ok = w === NC_WORDS[t.w][0];
  ok ? sfxWin() : sfxWrong();
  ncFinish({ by: ncMe(), w, shown }, ok ? ncPoints(shown, t.clues.length) : 0);
}
let ncDutyT = 0;
function ncHostDuties(){
  if(!ncOn || !ncOn.room) return;
  const r = ncOn.room, t = r.turn, now = srvNow();
  // the picker's own phone sends what was picked when the minute is up
  if(r.phase === 'pick' && t && t.picker === ncMe() && now >= t.pickEnd && !t.clues) ncSendClues(ncOn.sel);
  if(!ncIsHost() || now - ncDutyT < 1500) return;
  if(r.phase === 'pick' && t && !t.clues && (now > t.pickEnd + 4000 || !r.players[t.picker])){ ncDutyT = now; ncFinish(null, 0); }
  if(r.phase === 'guess' && t && !t.guess && t.clues && now > t.revealAt + t.clues.length * NC_REVEAL_MS + 12000){ ncDutyT = now; ncFinish(null, 0); }
}
function ncStartTick(){
  ncStopTick();
  ncTick = setInterval(() => {
    if(!ncOn || state.screen !== 'nakhchin') return;
    ncHostDuties();
    const r = ncOn.room; if(!r) return;
    const t = r.turn || {};
    const left = Math.max(0, Math.ceil(((t.pickEnd || 0) - srvNow()) / 1000));
    document.querySelectorAll('.nc-ring').forEach(el => {
      el.style.setProperty('--p', Math.max(0, Math.min(1, left / 60)));
      const s = el.querySelector('span'); if(s) s.textContent = faNum(left);
    });
    if(r.phase === 'guess'){
      const n = ncShown(t);
      if(n !== ncOn.shown){ ncOn.shown = n; const box = document.querySelector('.nc-thr'); if(box) box.replaceWith(ncThreadsOnline()); ncPaintPts(); if(n) sfxTap(); }
    }
  }, 250);
}
function ncStopTick(){ clearInterval(ncTick); ncTick = null; }

// ---- screens ----
function ncName(id){ const p = ncOn.room.players[id]; return p ? p.name : 'بازیکن'; }
function ncRing(){ return el(`<span class="nc-ring" style="--p:1"><span>۶۰</span></span>`); }
function ncThreadsOnline(){
  const t = ncOn.room.turn, res = ncOn.room.phase === 'res' || ncOn.room.phase === 'end';
  const shown = res ? (t.guess ? t.guess.shown : (t.clues || []).length) : ncShown(t);
  const box = el(`<div class="nc-thr"></div>`);
  (t.clues || []).forEach((w, i) => {
    const on = i < shown || res;
    const th = el(`<div class="nc-th ${on ? 'is-on' : ''}${res && i >= shown ? ' is-late' : ''}"><em>${faNum(i + 1)}</em><span></span></div>`);
    th.querySelector('span').textContent = on ? w : '…';
    if(!res && i === shown - 1) th.classList.add('is-new');
    box.appendChild(th);
  });
  return box;
}
function ncPaintPts(){
  const t = ncOn.room.turn, b = document.querySelector('.nc-pts b'), s = document.querySelector('.nc-pts .wg-streak span');
  const n = Math.max(1, ncShown(t));
  if(b) b.textContent = `اگه الان حدس بزنی: ${faNum(ncPoints(n, (t.clues || []).length))} امتیاز`;
  if(s) s.textContent = `${faNum(ncShown(t))} از ${faNum((t.clues || []).length)} نخ`;
}
function ncScores(){
  const r = ncOn.room, box = el(`<div class="nc-teams"></div>`);
  ncActiveTeams().forEach(k => {
    const tm = el(`<div class="nc-team nc-team--${k}"><span></span><b></b></div>`);
    tm.querySelector('span').textContent = NC_TEAMS[k].name;
    tm.querySelector('b').textContent = faNum((r.score && r.score[k]) || 0);
    box.appendChild(tm);
  });
  return box;
}

function renderNcOnline(){
  const r = ncOn.room;
  const wrap = el(`<div class="wg nc nc-on"><div class="wg-bg" aria-hidden="true"></div></div>`);
  const titles = { lobby: 'اتاق نخ‌چین', pick: r && r.turn && r.turn.picker === ncMe() ? 'نوبت تو' : 'نخ‌چین', guess: 'حدس بزن!', res: 'نتیجه‌ی دور', end: 'پایان بازی' };
  wrap.appendChild(ncHud(r ? (titles[r.phase] || 'نخ‌چین') : 'نخ‌چین', () => { if(confirm('از اتاق بیرون بری؟')) ncLeaveRoom(); }));
  if(!r){ wrap.appendChild(el(`<div class="nc-wait"><img src="assets/mascot.webp" alt=""><h2>در حال اتصال…</h2></div>`)); return wrap; }
  const t = r.turn || {};
  if(r.phase === 'lobby') wrap.appendChild(ncLobby());
  else if(r.phase === 'pick') wrap.appendChild(t.picker === ncMe() ? ncPickScreen() : ncWaitScreen());
  else if(r.phase === 'guess' || r.phase === 'res') ncGuessScreen(wrap);
  else if(r.phase === 'end') wrap.appendChild(ncEndScreen());
  return wrap;
}

function ncLobby(){
  const r = ncOn.room, me = ncMe();
  const box = el(`<div class="nc-lobby">
    <div class="nc-code"><small>کد اتاق</small><b></b><div class="nc-code__btns"><button type="button" class="nc-mini">کپی کد</button><button type="button" class="nc-mini nc-mini--share">دعوت دوستان</button></div></div>
    <div class="nc-cols"></div>
    <p class="nc-hint">روی تیم دیگه بزن تا عوض بشی. هر تیم حداقل ۲ نفر لازم داره؛ با ۲ نفر هم می‌تونید با هم یه تیم باشید.</p>
  </div>`);
  box.querySelector('.nc-code b').textContent = ncOn.code;
  const [copy, share] = box.querySelectorAll('.nc-mini');
  copy.addEventListener('click', () => { if(navigator.clipboard) navigator.clipboard.writeText(ncOn.code).then(() => { copy.textContent = 'کپی شد ✓'; }).catch(() => {}); });
  share.addEventListener('click', () => {
    const link = gameLink() + '?nc=' + ncOn.code, text = `بیا «نخ‌چین» بازی کنیم! کد اتاق: ${ncOn.code}`;
    if(navigator.share) navigator.share({ title: 'نخ بده', text, url: link }).catch(() => {});
    else if(navigator.clipboard) navigator.clipboard.writeText(text + '\n' + link).then(() => { share.textContent = 'لینک کپی شد ✓'; }).catch(() => {});
  });
  const cols = box.querySelector('.nc-cols');
  ['a', 'b'].forEach(k => {
    const col = el(`<button type="button" class="nc-col nc-col--${k}"><b></b><div class="nc-col__list"></div></button>`);
    col.querySelector('b').textContent = NC_TEAMS[k].name;
    ncPlayers(k).forEach(id => {
      const p = r.players[id];
      const row = el(`<div class="nc-pl${id === me ? ' is-me' : ''}">${avatarHtmlFor(p.av, p.name)}<span class="nc-pl__n"></span>${id === r.hostId ? '<i>میزبان</i>' : ''}</div>`);
      row.querySelector('.nc-pl__n').textContent = p.name + (id === me ? ' (تو)' : '');
      col.querySelector('.nc-col__list').appendChild(row);
    });
    if(!ncPlayers(k).length) col.querySelector('.nc-col__list').appendChild(el(`<div class="nc-empty">هنوز کسی نیست</div>`));
    col.addEventListener('click', () => { if(r.players[me].team !== k) window.FB.update(ncRef('players/' + me), { team: k }); });
    cols.appendChild(col);
  });
  if(ncIsHost()){
    const teams = ncActiveTeams(), ok = teams.length && teams.every(t => ncPlayers(t).length >= 2);
    const go = el(`<button type="button" class="wg-btn wg-btn--next nc-go"${ok ? '' : ' disabled'}><b>شروع بازی</b></button>`);
    go.addEventListener('click', ncStartGame);
    box.appendChild(go);
    if(!ok) box.appendChild(el(`<p class="nc-hint">منتظر بقیه‌ایم… هر تیم حداقل ۲ نفر.</p>`));
  } else box.appendChild(el(`<p class="nc-hint nc-hint--big">منتظر میزبانیم که بازی رو شروع کنه…</p>`));
  return box;
}

// the picker: the word, the minute, fifty words to pick from
function ncPickScreen(){
  const r = ncOn.room, t = r.turn;
  const box = el(`<div class="nc-pick">
    <div class="nc-target"><div><small>کلمه‌ی تو (فقط تو می‌بینی)</small><b></b></div></div>
    <div class="nc-grid"></div>
    <div class="nc-tray"><div class="nc-tray__row"><span class="nc-cnt"></span><span class="nc-bonus"></span></div><button type="button" class="wg-btn wg-btn--next"><b>بفرست برای یارم</b></button></div>
  </div>`);
  box.querySelector('.nc-target b').textContent = NC_WORDS[t.w][0];
  box.querySelector('.nc-target').appendChild(ncRing());
  const grid = box.querySelector('.nc-grid');
  const paint = () => {
    grid.querySelectorAll('.nc-ch').forEach(c => {
      const i = ncOn.sel.indexOf(c.dataset.w);
      c.classList.toggle('is-on', i >= 0);
      const n = c.querySelector('i'); n.textContent = i >= 0 ? faNum(i + 1) : '';
    });
    box.querySelector('.nc-cnt').textContent = `${faNum(ncOn.sel.length)} از ${faNum(NC_MAX)} نخ چیدی`;
    box.querySelector('.nc-bonus').textContent = ncOn.sel.length && ncOn.sel.length < NC_MAX ? `+${faNum(10 * (NC_MAX - ncOn.sel.length))} امتیاز اضافه` : '';
    box.querySelector('.nc-tray button').disabled = !ncOn.sel.length;
  };
  (t.board || []).forEach(w => {
    const c = el(`<button type="button" class="nc-ch"><i></i><span></span></button>`);
    c.dataset.w = w; c.querySelector('span').textContent = w;
    c.addEventListener('click', () => {
      const i = ncOn.sel.indexOf(w);
      if(i >= 0) ncOn.sel.splice(i, 1);
      else if(ncOn.sel.length < NC_MAX) ncOn.sel.push(w);
      paint();
    });
    grid.appendChild(c);
  });
  box.querySelector('.nc-tray button').addEventListener('click', () => ncSendClues(ncOn.sel));
  paint();
  return box;
}
function ncWaitScreen(){
  const t = ncOn.room.turn, mine = ncOn.room.players[ncMe()].team === t.team;
  const box = el(`<div class="nc-wait"><img src="assets/mascot.webp" alt="" aria-hidden="true"><h2></h2><p></p></div>`);
  box.querySelector('h2').textContent = `${ncName(t.picker)} داره نخ می‌چینه…`;
  box.querySelector('p').textContent = mine ? 'آماده باش! نخ‌ها یکی‌یکی رو می‌شن؛ هرچی زودتر حدس بزنی امتیاز بیشتری می‌گیری.' : `نوبت ${NC_TEAMS[t.team].name}ه. تو فقط تماشا می‌کنی.`;
  box.insertBefore(ncRing(), box.querySelector('p'));
  box.appendChild(ncScores());
  return box;
}
function ncGuessScreen(wrap){
  const r = ncOn.room, t = r.turn, me = ncMe();
  const canGuess = r.phase === 'guess' && t.picker !== me && r.players[me] && r.players[me].team === t.team;
  const answer = NC_WORDS[t.w][0];
  const stage = el(`<div class="nc-stage"></div>`);
  if(r.phase === 'guess'){
    const pts = el(`<div class="nc-pts"><b></b><span class="wg-streak"><span></span></span></div>`);
    stage.appendChild(pts);
    const who = el(`<div class="nc-who"></div>`);
    who.textContent = canGuess ? `نخ‌های ${ncName(t.picker)} — حدس بزن!` : (t.picker === me ? 'یارت داره حدس می‌زنه…' : `${NC_TEAMS[t.team].name} داره حدس می‌زنه…`);
    stage.appendChild(who);
  } else {
    const ok = t.guess && t.guess.w === answer;
    const res = el(`<div class="nc-res ${ok ? 'is-ok' : 'is-bad'}"><img src="assets/${ok ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true"><div><b></b><small></small></div></div>`);
    res.querySelector('b').textContent = ok ? `${NC_TEAMS[t.team].name}: +${faNum(t.pts)} امتیاز` : (t.guess ? 'اِی… اشتباه بود!' : (t.clues ? 'وقت تموم شد!' : 'نخی نرسید!'));
    res.querySelector('small').textContent = `کلمه «${answer}» بود${t.guess ? ` · ${ncName(t.guess.by)} زد «${t.guess.w}»` : ''}.`;
    stage.appendChild(res);
  }
  stage.appendChild(ncThreadsOnline());
  stage.appendChild(ncScores());
  wrap.appendChild(stage);
  const five = el(`<div class="nc-five"></div>`);
  (t.opts || []).forEach(w => {
    const b = el(`<button type="button" class="hm-opt nc-opt"><b></b></button>`);
    b.querySelector('b').textContent = w;
    if(r.phase === 'res'){ if(w === answer) b.classList.add('is-ok'); else if(t.guess && w === t.guess.w) b.classList.add('is-bad'); }
    if(!canGuess) b.disabled = true;
    b.addEventListener('click', () => ncGuessOnline(w));
    five.appendChild(b);
  });
  wrap.appendChild(five);
  if(r.phase === 'res'){
    const foot = el(`<div class="hm-foot"></div>`);
    if(ncIsHost()){
      const b = el(`<button type="button" class="wg-btn wg-btn--next"><b>${r.r + 1 >= r.rounds ? 'نتیجه‌ی بازی' : 'دور بعد'}</b></button>`);
      b.addEventListener('click', ncNextTurn);
      foot.appendChild(b);
    } else foot.appendChild(el(`<p class="nc-hint nc-hint--big">منتظر میزبان برای دور بعد…</p>`));
    wrap.appendChild(foot);
  }
  if(r.phase === 'guess') setTimeout(() => { ncOn && (ncOn.shown = -1); }, 0);
  setTimeout(ncPaintPts, 0);
}
function ncEndScreen(){
  const r = ncOn.room, sc = r.score || {}, teams = ncActiveTeams();
  const myTeam = r.players[ncMe()].team;
  const best = Math.max(...teams.map(k => sc[k] || 0));
  const winners = teams.filter(k => (sc[k] || 0) === best);
  const won = winners.includes(myTeam);
  const box = el(`<div class="hm-res"><img class="hm-res__nk" src="assets/${won ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true">
    <div class="hm-res__card"><div class="wg-res__t"></div><div class="hm-res__big"></div><div class="nc-end-teams"></div><div class="hm-res__best"></div></div><div class="wg-res__btns"></div></div>`);
  box.querySelector('.wg-res__t').textContent = teams.length < 2 ? 'آفرین به تیمتون!' : winners.length > 1 ? 'مساوی شد!' : `${NC_TEAMS[winners[0]].name} برد!`;
  box.querySelector('.hm-res__big').textContent = `${faNum(sc[myTeam] || 0)} امتیاز`;
  box.querySelector('.nc-end-teams').appendChild(ncScores());
  // coins once per game for this phone
  const tag = ncOn.code + ':' + r.createdAt + ':' + (r.rounds || 0) + ':' + JSON.stringify(sc);
  let coins = Math.floor((sc[myTeam] || 0) / 25) + (won && teams.length > 1 ? 10 : 0);
  if(LS.get('ncPaid', '') !== tag){ LS.set('ncPaid', tag); try{ const p = loadProfile(); p.coins += coins; saveProfile(p); }catch(e){} }
  box.querySelector('.hm-res__best').textContent = `+${faNum(coins)} سکه`;
  const btns = box.querySelector('.wg-res__btns');
  if(ncIsHost()){
    const again = el(`<button type="button" class="wg-btn wg-btn--next"><b>یه بازی دیگه</b></button>`);
    again.addEventListener('click', () => window.FB.update(ncRef(), { phase: 'lobby', r: 0, turn: null, score: { a: 0, b: 0 } }));
    btns.appendChild(again);
  }
  const out = el(`<button type="button" class="wg-btn wg-btn--share" aria-label="خروج">${wgIcon('back')}</button>`);
  out.addEventListener('click', ncLeaveRoom);
  btns.appendChild(out);
  if(won) setTimeout(() => { const w = document.querySelector('.wg'); if(w && !w.dataset.conf){ w.dataset.conf = 1; wgConfetti(w); } }, 60);
  return box;
}
