const TEAM_COLORS = ['#ff6b5e','#33c9b5','#ffcc4d','#8b7dff','#ff8fc4','#5eb3ff','#7fe08a','#ff9c5e','#c98bff','#5ee0c9'];
const TEAM_ICONS = ['🦁','🐯','🐻','🦊','🐼','🐨','🐸','🦉','🐢','🦅'];

// Small persistent store. Every access is guarded: storage can be blocked
// (private window, site data cleared) and the game must still run without it.
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('nb_' + k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('nb_' + k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('nb_' + k); }catch(e){} },
};
const prefs = { sound: LS.get('sound', true) !== false, haptic: LS.get('haptic', true) !== false };

function PERSIAN_ORNAMENT(size){
  size = size || 20;
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#D4AA4F" stroke-width="1.6">
      <path d="M20 4 C24 12 28 16 36 20 C28 24 24 28 20 36 C16 28 12 24 4 20 C12 16 16 12 20 4 Z"/>
      <circle cx="20" cy="20" r="4.5" fill="#078C83" stroke="none"/>
      <circle cx="20" cy="20" r="7.5"/>
    </g>
  </svg>`;
}
function PERSIAN_CORNER(size){
  size = size || 46;
  return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 30 Q4 4 30 4" fill="none" stroke="#D4AA4F" stroke-width="2" opacity=".7"/>
    <path d="M4 22 Q4 12 22 4" fill="none" stroke="#078C83" stroke-width="1.4" opacity=".6"/>
    <circle cx="10" cy="10" r="4" fill="#B43B2D" opacity=".75"/>
    <circle cx="10" cy="10" r="7" fill="none" stroke="#D4AA4F" stroke-width="1.2" opacity=".6"/>
  </svg>`;
}

function PAWN_SVG(color){
  // primitives only (no gradient ids, no arc paths) so every instance renders alike
  return `<svg viewBox="0 0 28 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="14" cy="37.4" rx="10.2" ry="2.5" fill="#000" opacity=".16"/>
    <ellipse cx="14" cy="37.2" rx="8.4" ry="1.9" fill="#000" opacity=".3"/>

    <ellipse cx="14" cy="33.8" rx="9.4" ry="3.1" fill="${color}"/>
    <ellipse cx="16.5" cy="34.5" rx="6.8" ry="2.5" fill="#000" opacity=".22"/>
    <ellipse cx="10.9" cy="32.7" rx="4.0" ry="1.2" fill="#fff" opacity=".3"/>

    <polygon points="9.7,33.9 12.6,23.6 15.4,23.6 18.3,33.9" fill="${color}"/>
    <polygon points="14,23.6 15.4,23.6 18.3,33.9 14,33.9" fill="#000" opacity=".24"/>
    <polygon points="11.5,33.9 13.2,24.2 14.0,24.2 12.7,33.9" fill="#fff" opacity=".28"/>

    <ellipse cx="14" cy="23.4" rx="6.2" ry="2.2" fill="${color}"/>
    <ellipse cx="15.9" cy="23.9" rx="4.3" ry="1.6" fill="#000" opacity=".22"/>
    <ellipse cx="11.6" cy="22.6" rx="2.6" ry="0.8" fill="#fff" opacity=".28"/>

    <circle cx="14" cy="14.2" r="7.3" fill="${color}"/>
    <circle cx="16.1" cy="16.2" r="6.2" fill="#000" opacity=".18"/>
    <circle cx="15.2" cy="15.4" r="6.6" fill="none" stroke="#fff" stroke-width="1" opacity=".14"/>
    <ellipse cx="11.2" cy="11.0" rx="2.8" ry="2.0" fill="#fff" opacity=".5"/>
    <circle cx="10.4" cy="10.2" r="1.1" fill="#fff" opacity=".9"/>
  </svg>`;
}

const DEMO_DECK = [
  ["سیب","دوچرخه","بهار","دریا","خورشید","کتاب"],
  ["گیتار","کوه","قهوه","پرنده","آینه","باران"],
  ["ماه","جنگل","ساعت","پل","آتش","ستاره"],
  ["قطار","گل","برف","چتر","آسمان","نامه"],
  ["دریاچه","کلید","پروانه","شمع","جاده","صخره"],
  ["پنجره","موسیقی","صحرا","رنگین‌کمان","درخت","سایه"]
];

const HOME_CARD_BACK = "assets/card-back.webp";
const HOME_CARD_WORD = "assets/card-word.webp";
const HOME_CARD_ACT = "assets/card-action.webp";
const HOME_LOGO = "assets/logo.webp";
const MAP_IMAGE = "assets/map.webp";

// Index-aligned with ACTION_CARDS (0-23). needsTarget = must pick a rival team; needsNumber = must pick 1-6.

let online = {
  roomCode: null,
  playerId: null,
  playerName: null,
  isHost: false,
  room: null,
};

function genRoomCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0;i<5;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function fbReadyOrWarn(){
  if(window.__fbReady && window.FB && window.FB.uid) return true;
  if(window.__fbAuthError){
    alert('ورود به سرور ناموفق بود. لطفاً اتصال اینترنت را بررسی کنید و صفحه را دوباره باز کنید.');
  } else {
    alert('اتصال به سرور هنوز آماده نیست، چند ثانیه صبر کنید.');
  }
  return false;
}

function fbErrorText(err){
  const code = String((err && (err.code || err.message)) || '').toLowerCase();
  if(code.includes('permission')) return 'دسترسی به این اتاق مجاز نیست.';
  return 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.';
}

// Presence: when the connection drops, onDisconnect removes this player from
// the room, and the rules then refuse their writes. So on every reconnect we
// put the player back (same team) and re-arm the disconnect cleanup.
let presenceUnsub = null;
function armPresence(){
  if(presenceUnsub){ presenceUnsub(); presenceUnsub = null; }
  const connRef = window.FB.ref(window.FB.db, '.info/connected');
  presenceUnsub = window.FB.onValue(connRef, (snap) => {
    if(snap.val() !== true) return;
    if(!online.roomCode || !online.playerId) return;
    const meRef = window.FB.ref(window.FB.db, `rooms/${online.roomCode}/players/${online.playerId}`);
    window.FB.onDisconnect(meRef).remove();
    window.FB.update(meRef, { name: online.playerName, teamId: online.lastTeamId || null })
      .catch(err => console.warn('presence restore failed', err));
  });
}

function genPlayerId(){
  return 'p_' + Math.random().toString(36).slice(2,10);
}

function onlineCreateRoom(playerName){
  if(!fbReadyOrWarn()) return Promise.resolve();
  const code = genRoomCode();
  const playerId = window.FB.uid;
  online.lastTeamId = null;
  online.roomCode = code;
  online.playerId = playerId;
  online.playerName = playerName;
  online.isHost = true;
  const roomData = {
    createdAt: Date.now(),
    hostId: playerId,
    phase: 'lobby',
    players: { [playerId]: { name: playerName, teamId: null } },
    teams: {},
  };
  return window.FB.set(window.FB.ref(window.FB.db, 'rooms/'+code), roomData).then(() => {
    rememberRoom();
    armPresence();
    subscribeRoom();
    state.screen = 'online-lobby';
    render();
  }).catch(err => { alert(fbErrorText(err)); });
}

function onlineJoinRoom(code, playerName, restoreTeamId){
  if(!fbReadyOrWarn()) return Promise.resolve();
  code = code.trim().toUpperCase();
  if(!code){ alert('کد اتاق رو وارد کن'); return Promise.resolve(); }
  const roomRef = window.FB.ref(window.FB.db, 'rooms/'+code);
  return window.FB.get(roomRef).then(snap => {
    if(!snap.exists()){ alert('اتاقی با این کد پیدا نشد'); return; }
    const playerId = window.FB.uid;
    online.lastTeamId = restoreTeamId || null;
    online.roomCode = code;
    online.playerId = playerId;
    online.playerName = playerName;
    online.isHost = false;
    return window.FB.update(window.FB.ref(window.FB.db, `rooms/${code}/players/${playerId}`), {name: playerName, teamId: restoreTeamId || null}).then(() => {
      rememberRoom();
      armPresence();
      subscribeRoom();
      state.screen = 'online-lobby';
      render();
    });
  }).catch(err => { alert(fbErrorText(err)); });
}

function subscribeRoom(){
  const roomRef = window.FB.ref(window.FB.db, 'rooms/'+online.roomCode);
  window.FB.onValue(roomRef, (snap) => {
    online.room = snap.val();
    if(!online.room){ return; }
    const me = online.room.players && online.room.players[online.playerId];
    if(me && me.teamId && me.teamId !== online.lastTeamId){ online.lastTeamId = me.teamId; rememberRoom(); }
    else if(me && me.teamId) online.lastTeamId = me.teamId;
    if(online.room.phase === 'playing' && state.screen === 'online-lobby'){
      state.screen = 'online-board';
    }
    render();
  });
}

// Lets a player who closed the app by accident get back into the same room.
function rememberRoom(){
  if(!online.roomCode) return;
  LS.set('room', { code: online.roomCode, name: online.playerName, teamId: online.lastTeamId || null, at: Date.now() });
  if(online.playerName) LS.set('name', online.playerName);
}
function savedRoom(){
  const r = LS.get('room', null);
  if(!r || !r.code || Date.now() - (r.at || 0) > 6 * 3600 * 1000) return null;
  return r;
}
function rejoinSavedRoom(){
  const r = savedRoom();
  if(!r){ LS.del('room'); render(); return; }
  onlineJoinRoom(r.code, r.name, r.teamId).then(() => {
    // the room is gone: stop offering it
    if(state.screen !== 'online-lobby' && state.screen !== 'online-board'){ LS.del('room'); render(); }
  });
}

function onlineLeaveRoom(){
  LS.del('room');
  if(online.roomCode && online.playerId){
    window.FB.remove(window.FB.ref(window.FB.db, `rooms/${online.roomCode}/players/${online.playerId}`));
  }
  if(presenceUnsub){ presenceUnsub(); presenceUnsub = null; }
  online.roomCode = null; online.playerId = null; online.room = null; online.isHost = false; online.lastTeamId = null;
  state.screen = 'home';
  render();
}

let state = {
  screen: 'home', // home | setup | board | settings
  hasActiveGame: false,
  showAbout: false,
  homeSheet: false,
  toast: null,
  roundDuration: 90,
  teams: [
    { id:1, name:'تیم ۱', color: TEAM_COLORS[0], icon: TEAM_ICONS[0], members:['بازیکن ۱','بازیکن ۲'], position:0, score:0, describerIdx:0, timerOverride:null, mods:{} },
    { id:2, name:'تیم ۲', color: TEAM_COLORS[1], icon: TEAM_ICONS[1], members:['بازیکن ۳','بازیکن ۴'], position:0, score:0, describerIdx:0, timerOverride:null, mods:{} },
  ],
  trackLength: 66,
  obstacles: [2,6,11,17,20,26,30,35,39,43,48,52,57,61,64],
  twistActive: false,
  currentTeamIdx: 0,
  currentCard: null,
  timeLeft: 90,
  timerRunning: false,
  timerInterval: null,
  roundEnded: false,
  correctCount: 0,
  skipCount: 0,
  foulCount: 0,
  foulPending: false,
  streak: 0,
  viewerKey: null, // "teamIdx:memberIdx"
  actionMsg: null,
  actionPickActive: false,
  actionRevealedIdx: null,
  actionChosenCard: null,
  actionChosenIdx: null,
  cardPeekNum: null,
  actionEffectTarget: null,
  actionEffectNumber: null,
  wheelSpun: false,
  wheelDone: false,
  wheelAnimStarted: false,
  wheelTimer: null,
  wheelRotation: 0,
  wheelVel: 0,
  animating: false,
  mapFit: false,
  flashFeedback: null,
  pendingSummary: null,
  lastRoundSummary: null,
  winner: null,
  deck: JSON.parse(JSON.stringify(REAL_DECK)),
};

// ---------------- SOUND EFFECTS (Web Audio, no external files) ----------------
function playTone(freq, duration, type, vol){
  if(!prefs.sound) return;
  try{
    const ctx = window.__audioCtx || (window.__audioCtx = new (window.AudioContext||window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol || 0.15;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }catch(e){}
}
function sfxTap(){ haptic(6); playTone(640,0.04,'sine',0.045); }
function sfxCorrect(){ haptic(18); playTone(880,0.14,'sine',0.18); setTimeout(()=>playTone(1320,0.16,'sine',0.15),90); }
function sfxWrong(){ haptic([28,40,28]); playTone(180,0.25,'sawtooth',0.14); }
function sfxTick(){ playTone(1000,0.05,'square',0.05); }
function sfxWin(){ haptic([40,60,40,60,120]); [660,880,990,1320].forEach((f,i)=>setTimeout(()=>playTone(f,0.28,'triangle',0.18), i*140)); }
function sfxHop(){ haptic(12); playTone(520,0.08,'square',0.12); setTimeout(()=>playTone(700,0.06,'square',0.08),50); }
function sfxCardReveal(){ haptic([15,50,30]); playTone(300,0.1,'triangle',0.12); setTimeout(()=>playTone(500,0.12,'triangle',0.14),80); setTimeout(()=>playTone(750,0.18,'triangle',0.16),160); }

function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function render(){
  // the wheel owns the screen for the length of its spin — but never block
  // a navigation away from the board, or the UI would freeze for 4s
  if(state.wheelTimer && (state.screen === 'board' || state.screen === 'online-board')) return;
  const app = document.getElementById('app');
  document.body.classList.toggle('home-mode', state.screen === 'home');
  document.documentElement.classList.toggle('home-mode', state.screen === 'home');
  document.body.classList.toggle('setup-mode', state.screen === 'setup' || state.screen === 'online-lobby' || state.screen === 'settings');
  // only the redesigned board is guaranteed to fit; the online board still
  // uses the older, taller layout and must stay reachable
  const boardScreen = state.screen === 'board';
  document.body.classList.toggle('scroll-lock', boardScreen);
  document.documentElement.classList.toggle('scroll-lock', boardScreen);
  const roomScreen = ['online-home','online-create','online-join'].includes(state.screen);
  document.body.classList.toggle('room-mode', roomScreen);
  document.documentElement.classList.toggle('room-mode', roomScreen);
  const playScreen = state.screen === 'board' || state.screen === 'online-board';
  document.body.classList.toggle('play-mode', playScreen);
  document.documentElement.classList.toggle('play-mode', playScreen);
  app.innerHTML = '';
  app.appendChild(renderBrand());
  if(state.screen === 'home'){
    app.appendChild(renderHome());
  } else if(state.screen === 'settings'){
    app.appendChild(renderSettings());
  } else if(state.screen === 'tutorial'){
    app.appendChild(renderTutorial());
  } else if(state.screen === 'setup'){
    app.appendChild(renderSetup());
  } else if(state.screen === 'online-home'){
    app.appendChild(renderOnlineHome());
  } else if(state.screen === 'online-create'){
    app.appendChild(renderOnlineCreate());
  } else if(state.screen === 'online-join'){
    app.appendChild(renderOnlineJoin());
  } else if(state.screen === 'online-lobby'){
    app.appendChild(renderOnlineLobby());
  } else if(state.screen === 'online-board'){
    app.appendChild(renderOnlineBoard());
  } else {
    app.appendChild(renderBoard());
  }
  attachBackButton(app);
  playScreenEntrance(app);
}

function playScreenEntrance(app){
  if(lastRenderedScreen === state.screen) return false;
  lastRenderedScreen = state.screen;
  app.classList.remove('screen-in');
  void app.offsetWidth;             // restart the entrance for the new screen
  app.classList.add('screen-in');
  // The class must not linger. Every later render builds fresh children, and
  // while it is still on they replay the entrance animation — which is what
  // made the screen flash on each tap.
  clearTimeout(screenInTimer);
  screenInTimer = setTimeout(() => app.classList.remove('screen-in'), 420);
  return true;
}

// ---------------- HOME SCREEN ----------------
let deferredInstall = null;
function isStandalone(){
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch(e){ return false; }
}
function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  if(state.screen === 'home') render();
});
window.addEventListener('appinstalled', () => { deferredInstall = null; LS.set('installDismissed', true); if(state.screen === 'home') render(); });

// One banner at a time on the home screen: first the rules, then the install hint.
function homeBanner(){
  if(!LS.get('seenTutorial', false)){
    return { kind:'learn', icon:'🎓', text:'اولین بازی‌ته؟ قانون‌ها رو تو یک دقیقه یاد بگیر.', cta:'آموزش',
      go(){ state.screen = 'tutorial'; render(); }, close(){ LS.set('seenTutorial', true); } };
  }
  if(!isStandalone() && !LS.get('installDismissed', false)){
    if(deferredInstall){
      return { kind:'install', icon:'📲', text:'بازی رو روی گوشی نصب کن تا مثل یک اپ باز بشه.', cta:'نصب',
        go(){ const d = deferredInstall; deferredInstall = null; d.prompt(); d.userChoice.finally(() => { LS.set('installDismissed', true); render(); }); },
        close(){ LS.set('installDismissed', true); } };
    }
    if(isIOS()){
      return { kind:'ios', icon:'📲', text:'برای نصب: در Safari دکمه‌ی اشتراک‌گذاری را بزن و «Add to Home Screen» را انتخاب کن.', cta:'',
        go(){}, close(){ LS.set('installDismissed', true); } };
    }
  }
  return null;
}

const SHOW_FUTURE_FEATURES = false;   // coins — not asked for yet
const SHOW_BOTTOM_NAV = true;         // the five tabs along the bottom

function renderHome(){
  const wrap = el(`<div class="hm"></div>`);

  const top = el(`<div class="hm-top"></div>`);
  top.appendChild(el(`<div class="hm-prof">
    <span class="hm-prof__av"><svg viewBox="0 0 24 24" width="21" height="21" fill="#fff"><circle cx="12" cy="9" r="4"/><path d="M12 14.1c-4.1 0-7.2 2.6-7.4 6.1-.02.46.35.8.8.8h13.2c.45 0 .82-.34.8-.8-.2-3.5-3.3-6.1-7.4-6.1Z"/></svg></span>
    <span class="hm-prof__txt"><b>بازیکن مهمان</b><i>نسخه آزمایشی</i></span>
  </div>`));
  const tools = el(`<div class="hm-tools"></div>`);
  if(SHOW_FUTURE_FEATURES){
    tools.appendChild(el(`<div class="hm-coins">
      <span class="hm-coins__ico"></span><span class="hm-coins__n">${faNum(0)}</span>
      <button class="hm-coins__add" aria-label="افزودن سکه">+</button></div>`));
  }
  const gear = el(`<button class="hm-gear" aria-label="تنظیمات"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#EAF6FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></svg></button>`);
  gear.addEventListener('click', () => { state.screen = 'settings'; render(); });
  tools.appendChild(gear);
  top.appendChild(tools);
  wrap.appendChild(top);

  const banner = homeBanner();
  if(banner){
    wrap.classList.add('has-banner');
    const b = el(`<div class="hm-banner hm-banner--${banner.kind}" role="status">
      <span class="hm-banner__ico" aria-hidden="true">${banner.icon}</span>
      <span class="hm-banner__txt">${banner.text}</span>
      ${banner.cta ? `<button class="hm-banner__cta">${banner.cta}</button>` : ''}
      <button class="hm-banner__x" aria-label="بستن"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button>
    </div>`);
    const cta = b.querySelector('.hm-banner__cta');
    if(cta) cta.addEventListener('click', banner.go);
    b.querySelector('.hm-banner__x').addEventListener('click', () => { banner.close(); render(); });
    wrap.appendChild(b);
  }

  wrap.appendChild(el(`<div class="hm-logo">
    <span class="hm-rays"></span><span class="hm-halo"></span>
      <img class="hm-logo__img" src="${HOME_LOGO}" alt="نخ بده" />
    <span class="hm-spark hm-spark--l1"></span>
    <span class="hm-spark hm-spark--l2"></span>
    <span class="hm-spark hm-spark--l3"></span>
  </div>`));
  wrap.appendChild(el(`<div class="hm-ribbon"><span class="hm-out hm-out--ribbon" data-text="بازی حدس کلمات">بازی حدس کلمات</span></div>`));
  wrap.appendChild(el(`<p class="hm-tag">توضیح بده، حدس بزن، جلو برو!</p>`));

  wrap.appendChild(el(`<div class="hm-scene">
    <span class="hm-pawn hm-pawn--r">${PAWN_SVG('#F0503F')}</span>
    <span class="hm-pawn hm-pawn--t">${PAWN_SVG('#22B3A6')}</span>
    <span class="hm-podium"></span>
    <img class="hm-card hm-card--back" src="${HOME_CARD_BACK}" alt="" />
    <img class="hm-card hm-card--act"  src="${HOME_CARD_ACT}"  alt="" />
    <img class="hm-card hm-card--word" src="${HOME_CARD_WORD}" alt="" />
    <span class="hm-spark hm-spark--1"></span>
    <span class="hm-spark hm-spark--2"></span>
    <span class="hm-spark hm-spark--3"></span>
  </div>`));

  const play = el(`<button class="hm-btn hm-btn--gold hm-play">
    <span class="hm-btn__gloss"></span>
    <span class="hm-play__ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg></span>
    <span class="hm-play__txt">${hasSavedGame() ? 'ادامه‌ی بازی' : 'ساخت بازی'}</span></button>`);
  play.addEventListener('click', () => { if(hasSavedGame()) resumeLocalGame(); else { state.homeSheet = 'new'; render(); } });
  wrap.appendChild(play);

  // quick ways back in: a fresh game next to a saved one, and the room you left
  const quick = [];
  if(hasSavedGame()) quick.push(['بازی جدید', () => { state.homeSheet = 'new'; render(); }]);
  const sr = savedRoom();
  if(sr) quick.push([`بازگشت به اتاق ${sr.code}`, rejoinSavedRoom]);
  if(quick.length){
    const row = el(`<div class="hm-quick"></div>`);
    quick.forEach(([label, fn]) => {
      const chip = el(`<button class="hm-chip"></button>`);
      chip.textContent = label;
      chip.addEventListener('click', fn);
      row.appendChild(chip);
    });
    wrap.appendChild(row);
  }

  const tiles = el(`<div class="hm-tiles"></div>`);
  const joinTile = el(`<button class="hm-btn hm-btn--teal hm-tile"><span class="hm-btn__gloss"></span>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="3.6"/><path d="M11.6 12H21"/><path d="M17.5 12v3.2"/><path d="M20.4 12v2.4"/></svg>
    <span class="hm-out hm-out--teal" data-text="ورود با کد">ورود با کد</span></button>`);
  joinTile.addEventListener('click', () => { state.homeSheet = 'join'; render(); });
  const learnTile = el(`<button class="hm-btn hm-btn--red hm-tile"><span class="hm-btn__gloss"></span>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.2 12 5l9 4.2-9 4.2Z"/><path d="M7 11.4v4.1c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.1"/></svg>
    <span class="hm-out hm-out--red" data-text="آموزش">آموزش</span>${LS.get('seenTutorial', false) ? '' : '<span class="hm-tile__dot" aria-label="جدید"></span>'}</button>`);
  learnTile.addEventListener('click', () => { state.screen = 'tutorial'; render(); });
  tiles.appendChild(joinTile);
  tiles.appendChild(learnTile);
  wrap.appendChild(tiles);

  if(SHOW_BOTTOM_NAV){
    const ico = {
      profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.8 7-5.8s7 2.2 7 5.8"/></svg>`,
      friends: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.4" r="3.2"/><path d="M3 19.4c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/><path d="M16.2 6.2a3 3 0 0 1 0 5.9"/><path d="M17.6 14.6c2.1.6 3.6 2.2 3.6 4.5"/></svg>`,
      home:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.2 12 4.6l8 6.6"/><path d="M6.4 10.6V19a1 1 0 0 0 1 1h9.2a1 1 0 0 0 1-1v-8.4"/></svg>`,
      cards:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="4" width="10" height="14" rx="2.2"/><path d="M6.4 6.6 4.4 16.2a2.2 2.2 0 0 0 1.7 2.6l4 .8"/></svg>`,
      shop:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5.6 8h12.8l-1 11.2a1.6 1.6 0 0 1-1.6 1.4H8.2a1.6 1.6 0 0 1-1.6-1.4Z"/><path d="M9 8V6.4a3 3 0 0 1 6 0V8"/></svg>`,
    };
    const nav = el(`<nav class="hm-nav"></nav>`);
    [['پروفایل','profile',0], ['دوستان','friends',0], ['خانه','home',1],
     ['کارت‌ها','cards',0], ['فروشگاه','shop',0]].forEach(([label, key, isHome]) => {
      const item = el(`<button class="hm-nav__item ${isHome ? 'is-home' : ''}">
        <span class="hm-nav__ico">${ico[key]}</span><span class="hm-nav__lbl">${label}</span></button>`);
      if(!isHome) item.addEventListener('click', () => toastHome(label + ' به زودی'));
      nav.appendChild(item);
    });
    wrap.appendChild(nav);
  }

  if(state.homeSheet){
    const isJoin = state.homeSheet === 'join';
    const back = el(`<div class="hm-sheet-back" role="dialog" aria-modal="true" aria-label="${isJoin ? 'ورود به اتاق' : 'بازی جدید'}"></div>`);
    back.addEventListener('click', (e) => { if(e.target === back){ state.homeSheet = false; render(); } });
    const sheet = el(`<div class="hm-sheet"><span class="hm-sheet__grip"></span><h2>${isJoin ? 'ورود به اتاق' : 'بازی جدید'}</h2></div>`);
    if(isJoin){
      const form = el(`<form class="hm-join" novalidate>
        <label class="hm-join__lbl" for="hmCode">کد اتاق</label>
        <input class="hm-join__input hm-join__input--code" id="hmCode" type="text" dir="ltr" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" />
        <label class="hm-join__lbl" for="hmName">نام تو</label>
        <input class="hm-join__input" id="hmName" type="text" maxlength="20" autocomplete="off" />
        <div class="hm-join__err" role="alert" hidden></div>
        <button type="submit" class="hm-btn hm-btn--teal hm-sheet__opt"><span class="hm-btn__gloss"></span><span class="hm-sheet__t">ورود به اتاق</span></button>
      </form>`);
      const codeIn = form.querySelector('#hmCode'), nameIn = form.querySelector('#hmName'), err = form.querySelector('.hm-join__err');
      codeIn.value = state.joinCode || '';
      nameIn.value = LS.get('name', '') || '';
      codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); err.hidden = true; });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = codeIn.value.trim().toUpperCase(), name = nameIn.value.trim();
        if(!name || code.length < 5){
          err.textContent = !name ? 'لطفاً نام خودت رو وارد کن' : 'کد اتاق پنج حرفیه';
          err.hidden = false;
          (!name ? nameIn : codeIn).focus();
          return;
        }
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        onlineJoinRoom(code, name).then(() => {
          if(state.screen === 'online-lobby' || state.screen === 'online-board'){ state.homeSheet = false; state.joinCode = ''; }
        }).finally(() => { btn.disabled = false; });
      });
      sheet.appendChild(form);
      setTimeout(() => (codeIn.value ? nameIn : codeIn).focus(), 60);
    } else {
      const online = el(`<button class="hm-btn hm-btn--teal hm-sheet__opt"><span class="hm-btn__gloss"></span>
        <span class="hm-sheet__t">آنلاین با دوستان</span></button>`);
      online.addEventListener('click', () => { state.homeSheet = false; state.screen = 'online-create'; render(); });
      const local = el(`<button class="hm-btn hm-btn--gold hm-sheet__opt"><span class="hm-btn__gloss"></span>
        <span class="hm-sheet__t">روی همین گوشی</span></button>`);
      local.addEventListener('click', () => { state.homeSheet = false; state.screen = 'setup'; render(); });
      sheet.appendChild(online); sheet.appendChild(local);
    }
    back.appendChild(sheet);
    wrap.appendChild(back);
  }

  if(state.toast) wrap.appendChild(el(`<div class="home-toast" role="status" aria-live="polite">${state.toast}</div>`));
  return wrap;
}

function toastHome(msg){
  state.toast = msg;
  render();
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => { state.toast = null; render(); }, 1900);
}

function fbRoomRef(path){
  const code = online.roomCode;
  return window.FB.ref(window.FB.db, path ? `rooms/${code}/${path}` : `rooms/${code}`);
}

function onlineTeamsArray(){
  const room = online.room;
  if(!room || !room.teams) return [];
  return Object.keys(room.teams).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10)).map(tid => {
    const t = room.teams[tid];
    const memberIds = Object.keys(room.players||{}).filter(pid => room.players[pid].teamId === tid).sort();
    return {
      id: tid,
      name: t.name,
      color: t.color,
      position: t.position||0,
      score: t.score||0,
      describerIdx: t.describerIdx||0,
      memberIds: memberIds,
      memberNames: memberIds.map(pid => (room.players[pid]||{}).name || '؟'),
    };
  });
}

let onlineTicker = null;
function ensureOnlineTicker(){
  if(onlineTicker) return;
  onlineTicker = setInterval(() => {
    if(state.screen !== 'online-board') return;
    // nothing is counting down during the wheel / action-card overlay or the
    // round summary — re-rendering there only restarts their animations
    if(state.actionPickActive || state.roundEnded || state.animating) return;
    if(!state.timerRunning) return;
    syncStateFromOnlineRoom();
    if(!tickTimerOnly()) render();
  }, 1000);
}

function clearErrorOnType(form){
  form.querySelectorAll('.room-form__field').forEach(field => {
    const input = field.querySelector('input');
    const err = field.querySelector('.room-form__error');
    if(!input || !err) return;
    input.addEventListener('input', () => {
      if(input.value.trim()){ err.style.display = 'none'; input.classList.remove('is-invalid'); }
    });
  });
}

function roomHeader(){
  const header = el(`<div class="online-room-header"></div>`);
  header.appendChild(el(`<div class="online-room-logo"><span class="online-room-logo-dot"></span>نخ بده</div>`));
  return header;
}

// ---- step 1: choose create or join ----
function renderOnlineHome(){
  const wrap = el(`<div class="online-room-page"></div>`);
  wrap.appendChild(roomHeader());

  wrap.appendChild(el(`<div class="room-choose__head">
    <h1 class="room-choose__title">بازی آنلاین با دوستان</h1>
    <p class="room-choose__sub">یه اتاق بساز و کدش رو برای دوستات بفرست، یا با کد دوستت وارد اتاقش شو.</p>
  </div>`));

  const createChoice = el(`<button class="room-choice room-choice--create">
    <span class="room-choice__icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></span>
    <span class="room-choice__text"><span class="room-choice__label">ساخت اتاق</span><span class="room-choice__hint">میزبان بازی شو</span></span>
    <span class="room-choice__chev"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></span>
  </button>`);
  createChoice.addEventListener('click', () => { state.screen = 'online-create'; render(); });
  wrap.appendChild(createChoice);

  const joinChoice = el(`<button class="room-choice room-choice--join">
    <span class="room-choice__icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg></span>
    <span class="room-choice__text"><span class="room-choice__label">ورود به اتاق</span><span class="room-choice__hint">با کد دوستت وارد شو</span></span>
    <span class="room-choice__chev"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></span>
  </button>`);
  joinChoice.addEventListener('click', () => { state.screen = 'online-join'; render(); });
  wrap.appendChild(joinChoice);

  return wrap;
}

// ---- step 2a: create a room ----
function renderOnlineCreate(){
  const wrap = el(`<div class="online-room-page"></div>`);
  wrap.appendChild(roomHeader());

  const createForm = el(`<form class="room-card room-card--create" novalidate></form>`);
  createForm.appendChild(el(`<div class="room-card__ornament room-card__ornament--tr">${PERSIAN_CORNER(46)}</div>`));
  createForm.appendChild(el(`<h2 class="room-card__title">${PERSIAN_ORNAMENT(16)}<span>ساخت اتاق جدید</span>${PERSIAN_ORNAMENT(16)}</h2>`));
  const createNameField = el(`<div class="room-form__field">
    <label class="room-form__label" for="createNameInput">نام خود را وارد کنید</label>
    <input class="room-form__input" type="text" id="createNameInput" maxlength="20" autocomplete="off" />
    <div class="room-form__error" style="display:none;"></div>
  </div>`);
  createForm.appendChild(createNameField);
  const createBtn = el(`<button type="submit" class="room-button room-button--create">ساخت اتاق</button>`);
  createForm.appendChild(createBtn);
  createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = createForm.querySelector('#createNameInput');
    const nameErr = createNameField.querySelector('.room-form__error');
    const name = nameInput.value.trim();
    if(!name){
      nameErr.textContent = 'لطفاً نام خود را وارد کنید';
      nameErr.style.display = 'block';
      nameInput.classList.add('is-invalid');
      nameInput.focus();
      return;
    }
    nameErr.style.display = 'none';
    nameInput.classList.remove('is-invalid');
    createBtn.disabled = true;
    createBtn.textContent = 'ساخت اتاق...';
    onlineCreateRoom(name).finally(() => {
      createBtn.disabled = false;
      createBtn.textContent = 'ساخت اتاق';
    });
  });
  clearErrorOnType(createForm);
  wrap.appendChild(createForm);
  wrap.appendChild(el(`<p class="room-foot">بعد از ساخت، یه کد ۵ حرفی می‌گیری که دوستات باهاش وارد می‌شن.</p>`));
  return wrap;
}

// ---- step 2b: join a friend's room ----
function renderOnlineJoin(){
  const wrap = el(`<div class="online-room-page"></div>`);
  wrap.appendChild(roomHeader());

  const joinForm = el(`<form class="room-card room-card--join" novalidate></form>`);
  joinForm.appendChild(el(`<div class="room-card__ornament room-card__ornament--tr">${PERSIAN_CORNER(46)}</div>`));
  joinForm.appendChild(el(`<h2 class="room-card__title">${PERSIAN_ORNAMENT(16)}<span>ورود به اتاق دوستت</span>${PERSIAN_ORNAMENT(16)}</h2>`));
  const joinNameField = el(`<div class="room-form__field">
    <label class="room-form__label" for="joinNameInput">نام خود را وارد کنید</label>
    <input class="room-form__input" type="text" id="joinNameInput" maxlength="20" autocomplete="off" />
    <div class="room-form__error" style="display:none;"></div>
  </div>`);
  joinForm.appendChild(joinNameField);
  const joinCodeField = el(`<div class="room-form__field">
    <label class="room-form__label" for="joinCodeInput">کد اتاق را وارد کنید</label>
    <input class="room-form__input room-form__input--code" type="text" id="joinCodeInput" maxlength="5" autocomplete="off" />
    <div class="room-form__error" style="display:none;"></div>
  </div>`);
  joinForm.appendChild(joinCodeField);
  const joinBtn = el(`<button type="submit" class="room-button room-button--join">ورود به اتاق</button>`);
  joinForm.appendChild(joinBtn);
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const errBox = joinCodeField.querySelector('.room-form__error');
    const nameErr = joinNameField.querySelector('.room-form__error');
    const nameInput = joinForm.querySelector('#joinNameInput');
    const codeInput = joinForm.querySelector('#joinCodeInput');
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    // check both fields so the player sees every problem at once
    let firstBad = null;
    if(!name){
      nameErr.textContent = 'لطفاً نام خود را وارد کنید';
      nameErr.style.display = 'block';
      nameInput.classList.add('is-invalid');
      firstBad = firstBad || nameInput;
    } else {
      nameErr.style.display = 'none';
      nameInput.classList.remove('is-invalid');
    }
    if(!code){
      errBox.textContent = 'لطفاً کد اتاق را وارد کنید';
      errBox.style.display = 'block';
      codeInput.classList.add('is-invalid');
      firstBad = firstBad || codeInput;
    } else {
      errBox.style.display = 'none';
      codeInput.classList.remove('is-invalid');
    }
    if(firstBad){ firstBad.focus(); return; }
    joinBtn.disabled = true;
    joinBtn.textContent = 'در حال ورود...';
    onlineJoinRoom(code, name).finally(() => {
      joinBtn.disabled = false;
      joinBtn.textContent = 'ورود به اتاق';
    });
  });
  clearErrorOnType(joinForm);
  wrap.appendChild(joinForm);
  wrap.appendChild(el(`<p class="room-foot">کد اتاق رو از کسی که اتاق رو ساخته بگیر.</p>`));
  return wrap;
}

function renderOnlineLobby(){
  const wrap = el(`<div class="setup-page lobby"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">نخ بده<span class="setup-brand-dot"></span></div></div>`));
  const room = online.room;
  if(!room){
    wrap.appendChild(el(`<div class="lobby-wait">در حال اتصال به اتاق…</div>`));
    return wrap;
  }

  // ---- room code ----
  const playerCount = Object.keys(room.players || {}).length;
  const codeCard = el(`<div class="lobby-code">
    <span class="lobby-code__lbl">کد اتاق</span>
    <div class="lobby-code__val" dir="ltr">${online.roomCode}</div>
    <small class="lobby-code__hint">این کد رو به دوستات بده تا وارد بشن · ${faNum(playerCount)} نفر توی اتاقن</small>
  </div>`);
  const copyBtn = el(`<button class="lobby-code__copy">کپی کد</button>`);
  copyBtn.addEventListener('click', () => {
    const done = () => { copyBtn.textContent = 'کپی شد ✓'; setTimeout(() => { copyBtn.textContent = 'کپی کد'; }, 1500); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(online.roomCode).then(done).catch(() => {});
    }
  });
  const shareBtn = el(`<button class="lobby-code__copy lobby-code__copy--share">دعوت دوستان</button>`);
  shareBtn.addEventListener('click', () => {
    const link = location.origin + location.pathname + '?room=' + online.roomCode;
    const text = `بیا توی اتاق «نخ بده»! کد اتاق: ${online.roomCode}`;
    if(navigator.share){
      navigator.share({ title: 'نخ بده', text, url: link }).catch(() => {});
    } else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text + '\n' + link).then(() => {
        shareBtn.textContent = 'لینک کپی شد ✓'; setTimeout(() => { shareBtn.textContent = 'دعوت دوستان'; }, 1500);
      }).catch(() => {});
    }
  });
  const codeActions = el(`<div class="lobby-code__actions"></div>`);
  codeActions.appendChild(copyBtn);
  codeActions.appendChild(shareBtn);
  codeCard.insertBefore(codeActions, codeCard.querySelector('.lobby-code__hint'));
  wrap.appendChild(codeCard);

  // ---- teams ----
  const teams = onlineTeamsArray();
  const myTeam = room.players[online.playerId] ? room.players[online.playerId].teamId : null;
  const unassigned = Object.keys(room.players || {}).filter(pid => !room.players[pid].teamId);

  if(!teams.length){
    wrap.appendChild(el(`<div class="lobby-wait">${online.isHost ? 'اول چند تا تیم بساز تا بقیه بتونن بپیوندن.' : 'میزبان هنوز تیمی نساخته.'}</div>`));
  }
  teams.forEach(t => {
    const mine = myTeam === t.id;
    const block = el(`<div class="team-card lobby-team ${mine ? 'is-mine' : ''}"></div>`);
    block.appendChild(el(`<div class="team-card__head lobby-team__head">
      <span class="team-card__swatch" style="background:${t.color}"></span>
      <b class="lobby-team__name">${t.name}</b>
      <span class="lobby-team__count">${faNum(t.memberIds.length)} نفر</span>
    </div>`));
    const chips = el(`<div class="lobby-chips"></div>`);
    if(t.memberIds.length){
      t.memberIds.forEach((pid, k) => {
        const me = pid === online.playerId;
        chips.appendChild(el(`<span class="lobby-chip ${me ? 'is-me' : ''}">${t.memberNames[k]}${me ? ' (تو)' : ''}</span>`));
      });
    } else {
      chips.appendChild(el(`<span class="lobby-empty">هنوز کسی نیست</span>`));
    }
    block.appendChild(chips);
    if(mine){
      block.appendChild(el(`<div class="lobby-team__mine">✓ تیم توئه</div>`));
    } else {
      const joinBtn = el(`<button class="team-card__add">پیوستن به این تیم</button>`);
      joinBtn.addEventListener('click', () => {
        window.FB.update(fbRoomRef(`players/${online.playerId}`), {teamId: t.id});
      });
      block.appendChild(joinBtn);
    }
    wrap.appendChild(block);
  });

  if(unassigned.length){
    const un = el(`<div class="lobby-unassigned"><span class="lobby-unassigned__lbl">بدون تیم</span></div>`);
    unassigned.forEach(pid => {
      const me = pid === online.playerId;
      un.appendChild(el(`<span class="lobby-chip ${me ? 'is-me' : ''}">${room.players[pid].name}${me ? ' (تو)' : ''}</span>`));
    });
    wrap.appendChild(un);
  }

  // ---- host / guest actions ----
  if(online.isHost){
    if(teams.length < 10){
      const addTeamBtn = el(`<button class="setup-addteam">+ افزودن تیم</button>`);
      addTeamBtn.addEventListener('click', () => {
        const n = teams.length;
        if(n >= 10) return;
        const tid = 't' + (n+1);
        window.FB.update(fbRoomRef(`teams/${tid}`), {name: 'تیم '+(n+1), color: TEAM_COLORS[n % TEAM_COLORS.length], position:0, score:0, describerIdx:0});
      });
      wrap.appendChild(addTeamBtn);
    }
    const readyTeams = teams.filter(t => t.memberIds.length > 0);
    const startBtn = el(`<button class="setup-start"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg><span>شروع بازی برای همه</span></button>`);
    startBtn.disabled = readyTeams.length < 2;
    startBtn.addEventListener('click', () => { startOnlineGame(); });
    wrap.appendChild(startBtn);
    if(readyTeams.length < 2){
      wrap.appendChild(el(`<div class="setup-note">حداقل ۲ تیم با عضو لازمه</div>`));
    }
  } else {
    wrap.appendChild(el(`<div class="lobby-wait">منتظر شروع بازی از طرف میزبان…</div>`));
  }

  const leaveBtn = el(`<button class="play-leave">خروج از اتاق</button>`);
  leaveBtn.addEventListener('click', onlineLeaveRoom);
  wrap.appendChild(leaveBtn);
  return wrap;
}

function startOnlineGame(){
  const teams = onlineTeamsArray().filter(t => t.memberIds.length > 0);
  if(teams.length < 2) return;
  const firstCardIdx = Math.floor(Math.random()*REAL_DECK.length);
  const updates = {
    phase: 'playing',
    currentTeamId: teams[0].id,
    currentCardIdx: firstCardIdx,
    roundEndAt: null,
    correctCount: 0,
    skipCount: 0,
    roundEnded: false,
    actionPickActive: false,
    actionRevealedIdx: null,
    actionChosenCardIdx: null,
    winnerTeamId: null,
    lastRoundSummary: null,
  };
  teams.forEach(t => {
    updates[`teams/${t.id}/position`] = 0;
    updates[`teams/${t.id}/score`] = 0;
    updates[`teams/${t.id}/describerIdx`] = 0;
  });
  window.FB.update(fbRoomRef(), updates);
}

function syncStateFromOnlineRoom(){
  const room = online.room;
  if(!room) return;
  const teams = onlineTeamsArray();
  state.teams = teams.map(t => ({
    id: t.id, name: t.name, color: t.color, position: t.position, score: t.score,
    describerIdx: t.describerIdx, members: t.memberNames.length ? t.memberNames : ['—'],
    memberIds: t.memberIds, timerOverride: room.teams[t.id].timerOverride || null,
    mods: room.teams[t.id].mods || {},
  }));
  const curIdx = state.teams.findIndex(t => t.id === room.currentTeamId);
  state.currentTeamIdx = curIdx >= 0 ? curIdx : 0;
  state.correctCount = room.correctCount || 0;
  state.skipCount = room.skipCount || 0;
  state.roundEnded = !!room.roundEnded;
  state.foulCount = room.foulCount || 0;
  state.foulPending = !!room.foulPending;
  state.actionPickActive = !!room.actionPickActive;
  if(!state.actionPickActive){ resetWheel(); }
  else { state.wheelSpun = !!room.wheelSpun; }
  state.actionRevealedIdx = (room.actionRevealedIdx === undefined) ? null : room.actionRevealedIdx;
  state.actionChosenCard = (room.actionChosenCardIdx !== null && room.actionChosenCardIdx !== undefined) ? ACTION_CARDS[room.actionChosenCardIdx] : null;
  state.lastRoundSummary = room.lastRoundSummary || null;
  const curCardIdx = (room.currentCardIdx===undefined || room.currentCardIdx===null) ? 0 : room.currentCardIdx;
  state.currentCard = REAL_DECK[curCardIdx];
  if(room.winnerTeamId){
    const wt = state.teams.find(t => t.id === room.winnerTeamId);
    if(wt && !state.winner){ sfxWin(); }
    state.winner = wt || null;
  } else {
    state.winner = null;
  }
  if(room.roundEndAt){
    state.timeLeft = Math.max(0, Math.ceil((room.roundEndAt - (room.foulPending ? (room.foulPausedAt || Date.now()) : Date.now()))/1000));
    state.timerRunning = state.timeLeft > 0;
  } else {
    state.timeLeft = state.roundDuration;
    state.timerRunning = false;
  }
}

function onlineMyTeamId(){
  const room = online.room;
  return room && room.players && room.players[online.playerId] ? room.players[online.playerId].teamId : null;
}

function onlineStartTimer(){
  const t = currentTeam();
  const nextCardIdx = Math.floor(Math.random()*REAL_DECK.length);
  const endAt = Date.now() + state.roundDuration*1000;
  window.FB.update(fbRoomRef(), { roundEndAt: endAt, correctCount: 0, skipCount: 0, foulCount: 0, foulPending: false, foulPausedAt: null, currentCardIdx: nextCardIdx });
  ensureOnlineLocalCountdown();
}

let onlineFinishTimeout = null;
function ensureOnlineLocalCountdown(){
  if(onlineFinishTimeout) clearTimeout(onlineFinishTimeout);
  const room = online.room;
  if(!room || !room.roundEndAt) return;
  if(room.foulPending) return;   // round is frozen for a foul decision
  const msLeft = room.roundEndAt - Date.now();
  if(msLeft <= 0){ finishRoundOnline(); return; }
  onlineFinishTimeout = setTimeout(() => {
    if(online.room && online.room.roundEndAt) finishRoundOnline();
  }, msLeft + 150);
}

function onlineCorrect(){
  if(!state.timerRunning || state.foulPending) return;
  sfxCorrect();
  const nextCardIdx = Math.floor(Math.random()*REAL_DECK.length);
  window.FB.update(fbRoomRef(), { correctCount: (state.correctCount||0)+1, currentCardIdx: nextCardIdx });
}
function onlineFoul(){
  if(!state.timerRunning || state.foulPending) return;
  sfxWrong();
  // everyone's clock has to stop, so we record when the pause began and
  // push the deadline back by the same amount when play resumes
  window.FB.update(fbRoomRef(), { foulPending: true, foulPausedAt: Date.now() });
}

function onlineResolveFoul(counted){
  const room = online.room;
  if(!room || !room.foulPending) return;
  const pausedFor = Math.max(0, Date.now() - (room.foulPausedAt || Date.now()));
  const updates = {
    foulPending: false,
    foulPausedAt: null,
    roundEndAt: (room.roundEndAt || Date.now()) + pausedFor
  };
  if(counted) updates.foulCount = (room.foulCount || 0) + 1;
  window.FB.update(fbRoomRef(), updates);
}

function onlineSkip(){
  if(!state.timerRunning || state.foulPending) return;
  sfxWrong();
  const nextCardIdx = Math.floor(Math.random()*REAL_DECK.length);
  window.FB.update(fbRoomRef(), { skipCount: (state.skipCount||0)+1, currentCardIdx: nextCardIdx });
}

function finishRoundOnline(){
  const room = online.room;
  if(!room || !room.roundEndAt) return;
  const t = currentTeam();
  const outcome = computeRoundOutcome(t, room.correctCount||0, room.skipCount||0, room.foulCount||0);
  const scoreChange = outcome.scoreChange;
  const moved = outcome.moved;
  const newPos = Math.max(0, Math.min(t.position + moved, state.trackLength - 1));
  const newScore = t.score + scoreChange;
  const updates = {};
  updates[`teams/${t.id}/position`] = newPos;
  updates[`teams/${t.id}/score`] = newScore;
  updates[`teams/${t.id}/mods`] = {}; // clear one-round mods after use (shieldAttack intentionally dropped too if unused this round in v1)
  updates['roundEndAt'] = null;
  updates['lastRoundSummary'] = { teamName: t.name, correct: room.correctCount||0, skip: room.skipCount||0, foul: room.foulCount||0, scoreChange, moved, landedCell: newPos };
  if(newPos >= state.trackLength - 1){
    updates['winnerTeamId'] = t.id;
    updates['roundEnded'] = false;
  } else if(state.obstacles.includes(newPos)){
    updates['actionPickActive'] = true;
    updates['actionRevealedIdx'] = null;
    updates['actionChosenCardIdx'] = drawActionCard();
    updates['wheelSpun'] = false;
    updates['roundEnded'] = false;
  } else {
    updates['roundEnded'] = true;
  }
  window.FB.update(fbRoomRef(), updates);
}

function computeActionEffectUpdates(effect, selfTeam, targetTeam, number){
  const updates = {};
  if(!effect) return updates;
  if(effect.attack && targetTeam && targetTeam.mods && targetTeam.mods.shieldAttack){
    updates[`teams/${targetTeam.id}/mods/shieldAttack`] = false;
    return updates;
  }
  switch(effect.type){
    case 'moveNow':
      updates[`teams/${selfTeam.id}/position`] = Math.max(0, Math.min(selfTeam.position + effect.delta, state.trackLength-1));
      break;
    case 'timeBonusSelf':
      updates[`teams/${selfTeam.id}/timerOverride`] = state.roundDuration + effect.seconds;
      break;
    case 'timeStealChoose':
      if(targetTeam) updates[`teams/${targetTeam.id}/timerOverride`] = Math.max(10, state.roundDuration - effect.seconds);
      updates[`teams/${selfTeam.id}/timerOverride`] = state.roundDuration + effect.seconds;
      break;
    case 'forceNumberSelf':
      updates[`teams/${selfTeam.id}/mods/forcedNumber`] = cellNumber(selfTeam.position);
      break;
    case 'forceNumberChoose':
      if(targetTeam) updates[`teams/${targetTeam.id}/mods/forcedNumber`] = number;
      break;
    case 'freeNumberSelf':
      updates[`teams/${selfTeam.id}/mods/forcedNumber`] = number;
      break;
    case 'shieldFirstNegative':
      updates[`teams/${selfTeam.id}/mods/shieldNegative`] = true;
      break;
    case 'doubleFirstCorrect':
      updates[`teams/${selfTeam.id}/mods/doubleFirstCorrect`] = true;
      break;
    case 'bonusIfScoreAtLeast':
      updates[`teams/${selfTeam.id}/mods/bonusThreshold`] = effect.threshold;
      updates[`teams/${selfTeam.id}/mods/bonusAmount`] = effect.bonus;
      break;
    case 'predictNumberBonus':
      updates[`teams/${selfTeam.id}/mods/predictNumber`] = number;
      updates[`teams/${selfTeam.id}/mods/predictBonus`] = effect.bonus;
      break;
    case 'perSkipPenaltyChoose':
      if(targetTeam) updates[`teams/${targetTeam.id}/mods/skipPenalty`] = effect.penalty;
      break;
    case 'blockSkipChoose':
      if(targetTeam) updates[`teams/${targetTeam.id}/mods/blockSkip`] = true;
      break;
    case 'blockMoveChoose':
      if(targetTeam) updates[`teams/${targetTeam.id}/mods/blockMoveThreshold`] = effect.threshold;
      break;
    case 'shieldNextAttack':
      updates[`teams/${selfTeam.id}/mods/shieldAttack`] = true;
      break;
    default: break;
  }
  return updates;
}

function onlineContinueNextTurn(effectUpdates){
  resetMapCamera();
  const room = online.room;
  const teams = onlineTeamsArray();
  const t = currentTeam();
  const nextDescriberIdx = ((t.describerIdx||0) + 1);
  const curIdx = teams.findIndex(x => x.id === t.id);
  const nextTeam = teams[(curIdx+1) % teams.length];
  const nextCardIdx = Math.floor(Math.random()*REAL_DECK.length);
  const updates = Object.assign({
    [`teams/${t.id}/describerIdx`]: nextDescriberIdx,
    currentTeamId: nextTeam.id,
    currentCardIdx: nextCardIdx,
    roundEnded: false,
    actionPickActive: false,
    actionRevealedIdx: null,
    actionChosenCardIdx: null,
  }, effectUpdates || {});
  window.FB.update(fbRoomRef(), updates);
}

function renderOnlineBoard(){
  ensureOnlineTicker();
  syncStateFromOnlineRoom();
  const wrap = el(`<div class="play-screen"></div>`);
  const room = online.room;
  if(!room || !state.teams.length){
    wrap.appendChild(el(`<div class="card">در حال بارگذاری بازی…</div>`));
    return wrap;
  }

  if(state.winner){
    wrap.appendChild(renderWinner());
    const backBtn = el(`<button class="btn btn-ghost">خروج از اتاق</button>`);
    backBtn.addEventListener('click', onlineLeaveRoom);
    wrap.appendChild(backBtn);
    return wrap;
  }

  const t = currentTeam();
  const myTeamId = onlineMyTeamId();
  const isTurnTeam = myTeamId === t.id;
  const describerPid = t.memberIds && t.memberIds.length ? t.memberIds[(t.describerIdx||0) % t.memberIds.length] : null;
  const isDescriber = isTurnTeam && describerPid === online.playerId;

  let roleLabel = 'ناظر (تیم دیگر)';
  if(isDescriber) roleLabel = 'توضیح‌دهنده';
  else if(isTurnTeam) roleLabel = 'هم‌تیمی توضیح‌دهنده';

  const header = el(`<div class="play-head"></div>`);
  header.appendChild(el(`<div class="play-turn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4Zm7.5.5c-.7 0-1.4.1-2 .3 1.2 1 2 2.3 2 3.7V19H22v-1.8c0-2-2.4-3.7-5.5-3.7Z"/></svg><span>نوبت ${t.name}</span></div>`));
  header.appendChild(el(`<div class="play-brand">نخ بده<span class="play-brand-dot"></span></div>`));
  wrap.appendChild(header);

  const status = el(`<div class="play-status"></div>`);
  status.appendChild(el(`<div class="play-status__item"><svg viewBox="0 0 24 24" width="16" height="16" fill="#E9B94C"><path d="M12 3 2.5 11h2.3v9h5.1v-5.6h4.2V20h5.1v-9h2.3L12 3Z"/></svg><span>خانه ${faNum(currentTargetNumber(t))}</span></div>`));
  status.appendChild(el(`<span class="play-status__sep"></span>`));
  status.appendChild(el(`<div class="play-status__item play-status__role">${roleLabel}</div>`));
  wrap.appendChild(status);

  if(state.roundEnded){
    const pendingAction = state.actionPickActive;
    wrap.appendChild(buildRoundResult(() => {
      // only clear the summary; the action phase advances the turn
      if(pendingAction){ window.FB.update(fbRoomRef(), { roundEnded: false }); return; }
      onlineContinueNextTurn();
    }, pendingAction ? 'روی خونه‌ی ویژه افتادی — برو سراغ گردونه' : null));
    return wrap;
  }

  if(state.actionPickActive){
    const s = state.lastRoundSummary || {};
    wrap.appendChild(renderMapFullScreen());
    wrap.appendChild(el(`<div class="action-banner" style="border-color:var(--teal); background:rgba(51,201,181,.12); text-align:right; margin-bottom:10px;">
      <div class="cardtag" style="color:var(--teal);">خلاصه‌ی این راند — ${s.teamName || ''}</div>
      <p style="margin:0 0 4px;">✓ درست: ${faNum(s.correct ?? 0)} &nbsp; | &nbsp; ✕ رد شده: ${faNum(s.skip ?? 0)}</p>
      <p style="margin:0;">تغییر امتیاز: ${(s.scoreChange ?? 0) >= 0 ? '+' : '−'}${faNum(Math.abs(s.scoreChange ?? 0))} — حرکت: ${(s.moved ?? 0) >= 0 ? '+' : '−'}${faNum(Math.abs(s.moved ?? 0))} خانه</p>
    </div>`));
    const backdrop = el(`<div class="card-modal-backdrop"></div>`);
    const modal = el(`<div class="card-modal"></div>`);
    if(!state.wheelDone){
      modal.appendChild(el(`<div class="act-lead">تیم «${t.name}» روی خونه‌ی کارت ویژه فرود اومد!</div>`));
      modal.appendChild(renderWheelStage(room.actionChosenCardIdx || 0, state.wheelSpun, isTurnTeam, () => {
        sfxHop();
        window.FB.update(fbRoomRef(), { wheelSpun: true });
      }));
      backdrop.appendChild(modal);
      wrap.appendChild(backdrop);
      wrap.appendChild(renderScoreboard());
      return wrap;
    }
    modal.appendChild(el(`<div class="act-lead">گردونه این کارت رو آورد!</div>`));
    modal.appendChild(renderActionCard(state.actionChosenCard, room.actionChosenCardIdx));
    const effect = ACTION_EFFECTS[room.actionChosenCardIdx];
    if(isTurnTeam && effect){
      const choiceUI = buildEffectChoiceUI(effect, t.id, (targetId, number) => {
        const targetTeam = targetId ? state.teams.find(x => x.id === targetId) : null;
        const effectUpdates = computeActionEffectUpdates(effect, t, targetTeam, number);
        onlineContinueNextTurn(effectUpdates);
      });
      modal.appendChild(choiceUI);
    } else {
      modal.appendChild(el(`<div style="color:#F3D37A; font-size:13px; text-align:center; margin-top:10px;">منتظر تیم «${t.name}» بمون…</div>`));
    }
    backdrop.appendChild(modal);
    wrap.appendChild(backdrop);
    wrap.appendChild(renderScoreboard());
    return wrap;
  }

  const cardViewEl = renderCardView(isDescriber, isTurnTeam);
  if(state.flashFeedback === 'correct') cardViewEl.classList.add('flash-correct');
  if(state.flashFeedback === 'wrong') cardViewEl.classList.add('flash-wrong');
  wrap.appendChild(renderPlayTimer());
  wrap.appendChild(cardViewEl);
  wrap.appendChild(buildFoulRow(onlineFoul, onlineResolveFoul));

  if(isDescriber){
    const blocked = t.mods && t.mods.blockSkip;
    const actions = el(`<div class="play-actions"></div>`);
    const skipBtn = el(`<button class="play-act play-act--skip"><span class="play-act__ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></span><span>رد شد${blocked ? ' (قفل)' : ''}</span></button>`);
    skipBtn.disabled = !state.timerRunning || blocked;
    skipBtn.addEventListener('click', onlineSkip);
    const startBtn = el(`<button class="play-act play-act--start"><span class="play-act__ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg></span><span>شروع تایمر</span></button>`);
    startBtn.disabled = state.timerRunning;
    startBtn.addEventListener('click', onlineStartTimer);
    const correctBtn = el(`<button class="play-act play-act--ok"><span class="play-act__ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17.5 L19 7"/></svg></span><span>درست گفت</span></button>`);
    correctBtn.disabled = !state.timerRunning;
    correctBtn.addEventListener('click', onlineCorrect);
    actions.appendChild(skipBtn);
    actions.appendChild(startBtn);
    actions.appendChild(correctBtn);
    wrap.appendChild(actions);
  } else if(isTurnTeam){
    wrap.appendChild(el(`<div class="play-note">🙈 نوبت تیمته؛ فقط توضیح‌دهنده دکمه‌ها رو می‌زنه.</div>`));
  } else {
    wrap.appendChild(el(`<div class="play-note">منتظر بمون، نوبت تیم «${t.name}»ه.</div>`));
  }

  wrap.appendChild(buildPlayScore());
  const leaveBtn = el(`<button class="play-leave">خروج از اتاق</button>`);
  leaveBtn.addEventListener('click', onlineLeaveRoom);
  wrap.appendChild(leaveBtn);
  return wrap;
}

function renderSettings(){
  const wrap = el(`<div class="setup-page settings"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">نخ بده<span class="setup-brand-dot"></span></div></div>`));

  // ---- round length ----
  const MIN = 10, MAX = 180, STEP = 5, OFFICIAL = 90;
  const setDuration = v => { state.roundDuration = Math.max(MIN, Math.min(MAX, v)); render(); };
  const durCard = el(`<div class="team-card set-card"></div>`);
  durCard.appendChild(el(`<h2 class="set-card__title">مدت زمان هر راند</h2>`));
  const stepper = el(`<div class="set-stepper"></div>`);
  const minus = el(`<button class="set-step" aria-label="کمتر"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14"/></svg></button>`);
  const plus = el(`<button class="set-step" aria-label="بیشتر"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>`);
  minus.disabled = state.roundDuration <= MIN;
  plus.disabled = state.roundDuration >= MAX;
  minus.addEventListener('click', () => setDuration(state.roundDuration - STEP));
  plus.addEventListener('click', () => setDuration(state.roundDuration + STEP));
  stepper.appendChild(plus);
  stepper.appendChild(el(`<div class="set-value"><b>${faNum(state.roundDuration)}</b><span>ثانیه</span></div>`));
  stepper.appendChild(minus);
  durCard.appendChild(stepper);
  const presets = el(`<div class="set-presets"></div>`);
  [60, 90, 120].forEach(v => {
    const chip = el(`<button class="set-chip ${state.roundDuration === v ? 'is-on' : ''}">${faNum(v)}${v === OFFICIAL ? ' · رسمی' : ''}</button>`);
    chip.addEventListener('click', () => setDuration(v));
    presets.appendChild(chip);
  });
  durCard.appendChild(presets);
  durCard.appendChild(el(`<small class="set-hint">مقدار رسمی بازی ${faNum(OFFICIAL)} ثانیه‌ست. این تنظیم فقط روی همین گوشی اثر داره.</small>`));
  wrap.appendChild(durCard);

  // ---- sound & vibration ----
  const fbCard = el(`<div class="team-card set-card"></div>`);
  fbCard.appendChild(el(`<h2 class="set-card__title">صدا و لرزش</h2>`));
  [['sound', 'صدای بازی'], ['haptic', 'لرزش']].forEach(([key, label]) => {
    const row = el(`<button class="set-switch" role="switch" aria-checked="${prefs[key]}"><span class="set-switch__lbl">${label}</span><span class="set-switch__knob" aria-hidden="true"></span></button>`);
    row.addEventListener('click', () => {
      prefs[key] = !prefs[key];
      LS.set(key, prefs[key]);
      if(prefs[key]) sfxTap();
      render();
    });
    fbCard.appendChild(row);
  });
  wrap.appendChild(fbCard);

  // ---- board facts ----
  const infoCard = el(`<div class="team-card set-card"></div>`);
  infoCard.appendChild(el(`<h2 class="set-card__title">اطلاعات نقشه</h2>`));
  infoCard.appendChild(el(`<div class="set-stats">
    <div class="set-stat"><b>${faNum(state.trackLength)}</b><span>خانه</span></div>
    <div class="set-stat"><b>${faNum(state.obstacles.length)}</b><span>خانه‌ی ویژه</span></div>
    <div class="set-stat"><b>${faNum(state.deck.length)}</b><span>کارت</span></div>
  </div>`));
  wrap.appendChild(infoCard);

  // the rules live on the tutorial screen; no second copy here
  const learn = el(`<button class="team-card__add set-learn">قوانین و آموزش بازی</button>`);
  learn.addEventListener('click', () => { state.screen = 'tutorial'; render(); });
  wrap.appendChild(learn);

  return wrap;
}

// ---------------- TUTORIAL SCREEN ----------------
function renderTutorial(){
  LS.set('seenTutorial', true);
  const wrap = el(`<div class="tut"></div>`);
  const dur = faNum(state.roundDuration);
  const last = faNum(state.trackLength);

  wrap.appendChild(el(`<div class="card tut-intro">
    <h2>آموزش بازی</h2>
    <p>«نخ بده» یک بازی حدس کلمات گروهیه. هر تیم می‌خواد زودتر از بقیه خودش رو به خانه‌ی آخر نقشه برسونه؛ و راهش اینه که کلمه‌ها رو درست توضیح بده و درست حدس بزنه.</p>
  </div>`));

  const wordCells = [1,2,3,4,5,6].map(n => `<li><b>${faNum(n)}</b><span>کلمه‌ی ${faNum(n)}</span></li>`).join('');
  const actionRows = ACTION_CARDS.map(c => `<li><b>${c.title}</b><span>${c.instruction}</span></li>`).join('');

  const sections = [
    ['🎯', 'هدف بازی', `
      <p>اولین تیمی که مهره‌اش به خانه‌ی <b>${last}</b> برسه، برنده‌ست.</p>
      <p>مهره‌ی هر تیم روی نقشه جلو می‌ره؛ هر چقدر راندت بهتر باشه، بیشتر جلو می‌ری.</p>`],
    ['🧶', 'آماده‌سازی', `
      <p>دو یا چند تیم تشکیل بدین. مهره‌ی هر تیم روی خانه‌ی شروع قرار می‌گیره.</p>
      <p>می‌تونین روی یک گوشی بازی کنین یا از بخش «بازی آنلاین» یک اتاق بسازین و بقیه با کد اتاق وارد بشن.</p>`],
    ['🔁', 'نوبت هر تیم', `
      <p>تیم‌ها به نوبت بازی می‌کنن. در هر نوبت <b>یک نفر</b> از تیم، «توضیح‌دهنده» می‌شه و بقیه‌ی هم‌تیمی‌ها حدس می‌زنن. دفعه‌ی بعد که نوبت این تیم شد، نفر بعدی توضیح می‌ده.</p>
      <p>هر راند <b>${dur} ثانیه</b> طول می‌کشه و با زدن دکمه‌ی شروع تایمر آغاز می‌شه.</p>`],
    ['🃏', 'کارت و شماره‌ی کلمه', `
      <p>روی هر کارت <b>شش کلمه</b> هست. فقط توضیح‌دهنده کارت رو می‌بینه.</p>
      <p>اینکه کدوم کلمه رو باید توضیح بده، به <b>شماره‌ی خانه‌ای</b> بستگی داره که مهره‌ی تیم روش ایستاده؛ خانه‌ها به ترتیب ۱ تا ۶ شماره می‌گیرن و دوباره از ۱ شروع می‌شن. مثلاً اگه شماره‌ی خانه‌ات ۳ باشه، کلمه‌ی سوم کارت رو توضیح می‌دی.</p>
      <ul class="tut-list tut-list--six">${wordCells}</ul>`],
    ['🗣️', 'توضیح دادن', `
      <p>توضیح‌دهنده کلمه رو با جمله‌ها و مثال‌هاش توضیح می‌ده، ولی <b>نباید</b> خودِ کلمه رو بگه.</p>
      <p>اگه هم‌تیمی‌ها درست حدس زدن، دکمه‌ی «درست» رو بزن تا کارت بعدی بیاد. اگه توضیح دادن سخته، «رد شد» رو بزن؛ البته رد کردن امتیاز منفی داره.</p>
      <p>اگه توضیح‌دهنده راهنمایی غیرمجاز بده (مثلاً کلمه رو بگه)، هر کسی می‌تونه دکمه‌ی «راهنمایی غیرمجاز» رو بزنه. تایمر می‌ایسته و تیم مقابل تصمیم می‌گیره: تأیید یا برگردوندن. اگه تأیید بشه، یک امتیاز منفی ثبت می‌شه.</p>`],
    ['➕', 'امتیاز و حرکت', `
      <ul class="tut-list">
        <li><b>+۱</b><span>هر جواب درست</span></li>
        <li><b>−۱</b><span>هر «رد شد»</span></li>
        <li><b>−۱</b><span>هر راهنمایی غیرمجاز</span></li>
      </ul>
      <p>آخر راند، امتیاز خالص همون تعداد خانه‌ایه که مهره جلو (یا عقب) می‌ره. مثلاً ۵ درست، ۱ رد و ۱ خطا یعنی ${faNum(5-1-1)} خانه جلو.</p>`],
    ['🎡', 'خانه‌های ویژه و گردونه', `
      <p>روی نقشه <b>${faNum(state.obstacles.length)} خانه‌ی ویژه</b> هست. هر تیمی آخر راند روی یکی از اونا بایسته، گردونه رو می‌چرخونه و یک «کارت فرمان» می‌گیره.</p>
      <p>اثر بعضی کارت‌ها همون لحظه اعمال می‌شه و بعضی‌ها روی راند بعدی تیم اثر می‌ذارن. کارت‌های حمله‌ای تیم هدف رو خودت انتخاب می‌کنی.</p>
      <p>«کارت نجات» حمله‌ی بعدی علیه تیمت رو خنثی می‌کنه.</p>`],
    ['⚡', 'کارت‌های فرمان', `
      <p>این‌ها همه‌ی کارت‌هایی‌ان که ممکنه از گردونه دربیاد:</p>
      <ul class="tut-list tut-list--cards">${actionRows}</ul>`],
    ['💡', 'نکته‌های آخر', `
      <p>• اگه عقب‌تر از خانه‌ی شروع بری، همون‌جا می‌مونی.</p>
      <p>• کارت‌های فرمان می‌تونن بازی رو کامل برگردونن، پس تا آخرش امیدوار باش!</p>`],
  ];

  sections.forEach(([icon, title, body], i) => {
    const d = el(`<details class="card tut-sec"${i === 0 ? ' open' : ''}>
      <summary><span class="tut-sec__ico">${icon}</span><span class="tut-sec__title">${title}</span><span class="tut-sec__chev" aria-hidden="true"></span></summary>
      <div class="about-body tut-sec__body">${body}</div>
    </details>`);
    wrap.appendChild(d);
  });

  const start = el(`<button class="btn btn-primary tut-start">شروع بازی</button>`);
  start.addEventListener('click', () => { state.screen = 'setup'; render(); });
  wrap.appendChild(start);
  return wrap;
}

// Screens you may leave with a visible control. The board is deliberately
// excluded: a round in progress should not be abandoned by a stray tap.
const NO_BACK_SCREENS = ['home', 'board', 'online-board'];

function attachBackButton(app){
  if(NO_BACK_SCREENS.includes(state.screen)) return;
  if(state.foulPending || state.actionPickActive || state.roundEnded || state.animating) return;
  const btn = el(`<button class="app-back" aria-label="بازگشت"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></button>`);
  btn.addEventListener('click', goBack);
  app.appendChild(btn);
}
function handleAppBack(){
  if(state.homeSheet){ state.homeSheet = false; render(); return true; }
  // a mid-round decision must not be skipped by a stray back press
  if(state.showAbout){ state.showAbout = false; render(); return true; }
  if(state.foulPending || state.actionPickActive || state.roundEnded || state.animating) return true;
  if(state.screen === 'home'){
    // the browser already consumed one entry, so the next press really exits;
    // say so instead of leaving the game by accident
    state.toast = 'برای خروج، دوباره دکمه بازگشت را بزنید';
    render();
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => { state.toast = null; render(); }, 1900);
    return false;
  }
  goBack();
  return true;
}

function installBackHandler(){
  if(!window.history || !window.history.pushState) return;
  try { history.pushState({ nb: 1 }, ''); } catch(e){ return; }
  window.addEventListener('popstate', () => {
    if(handleAppBack()){
      // re-arm so the following back press reaches the game too
      try { history.pushState({ nb: 1 }, ''); } catch(e){}
    }
  });
}

function goBack(){
  const s = state.screen;
  if(s === 'online-create' || s === 'online-join'){
    state.screen = 'online-home';
    render();
  } else if(s === 'settings' || s === 'setup' || s === 'online-home' || s === 'tutorial'){
    state.screen = 'home';
    render();
  } else if(s === 'online-lobby'){
    onlineLeaveRoom();
  } else if(s === 'online-board'){
    if(confirm('با خروج، بازی برای بقیه هم ادامه پیدا می‌کنه ولی تو دیگه توش نیستی. مطمئنی؟')){
      onlineLeaveRoom();
    }
  } else if(s === 'board'){
    stopTimerInterval();
    state.screen = 'home';
    render();
  } else {
    state.screen = 'home';
    render();
  }
}

function renderBrand(){
  // these screens draw their own header (brand + back), so the global bar
  // would render a second logo and a second back button on top of them
  const ownHeader = ['home','online-home','online-create','online-join','setup','board','online-board','online-lobby','settings'];
  if(ownHeader.includes(state.screen)){
    return el(`<div style="display:none;"></div>`);
  }
  const wrap = el(`<div class="brand"></div>`);
  wrap.appendChild(el(`<span class="dot"></span>`));
  wrap.appendChild(el(`<h1>نخ بده</h1>`));
  return wrap;
}

// ---------------- SETUP SCREEN ----------------
function renderSetup(){
  const wrap = el(`<div class="setup-page"></div>`);

  // ---- header ----
  const header = el(`<div class="setup-head"></div>`);
  header.appendChild(el(`<div class="setup-brand">نخ بده<span class="setup-brand-dot"></span></div>`));
  wrap.appendChild(header);

  // ---- team cards ----
  state.teams.forEach((team, ti) => {
    const block = el(`<div class="team-card"></div>`);

    const head = el(`<div class="team-card__head"></div>`);
    const nameInput = el(`<input class="team-card__name" type="text" value="${team.name}" />`);
    nameInput.addEventListener('input', e => { team.name = e.target.value; syncScoreLabelsOnly(); });
    head.appendChild(nameInput);
    head.appendChild(el(`<span class="team-card__color"><span class="team-card__swatch" style="background:${team.color}"></span><span>رنگ تیم روی نقشه</span></span>`));
    const removeTeamBtn = el(`<button class="team-card__x" title="حذف تیم"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button>`);
    removeTeamBtn.disabled = state.teams.length <= 2;
    removeTeamBtn.addEventListener('click', () => {
      if(state.teams.length <= 2) return;
      state.teams.splice(ti,1);
      render();
    });
    head.appendChild(removeTeamBtn);
    block.appendChild(head);

    const grid = el(`<div class="team-card__players"></div>`);
    team.members.forEach((m, mi) => {
      const cell = el(`<div class="player-cell"></div>`);
      const inp = el(`<input class="player-cell__input" type="text" value="${m}" />`);
      inp.addEventListener('input', e => { team.members[mi] = e.target.value; });
      cell.appendChild(inp);
      if(team.members.length > 2){
        const del = el(`<button class="player-cell__x" title="حذف بازیکن"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button>`);
        del.addEventListener('click', () => { team.members.splice(mi,1); render(); });
        cell.appendChild(del);
      }
      grid.appendChild(cell);
    });
    block.appendChild(grid);

    if(team.members.length < 10){
      const addMember = el(`<button class="team-card__add">+ افزودن بازیکن</button>`);
      addMember.addEventListener('click', () => {
        team.members.push('بازیکن ' + (team.members.length + 1));
        render();
      });
      block.appendChild(addMember);
    }
    wrap.appendChild(block);
  });

  // ---- add team ----
  if(state.teams.length < 10){
    const addTeam = el(`<button class="setup-addteam">+ افزودن تیم</button>`);
    addTeam.addEventListener('click', () => {
      const idx = state.teams.length;
      state.teams.push({
        id: idx+1, name:'تیم ' + (idx+1), color: TEAM_COLORS[idx % TEAM_COLORS.length], icon: TEAM_ICONS[idx % TEAM_ICONS.length],
        members:['بازیکن ۱','بازیکن ۲'], position:0, score:0, describerIdx:0, timerOverride:null, mods:{}
      });
      render();
    });
    wrap.appendChild(addTeam);
  }

  // ---- custom word cards ----
  const deckCard = el(`<div class="deck-card">
    <h2 class="deck-card__title">کارت‌های کلمه</h2>
    <p class="deck-card__sub">اگر خواستی خودت دستی جایگزینش کنی، اینجا بنویس (هر خط = یک کارت).</p>
    <textarea class="deck-card__area" id="deckInput" placeholder="برای جایگزینی، اینجا کارت‌های خودت رو بنویس..."></textarea>
  </div>`);
  const ta = deckCard.querySelector('#deckInput');
  ta.value = '';
  ta.addEventListener('change', e => {
    const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(l => l.split(',').map(w => w.trim()).filter(Boolean)).filter(c => c.length >= 2)
      .map(words => ({words}));
    if(parsed.length) state.deck = parsed;
  });
  wrap.appendChild(deckCard);

  const startBtn = el(`<button class="setup-start"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg><span>شروع بازی و رفتن به تخته</span></button>`);
  startBtn.addEventListener('click', startGame);
  wrap.appendChild(startBtn);

  wrap.appendChild(el(`<div class="setup-note">بعد از شروع بازی، از منوی «دیدن به‌عنوان» می‌تونی چیزی که هر بازیکن می‌بینه رو ببینی.</div>`));

  return wrap;
}

function syncScoreLabelsOnly(){ /* names update live via re-render on other actions; no-op here to avoid losing focus */ }

// ---------------- GAME START ----------------
function startGame(){
  state.teams.forEach(t => { t.position = 0; t.score = 0; t.describerIdx = 0; });
  state.currentTeamIdx = 0;
  state.winner = null;
  state.actionMsg = null;
  state.actionPickActive = false;
  state.actionRevealedIdx = null;
  state.actionChosenCard = null;
  state.hasActiveGame = true;
  drawCard();
  state.viewerKey = describerKey();
  saveLocalGame();
  state.screen = 'board';
  render();
}

function currentTeam(){ return state.teams[state.currentTeamIdx]; }

// A local game is saved at the start of every turn, so closing the app
// between rounds loses nothing.
function saveLocalGame(){
  if(!state.hasActiveGame || state.winner){ LS.del('game'); return; }
  LS.set('game', { v:1, teams: JSON.parse(JSON.stringify(state.teams)), currentTeamIdx: state.currentTeamIdx, roundDuration: state.roundDuration, at: Date.now() });
}
function storedLocalGame(){
  const g = LS.get('game', null);
  const ok = g && Array.isArray(g.teams) && g.teams.length >= 2 &&
    g.teams.every(t => t && typeof t.name === 'string' && Array.isArray(t.members) && t.members.length);
  return ok ? g : null;
}
function hasSavedGame(){
  return (state.hasActiveGame && !state.winner && state.teams.length >= 2) || !!storedLocalGame();
}
function resumeLocalGame(){
  if(!(state.hasActiveGame && !state.winner)){
    const g = storedLocalGame();
    if(!g){ LS.del('game'); toastHome('بازی ذخیره‌شده پیدا نشد'); return; }
    state.teams = g.teams;
    state.currentTeamIdx = Math.min(Math.max(g.currentTeamIdx || 0, 0), g.teams.length - 1);
    if(g.roundDuration >= 10 && g.roundDuration <= 180) state.roundDuration = g.roundDuration;
    state.hasActiveGame = true;
    state.winner = null;
  }
  stopTimerInterval();
  // an unfinished round is replayed from its start
  state.roundEnded = false; state.timerRunning = false; state.timeLeft = state.roundDuration;
  state.correctCount = 0; state.skipCount = 0; state.foulCount = 0; state.foulPending = false;
  state.animating = false; state.actionPickActive = false; state.actionChosenCard = null;
  state.actionRevealedIdx = null;
  resetWheel();
  drawCard();
  state.viewerKey = describerKey();
  state.screen = 'board';
  render();
}
function describerKey(){
  const t = currentTeam();
  return state.currentTeamIdx + ':' + (t.describerIdx % t.members.length);
}

function drawCard(){
  state.cardPeekNum = null;
  if(state.deck.length === 0){
    state.deck = JSON.parse(JSON.stringify(REAL_DECK));
  }
  const idx = Math.floor(Math.random() * state.deck.length);
  state.currentCard = state.deck[idx];
}

// ---------------- BOARD SCREEN ----------------
function buildFoulRow(onAdd, onResolve){
  // anyone at the table can raise an illegal hint, and anyone can settle it:
  // the rival team is the real referee, so this is not locked to one team
  if(state.foulPending){
    const bar = el(`<div class="foul-row foul-row--pending"></div>`);
    bar.appendChild(el(`<span class="foul-pending__label">راهنمایی غیرمجاز بود؟</span>`));
    const yes = el(`<button class="foul-confirm"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17.5 L19 7"/></svg><span>تأیید</span></button>`);
    yes.addEventListener('click', () => onResolve(true));
    const no = el(`<button class="foul-undo"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 L4 9 L9 4"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg><span>برگردان</span></button>`);
    no.addEventListener('click', () => onResolve(false));
    bar.appendChild(yes);
    bar.appendChild(no);
    return bar;
  }
  const row = el(`<div class="foul-row"></div>`);
  const btn = el(`<button class="foul-btn"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L22 20 L2 20 Z"/><path d="M12 9.6v4.2"/><path d="M12 17h.01"/></svg><span>راهنمایی غیرمجاز</span>${state.foulCount ? `<span class="foul-count">${faNum(state.foulCount)}</span>` : ''}</button>`);
  btn.disabled = !state.timerRunning;
  btn.addEventListener('click', onAdd);
  row.appendChild(btn);
  return row;
}

function renderBoard(){
  const wrap = el(`<div class="play-screen"></div>`);

  if(state.winner){
    wrap.appendChild(renderWinner());
    return wrap;
  }

  const [vTeamIdx, vMemberIdx] = state.viewerKey.split(':').map(Number);
  const isTurnTeam = vTeamIdx === state.currentTeamIdx;
  const isDescriber = isTurnTeam && (vMemberIdx === (currentTeam().describerIdx % currentTeam().members.length));
  let roleLabel = '';
  if(isDescriber) roleLabel = 'توضیح‌دهنده';
  else if(isTurnTeam) roleLabel = 'هم‌تیمی توضیح‌دهنده';
  else roleLabel = 'ناظر (تیم دیگر)';

  // ---- compact header: back + brand + turn pill ----
  const header = el(`<div class="play-head"></div>`);
  header.appendChild(el(`<div class="play-turn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4Zm7.5.5c-.7 0-1.4.1-2 .3 1.2 1 2 2.3 2 3.7V19H22v-1.8c0-2-2.4-3.7-5.5-3.7Z"/></svg><span>نوبت ${currentTeam().name}</span></div>`));
  header.appendChild(el(`<div class="play-brand">نخ بده<span class="play-brand-dot"></span></div>`));
  wrap.appendChild(header);

  // ---- compact status row: cell | role | viewer select ----
  const status = el(`<div class="play-status"></div>`);
  status.appendChild(el(`<div class="play-status__item"><svg viewBox="0 0 24 24" width="16" height="16" fill="#E9B94C"><path d="M12 3 2.5 11h2.3v9h5.1v-5.6h4.2V20h5.1v-9h2.3L12 3Z"/></svg><span>خانه ${faNum(currentTargetNumber(currentTeam()))}</span></div>`));
  status.appendChild(el(`<span class="play-status__sep"></span>`));
  status.appendChild(el(`<div class="play-status__item play-status__role">${roleLabel}</div>`));
  const select = el(`<select class="play-status__select"></select>`);
  state.teams.forEach((team, ti) => {
    const optGroup = el(`<optgroup label="${team.name}"></optgroup>`);
    team.members.forEach((m, mi) => {
      const key = ti+':'+mi;
      const opt = el(`<option value="${key}">${m}</option>`);
      if(key === state.viewerKey) opt.selected = true;
      optGroup.appendChild(opt);
    });
    select.appendChild(optGroup);
  });
  select.addEventListener('change', e => { state.viewerKey = e.target.value; render(); });
  status.appendChild(select);
  wrap.appendChild(status);

  if(state.animating){
    wrap.appendChild(renderMapFullScreen());
    wrap.appendChild(el(`<div class="pick-intro">در حال حرکت روی نقشه…</div>`));
    return wrap;
  }

  if(state.roundEnded){
    const pendingAction = state.actionPickActive;
    wrap.appendChild(buildRoundResult(() => {
      state.roundEnded = false;
      // when a special cell is pending, the action phase is what ends the turn —
      // advancing here too would skip the next team
      if(pendingAction){ render(); return; }
      nextTurn();
      render();
    }, pendingAction ? 'روی خونه‌ی ویژه افتادی — برو سراغ گردونه' : null));
    return wrap;
  }

  if(state.actionPickActive){
    const t = currentTeam();
    const s = state.lastRoundSummary || {};
    if(!state.actionChosenCard){
      const ai = drawActionCard();
      state.actionChosenIdx = ai;
      state.actionChosenCard = ACTION_CARDS[ai];
    }
    wrap.appendChild(renderMapFullScreen());
    wrap.appendChild(el(`<div class="action-banner" style="border-color:var(--teal); background:rgba(51,201,181,.12); text-align:right; margin-bottom:10px;">
      <div class="cardtag" style="color:var(--teal);">خلاصه‌ی این راند — ${s.teamName || ''}</div>
      <p style="margin:0 0 4px;">✓ درست: ${faNum(s.correct ?? 0)} &nbsp; | &nbsp; ✕ رد شده: ${faNum(s.skip ?? 0)}</p>
      <p style="margin:0;">تغییر امتیاز: ${(s.scoreChange ?? 0) >= 0 ? '+' : '−'}${faNum(Math.abs(s.scoreChange ?? 0))} — حرکت: ${(s.moved ?? 0) >= 0 ? '+' : '−'}${faNum(Math.abs(s.moved ?? 0))} خانه</p>
    </div>`));
    const backdrop = el(`<div class="card-modal-backdrop"></div>`);
    const modal = el(`<div class="card-modal"></div>`);
    if(!state.wheelDone){
      modal.appendChild(el(`<div class="act-lead">روی خونه‌ی کارت ویژه فرود اومدی!</div>`));
      modal.appendChild(renderWheelStage(state.actionChosenIdx, state.wheelSpun, true, () => {
        state.wheelSpun = true;
        sfxHop();
        render();
      }));
      backdrop.appendChild(modal);
      wrap.appendChild(backdrop);
      wrap.appendChild(renderScoreboard());
      return wrap;
    }
    modal.appendChild(el(`<div class="act-lead">گردونه این کارت رو برات آورد!</div>`));
    modal.appendChild(renderActionCard(state.actionChosenCard, state.actionChosenIdx));
    const effect = ACTION_EFFECTS[state.actionChosenIdx];
    const choiceUI = buildEffectChoiceUI(effect, t.id, (targetId, number) => {
      const targetTeam = targetId ? state.teams.find(x => x.id === targetId) : null;
      applyActionCardEffect(effect, t, targetTeam, number);
      state.actionPickActive = false;
      state.actionRevealedIdx = null;
      state.actionChosenCard = null;
      state.actionChosenIdx = null;
      resetWheel();
      nextTurn();
      render();
    });
    modal.appendChild(choiceUI);
    backdrop.appendChild(modal);
    wrap.appendChild(backdrop);
    wrap.appendChild(renderScoreboard());
    return wrap;
  }

  // ---- compact timer ----
  wrap.appendChild(renderPlayTimer());

  // ---- main word card (visual focus) ----
  const cardViewEl = renderCardView(isDescriber, isTurnTeam);
  if(state.flashFeedback === 'correct') cardViewEl.classList.add('flash-correct');
  if(state.flashFeedback === 'wrong') cardViewEl.classList.add('flash-wrong');
  wrap.appendChild(cardViewEl);

  // ---- one row of action buttons ----
  const blocked = currentTeam().mods && currentTeam().mods.blockSkip;
  const actions = el(`<div class="play-actions"></div>`);

  const skipBtn = el(`<button class="play-act play-act--skip"><span class="play-act__ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></span><span>رد شد</span></button>`);
  skipBtn.disabled = !state.timerRunning || blocked;
  skipBtn.addEventListener('click', onSkip);

  const effectiveDuration = currentTeam().timerOverride || state.roundDuration;
  const startBtn = el(`<button class="play-act play-act--start"><span class="play-act__ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg></span><span>شروع تایمر</span></button>`);
  startBtn.disabled = state.timerRunning;
  startBtn.addEventListener('click', startTimer);

  const correctBtn = el(`<button class="play-act play-act--ok"><span class="play-act__ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17.5 L19 7"/></svg></span><span>درست گفت</span></button>`);
  correctBtn.disabled = !state.timerRunning;
  correctBtn.addEventListener('click', onCorrect);

  actions.appendChild(skipBtn);
  actions.appendChild(startBtn);
  actions.appendChild(correctBtn);
  wrap.appendChild(buildFoulRow(onFoul, resolveFoul));
  wrap.appendChild(actions);

  wrap.appendChild(buildPlayScore());

  return wrap;
}

function buildPlayScore(){
  const sb = el(`<div class="play-score"></div>`);
  state.teams.forEach((t, i) => {
    if(i > 0) sb.appendChild(el(`<span class="play-score__sep"></span>`));
    sb.appendChild(el(`<div class="play-score__team ${t===currentTeam()?'is-active':''}">
      <div class="play-score__name"><span class="play-score__dot" style="background:${t.color}"></span>${t.name}</div>
      <div class="play-score__vals">امتیاز: ${faNum(t.score)} | خانه ${faNum(t.position+1)}</div>
    </div>`));
  });
  return sb;
}

function renderPlayTimer(){
  const total = currentTeam().timerOverride || state.roundDuration;
  const pct = Math.max(0, Math.min(1, state.timeLeft / total));
  const deg = Math.round(pct * 360);
  const left = state.timeLeft;
  // the ring warms up as the round runs out
  let tier = 'calm', colour = '#E9B94C';
  if(state.timerRunning && left <= 10){ tier = 'hot';  colour = '#FF5A46'; }
  else if(state.timerRunning && left <= 25){ tier = 'warm'; colour = '#FF9B3D'; }
  // The board is rebuilt on every tap, so keying the beat to "is the timer
  // running" replayed it on each click. Only beat when the second changes.
  const beat = state.timerRunning && left !== lastTimerSecond;
  lastTimerSecond = left;
  const ring = el(`<div class="play-timer is-${tier} ${beat ? 'is-tick' : ''}">
    <div class="play-timer__ring" style="background: conic-gradient(${colour} ${deg}deg, rgba(255,255,255,.10) ${deg}deg);">
      <div class="play-timer__face">${faNum(left)}</div>
    </div>
  </div>`);
  timerEl = ring;
  return ring;
}

// Refresh only the clock each second. Rebuilding the whole screen restarted
// every in-flight animation (the flash, the score pop, the streak glow), which
// is what read as flickering while tapping.
function tickTimerOnly(){
  if(!timerEl || !timerEl.isConnected) return false;
  const total = currentTeam().timerOverride || state.roundDuration;
  const left = state.timeLeft;
  const deg = Math.round(Math.max(0, Math.min(1, left / total)) * 360);
  let tier = 'calm', colour = '#E9B94C';
  if(state.timerRunning && left <= 10){ tier = 'hot';  colour = '#FF5A46'; }
  else if(state.timerRunning && left <= 25){ tier = 'warm'; colour = '#FF9B3D'; }

  const face = timerEl.querySelector('.play-timer__face');
  const ring = timerEl.querySelector('.play-timer__ring');
  if(!face || !ring) return false;
  timerEl.classList.remove('is-calm','is-warm','is-hot','is-tick');
  timerEl.classList.add('is-' + tier);
  ring.style.background = `conic-gradient(${colour} ${deg}deg, rgba(255,255,255,.10) ${deg}deg)`;
  face.textContent = faNum(left);
  if(state.timerRunning && left !== lastTimerSecond){
    void timerEl.offsetWidth;
    timerEl.classList.add('is-tick');
  }
  lastTimerSecond = left;
  return true;
}

function cellNumber(pos){ return (pos % 6) + 1; }

function currentTargetNumber(team){
  if(team.mods && team.mods.forcedNumber) return team.mods.forcedNumber;
  return cellNumber(team.position);
}

function computeRoundOutcome(team, correctCount, skipCount, foulCount){
  const mods = team.mods || {};
  const skipPenalty = mods.skipPenalty || 1;
  const fouls = foulCount || 0;
  // an illegal hint is a rule break, not a failed description: the score
  // shield forgives a skip but never a foul
  let scoreChange = correctCount - skipCount*skipPenalty - fouls;
  if(mods.shieldNegative && skipCount > 0){ scoreChange += skipPenalty; }
  if(mods.doubleFirstCorrect && correctCount > 0){ scoreChange += 1; }
  let moved = scoreChange;
  if(mods.bonusThreshold !== undefined && scoreChange >= mods.bonusThreshold){ moved += (mods.bonusAmount||0); }
  // a lock only holds a team back; it must never cancel a move backwards
  if(mods.blockMoveThreshold !== undefined && scoreChange < mods.blockMoveThreshold && moved > 0){ moved = 0; }
  if(mods.predictNumber !== undefined){
    // the guess is about the cell the team actually lands on
    const landing = Math.max(0, Math.min(team.position + moved, state.trackLength - 1));
    if(cellNumber(landing) === mods.predictNumber) moved += (mods.predictBonus||0);
  }
  return {scoreChange, moved};
}

function clearOneRoundMods(team){
  if(!team.mods) { team.mods = {}; return; }
  delete team.mods.forcedNumber;
  delete team.mods.shieldNegative;
  delete team.mods.doubleFirstCorrect;
  delete team.mods.bonusThreshold;
  delete team.mods.bonusAmount;
  delete team.mods.predictNumber;
  delete team.mods.predictBonus;
  delete team.mods.skipPenalty;
  delete team.mods.blockSkip;
  delete team.mods.blockMoveThreshold;
  // the shield covers the team's next round only, matching the online rule
  delete team.mods.shieldAttack;
}

function applyActionCardEffect(effect, selfTeam, targetTeam, number){
  if(!effect) return 'none';
  if(effect.attack && targetTeam && targetTeam.mods && targetTeam.mods.shieldAttack){
    targetTeam.mods.shieldAttack = false;
    return 'shielded';
  }
  switch(effect.type){
    case 'moveNow':
      selfTeam.position = Math.max(0, Math.min(selfTeam.position + effect.delta, state.trackLength-1));
      break;
    case 'timeBonusSelf':
      selfTeam.timerOverride = state.roundDuration + effect.seconds;
      break;
    case 'timeStealChoose':
      if(targetTeam) targetTeam.timerOverride = Math.max(10, state.roundDuration - effect.seconds);
      selfTeam.timerOverride = state.roundDuration + effect.seconds;
      break;
    case 'forceNumberSelf':
      selfTeam.mods.forcedNumber = cellNumber(selfTeam.position);
      break;
    case 'forceNumberChoose':
      if(targetTeam){ targetTeam.mods = targetTeam.mods||{}; targetTeam.mods.forcedNumber = number; }
      break;
    case 'freeNumberSelf':
      selfTeam.mods.forcedNumber = number;
      break;
    case 'shieldFirstNegative':
      selfTeam.mods.shieldNegative = true;
      break;
    case 'doubleFirstCorrect':
      selfTeam.mods.doubleFirstCorrect = true;
      break;
    case 'bonusIfScoreAtLeast':
      selfTeam.mods.bonusThreshold = effect.threshold;
      selfTeam.mods.bonusAmount = effect.bonus;
      break;
    case 'predictNumberBonus':
      selfTeam.mods.predictNumber = number;
      selfTeam.mods.predictBonus = effect.bonus;
      break;
    case 'perSkipPenaltyChoose':
      if(targetTeam){ targetTeam.mods = targetTeam.mods||{}; targetTeam.mods.skipPenalty = effect.penalty; }
      break;
    case 'blockSkipChoose':
      if(targetTeam){ targetTeam.mods = targetTeam.mods||{}; targetTeam.mods.blockSkip = true; }
      break;
    case 'blockMoveChoose':
      if(targetTeam){ targetTeam.mods = targetTeam.mods||{}; targetTeam.mods.blockMoveThreshold = effect.threshold; }
      break;
    case 'shieldNextAttack':
      selfTeam.mods.shieldAttack = true;
      break;
    default: break;
  }
  return 'applied';
}

// Builds the target-team / number picker UI shown inside the card-reveal modal
// when the drawn card's effect needs a choice before it can be confirmed.
// onConfirm(targetTeamId|null, number|null) is called once the required choices are made.
function buildEffectChoiceUI(effect, selfTeamId, onConfirm){
  const box = el(`<div style="margin-top:10px; text-align:center;"></div>`);
  if(!effect || (!effect.needsTarget && !effect.needsNumber)){
    const okBtn = el(`<button class="btn btn-primary">باشه، ادامه</button>`);
    okBtn.addEventListener('click', () => onConfirm(null, null));
    box.appendChild(okBtn);
    return box;
  }
  let chosenTarget = null;
  let chosenNumber = null;
  if(effect.needsTarget){
    box.appendChild(el(`<div style="color:#fdf6e3; font-size:13px; margin-bottom:8px;">یه تیم رقیب رو انتخاب کن:</div>`));
    const row = el(`<div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:10px;"></div>`);
    state.teams.filter(x => x.id !== selfTeamId).forEach(x => {
      const b = el(`<button class="btn btn-ghost" style="width:auto; padding:8px 14px; border-color:${x.color};">${x.name}</button>`);
      b.addEventListener('click', () => {
        chosenTarget = x.id;
        Array.from(row.children).forEach(c => c.style.background = 'transparent');
        b.style.background = x.color;
        checkReady();
      });
      row.appendChild(b);
    });
    box.appendChild(row);
  }
  if(effect.needsNumber){
    box.appendChild(el(`<div style="color:#fdf6e3; font-size:13px; margin-bottom:8px;">یه عدد از ۱ تا ۶ انتخاب کن:</div>`));
    const row2 = el(`<div style="display:flex; gap:6px; justify-content:center; margin-bottom:10px;"></div>`);
    for(let n=1;n<=6;n++){
      const b = el(`<button class="btn btn-ghost" style="width:44px; padding:8px 0;">${n}</button>`);
      b.addEventListener('click', () => {
        chosenNumber = n;
        Array.from(row2.children).forEach(c => c.style.background = 'transparent');
        b.style.background = 'var(--gold)';
        checkReady();
      });
      row2.appendChild(b);
    }
    box.appendChild(row2);
  }
  const okBtn = el(`<button class="btn btn-primary" disabled>باشه، ادامه</button>`);
  okBtn.addEventListener('click', () => onConfirm(chosenTarget, chosenNumber));
  box.appendChild(okBtn);
  function checkReady(){
    const ready = (!effect.needsTarget || chosenTarget) && (!effect.needsNumber || chosenNumber);
    okBtn.disabled = !ready;
  }
  return box;
}

function renderTimer(){
  const pct = state.timeLeft / state.roundDuration;
  const deg = Math.round(Math.max(0,pct) * 360);
  const critical = state.timerRunning && state.timeLeft <= 10;
  const box = el(`<div class="timer-ring" style="background: conic-gradient(${critical?'var(--danger)':'var(--coral)'} ${deg}deg, var(--surface-2) ${deg}deg); border-radius:50%;"></div>`);
  const inner = el(`<div class="timer-num">${state.timeLeft}</div>`);
  box.appendChild(inner);
  const container = el(`<div></div>`);
  container.appendChild(box);
  return container;
}

function haptic(pattern){
  if(!prefs.haptic) return;
  try { if(navigator.vibrate) navigator.vibrate(pattern); } catch(e){}
}

function countUp(node, to, ms){
  if(!node) return;
  const from = 0, start = performance.now(), sign = to < 0 ? '-' : (node.dataset.sign || '');
  const end = Math.abs(to);
  function step(now){
    const t = Math.min(1, ((now || performance.now()) - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = sign + faNum(Math.round(from + (end - from) * eased));
    if(t < 1) requestAnimationFrame(step);
  }
  node.textContent = sign + faNum(0);
  requestAnimationFrame(step);
}

function faNum(n){ return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }

const WHEEL_COLORS = [
  {bg:'#B5332A', deep:'#76201A'},
  {bg:'#D7A342', deep:'#7E5F12'},
  {bg:'#0F9C97', deep:'#0A5F5C'},
  {bg:'#1D5AA8', deep:'#12386B'},
  {bg:'#2C9447', deep:'#1A5B2C'},
  {bg:'#B85220', deep:'#7A3512'}
];
function cardColor(i){ return WHEEL_COLORS[((i % WHEEL_COLORS.length) + WHEEL_COLORS.length) % WHEEL_COLORS.length]; }

function wheelSVG(){
  const N = ACTION_CARDS.length, seg = 360 / N;
  const R = 122, cx = 135, cy = 135;
  let out = '';
  for(let i = 0; i < N; i++){
    const a0 = (i*seg - 90) * Math.PI/180, a1 = ((i+1)*seg - 90) * Math.PI/180;
    const x0 = (cx + R*Math.cos(a0)).toFixed(2), y0 = (cy + R*Math.sin(a0)).toFixed(2);
    const x1 = (cx + R*Math.cos(a1)).toFixed(2), y1 = (cy + R*Math.sin(a1)).toFixed(2);
    out += `<path d="M${cx} ${cy} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z" fill="${cardColor(i).bg}" stroke="#F7E6B1" stroke-width="0.9"/>`;
  }
  for(let i = 0; i < N; i++){
    let name = ACTION_CARDS[i].title || '';
    if(name.length > 15) name = name.slice(0, 14) + '…';
    name = name.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    const ang = (i + 0.5) * seg;
    const flip = (ang > 180);
    const rot = flip ? (ang + 90) : (ang - 90);
    // anchor at the MIDDLE of the label track: symmetric, so RTL bidi can't
    // push the text outside the rim the way text-anchor:end does
    const mid = (19 + (R - 9)) / 2;
    const x = flip ? (cx - mid) : (cx + mid);
    out += `<g transform="rotate(${rot.toFixed(2)} ${cx} ${cy})">`
        +  `<text x="${x.toFixed(1)}" y="${cy}" fill="#FFF6DC" font-size="8" font-weight="700"`
        +  ` text-anchor="middle" dominant-baseline="middle" direction="rtl">${name}</text></g>`;
  }
  return `<svg viewBox="0 0 270 270" width="100%" height="100%">${out}`
    + `<circle cx="${cx}" cy="${cy}" r="${R+3}" fill="none" stroke="#E0B34E" stroke-width="6"/>`
    + `<circle cx="${cx}" cy="${cy}" r="19" fill="#06364B" stroke="#E0B34E" stroke-width="3"/></svg>`;
}

function resetWheel(){
  state.wheelSpun = false;
  state.wheelDone = false;
  state.wheelAnimStarted = false;
  state.wheelRotation = 0;
  state.wheelVel = 0;
  if(state.wheelTimer){ clearTimeout(state.wheelTimer); state.wheelTimer = null; }
}

function attachWheelDrag(disc, wrap, onFlick){
  let dragging = false, lastAng = 0, lastT = 0, vel = 0, c = null;
  let rot = state.wheelRotation || 0;
  const centerOf = () => { const r = wrap.getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2}; };
  const angOf = (e, cc) => Math.atan2(e.clientY - cc.y, e.clientX - cc.x) * 180 / Math.PI;

  const down = e => {
    dragging = true; c = centerOf(); lastAng = angOf(e, c);
    lastT = performance.now(); vel = 0;
    disc.style.transition = 'none';
    try { wrap.setPointerCapture(e.pointerId); } catch(_){}
  };
  const move = e => {
    if(!dragging) return;
    const a = angOf(e, c);
    let d = a - lastAng;
    if(d > 180) d -= 360;
    if(d < -180) d += 360;
    rot += d;
    const now = performance.now(), dt = Math.max(8, now - lastT);
    vel = 0.7*vel + 0.3*(d / dt * 1000);
    lastAng = a; lastT = now;
    state.wheelRotation = rot;
    disc.style.transform = `rotate(${rot}deg)`;
    e.preventDefault();
  };
  const up = () => {
    if(!dragging) return;
    dragging = false;
    if(Math.abs(vel) > 110){ state.wheelVel = vel; onFlick(); }
  };
  wrap.addEventListener('pointerdown', down);
  wrap.addEventListener('pointermove', move);
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
}

function renderWheelStage(targetIdx, spun, canSpin, onSpin){
  const N = ACTION_CARDS.length, seg = 360 / N;
  const stage = el(`<div class="wheel-stage"></div>`);
  stage.appendChild(el(`<div class="wheel-lead">${canSpin && !spun ? 'گردونه رو بچرخون یا با انگشت بچرخونش' : 'گردونه در حال چرخشه'}</div>`));
  stage.appendChild(el(`<div class="wheel-ptr"></div>`));
  const wrap = el(`<div class="wheel-wrap ${canSpin && !spun ? 'is-grabbable' : ''}"></div>`);
  const disc = el(`<div class="wheel-disc"></div>`);
  disc.innerHTML = wheelSVG();
  wrap.appendChild(disc);
  stage.appendChild(wrap);

  if(spun && !state.wheelAnimStarted){
    state.wheelAnimStarted = true;
    const cur = state.wheelRotation || 0;
    const T = -(targetIdx*seg + seg/2);
    const turns = 4 + Math.min(4, Math.abs(state.wheelVel || 0) / 600);
    const base = cur + turns*360;
    const final = base + (((T - base) % 360) + 360) % 360;
    disc.style.transition = 'none';
    disc.style.transform = `rotate(${cur}deg)`;
    requestAnimationFrame(() => {
      disc.style.transition = '';
      requestAnimationFrame(() => { disc.style.transform = `rotate(${final}deg)`; });
    });
    state.wheelRotation = final;
    // light ticks that thin out as the wheel slows, like a real one
    const tickAt = [120, 300, 500, 740, 1020, 1350, 1730, 2160, 2620, 3080, 3500, 3850, 4100, 4260];
    tickAt.forEach(t => setTimeout(() => { haptic(8); sfxTick(); }, t));
    setTimeout(() => { if(mapCamEl || true) stage.classList.add('is-landed'); }, 4180);
    state.wheelTimer = setTimeout(() => {
      state.wheelTimer = null;
      state.wheelDone = true;
      sfxCardReveal();
      render();
    }, 4300);
  } else if(spun){
    disc.style.transition = 'none';
    disc.style.transform = `rotate(${state.wheelRotation || 0}deg)`;
  } else {
    disc.style.transition = 'none';
    disc.style.transform = `rotate(${state.wheelRotation || 0}deg)`;
    if(canSpin) attachWheelDrag(disc, wrap, onSpin);
  }

  if(!spun){
    if(canSpin){
      const btn = el(`<button class="wheel-btn">بچرخون!</button>`);
      btn.addEventListener('click', () => { state.wheelVel = 900; onSpin(); });
      stage.appendChild(btn);
    } else {
      stage.appendChild(el(`<div class="wheel-hint">منتظر چرخوندن گردونه…</div>`));
    }
  } else {
    stage.appendChild(el(`<div class="wheel-hint">در حال چرخیدن…</div>`));
  }
  return stage;
}

function renderActionCard(card, idx){
  if(!card) return el(`<div class="act-card act-card--wait"><div class="act-card__body"><div class="act-card__title">…</div></div></div>`);
  const col = cardColor(idx || 0);
  const box = el(`<div class="act-card" style="border-color:${col.bg}"></div>`);
  box.appendChild(el(`<div class="act-card__head" style="background:${col.bg}"><span class="act-card__tag" style="color:${col.deep}; border-color:${col.deep}">کارت فرمان</span></div>`));
  const body = el(`<div class="act-card__body"></div>`);
  body.appendChild(el(`<span class="act-card__corner act-card__corner--tr"></span>`));
  body.appendChild(el(`<span class="act-card__corner act-card__corner--tl"></span>`));
  body.appendChild(el(`<div class="act-card__title" style="color:${col.deep}">${card.title}</div>`));
  body.appendChild(el(`<div class="act-card__rule" style="background:linear-gradient(90deg,transparent,${col.bg},transparent)"></div>`));
  body.appendChild(el(`<div class="act-card__text">${card.instruction}</div>`));
  box.appendChild(body);
  return box;
}

function drawActionCard(){
  const idx = Math.floor(Math.random() * ACTION_CARDS.length);
  return idx;
}

function renderCardView(isDescriber, isTurnTeam){
  if(isTurnTeam && !isDescriber){
    return el(`<div class="play-card play-card--hidden">
      <div class="play-card__hidden">🙈<span>نوبت تیم توئه — فقط گوش کن و حدس بزن</span></div>
    </div>`);
  }
  const targetNum = currentTargetNumber(currentTeam());
  const words = state.currentCard.words;
  const shownNum = state.cardPeekNum || targetNum;
  const word = words[shownNum - 1] || '—';
  const offTarget = shownNum !== targetNum;

  const changed = lastShownWord !== null && lastShownWord !== word;
  lastShownWord = word;
  const streakOn = state.streak >= 3;
  const card = el(`<div class="play-card ${isDescriber ? '' : 'play-card--spec'} ${changed ? 'is-flip' : ''} ${streakOn ? 'is-streak' : ''}"></div>`);
  if(state.flashFeedback === 'correct'){
    card.appendChild(el(`<span class="score-pop score-pop--up">+۱</span>`));
  } else if(state.flashFeedback === 'wrong'){
    card.appendChild(el(`<span class="score-pop score-pop--down">−۱</span>`));
  }
  if(streakOn){
    const grew = state.streak !== lastStreakShown;
    lastStreakShown = state.streak;
    card.appendChild(el(`<span class="streak-badge ${grew ? 'is-new' : ''}">${faNum(state.streak)} پشت هم!</span>`));
  } else {
    lastStreakShown = 0;
  }
  card.appendChild(el(`<span class="play-card__badge n${shownNum}">${faNum(shownNum)}</span>`));
  card.appendChild(el(`<span class="play-card__corner play-card__corner--tr"></span>`));
  card.appendChild(el(`<span class="play-card__corner play-card__corner--tl"></span>`));
  card.appendChild(el(`<span class="play-card__corner play-card__corner--br"></span>`));
  card.appendChild(el(`<span class="play-card__corner play-card__corner--bl"></span>`));

  const prev = el(`<button class="play-card__arrow play-card__arrow--r" aria-label="کلمه قبلی"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></button>`);
  prev.addEventListener('click', () => { state.cardPeekNum = shownNum === 1 ? 6 : shownNum - 1; render(); });
  const next = el(`<button class="play-card__arrow play-card__arrow--l" aria-label="کلمه بعدی"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6 L16 12 L10 18"/></svg></button>`);
  next.addEventListener('click', () => { state.cardPeekNum = shownNum === 6 ? 1 : shownNum + 1; render(); });

  card.appendChild(prev);
  card.appendChild(el(`<div class="play-card__word">${word}</div>`));
  card.appendChild(next);
  if(offTarget){
    const back = el(`<button class="play-card__hint">این کلمه‌ی نوبت تو نیست — برگرد به شماره ${faNum(targetNum)}</button>`);
    back.addEventListener('click', () => { state.cardPeekNum = null; render(); });
    card.appendChild(back);
  }
  return card;
}

function buildRoundResult(onNext, label){
  const s = state.lastRoundSummary || {};
  const correct = s.correct ?? 0, skip = s.skip ?? 0, foul = s.foul ?? 0;
  const score = s.scoreChange ?? 0, moved = s.moved ?? 0;
  const landed = (s.landedCell ?? 0) + 1;
  const box = el(`<div class="res res--map"></div>`);
  box.appendChild(renderMapFullScreen());
  const top = el(`<div class="res__panel res__panel--top"></div>`);
  const bottom = el(`<div class="res__panel res__panel--bottom"></div>`);
  const appEl = document.getElementById('app');
  pinSummary(bottom, (appEl && appEl.clientWidth) || window.innerWidth);

  bottom.appendChild(el(`<div class="res-head">
    <h2 class="res-title">نتیجه راند</h2>
    <span class="res-team">${s.teamName || ''}</span>
  </div>`));

  const statsEl = el(`<div class="res-stats">
    <div class="res-stat res-stat--ok">
      <span class="res-stat__ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17.5 L19 7"/></svg></span>
      <span class="res-stat__num js-count" data-to="${correct}"></span>
      <span class="res-stat__lbl">درست</span>
    </div>
    <div class="res-stat res-stat--no">
      <span class="res-stat__ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></span>
      <span class="res-stat__num js-count" data-to="${skip}"></span>
      <span class="res-stat__lbl">رد شده</span>
    </div>
    ${foul ? `<div class="res-stat res-stat--foul">
      <span class="res-stat__ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L22 20 L2 20 Z"/><path d="M12 9.6v4.2"/><path d="M12 17h.01"/></svg></span>
      <span class="res-stat__num js-count" data-to="${foul}"></span>
      <span class="res-stat__lbl">خطا</span>
    </div>` : ''}
    <div class="res-stat res-stat--pt">
      <span class="res-stat__ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.6Z"/></svg></span>
      <span class="res-stat__num js-count" data-to="${Math.abs(score)}" data-sign="${score >= 0 ? '+' : '−'}"></span>
      <span class="res-stat__lbl">امتیاز راند</span>
    </div>
  </div>`);
  bottom.appendChild(statsEl);
  // run the tallies up as each tile lands
  const delays = [1120, 1220, 1320, 1420];
  statsEl.querySelectorAll('.js-count').forEach((n, i) => {
    n.dataset.sign = n.dataset.sign || '';
    n.textContent = '';
    setTimeout(() => countUp(n, Number(n.dataset.to) || 0, 620), delays[i] || 1420);
  });

  const dirCls = moved > 0 ? 'is-fwd' : (moved < 0 ? 'is-back' : 'is-stay');
  const dirTxt = moved > 0 ? 'به جلو' : (moved < 0 ? 'به عقب' : 'بدون حرکت');
  bottom.appendChild(el(`<div class="res-move ${dirCls}">
    <div class="res-move__main">
      <span class="res-move__val">${moved > 0 ? '+' : (moved < 0 ? '−' : '')}${faNum(Math.abs(moved))}</span>
      <span class="res-move__unit">خانه ${dirTxt}</span>
    </div>
    <div class="res-move__land">خانه <b>${faNum(landed)}</b> / ${faNum(state.trackLength)}</div>
  </div>`));

  const next = el(`<button class="res-next">${label || 'ادامه — نوبت بعدی'}<span class="res-next__chev"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></span></button>`);
  next.addEventListener('click', onNext);
  bottom.appendChild(next);
  box.appendChild(bottom);
  return box;
}

const MAP_RATIO = 4961 / 3508;
const MAP_ZOOM = 1.8;           // board height vs screen height
const MAP_FIT_TOP = 50;         // gap above the board in the pulled-back view
const MAP_FIT_MAX_W = 460;      // board never wider than the app's content column
const MAP_SUMMARY_GAP = 10;     // space between the board and the summary
let camLastX = null, camLastY = null, camLastS = 1;
let tokLastPos = {};
let mapCamEl = null, mapWorldEl = null;
let lastShownWord = null;
let lastRenderedScreen = null;
let lastTimerSecond = null;
let lastStreakShown = 0;
let timerEl = null;
let screenInTimer = null;

function resetMapCamera(){ timerEl = null; lastShownWord = null; lastTimerSecond = null; camLastX = null; camLastY = null; camLastS = 1; tokLastPos = {}; mapCamEl = null; mapWorldEl = null; state.mapFit = false; }

function summaryTopFor(cw){
  // The board is pinned MAP_FIT_TOP from the top and its height is a pure
  // function of width, so the summary's place never depends on the viewport
  // height (which moves as the browser bar slides).
  const boardH = Math.min(cw, MAP_FIT_MAX_W) / MAP_RATIO;
  return Math.round(MAP_FIT_TOP + boardH + MAP_SUMMARY_GAP);
}

function pinSummary(panel, cw){
  if(!panel || !cw) return;
  panel.style.top = summaryTopFor(cw) + 'px';
}

function positionMapCamera(cam, world){
  const cw = cam.clientWidth, ch = cam.clientHeight;
  if(!cw || !ch) return;

  // The board is always laid out at the close-up size; zooming is done with a
  // transform scale so it can animate smoothly instead of relaying out.
  const baseH = ch * MAP_ZOOM;
  const baseW = baseH * MAP_RATIO;
  world.style.width = baseW + 'px';
  world.style.height = baseH + 'px';

  let s, x, y;
  if(state.mapFit){
    // Board size comes from the viewport WIDTH only. Height changes whenever
    // the browser bar slides in or out, so anything derived from it drifts.
    // The summary below is offset by exactly the same width-based formula.
    s = Math.min(cw, MAP_FIT_MAX_W) / baseW;
    x = (cw - baseW * s) / 2;
    y = MAP_FIT_TOP;

  } else {
    s = 1;
    const t = currentTeam();
    const cell = Math.max(0, Math.min(t ? t.position : 0, CELL_COORDS.length - 1));
    const tokenX = baseW * CELL_COORDS[cell][0] / 100;
    const tokenY = baseH * CELL_COORDS[cell][1] / 100;
    // keep the moving pawn centred, but never show past the edges of the board
    x = Math.max(Math.min(0, cw - baseW), Math.min(0, cw / 2 - tokenX));
    y = Math.max(Math.min(0, ch - baseH), Math.min(0, ch / 2 - tokenY));
  }
  // the summary is pinned from the same numbers, in every state, so the two
  // can never disagree and it never shifts once drawn
  if(cam.parentElement){
    pinSummary(cam.parentElement.querySelector('.res__panel--bottom'), cw);
  }

  const tf = `translate(${x}px, ${y}px) scale(${s})`;

  // Pawns shrink with the board. The only correction is a floor so they do
  // not vanish at full zoom-out: aim for about 15px on screen, and never
  // enlarge beyond what that floor needs.
  const TOK_H = 56, TOK_MIN_PX = 15;
  const natural = TOK_H * s;
  const tokScale = natural >= TOK_MIN_PX ? 1 : Math.min(TOK_MIN_PX / natural, 1.7);
  world.style.setProperty('--tok-scale', tokScale.toFixed(3));

  if(world.isConnected && world.style.transform && camLastX !== null){
    // the map is already on screen and keeps its element, so a plain transform
    // change lets the CSS transition carry the camera across
    world.style.transition = '';
    world.style.transform = tf;
    camLastX = x; camLastY = y; camLastS = s;
    return;
  }
  if(camLastX === null){
    world.style.transition = 'none';
    world.style.transform = tf;
  } else {
    // the board re-renders on every hop, so start from where the camera
    // visually was and glide to the new spot instead of jumping
    world.style.transition = 'none';
    world.style.transform = `translate(${camLastX}px, ${camLastY}px) scale(${camLastS})`;
    requestAnimationFrame(() => {
      world.style.transition = '';
      world.style.transform = tf;
    });
  }
  camLastX = x; camLastY = y; camLastS = s;
}

// Ease all the way out once the summary panel is on screen: the camera needs
// its height to know how much room it has, otherwise it centres on the whole
// viewport first and then jumps up when the panel appears.
function startMapZoomOut(){
  if(!mapWorldEl || !mapWorldEl.isConnected || !mapCamEl) return;
  state.mapFit = true;
  mapWorldEl.classList.add('is-fitting');
  positionMapCamera(mapCamEl, mapWorldEl);
}

function renderMapFullScreen(){
  const cam = el(`<div class="mapcam"></div>`);
  const world = el(`<div class="mapcam__world ${state.mapFit ? 'is-fitting' : ''}"></div>`);
  world.appendChild(el(`<img class="mapcam__img" src="${MAP_IMAGE}" alt="" />`));

  const byCell = {};
  state.teams.forEach((t, ti) => {
    const c = Math.max(0, Math.min(t.position, CELL_COORDS.length - 1));
    if(!byCell[c]) byCell[c] = [];
    byCell[c].push({ t, ti });
  });
  Object.keys(byCell).forEach(c => {
    const group = byCell[c];
    const [px, py] = CELL_COORDS[parseInt(c)];
    group.forEach((g, gi) => {
      const ang = (gi / group.length) * 2 * Math.PI;
      const r = group.length > 1 ? 1.4 : 0;
      const ox = r * Math.cos(ang), oy = r * Math.sin(ang);
      const isTurn = g.t === currentTeam();
      const nx = px + ox, ny = py + oy;
      const prev = tokLastPos[g.t.id];
      const moving = !!prev && (Math.abs(prev.x - nx) > 0.01 || Math.abs(prev.y - ny) > 0.01);
      const motion = moving ? 'is-hop' : (isTurn ? 'is-turn' : '');
      // the board is rebuilt every step, so a fresh element has nothing to
      // transition from: start it on the previous cell, then move it next frame
      const sx = moving ? prev.x : nx, sy = moving ? prev.y : ny;
      const tok = el(`<div class="mapcam__tok" data-team="${g.t.id}" style="left:${sx.toFixed(2)}%; top:${sy.toFixed(2)}%;"><span class="mapcam__tok-body ${motion}">${PAWN_SVG(g.t.color)}</span></div>`);
      if(moving){
        tok.style.transition = 'none';
        requestAnimationFrame(() => {
          tok.style.transition = '';
          tok.style.left = nx.toFixed(2) + '%';
          tok.style.top  = ny.toFixed(2) + '%';
        });
      }
      tokLastPos[g.t.id] = { x: nx, y: ny };
      world.appendChild(tok);
    });
  });

  cam.appendChild(world);
  mapCamEl = cam; mapWorldEl = world;
  requestAnimationFrame(() => positionMapCamera(cam, world));
  return cam;
}

// Move one pawn on the board that is already on screen. Re-rendering the whole
// board for each step replaced the pawn with a brand-new element, which has no
// previous position to animate from — so it teleported instead of travelling.
function stepMapToken(team){
  if(!mapWorldEl || !mapWorldEl.isConnected) return false;
  const tok = mapWorldEl.querySelector(`.mapcam__tok[data-team="${team.id}"]`);
  if(!tok) return false;
  const cell = Math.max(0, Math.min(team.position, CELL_COORDS.length - 1));
  const [nx, ny] = CELL_COORDS[cell];

  const body = tok.querySelector('.mapcam__tok-body');
  if(body){
    body.classList.remove('is-hop', 'is-turn');
    void body.offsetWidth;            // restart the arc for this step
    body.classList.add('is-hop');
  }
  tok.style.transition = '';
  tok.style.left = nx.toFixed(2) + '%';
  tok.style.top  = ny.toFixed(2) + '%';
  tok.classList.remove('is-land');
  setTimeout(() => { tok.classList.add('is-land'); }, 520);   // dust as it touches down
  tokLastPos[team.id] = { x: nx, y: ny };

  positionMapCamera(mapCamEl, mapWorldEl);
  return true;
}

function buildMapWrap(large){
  const mapWrap = el(`<div style="position:relative; margin-bottom:${large?'8px':'12px'};"></div>`);
  const mapImg = el(`<img src="${MAP_IMAGE}" style="width:100%; border-radius:${large?'16px':'14px'}; border:2px solid var(--gold); display:block;" />`);
  mapWrap.appendChild(mapImg);
  const tokSize = large ? 20 : 15;
  const byCell = {};
  state.teams.forEach((t,ti) => {
    const c = Math.min(t.position, CELL_COORDS.length-1);
    if(!byCell[c]) byCell[c] = [];
    byCell[c].push({t,ti});
  });
  Object.keys(byCell).forEach(c => {
    const group = byCell[c];
    const [px,py] = CELL_COORDS[parseInt(c)];
    group.forEach((g, gi) => {
      const offsetAngle = (gi/group.length) * 2*Math.PI;
      const offsetR = group.length>1 ? 1.4 : 0;
      const ox = offsetR*Math.cos(offsetAngle);
      const oy = offsetR*Math.sin(offsetAngle);
      const tok = el(`<div style="position:absolute; left:${(px+ox).toFixed(2)}%; top:${(py+oy).toFixed(2)}%; width:${tokSize}px; height:${tokSize*1.35}px; margin-left:-${tokSize/2}px; margin-top:-${tokSize*1.15}px; filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); transition:left .4s ease, top .4s ease;">${PAWN_SVG(g.t.color)}</div>`);
      mapWrap.appendChild(tok);
    });
  });
  return mapWrap;
}

function renderTrack(){
  const card = el(`<div class="card"></div>`);
  card.appendChild(el(`<h2>نقشه</h2>`));
  card.appendChild(buildMapWrap(false));
  const posList = el(`<div class="scoreboard"></div>`);
  state.teams.forEach((t) => {
    const row = el(`<div class="score-row ${t===currentTeam()?'active':''}">
      <div class="score-name"><span class="swatch" style="background:${t.color}"></span>${t.name}</div>
      <div class="score-vals">خونه‌ی ${t.position+1} از ${state.trackLength}</div>
    </div>`);
    posList.appendChild(row);
  });
  card.appendChild(posList);
  return card;
}

function renderScoreboard(){
  const card = el(`<div class="card"></div>`);
  card.appendChild(el(`<h2>امتیازها</h2>`));
  const board = el(`<div class="scoreboard"></div>`);
  state.teams.forEach((t, ti) => {
    const row = el(`<div class="score-row ${ti===state.currentTeamIdx?'active':''}">
      <div class="score-name"><span class="swatch" style="background:${t.color}"></span>${t.name}</div>
      <div class="score-vals">امتیاز ${t.score} · خانه ${t.position+1}</div>
    </div>`);
    board.appendChild(row);
  });
  card.appendChild(board);
  return card;
}

// ---------------- TIMER LOGIC ----------------
function startTimer(){
  const t = currentTeam();
  if(t.timerOverride){
    state.timeLeft = t.timerOverride;
    t.timerOverride = null;
  } else {
    state.timeLeft = state.roundDuration;
  }
  state.timerRunning = true;
  state.correctCount = 0;
  state.skipCount = 0;
  state.foulCount = 0;
  state.foulPending = false;
  state.streak = 0;
  drawCard();
  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    if(state.timeLeft <= 10 && state.timeLeft > 0){ sfxTick(); }
    if(state.timeLeft <= 0){
      stopTimerInterval();
      state.timerRunning = false;
      finishRound();
    } else if(!tickTimerOnly()){
      render();
    }
  }, 1000);
  render();
}
function stopTimerInterval(){
  if(state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval = null; }
}

function onCorrect(){
  if(!state.timerRunning || state.foulPending) return;
  state.correctCount += 1;
  state.streak += 1;
  state.flashFeedback = 'correct';
  sfxCorrect();
  drawCard();
  render();
  setTimeout(() => { state.flashFeedback = null; render(); }, 350);
}
function onFoul(){
  if(!state.timerRunning || state.foulPending) return;
  // freeze the round so the table can argue it out before anything is counted
  state.foulPending = true;
  state.streak = 0;
  stopTimerInterval();
  sfxWrong();
  render();
}

function resolveFoul(counted){
  if(!state.foulPending) return;
  state.foulPending = false;
  if(counted) state.foulCount += 1;
  resumeTimer();
  render();
}

function resumeTimer(){
  if(!state.timerRunning || state.timerInterval) return;
  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    if(state.timeLeft <= 10 && state.timeLeft > 0){ sfxTick(); }
    if(state.timeLeft <= 0){
      stopTimerInterval();
      state.timerRunning = false;
      finishRound();
    } else if(!tickTimerOnly()){
      render();
    }
  }, 1000);
}

function onSkip(){
  if(!state.timerRunning || state.foulPending) return;
  state.skipCount += 1;
  state.streak = 0;
  state.flashFeedback = 'wrong';
  sfxWrong();
  drawCard();
  render();
  setTimeout(() => { state.flashFeedback = null; render(); }, 350);
}

function finishRound(){
  const t = currentTeam();
  const outcome = computeRoundOutcome(t, state.correctCount, state.skipCount, state.foulCount);
  let scoreChange = outcome.scoreChange;
  let moved = outcome.moved;
  const fromPos = t.position;
  const toPos = Math.max(0, Math.min(t.position + moved, state.trackLength - 1));
  t.score += scoreChange;
  clearOneRoundMods(t);
  state.pendingSummary = {
    teamName: t.name,
    correct: state.correctCount,
    skip: state.skipCount,
    foul: state.foulCount,
    scoreChange: scoreChange,
    moved: moved,
    landedCell: toPos
  };
  state.animating = true;
  render();
  animateMove(t, fromPos, toPos, () => {
    state.animating = false;
    state.roundEnded = true;
    state.lastRoundSummary = state.pendingSummary;
    checkWinOrObstacle();
  });
}

function animateMove(team, fromPos, toPos, onDone){
  if(fromPos === toPos){ onDone(); return; }
  const step = toPos > fromPos ? 1 : -1;
  let cur = fromPos;
  const iv = setInterval(() => {
    cur += step;
    team.position = cur;
    sfxHop();
    if(!stepMapToken(team)) render();
    if(cur === toPos){
      clearInterval(iv);
      onDone();
      // The summary render sets the close-up transform in the next frame. The
      // zoom must start after that has actually been painted, otherwise both
      // values land in one frame and the browser jumps straight to the end
      // with no animation at all.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTimeout(startMapZoomOut, 30);
      }));
    }
  }, 800);
}

function checkWinOrObstacle(){
  const t = currentTeam();
  if(t.position >= state.trackLength - 1){
    stopTimerInterval();
    state.timerRunning = false;
    state.winner = t;
    sfxWin();
    render();
    return;
  }
  if(state.obstacles.includes(t.position)){
    stopTimerInterval();
    state.timerRunning = false;
    state.actionPickActive = true;
    state.actionRevealedIdx = null;
    const _ai = drawActionCard();
    state.actionChosenIdx = _ai;
    state.actionChosenCard = ACTION_CARDS[_ai];
    state.actionEffectTarget = null;
    state.actionEffectNumber = null;
    resetWheel();
  }
  render();
}

function nextTurn(){
  resetMapCamera();
  const t = currentTeam();
  t.describerIdx = (t.describerIdx + 1) % t.members.length;
  state.currentTeamIdx = (state.currentTeamIdx + 1) % state.teams.length;
  const nt = currentTeam();
  drawCard();
  state.timeLeft = state.roundDuration;
  state.timerRunning = false;
  state.viewerKey = describerKey();
  saveLocalGame();
}

function renderWinner(){
  const w = state.winner;
  LS.del('game');
  const wrap = el(`<div></div>`);
  const confetti = el(`<div style="position:fixed; inset:0; pointer-events:none; overflow:hidden; z-index:50;"></div>`);
  const confColors = [TEAM_COLORS[0],TEAM_COLORS[1],TEAM_COLORS[2],TEAM_COLORS[3],'var(--gold)','var(--teal)'];
  for(let i=0;i<40;i++){
    const left = Math.random()*100;
    const delay = Math.random()*0.6;
    const dur = 2.2 + Math.random()*1.6;
    const size = 6 + Math.random()*6;
    const color = confColors[i % confColors.length];
    const rot = Math.random()*360;
    const piece = el(`<div style="position:absolute; top:-20px; left:${left}%; width:${size}px; height:${size*0.4}px; background:${color}; opacity:.9; transform:rotate(${rot}deg); animation: confettiFall ${dur}s ${delay}s ease-in forwards;"></div>`);
    confetti.appendChild(piece);
  }
  wrap.appendChild(confetti);
  const box = el(`<div class="card winner">
    <div class="big">🏆</div>
    <h2 style="font-size:20px; margin:10px 0 4px;">${w.name} برنده شد!</h2>
    <p style="color:var(--text-dim); font-size:13px;">امتیاز نهایی: ${w.score}</p>
  </div>`);
  const again = el(`<button class="btn btn-primary">بازی جدید</button>`);
  again.addEventListener('click', () => { state.screen='setup'; render(); });
  box.appendChild(again);
  wrap.appendChild(box);
  return wrap;
}

// after a round ends without win/obstacle, offer explicit "next turn" via re-drawing controls
const origRenderBoard = renderBoard;

// invite links look like  /?room=ABCDE  and open the join sheet with the code filled in
try {
  const q = new URLSearchParams(location.search).get('room');
  if(q){
    state.joinCode = q.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    state.homeSheet = 'join';
    history.replaceState(null, '', location.pathname);
  }
} catch(e){}

// a soft tick on every button, except the ones that play their own game sound
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('button');
  if(!b || b.disabled || b.closest('.play-actions, .foul-row, .wheel-stage')) return;
  sfxTap();
}, { passive: true });
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && state.homeSheet){ state.homeSheet = false; render(); }
});

render();
installBackHandler();
try {
} catch(e){}
