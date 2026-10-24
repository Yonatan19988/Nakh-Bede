const TEAM_COLORS = ['#ff6b5e','#33c9b5','#ffcc4d','#8b7dff','#ff8fc4','#5eb3ff','#7fe08a','#ff9c5e','#c98bff','#5ee0c9'];
const TEAM_ICONS = ['🦁','🐯','🐻','🦊','🐼','🐨','🐸','🦉','🐢','🦅'];

// Small persistent store. Every access is guarded: storage can be blocked
// (private window, site data cleared) and the game must still run without it.
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('nb_' + k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('nb_' + k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('nb_' + k); }catch(e){} },
};
const prefs = { sound: LS.get('sound', true) !== false, music: LS.get('music', true) !== false, haptic: LS.get('haptic', true) !== false };

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


const HOME_CARD_BACK = "assets/card-back.webp";
const HOME_CARD_WORD = "assets/card-word.webp";
const HOME_CARD_ACT = "assets/card-action.webp";
const HOME_LOGO = "assets/logo.webp";
// Two sizes of the same board. The full one (2160 px wide) decodes to about 100 MB of
// memory, which weak phones cannot hold, so they get the 1296 px one (about 37 MB).
// The player can override the automatic choice in settings.
function weakDevice(){
  try{
    const mem = navigator.deviceMemory;                          // Chrome/Android only, in GB
    if(typeof mem === 'number' && mem <= 3) return true;
    if(typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4 && /android/i.test(navigator.userAgent)) return true;
  }catch(e){}
  return false;
}
const LITE_MAP = (() => { const v = LS.get('liteMap', null); return v === null || v === undefined ? weakDevice() : v === true; })();
// the board in use; chosen on the setup screen (or by the host online) and saved with the game
let activeMapId = LS.get('mapId', 'iran');
function curMap(){ return MAPS.find(m => m.id === activeMapId) || MAPS[0]; }
function setActiveMap(id){ if(MAPS.some(m => m.id === id)) activeMapId = id; }
function mapImageOf(m){ return LITE_MAP ? m.lite : m.image; }
// live touches on the board (fountains, water, smoke...): on by default except on weak phones
const MAP_FX = (() => { const v = LS.get('mapFx', null); return (v === null || v === undefined ? !LITE_MAP : v === true) && !!window.NBMapFx && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); })();
// keep a copy for offline play; the service worker stores whatever the page fetches
try{ (window.requestIdleCallback || ((f) => setTimeout(f, 3000)))(() => { fetch(mapImageOf(curMap())).catch(() => {}); }); }catch(e){}

// Index-aligned with ACTION_CARDS. needsTarget = must pick a rival team.

let online = {
  roomCode: null,
  playerId: null,
  playerName: null,
  isHost: false,
  room: null,
};

// Phones' clocks differ, so everything shared through the room (round end, foul pause)
// is measured on the database's clock: local time plus the offset Firebase reports.
function srvNow(){ return Date.now() + ((window.FB && window.FB.offset) || 0); }
function onlineBaseSec(){ return (online.room && online.room.roundSec) || state.roundDuration; }

// ---- housekeeping: nobody deletes old rooms for us, so every phone clears the ones it knew ----
// The database has no server-side timer on the free plan and the rules (rightly) don't let anybody
// list the rooms, so each phone remembers the codes of the rooms it joined and, on a later launch,
// deletes those that are a day old. The rules allow deleting only a room older than 24 hours (or by
// its host), so this can never touch a live game. Stale entries of the public list go the same way.
function rememberSeenRoom(code){
  const list = (LS.get('seenRooms', []) || []).filter(r => r && r.c !== code);
  list.push({ c: code, at: srvNow() });
  LS.set('seenRooms', list.slice(-40));
}
function janitor(){
  const F = window.FB;
  if(!F || !F.uid) return;
  if(srvNow() - (LS.get('janitorAt', 0) || 0) < 6 * 3600 * 1000) return;
  LS.set('janitorAt', srvNow());
  const day = 24 * 3600 * 1000 + 60000;
  const seen = LS.get('seenRooms', []) || [];
  const old = seen.filter(r => r && typeof r.c === 'string' && srvNow() - r.at > day && r.c !== online.roomCode);
  LS.set('seenRooms', seen.filter(r => !old.includes(r)));
  old.slice(0, 20).forEach(r => { F.remove(F.ref(F.db, 'rooms/' + r.c)).catch(() => {}); });
  F.get(F.ref(F.db, 'publicRooms')).then(snap => {
    const v = snap.val() || {};
    Object.keys(v).filter(k => v[k] && typeof v[k].t === 'number' && srvNow() - v[k].t > 2 * 3600 * 1000).slice(0, 20)
      .forEach(k => { F.remove(F.ref(F.db, 'publicRooms/' + k)).catch(() => {}); });
  }).catch(() => {});
}
window.addEventListener('fb-ready', () => { setTimeout(janitor, 8000); });

// the packed app runs on a private address, so shared links must point to the public site
// Sign in with Apple shows up once it is set up in Firebase (Authentication > Sign-in method > Apple) and this is true
const APPLE_LOGIN = true;
const IS_NATIVE = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const PUBLIC_URL = 'https://yonatan19988.github.io/Nakh-Bede/';
function gameLink(){ return IS_NATIVE ? PUBLIC_URL : (location.origin + location.pathname); }

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
// ---- avatars shown to the other players in an online room ----
// A player record carries av = { l:[look indexes...], r:ring, e:emoji }. It comes from other
// phones, so it is clamped to the real part lists before it is drawn.
function myAvatarPayload(){
  try{
    const p = loadProfile(), keys = Object.keys(NBAvatar.DEFAULT_LOOK);
    return { l: keys.map(k => p.look[k] | 0), r: p.ring | 0, e: p.avatar || '' };
  }catch(e){ return null; }
}
function avatarHtmlFor(av, name){
  try{
    if(av && typeof av.e === 'string' && av.e) return `<span class="pav"><span class="av-emoji"></span></span>`.replace('<span class="av-emoji"></span>', `<span class="av-emoji">${escHtml(av.e.slice(0, 4))}</span>`);
    if(av && Array.isArray(av.l)){
      const keys = Object.keys(NBAvatar.DEFAULT_LOOK), look = {};
      keys.forEach((k, i) => { const n = av.l[i] | 0, max = NBAvatar.LISTS[k].length; look[k] = n >= 0 && n < max ? n : 0; });
      const ring = NBAvatar.RING[(av.r | 0) >= 0 && (av.r | 0) < NBAvatar.RING.length ? av.r | 0 : 0][0];
      return `<span class="pav" style="border-color:${ring}">${NBAvatar.svg(look)}</span>`;
    }
  }catch(e){}
  const ch = Array.from(String(name || '؟'))[0] || '؟';
  return `<span class="pav pav--letter">${escHtml(ch)}</span>`;
}
function escHtml(t){ return String(t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

let presenceUnsub = null;
function armPresence(){
  if(presenceUnsub){ presenceUnsub(); presenceUnsub = null; }
  const connRef = window.FB.ref(window.FB.db, '.info/connected');
  presenceUnsub = window.FB.onValue(connRef, (snap) => {
    if(snap.val() !== true) return;
    if(!online.roomCode || !online.playerId) return;
    const meRef = window.FB.ref(window.FB.db, `rooms/${online.roomCode}/players/${online.playerId}`);
    window.FB.onDisconnect(meRef).remove();
    pubJson = null;   // the public listing is removed on disconnect; list it again
    window.FB.update(meRef, { name: online.playerName, teamId: online.lastTeamId || null, av: myAvatarPayload() })
      .catch(err => console.warn('presence restore failed', err));
  });
}

function genPlayerId(){
  return 'p_' + Math.random().toString(36).slice(2,10);
}

// A public room is listed in publicRooms so strangers can be matched into it: it starts with two
// teams, newcomers are put on the smaller one, and the game starts by itself once four have joined.
function onlineCreateRoom(playerName, opts){
  opts = opts || {};
  if(!fbReadyOrWarn()) return Promise.resolve(false);
  const code = genRoomCode();
  const playerId = window.FB.uid;
  const pub = !!opts.public, mode = opts.mode === 'text' ? 'text' : 'voice';
  online.lastTeamId = pub ? 't1' : null;
  online.roomCode = code;
  online.playerId = playerId;
  online.playerName = playerName;
  online.isHost = true;
  pubJson = null;
  const roomData = {
    createdAt: srvNow(),
    hostId: playerId,
    phase: 'lobby',
    mode,
    roundSec: pub ? (mode === 'text' ? 120 : 90) : state.roundDuration,
    players: { [playerId]: { name: playerName, teamId: pub ? 't1' : null, av: myAvatarPayload() } },
    teams: {},
  };
  if(pub){
    roomData.public = true;
    roomData.packs = selectedPacks();
    roomData.mapId = selectedMapId();
    [1, 2].forEach(n => { roomData.teams['t' + n] = { name: 'تیم ' + n, color: TEAM_COLORS[n - 1], position: 0, score: 0, describerIdx: 0 }; });
  }
  return window.FB.set(window.FB.ref(window.FB.db, 'rooms/'+code), roomData).then(() => {
    rememberRoom();
    rememberSeenRoom(code);
    armPresence();
    subscribeRoom();
    state.screen = 'online-lobby';
    render();
    return true;
  }).catch(err => { online.roomCode = null; alert(fbErrorText(err)); return false; });
}

// the team with the fewest players (for strangers who join a public room)
function smallestTeamId(rv){
  const ids = Object.keys(rv.teams || {}).sort((x, y) => parseInt(x.slice(1), 10) - parseInt(y.slice(1), 10));
  if(!ids.length) return null;
  const cnt = {}; ids.forEach(id => { cnt[id] = 0; });
  Object.values(rv.players || {}).forEach(pl => { if(pl && cnt[pl.teamId] !== undefined) cnt[pl.teamId]++; });
  return ids.reduce((best, id) => cnt[id] < cnt[best] ? id : best, ids[0]);
}

// resolves true when we are in the room. opts.silent: no alerts (used while searching),
// opts.requireLobby / opts.maxPlayers: skip rooms that already started or are full.
function onlineJoinRoom(code, playerName, restoreTeamId, opts){
  opts = opts || {};
  if(!fbReadyOrWarn()) return Promise.resolve(false);
  code = code.trim().toUpperCase();
  if(!code){ if(!opts.silent) alert('کد اتاق رو وارد کن'); return Promise.resolve(false); }
  const roomRef = window.FB.ref(window.FB.db, 'rooms/'+code);
  return window.FB.get(roomRef).then(snap => {
    if(!snap.exists()){ if(!opts.silent) alert('اتاقی با این کد پیدا نشد'); return false; }
    const rv = snap.val() || {};
    if(opts.requireLobby && rv.phase !== 'lobby') return false;
    if(opts.maxPlayers && Object.keys(rv.players || {}).length >= opts.maxPlayers) return false;
    const playerId = window.FB.uid;
    const teamId = restoreTeamId || (rv.public ? smallestTeamId(rv) : null);
    online.lastTeamId = teamId || null;
    online.roomCode = code;
    online.playerId = playerId;
    online.playerName = playerName;
    online.isHost = rv.hostId === playerId;
    pubJson = null;
    return window.FB.update(window.FB.ref(window.FB.db, `rooms/${code}/players/${playerId}`), {name: playerName, teamId: teamId || null, av: myAvatarPayload()}).then(() => {
      rememberRoom();
      rememberSeenRoom(code);
      armPresence();
      subscribeRoom();
      state.screen = 'online-lobby';
      render();
      return true;
    });
  }).catch(err => { online.roomCode = null; if(!opts.silent) alert(fbErrorText(err)); return false; });
}

// ---- public rooms: the list strangers are matched from ----
let pubJson = null;
function pubRef(){ return window.FB.ref(window.FB.db, 'publicRooms/' + online.roomCode); }
function syncPublicEntry(){
  const r = online.room;
  if(!r || !r.public || !online.isHost || !online.roomCode) return;
  if(r.phase !== 'lobby'){
    if(pubJson !== 'gone'){ pubJson = 'gone'; window.FB.remove(pubRef()).catch(() => {}); }
    return;
  }
  const me = (r.players && r.players[online.playerId]) || {};
  const e = { h: online.playerId, n: String(me.name || '').slice(0, 20), c: Object.keys(r.players || {}).length, m: r.mode === 'text' ? 'text' : 'voice', t: r.createdAt || srvNow() };
  const j = JSON.stringify(e);
  if(j === pubJson) return;
  pubJson = j;
  window.FB.set(pubRef(), e).catch(() => { pubJson = null; });
  window.FB.onDisconnect(pubRef()).remove();
}
let autoStartTimer = null;
function publicAutoStart(){
  const r = online.room;
  clearTimeout(autoStartTimer); autoStartTimer = null;
  if(!r || r.phase !== 'lobby') return;
  const teams = onlineTeamsArray().filter(t => t.memberIds.length > 0);
  const ready = Object.keys(r.players || {}).length >= 4 && teams.length >= 2;
  if(ready && !r.autoStartAt){ window.FB.update(fbRoomRef(), { autoStartAt: srvNow() + 20000 }); return; }
  if(!ready && r.autoStartAt){ window.FB.update(fbRoomRef(), { autoStartAt: null }); return; }
  if(ready && r.autoStartAt){
    autoStartTimer = setTimeout(() => {
      if(online.room && online.room.phase === 'lobby' && online.isHost) startOnlineGame();
    }, Math.max(0, r.autoStartAt - srvNow()) + 100);
  }
}
// If the host's phone drops out of the room, the player with the lowest id takes over
// (so a public room never ends up with nobody who can start it).
let hostGraceTimer = null, hostGraceFor = null;
function onlineHostDuties(){
  const r = online.room;
  if(!r || !r.players) return;
  online.isHost = r.hostId === online.playerId;
  if(r.hostId && !r.players[r.hostId]){
    // The host's phone dropped out (or is reloading): give it a few seconds to come back
    // before the player with the lowest id takes over.
    if(hostGraceFor !== r.hostId && Object.keys(r.players).sort()[0] === online.playerId){
      hostGraceFor = r.hostId;
      clearTimeout(hostGraceTimer);
      hostGraceTimer = setTimeout(() => {
        const cur = online.room;
        if(cur && cur.players && cur.hostId === hostGraceFor && !cur.players[cur.hostId] && Object.keys(cur.players).sort()[0] === online.playerId){
          window.FB.update(fbRoomRef(), { hostId: online.playerId });
        }
        hostGraceFor = null;
      }, 10000);
    }
  } else if(hostGraceFor){
    clearTimeout(hostGraceTimer); hostGraceFor = null;
  }
  if(online.isHost && r.public){ syncPublicEntry(); publicAutoStart(); }
}

function roomWithoutFeed(r){
  if(!r) return '';
  const c = Object.assign({}, r); delete c.feed;
  return JSON.stringify(c);
}
let roomUnsub = null;
function subscribeRoom(){
  if(roomUnsub){ roomUnsub(); roomUnsub = null; }
  const roomRef = window.FB.ref(window.FB.db, 'rooms/'+online.roomCode);
  roomUnsub = window.FB.onValue(roomRef, (snap) => {
    const prev = online.room;
    online.room = snap.val();
    if(!online.room){ return; }
    onlineHostDuties();
    ensureOnlineLocalCountdown();
    // a new chat message alone must not rebuild the screen (it would drop the keyboard)
    if(prev && state.screen === 'online-board' && online.room.mode === 'text' && roomWithoutFeed(prev) === roomWithoutFeed(online.room) && patchTextFeed()){
      onlineTextJudge();
      return;
    }
    const me = online.room.players && online.room.players[online.playerId];
    if(me && me.teamId && me.teamId !== online.lastTeamId){ online.lastTeamId = me.teamId; rememberRoom(); }
    else if(me && me.teamId) online.lastTeamId = me.teamId;
    if(online.room.phase === 'playing' && state.screen === 'online-lobby'){
      state.screen = 'online-board';
    }
    render();
    onlineTextJudge();
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
  if(roomUnsub){ roomUnsub(); roomUnsub = null; }
  clearTimeout(autoStartTimer); autoStartTimer = null;
  if(online.isHost && online.room && online.room.public && online.roomCode){ window.FB.remove(pubRef()).catch(() => {}); }
  // the host leaving an otherwise empty room takes the room with it
  const alone = online.isHost && online.room && online.room.players && Object.keys(online.room.players).every(id => id === online.playerId);
  if(alone && online.roomCode){
    window.FB.remove(window.FB.ref(window.FB.db, `rooms/${online.roomCode}`)).catch(() => {});
  } else if(online.roomCode && online.playerId){
    window.FB.remove(window.FB.ref(window.FB.db, `rooms/${online.roomCode}/players/${online.playerId}`));
  }
  if(presenceUnsub){ presenceUnsub(); presenceUnsub = null; }
  online.roomCode = null; online.playerId = null; online.room = null; online.isHost = false; online.lastTeamId = null;
  state.screen = 'home';
  render();
}

let state = {
  screen: 'welcome', // welcome | home | setup | board | settings
  hasActiveGame: false,
  showAbout: false,
  homeSheet: false,
  toast: null,
  roundDuration: 90,
  teams: [
    { id:1, name:'تیم ۱', color: TEAM_COLORS[0], icon: TEAM_ICONS[0], members:['بازیکن ۱','بازیکن ۲'], position:0, score:0, describerIdx:0, timerOverride:null, mods:{} },
    { id:2, name:'تیم ۲', color: TEAM_COLORS[1], icon: TEAM_ICONS[1], members:['بازیکن ۳','بازیکن ۴'], position:0, score:0, describerIdx:0, timerOverride:null, mods:{} },
  ],
  trackLength: 60,
  obstacles: [2,7,12,17,22,27,31,35,39,43,47,51,55,58],
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
  wordSource: WORD_LIST.slice(),   // what the game draws from (the built-in list, or the player's own)
  deck: [],                         // words left in the current shuffle
};

// ---------------- BACKGROUND MUSIC ----------------
// one looped track; starts after the first tap (browsers block autoplay), pauses when the app is hidden
const bgm = { a: null, started: false, ducked: false };
function musicSync(){
  try{
    if(!bgm.a){
      bgm.a = new Audio('assets/music/fun.mp3');
      bgm.a.loop = true; bgm.a.preload = 'auto';
    }
    // menus: normal level; during a round: quiet so the timer and cards stay clear
    bgm.a.volume = (state.screen === 'board' || state.screen === 'online-board') ? 0.09 : 0.22;
    if(prefs.music && bgm.started && !document.hidden && !bgm.ducked){ const p = bgm.a.play(); if(p && p.catch) p.catch(() => {}); }
    else bgm.a.pause();
  }catch(e){}
}
// load the track at launch so the first tap can start it at once
try{ bgm.a = new Audio('assets/music/fun.mp3'); bgm.a.loop = true; bgm.a.preload = 'auto'; bgm.a.load(); }catch(e){}
['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if(!bgm.started){ bgm.started = true; musicSync(); } }, { passive: true }));
document.addEventListener('visibilitychange', musicSync);

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
function sfxOpen(){ haptic(8); playTone(420,0.07,'sine',0.07); setTimeout(()=>playTone(640,0.1,'sine',0.07),55); }
function sfxClose(){ playTone(560,0.06,'sine',0.06); setTimeout(()=>playTone(380,0.09,'sine',0.06),50); }
function sfxSelect(){ haptic(8); playTone(780,0.05,'triangle',0.09); setTimeout(()=>playTone(1040,0.07,'triangle',0.08),45); }
// the game-won fanfare (own melody, made in code): the background music rests while it plays
function sfxVictory(){
  haptic([40,60,40,60,160]);
  if(prefs.music && bgm.a){ bgm.ducked = true; musicSync(); setTimeout(() => { bgm.ducked = false; musicSync(); }, 5200); }
  const mel = [[523,0],[659,160],[784,320],[1047,480],[784,800],[1047,960],[1319,1120],[1568,1500],[1319,1900],[1568,2100],[2093,2300]];
  mel.forEach(([f,t]) => setTimeout(() => playTone(f, t > 2200 ? 0.9 : 0.3, 'triangle', 0.17), t));
  [[262,0],[330,480],[392,960],[523,1500],[392,1900],[523,2300]].forEach(([f,t]) => setTimeout(() => playTone(f, t > 2200 ? 1.1 : 0.45, 'sine', 0.13), t));
  for(let i=0;i<14;i++) setTimeout(() => playTone(1800+Math.random()*1800, 0.05, 'sine', 0.05), 2300+i*110);
}
function sfxCheer(big){
  haptic(big ? [30,40,30,40,30,40,160] : [30,40,60]);
  const seq = big ? [523,659,784,1047,784,1047,1319] : [659,784,1047];
  seq.forEach((f,i)=>setTimeout(()=>playTone(f,0.22,'triangle',0.17), i*(big?110:130)));
  const n = big ? 14 : 7;            // little sparkles on top
  for(let i=0;i<n;i++) setTimeout(()=>playTone(1800+Math.random()*1800,0.05,'sine',0.05), 200+i*70+Math.random()*40);
}
function launchConfetti(host, big){
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = W*dpr; cv.height = H*dpr;
  host.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let cols = ['#FFD15C','#2ED3C6','#FF6B5E','#8FB8FF','#F6B88A','#FFFFFF','#B58CFF'];
  try{ const pf = loadProfile(); const it = SHOP_ITEMS.find(i => i.id === pf.confetti && pf.owned.includes(i.id)); if(it) cols = it.value; }catch(e){}
  const N = big ? 170 : 90, ps = [];
  for(let i=0;i<N;i++){
    const fromSide = i % 3 === 0;             // a third burst from the lower corners, the rest rain from the top
    const left = i % 2 === 0;
    ps.push(fromSide ? { x: left ? -10 : W+10, y: H*0.78, vx:(left?1:-1)*(3+Math.random()*7), vy:-(9+Math.random()*10) }
                     : { x: Math.random()*W, y: -20-Math.random()*H*0.5, vx:(Math.random()-.5)*3, vy:1.5+Math.random()*3 });
    Object.assign(ps[i], { w:6+Math.random()*7, h:9+Math.random()*9, r:Math.random()*6, vr:(Math.random()-.5)*.35,
      c:cols[i%cols.length], sw:Math.random()*6, ssw:.04+Math.random()*.06, round:Math.random()<.2 });
  }
  const t0 = performance.now(), dur = big ? 4800 : 3400;
  (function frame(now){
    const t = now - t0;
    g.clearRect(0,0,W,H);
    const fade = t > dur-900 ? Math.max(0,(dur-t)/900) : 1;
    ps.forEach(p=>{
      p.vy += .16; p.vx *= .995; p.vy = Math.min(p.vy, 6.5);
      p.x += p.vx + Math.sin(p.sw)*.8; p.y += p.vy; p.sw += p.ssw; p.r += p.vr;
      g.save(); g.globalAlpha = fade; g.translate(p.x,p.y); g.rotate(p.r);
      g.scale(1, Math.cos(p.sw*2.2));            // flutter: the sheet flips as it falls
      g.fillStyle = p.c;
      if(p.round){ g.beginPath(); g.arc(0,0,p.w/2,0,7); g.fill(); } else g.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      g.restore();
    });
    if(t < dur && cv.isConnected) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}
function celebrate(host, big){ sfxCheer(big); launchConfetti(host, big); }

function sfxHop(){ haptic(12); playTone(520,0.08,'square',0.12); setTimeout(()=>playTone(700,0.06,'square',0.08),50); }
function sfxCardReveal(){ haptic([15,50,30]); playTone(300,0.1,'triangle',0.12); setTimeout(()=>playTone(500,0.12,'triangle',0.14),80); setTimeout(()=>playTone(750,0.18,'triangle',0.16),160); }

function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function render(){
  if(window.__needsReload && state.screen === 'home'){ window.__needsReload = false; location.reload(); return; }
  // the wheel owns the screen for the length of its spin — but never block
  // a navigation away from the board, or the UI would freeze for 4s
  if(state.wheelTimer && (state.screen === 'board' || state.screen === 'online-board')) return;
  const app = document.getElementById('app');
  // a text field that is being typed in survives the rebuild (online chat, call link)
  const ae = document.activeElement;
  const keepKey = ae && ae.dataset && ae.dataset.keep ? ae.dataset.keep : null;
  const keepSel = keepKey ? [ae.selectionStart, ae.selectionEnd] : null;
  document.body.classList.toggle('home-mode', state.screen === 'home' || state.screen === 'welcome');
  document.documentElement.classList.toggle('home-mode', state.screen === 'home' || state.screen === 'welcome');
  document.body.classList.toggle('setup-mode', state.screen === 'setup' || state.screen === 'online-lobby' || state.screen === 'settings' || state.screen === 'profile' || state.screen === 'shop' || state.screen === 'friends' || state.screen === 'cards' || state.screen === 'tutorial' || state.screen === 'online-home' || state.screen === 'online-create' || state.screen === 'online-join' || state.screen === 'online-quick' || state.screen === 'daily');
  // only the redesigned board is guaranteed to fit; the online board still
  // uses the older, taller layout and must stay reachable
  const boardScreen = state.screen === 'board';
  document.body.classList.toggle('scroll-lock', boardScreen);
  document.documentElement.classList.toggle('scroll-lock', boardScreen);
  const playScreen = state.screen === 'board' || state.screen === 'online-board';
  document.body.classList.toggle('play-mode', playScreen);
  document.documentElement.classList.toggle('play-mode', playScreen);
  app.innerHTML = '';
  app.appendChild(renderBrand());
  if(state.screen === 'welcome'){
    app.appendChild(renderWelcome());
  } else if(state.screen === 'home'){
    app.appendChild(renderHome());
  } else if(state.screen === 'settings'){
    app.appendChild(renderSettings());
  } else if(state.screen === 'profile'){
    app.appendChild(renderProfile());
  } else if(state.screen === 'shop'){
    app.appendChild(renderShop());
  } else if(state.screen === 'friends'){
    app.appendChild(renderFriends());
  } else if(state.screen === 'cards'){
    app.appendChild(renderCards());
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
  } else if(state.screen === 'online-quick'){
    app.appendChild(renderOnlineQuick());
  } else if(state.screen === 'daily'){
    app.appendChild(renderDaily());
  } else if(state.screen === 'online-lobby'){
    app.appendChild(renderOnlineLobby());
  } else if(state.screen === 'online-board'){
    app.appendChild(renderOnlineBoard());
  } else {
    app.appendChild(renderBoard());
  }
  attachBackButton(app);
  playScreenEntrance(app);
  if(keepKey){
    const n = app.querySelector(`[data-keep="${keepKey}"]`);
    if(n && !n.disabled){
      n.focus({ preventScroll: true });
      try{ n.setSelectionRange(keepSel[0], keepSel[1]); }catch(e){}
    }
  }
}

// text fields whose content must outlive a rebuild of the screen
const drafts = {};
function keepInput(inp, key){
  inp.dataset.keep = key;
  inp.value = drafts[key] || '';
  inp.addEventListener('input', () => { drafts[key] = inp.value; });
  return inp;
}

function playScreenEntrance(app){
  if(lastRenderedScreen === state.screen) return false;
  if(lastRenderedScreen !== null && lastRenderedScreen !== undefined && state.screen !== 'board' && state.screen !== 'online-board') sfxOpen();
  lastRenderedScreen = state.screen;
  musicSync();
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
// ---------------- FRIENDS ----------------
function loadFriends(){
  const f = LS.get('friends', []);
  return Array.isArray(f) ? f.filter(x => x && typeof x.name === 'string' && x.name.trim()).map(x => ({ name: x.name.slice(0, 14) })).slice(0, 30) : [];
}
function saveFriends(f){ LS.set('friends', f); if(typeof accountTouch === 'function') accountTouch(); }
const CARD_ICONS = ['⏱️','🕵️','🛡️','✨','⚡','🪬','🧿','🚫','🔒','👣','↩️'];

function renderFriends(){
  const friends = loadFriends();
  const wrap = el(`<div class="setup-page frn"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">دوستان</div></div>`));

  // ---- my friends first: that is what people come here to see ----
  const list = el(`<div class="team-card frn-list"><div class="frn-list__head"><h2 class="set-card__title">دوستان من</h2><span class="frn-count"></span></div><div class="frn-rows"></div></div>`);
  list.querySelector('.frn-count').textContent = `${faNum(friends.length)} از ۳۰`;
  const rows = list.querySelector('.frn-rows');
  if(!friends.length){
    rows.appendChild(el(`<div class="frn-empty"><span aria-hidden="true">👥</span><b>هنوز دوستی اضافه نکرده‌ای</b><small>نام دوستانت را بنویس تا موقع ساخت تیم با یک لمس اضافه‌شان کنی.</small></div>`));
  }
  friends.forEach((fr, i) => {
    const row = el(`<div class="frn-row"><span class="frn-row__av"></span><b class="frn-row__name"></b><button class="frn-row__x" aria-label="حذف"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button></div>`);
    row.querySelector('.frn-row__av').textContent = Array.from(fr.name)[0] || '؟';
    row.querySelector('.frn-row__name').textContent = fr.name;
    row.querySelector('.frn-row__x').addEventListener('click', () => { const f = loadFriends(); f.splice(i, 1); saveFriends(f); render(); });
    rows.appendChild(row);
  });
  wrap.appendChild(list);

  // ---- add: one row (avatar button, name, add) and a picker that opens on demand ----
  const add = el(`<div class="team-card frn-add">
    <h2 class="set-card__title">افزودن دوست</h2>
    <div class="frn-add__row">
      <input class="prof-name frn-name" id="frnName" type="text" maxlength="14" placeholder="نام دوست" autocomplete="off" />
      <button type="button" class="frn-add__btn">افزودن</button>
    </div>
    <p class="frn-hint">دوستان فقط روی همین گوشی ذخیره می‌شوند.</p>
  </div>`);
  const doAdd = () => {
    const inp = add.querySelector('#frnName'); const name = inp.value.trim();
    if(!name){ inp.focus(); return; }
    const f = loadFriends();
    if(f.some(x => x.name === name)){ toastHome('این دوست قبلاً هست'); return; }
    if(f.length >= 30){ toastHome('حداکثر ۳۰ دوست'); return; }
    f.push({ name }); saveFriends(f); render();
  };
  add.querySelector('.frn-add__btn').addEventListener('click', doAdd);
  add.querySelector('#frnName').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); doAdd(); } });
  wrap.appendChild(add);

  // ---- invite: a compact card at the end ----
  const inv = el(`<div class="team-card frn-invite">
    <div class="frn-invite__txt"><h2 class="set-card__title">دوستانت را دعوت کن</h2><p>لینک بازی را بفرست. برای بازی هم‌زمان از راه دور، یکی اتاق آنلاین می‌سازد و کد را می‌فرستد.</p></div>
    <button class="hm-btn hm-btn--teal frn-share"><span class="hm-btn__gloss"></span><span class="hm-out hm-out--teal" data-text="فرستادن لینک بازی">فرستادن لینک بازی</span></button>
  </div>`);
  inv.querySelector('.frn-share').addEventListener('click', () => {
    const link = gameLink();
    const text = 'بیا «نخ بده» بازی کنیم! بازی حدس کلمات گروهی:';
    if(navigator.share){ navigator.share({ title: 'نخ بده', text, url: link }).catch(() => {}); }
    else if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text + '\n' + link).then(() => toastHome('لینک کپی شد')).catch(() => {}); }
    else toastHome(link);
  });
  wrap.appendChild(inv);
  return wrap;
}

// ---------------- CARDS ----------------
function renderCards(){
  const seen = LS.get('seenCards', {}) || {};
  const got = ACTION_CARDS.filter((_, i) => seen[i] > 0).length;
  const wrap = el(`<div class="setup-page crd"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">کارت‌ها</div></div>`));
  wrap.appendChild(el(`<div class="team-card crd-top">
    <div class="crd-top__num"><b>${faNum(got)}</b><span>از ${faNum(ACTION_CARDS.length)}</span></div>
    <div class="crd-top__txt"><h2 class="set-card__title">کارت‌های اکشن</h2><p>وقتی تیمی روی خانه‌ی ویژه می‌افتد، یکی از این کارت‌ها برایش درمی‌آید. هر کارتی که اولین بار ببینی در مجموعه‌ات باز می‌شود.</p></div>
    <div class="crd-bar"><i style="width:${Math.round(got * 100 / ACTION_CARDS.length)}%"></i></div>
  </div>`));
  const grid = el(`<div class="crd-grid"></div>`);
  ACTION_CARDS.forEach((c, i) => {
    const n = seen[i] | 0;
    const cell = el(`<div class="crd-card ${n ? 'is-got' : ''}"><span class="crd-card__ico"></span><b class="crd-card__t"></b><p class="crd-card__d"></p><i class="crd-card__n"></i></div>`);
    cell.querySelector('.crd-card__ico').textContent = n ? CARD_ICONS[i % CARD_ICONS.length] : '❔';
    cell.querySelector('.crd-card__t').textContent = n ? c.title : 'کارت ناشناخته';
    cell.querySelector('.crd-card__d').textContent = n ? c.instruction : 'روی یک خانه‌ی ویژه بیفت تا این کارت را ببینی.';
    cell.querySelector('.crd-card__n').textContent = n ? `${faNum(n)} بار دیده‌ای` : '';
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  wrap.appendChild(el(`<div class="team-card set-card"><h2 class="set-card__title">کارت‌های کلمه</h2>
    <div class="set-stats"><div class="set-stat"><b>${faNum(state.wordSource.length)}</b><span>کلمه در بازی</span></div>
    <div class="set-stat"><b>${faNum(loadProfile().stats.correct)}</b><span>درست گفته‌ای</span></div></div></div>`));
  return wrap;
}

// ---------------- SHOP ----------------
// Coins are earned by playing (no real money). Items are cosmetic only.
const SHOP_ITEMS = [
  { id:'av_lion',   kind:'avatar',   name:'شیر',          value:'🦁', price:0,   free:true },
  { id:'av_crown',  kind:'avatar',   name:'تاج',          value:'👑', price:60 },
  { id:'av_falcon', kind:'avatar',   name:'طاووس',        value:'🦚', price:60 },
  { id:'av_sun',    kind:'avatar',   name:'خورشید',       value:'☀️', price:80 },
  { id:'av_cat',    kind:'avatar',   name:'گربه‌ی ایرانی', value:'🐈', price:80 },
  { id:'av_dragon', kind:'avatar',   name:'سیمرغ',        value:'🐉', price:140 },
  { id:'fr_teal',   kind:'frame',    name:'قاب فیروزه‌ای', value:'#2ED3C6', price:70 },
  { id:'fr_ruby',   kind:'frame',    name:'قاب یاقوتی',   value:'#FF4D5E', price:70 },
  { id:'fr_violet', kind:'frame',    name:'قاب ارغوانی',  value:'#B58CFF', price:90 },
  { id:'fr_gold',   kind:'frame',    name:'قاب زرین',     value:'#FFD15C', price:120 },
  { id:'cf_persian',kind:'confetti', name:'جشن ایرانی',   value:['#2ED3C6','#1D6FB8','#FFD15C','#FFF6E3','#0FA3B1'], price:100 },
  { id:'cf_rose',   kind:'confetti', name:'جشن گل سرخ',   value:['#FF4D5E','#FF8FA3','#FFD15C','#FFF6E3','#C23B33'], price:100 },
  { id:'cf_night',  kind:'confetti', name:'جشن شبانه',    value:['#FFFFFF','#B8C7FF','#8FB8FF','#FFD15C','#B58CFF'], price:130 },
  { id:'sc_fill',   kind:'scene', name:'تایمر بزرگ', value:'fill',  price:0,   free:true },
  { id:'sc_ring',   kind:'scene', name:'حلقه‌ی زمان',  value:'ring',    price:0,   free:true },
  { id:'sc_classic',kind:'scene', name:'کارت کلاسیک',  value:'classic', price:0,   free:true },
  { id:'sc_carpet', kind:'scene', name:'فرش ایرانی',   value:'carpet',  price:80 },
  { id:'sc_tile',   kind:'scene', name:'کاشی هشت‌پر',  value:'tile',    price:100 },
  { id:'sc_poster', kind:'scene', name:'پوستر',        value:'poster',  price:90 },
  { id:'sc_sunset', kind:'scene', name:'غروب خلیج',    value:'sunset',  price:110 },
  { id:'sc_ribbon', kind:'scene', name:'روبان طلایی',  value:'ribbon',  price:100 },
  { id:'sc_stack',  kind:'scene', name:'دسته‌ی کارت',  value:'stack',   price:90 },
  { id:'sc_spot',   kind:'scene', name:'نور صحنه',     value:'spot',    price:120 },
  { id:'sc_neon',   kind:'scene', name:'نئون شبانه',   value:'neon',    price:130 },
  { id:'sc_yarn',   kind:'scene', name:'کلاف نخ',      value:'yarn',    price:140 },
];
WORD_PACKS.forEach(p => SHOP_ITEMS.push({ id:'pk_' + p.id, kind:'pack', name:p.name, value:p.id, price:p.price, free:!!p.free }));
NBWheel.SKINS.forEach(s => SHOP_ITEMS.push({ id:s.id, kind:'wheel', name:s.name, value:s.id, price:s.price, free:!!s.free }));
MAPS.forEach(m => SHOP_ITEMS.push({ id:'mp_' + m.id, kind:'map', name:m.name, value:m.id, price:m.price, free:!!m.free }));
const SHOP_TABS = [['pack','پک کلمه'],['map','نقشه'],['avatar','آواتار'],['frame','قاب'],['confetti','کاغذ رنگی'],['scene','صحنه‌ی کلمه'],['wheel','گردونه']].filter(t => t[0] !== 'map' || MAPS.length > 1);

// ---- word packs the player can use (free ones plus the bought ones) ----
function packOwned(id){
  const it = SHOP_ITEMS.find(i => i.kind === 'pack' && i.value === id);
  return !!it && (it.free || loadProfile().owned.includes(it.id));
}
function selectedPacks(){
  const saved = LS.get('packs', null);
  const ids = (Array.isArray(saved) ? saved : DEFAULT_PACKS).filter(id => WORD_PACKS.some(p => p.id === id) && packOwned(id));
  return ids.length ? ids : DEFAULT_PACKS.slice();
}
// ---- boards (maps) the player can use ----
function mapOwned(id){
  const m = MAPS.find(x => x.id === id);
  return !!m && (m.free || loadProfile().owned.includes('mp_' + id));
}
function selectedMapId(){
  const id = LS.get('mapId', 'iran');
  return MAPS.some(m => m.id === id) && mapOwned(id) ? id : 'iran';
}
// chips for choosing a board; locked ones send the player to the shop
function buildMapPicker(selectedId, onPick, opts){
  opts = opts || {};
  const grid = el(`<div class="pk-grid mp-grid"></div>`);
  MAPS.forEach(m => {
    const owned = mapOwned(m.id), on = selectedId === m.id;
    const b = el(`<button type="button" class="pk-chip mp-chip ${on ? 'is-on' : ''} ${owned ? '' : 'is-locked'}" aria-pressed="${on}"><span class="pk-chip__ico" aria-hidden="true"></span><span class="pk-chip__name"></span><small></small></button>`);
    b.querySelector('.pk-chip__ico').textContent = owned ? '🗺️' : '🔒';
    b.querySelector('.pk-chip__name').textContent = m.name;
    b.querySelector('small').textContent = owned ? m.blurb : `${faNum(m.price)} سکه`;
    b.addEventListener('click', () => {
      if(opts.readOnly) return;
      if(!owned){ shopTab = 'map'; state.screen = 'shop'; render(); return; }
      LS.set('mapId', m.id); setActiveMap(m.id);
      onPick(m.id);
    });
    grid.appendChild(b);
  });
  return grid;
}
function packWordCount(p){ return (p.words || WORD_LIST).length; }
// A row of pack chips. selected = ids; onToggle(newIds). Locked packs send the player to the shop.
function buildPackPicker(selected, onToggle, opts){
  opts = opts || {};
  const box = el(`<div class="pk-pick"></div>`);
  const total = wordsForPacks(selected).length;
  const grid = el(`<div class="pk-grid"></div>`);
  WORD_PACKS.forEach(p => {
    const owned = packOwned(p.id), on = selected.includes(p.id);
    const b = el(`<button type="button" class="pk-chip ${on ? 'is-on' : ''} ${owned ? '' : 'is-locked'}" aria-pressed="${on}"><span class="pk-chip__ico" aria-hidden="true"></span><span class="pk-chip__name"></span><small></small>${packIsFresh(p) ? '<i class="pk-new">تازه</i>' : ''}</button>`);
    b.querySelector('.pk-chip__ico').textContent = owned ? p.icon : '🔒';
    b.querySelector('.pk-chip__name').textContent = p.name;
    b.querySelector('small').textContent = owned ? `${faNum(packWordCount(p))} کلمه` : `${faNum(p.price)} سکه`;
    b.addEventListener('click', () => {
      if(opts.readOnly) return;
      if(!owned){ shopTab = 'pack'; state.screen = 'shop'; render(); return; }
      let ids = on ? selected.filter(x => x !== p.id) : selected.concat(p.id);
      if(!ids.length){ toastHome('حداقل یک پک باید انتخاب باشد'); return; }
      LS.set('packs', ids);
      onToggle(ids);
    });
    grid.appendChild(b);
  });
  box.appendChild(grid);
  box.appendChild(el(`<small class="pk-total">${faNum(total)} کلمه در بازی</small>`));
  return box;
}
function coinsForRound(correct, moved, newCity){
  return correct * 2 + (correct >= 5 ? 5 : 0) + (newCity ? 15 : 0) + (moved >= 5 ? 3 : 0);
}
const COINS_PER_GAME = 30;

// ---------------- PROFILE ----------------
const AVATARS = ['🦁','🦅','🐎','🐪','🌹','🏺','⭐','🔥','🌙','🕊️','🏔️','🎯'];
const PROFILE_BADGES = [
  ['🎬','اولین راند',      p => p.stats.rounds >= 1],
  ['📚','۵۰ کلمه‌ی درست',  p => p.stats.correct >= 50],
  ['💯','۲۰۰ کلمه‌ی درست', p => p.stats.correct >= 200],
  ['⚡','راند ۸ کلمه‌ای',   p => p.stats.best >= 8],
  ['🏁','اولین بازی کامل', p => p.stats.games >= 1],
  ['🧭','۱۰ بازی کامل',    p => p.stats.games >= 10],
];
function loadProfile(){
  const p = LS.get('profile', null) || {};
  // the old default scene was saved into every profile; move those players to the new default once
  if(p.scene === 'sc_ring' && !LS.get('sceneFill', false)){ p.scene = 'sc_fill'; LS.set('sceneFill', true); LS.set('profile', p); }
  const s = p.stats || {};
  return {
    name: typeof p.name === 'string' ? p.name.slice(0, 14) : '',
    avatar: (AVATARS.includes(p.avatar) || SHOP_ITEMS.some(i => i.kind === 'avatar' && i.value === p.avatar)) ? p.avatar : '',
    coins: p.coins === undefined ? 50 : Math.max(0, p.coins|0),       // a welcome gift of 50 for new players
    owned: Array.isArray(p.owned) ? p.owned.filter(id => SHOP_ITEMS.some(i => i.id === id)) : [],
    frame: typeof p.frame === 'string' ? p.frame : '',
    confetti: typeof p.confetti === 'string' ? p.confetti : '',
    scene: sceneIdOf(p),
    wheel: wheelIdOf(p),
    stats: { games: s.games|0, rounds: s.rounds|0, correct: s.correct|0, skip: s.skip|0, best: s.best|0, cells: s.cells|0 },
    ...sanitizeLook(p)
  };
}

// ---- built avatars (see js/avatar.js) ----
// look = indexes into the part lists; cover/ring pick the banner and the circle colour;
// parts = locked pieces the player has bought, as 'kind:index'.
function partPrice(kind, i){ return (NBAvatar.PRICES[kind] || {})[i] || 0; }
function sanitizeLook(p){
  const L = NBAvatar.LISTS, src = (p.look && typeof p.look === 'object') ? p.look : {};
  const parts = Array.isArray(p.parts) ? p.parts.filter(x => typeof x === 'string') : [];
  const fix = (kind, v, dflt) => {
    const n = Number.isInteger(v) && v >= 0 && v < L[kind].length ? v : dflt;
    return partPrice(kind, n) && !parts.includes(kind + ':' + n) ? 0 : n;
  };
  const look = {};
  Object.keys(NBAvatar.DEFAULT_LOOK).forEach(k => { look[k] = fix(k, src[k], NBAvatar.DEFAULT_LOOK[k]); });
  return { look, cover: fix('cover', p.cover, 0), ring: fix('ring', p.ring, 0), parts };
}
function ringColor(p){
  const it = SHOP_ITEMS.find(i => i.id === p.frame && p.owned.includes(i.id));
  return it ? it.value : NBAvatar.RING[p.ring][0];
}
function avatarMarkup(p){ return p.avatar ? `<span class="av-emoji">${p.avatar}</span>` : NBAvatar.svg(p.look); }
function sceneIdOf(p){
  const it = SHOP_ITEMS.find(i => i.kind === 'scene' && i.id === p.scene);
  const owned = Array.isArray(p.owned) && it && p.owned.includes(it.id);
  return it && (it.free || owned) ? it.id : 'sc_fill';
}
function wheelIdOf(p){
  const it = SHOP_ITEMS.find(i => i.kind === 'wheel' && i.id === p.wheel);
  const owned = Array.isArray(p.owned) && it && p.owned.includes(it.id);
  return it && (it.free || owned) ? it.id : 'wh_lamp_red';
}
function sceneName(){ const it = SHOP_ITEMS.find(i => i.id === loadProfile().scene); return it ? it.value : 'fill'; }
function frameStyle(p){
  const c = ringColor(p);
  return `border-color:${c}; box-shadow:0 0 0 3px ${c}55, 0 8px 20px rgba(0,0,0,.35);`;
}
function saveProfile(p){ LS.set('profile', p); if(typeof accountTouch === 'function') accountTouch(); }
function recordRound(sum){
  try{
    const p = loadProfile(), s = p.stats;
    const newCity = sum.to !== undefined && sum.from !== undefined && sum.to > sum.from && cityOf(sum.to) > cityOf(sum.from);
    sum.earned = coinsForRound(sum.correct || 0, sum.moved || 0, newCity);
    p.coins += sum.earned;
    s.rounds++; s.correct += sum.correct || 0; s.skip += sum.skip || 0;
    s.best = Math.max(s.best, sum.correct || 0); s.cells += Math.max(0, sum.moved || 0);
    saveProfile(p);
  }catch(e){}
}
function recordGameFinished(){
  try{ const p = loadProfile(); p.stats.games++; p.coins += COINS_PER_GAME; saveProfile(p); }catch(e){}
}

let resumeMsgDismissed = false;
function resumeBanner(){
  if(resumeMsgDismissed || !hasSavedGame()) return null;
  const g = (state.hasActiveGame && !state.winner && state.teams.length >= 2) ? { teams: state.teams } : storedLocalGame();
  const lead = g && g.teams ? g.teams.reduce((m, t) => (t.position || 0) > (m.position || 0) ? t : m, g.teams[0]) : null;
  const where = lead ? ` (${lead.name} روی خانه‌ی ${faNum(Math.min((lead.position || 0) + 1, state.trackLength))} از ${faNum(state.trackLength)})` : '';
  return { kind:'resume', icon:'▶️', text:`بازی نیمه‌کاره‌ات منتظرته${where}. برای ادامه، همین پیام را لمس کن.`, cta:'',
    go(){ resumeLocalGame(); }, close(){ resumeMsgDismissed = true; } };
}

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

// share the link of the game (used by the friends row on the home screen)
function shareGameLink(){
  const link = gameLink();
  const text = 'بیا «نخ بده» بازی کنیم! بازی حدس کلمات گروهی:';
  if(navigator.share){ navigator.share({ title: 'نخ بده', text, url: link }).catch(() => {}); }
  else if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text + '\n' + link).then(() => toastHome('لینک کپی شد')).catch(() => {}); }
  else toastHome(link);
}

// the boards the player may use on the home screen (owned ones), and moving between them
function ownedMaps(){ return MAPS.filter(m => mapOwned(m.id)); }
function stepHomeMap(dir){
  const list = ownedMaps(); if(!list.length) return;
  const i = Math.max(0, list.findIndex(m => m.id === activeMapId));
  const m = list[(i + dir + list.length) % list.length];
  LS.set('mapId', m.id); setActiveMap(m.id);
  state.heroDir = dir;
  sfxTap(); render();
}

// ---------------- WELCOME (first launch): big logo, then guest or Google ----------------
function welcomeEnter(){
  LS.set('welcomed', true);
  state.screen = 'home';
  render();
}
async function welcomeGoogle(kind){
  LS.set('welcomed', true);               // set first: signing in to a known account reloads the page
  await accountSignIn(kind);
  if(accountIsGoogle()) welcomeEnter();
  else { LS.set('welcomed', false); render(); }
}
function renderWelcome(){
  const wrap = el(`<div class="wl"></div>`);
  const mus = el(`<button type="button" class="wl__music" aria-label="موزیک"></button>`);
  const paintMus = () => { mus.textContent = prefs.music ? '🔊' : '🔇'; };
  paintMus();
  mus.addEventListener('click', () => { prefs.music = !prefs.music; LS.set('music', prefs.music); musicSync(); paintMus(); });
  wrap.appendChild(mus);
  wrap.appendChild(el(`<div class="wl__cards" aria-hidden="true">
    <img class="wl__card wl__card--a" src="assets/card-action.webp" alt="">
    <img class="wl__card wl__card--b" src="assets/card-back.webp" alt="">
    <img class="wl__card wl__card--c" src="assets/card-word.webp" alt=""></div>`));
  wrap.appendChild(el(`<div class="wl__logo"><img src="assets/logo.webp" alt="نخ بده" decoding="async"></div>`));
  wrap.appendChild(el(`<p class="wl__tag">کلمه رو بدون گفتنش توضیح بده!<br><span>بازی دسته‌جمعی، رو به‌رو یا آنلاین</span></p>`));
  const box = el(`<div class="wl__btns"></div>`);
  const signedIn = !IS_NATIVE && accountIsGoogle();
  if(!IS_NATIVE && !signedIn){
    const g = el(`<button type="button" class="wl__google"><span class="acc__g"><svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg></span><span>${acc.busy ? 'در حال ورود…' : 'ورود با گوگل'}</span></button>`);
    g.disabled = acc.busy || !accountReady();
    g.addEventListener('click', () => welcomeGoogle());
    box.appendChild(g);
    if(APPLE_LOGIN){
      const ap = el(`<button type="button" class="wl__apple"><span class="wl__ap"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.700 2.400 2.900 2.300 1.200 0 1.600-.7 3-.7s1.800.7 3 .7c1.300 0 2.100-1.100 2.800-2.200.9-1.300 1.300-2.500 1.300-2.600 0 0-2.500-1-2.500-3.800zM14.200 5.900c.6-.8 1.100-1.900.9-3-.9 0-2.100.6-2.700 1.400-.6.700-1.100 1.800-.9 2.900 1 .1 2-.5 2.700-1.300z"/></svg></span><span>${acc.busy ? 'در حال ورود…' : 'ورود با اپل'}</span></button>`);
      ap.disabled = acc.busy || !accountReady();
      ap.addEventListener('click', () => welcomeGoogle('apple'));
      box.appendChild(ap);
    }
  }
  const guest = el(`<button type="button" class="wl__guest"><span>${signedIn ? 'ادامه به‌عنوان ' + ((window.FB.account.displayName() || '').split(' ')[0] || 'حساب گوگل') : (IS_NATIVE ? 'شروع بازی' : 'ادامه به‌عنوان مهمان')}</span></button>`);
  guest.disabled = acc.busy;
  guest.addEventListener('click', welcomeEnter);
  box.appendChild(guest);
  const code = el(`<button type="button" class="wl__code">🔑 کد اتاق دارم</button>`);
  code.disabled = acc.busy;
  code.addEventListener('click', () => { LS.set('welcomed', true); state.screen = 'home'; state.homeSheet = 'join'; render(); });
  box.appendChild(code);
  wrap.appendChild(box);
  if(acc.err){ const e = el(`<div class="room-form__error" role="alert" style="display:block;"></div>`); e.textContent = acc.err; wrap.appendChild(e); }
  wrap.appendChild(el(`<small class="wl__note">${IS_NATIVE ? '' : 'با حساب گوگل، پروفایل و سکه‌هات هیچ‌وقت گم نمی‌شن.<br>'}با ادامه دادن، <a href="privacy.html" target="_blank" rel="noopener">حریم خصوصی</a> را می‌پذیری · Yomor Games</small>`));
  return wrap;
}

function renderHome(){
  const wrap = el(`<div class="hm hm2"></div>`);

  // ---- top row: profile (right), logo (middle), settings (left) ----
  const top = el(`<div class="hm2-top"></div>`);
  const prof = loadProfile();
  const profChip = el(`<button class="hm-prof" aria-label="پروفایل">
    <span class="hm-prof__av" style="${frameStyle(prof).replace(/box-shadow:[^;]*;/,'')}">${avatarMarkup(prof)}</span>
    <span class="hm-prof__txt"><b></b><i>🪙 ${faNum(prof.coins)}</i></span>
  </button>`);
  profChip.querySelector('b').textContent = prof.name || 'بازیکن مهمان';
  profChip.addEventListener('click', () => { state.screen = 'profile'; render(); });
  top.appendChild(profChip);
  top.appendChild(el(`<img class="hm2-logo" src="${HOME_LOGO}" alt="نخ بده" />`));
  const gear = el(`<button class="hm-gear" aria-label="تنظیمات"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#EAF6FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg></button>`);
  gear.addEventListener('click', () => { state.screen = 'settings'; render(); });
  top.appendChild(gear);
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
    if(banner.kind === 'resume'){
      b.setAttribute('role', 'button'); b.tabIndex = 0;
      b.addEventListener('click', (ev) => { if(!ev.target.closest('.hm-banner__x')) banner.go(); });
      b.addEventListener('keydown', (ev) => { if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); banner.go(); } });
    }
    b.querySelector('.hm-banner__x').addEventListener('click', () => { banner.close(); render(); });
    wrap.appendChild(b);
  }

  // ---- friends ----
  const friends = loadFriends();
  const fr = el(`<section class="hm2-fr"><div class="hm2-sec"><h3>دوستان</h3><button type="button" class="hm2-link">همه ←</button></div><div class="hm2-frow"></div></section>`);
  fr.querySelector('.hm2-link').addEventListener('click', () => { state.screen = 'friends'; render(); });
  const frow = fr.querySelector('.hm2-frow');
  const invite = el(`<button type="button" class="hm2-fr__item hm2-fr__add"><span class="hm2-fr__av">+</span><small>دعوت</small></button>`);
  invite.addEventListener('click', shareGameLink);
  frow.appendChild(invite);
  friends.slice(0, 6).forEach(f => {
    const it = el(`<button type="button" class="hm2-fr__item"><span class="hm2-fr__av"></span><small></small></button>`);
    it.querySelector('.hm2-fr__av').textContent = Array.from(f.name)[0] || '؟';
    it.querySelector('small').textContent = f.name;
    it.addEventListener('click', () => { state.screen = 'friends'; render(); });
    frow.appendChild(it);
  });
  if(!friends.length) frow.appendChild(el(`<p class="hm2-fr__hint">دوستانت رو دعوت کن تا با هم بازی کنید.</p>`));
  wrap.appendChild(fr);

  // quick ways back in: a fresh game next to a saved one, and the room you left
  const quick = [];
  const sr = savedRoom();
  if(sr) quick.push([`بازگشت به اتاق ${sr.code}`, rejoinSavedRoom]);
  if(quick.length){
    const row = el(`<div class="hm-quick"></div>`);
    quick.forEach(([label, fn]) => {
      const chip = el(`<button class="hm-btn hm-btn--gold hm-qbtn"><span class="hm-btn__gloss"></span><span class="hm-out" data-text=""></span></button>`);
      const lab = chip.querySelector('.hm-out'); lab.textContent = label; lab.dataset.text = label;
      chip.addEventListener('click', fn);
      row.appendChild(chip);
    });
    wrap.appendChild(row);
  }

  // ---- the arena: the board in use, one big play button and three shortcuts ----
  const maps = ownedMaps(), cur = curMap();
  const hero = el(`<div class="hm2-hero"><div class="hm2-hero__img"></div><div class="hm2-hero__shade"></div>
    <button type="button" class="hm2-nav hm2-nav--l" aria-label="نقشه‌ی بعدی"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></button>
    <button type="button" class="hm2-nav hm2-nav--r" aria-label="نقشه‌ی قبلی"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6 L16 12 L10 18"/></svg></button>
    <div class="hm2-hero__info"><span class="hm2-hero__name"></span><small class="hm2-hero__blurb"></small><span class="hm2-dots"></span></div></div>`);
  const img = hero.querySelector('.hm2-hero__img');
  img.style.backgroundImage = `url("${cur.hero || cur.preview || cur.lite}")`;
  if(state.heroDir) img.classList.add(state.heroDir > 0 ? 'is-in-l' : 'is-in-r');
  state.heroDir = 0;
  hero.querySelector('.hm2-hero__name').textContent = '🗺️ ' + cur.name;
  hero.querySelector('.hm2-hero__blurb').textContent = cur.blurb || '';
  const dots = hero.querySelector('.hm2-dots');
  maps.forEach(m => dots.appendChild(el(`<i class="${m.id === cur.id ? 'is-on' : ''}"></i>`)));
  hero.querySelector('.hm2-nav--l').addEventListener('click', () => stepHomeMap(1));
  hero.querySelector('.hm2-nav--r').addEventListener('click', () => stepHomeMap(-1));
  if(maps.length < 2){ hero.querySelectorAll('.hm2-nav').forEach(n => n.hidden = true); }
  if(maps.length < MAPS.length){
    const more = el(`<button type="button" class="hm2-more">نقشه‌های بیشتر ←</button>`);
    more.addEventListener('click', () => { shopTab = 'map'; state.screen = 'shop'; render(); });
    hero.appendChild(more);
  }
  wrap.appendChild(hero);

  const play = el(`<button class="hm-btn hm-btn--gold hm2-play">
    <span class="hm-btn__gloss"></span>
    <span class="hm2-play__ico"><svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg></span>
    <span class="hm2-play__txt hm-out hm-out--gold" data-text="بازی کن">بازی کن</span></button>`);
  play.addEventListener('click', () => { state.homeSheet = 'new'; render(); });
  wrap.appendChild(play);

  const dst = dailyStreak();
  const dailyDone = dailyLoad().done;
  const shortcuts = el(`<div class="hm2-sc"></div>`);
  const sc = (cls, ico, label, fn) => {
    const b = el(`<button type="button" class="hm-btn ${cls} hm2-sc__b"><span class="hm-btn__gloss"></span><span class="hm2-sc__ico"></span><span class="hm2-sc__t"></span></button>`);
    b.querySelector('.hm2-sc__ico').textContent = ico; b.querySelector('.hm2-sc__t').textContent = label;
    b.addEventListener('click', fn); shortcuts.appendChild(b);
  };
  sc('hm-btn--teal', '🌐', 'بازی سریع', openQuick);
  sc('hm-btn--teal', '🔑', 'ورود با کد', () => { state.homeSheet = 'join'; render(); });
  sc('hm-btn--red', '🔥', 'کلمه‌ی امروز' + (dst.n ? ' · ' + faNum(dst.n) : (dailyDone ? ' ✓' : '')), openDaily);
  wrap.appendChild(shortcuts);

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
      if(key === 'profile') item.addEventListener('click', () => { state.screen = 'profile'; render(); });
      else if(key === 'shop' || key === 'friends' || key === 'cards') item.addEventListener('click', () => { state.screen = key; render(); });
      else if(!isHome) item.addEventListener('click', () => toastHome(label + ' به زودی'));
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
        if(NBSafety.bad(name)){ err.textContent = 'این اسم مناسب نیست. یه اسم دیگه بنویس.'; err.hidden = false; nameIn.focus(); return; }
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
      const quick = el(`<button class="hm-btn hm-btn--teal hm-sheet__opt"><span class="hm-btn__gloss"></span>
        <span class="hm-sheet__t">بازی سریع با فارسی‌زبان‌ها</span></button>`);
      quick.addEventListener('click', () => { state.homeSheet = false; openQuick(); });
      if(hasSavedGame()){
        // the unfinished local game is offered here, not as a message on the home screen
        const cont = el(`<button class="hm-btn hm-btn--red hm-sheet__opt"><span class="hm-btn__gloss"></span>
          <span class="hm-sheet__t">ادامه‌ی بازی قبلی</span></button>`);
        cont.addEventListener('click', () => { state.homeSheet = false; resumeLocalGame(); });
        sheet.appendChild(cont);
      }
      sheet.appendChild(quick); sheet.appendChild(online); sheet.appendChild(local);
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
      memberNames: memberIds.map(pid => NBSafety.clean((room.players[pid]||{}).name || '؟')),
      memberAv: memberIds.map(pid => (room.players[pid]||{}).av || null),
    };
  });
}

let onlineTicker = null;
function ensureOnlineTicker(){
  if(onlineTicker) return;
  onlineTicker = setInterval(() => {
    if(state.screen === 'online-lobby' && online.room && online.room.autoStartAt){ render(); return; }
    if(state.screen !== 'online-board') return;
    // nothing is counting down during the wheel / action-card overlay or the
    // round summary — re-rendering there only restarts their animations
    if(state.actionPickActive || state.roundEnded || state.animating) return;
    if(!state.timerRunning) return;
    syncStateFromOnlineRoom();
    if(!tickTimerOnly()) render();
  }, 1000);
}

// ---------------- ONLINE ROOM SCREENS (choose / create / join) ----------------
function roomHead(){
  return el(`<div class="setup-head"><div class="setup-brand">نخ بده</div></div>`);
}

function roomField(id, label, opts){
  opts = opts || {};
  return el(`<div class="room-form__field">
    <label class="room-form__label" for="${id}">${label}</label>
    <input class="room-form__input${opts.code ? ' room-form__input--code' : ''}" type="text" id="${id}" maxlength="${opts.max || 20}" autocomplete="off"${opts.code ? ' dir="ltr" autocapitalize="characters" spellcheck="false"' : ''} />
    <div class="room-form__error" role="alert" style="display:none;"></div>
  </div>`);
}

// shows or clears the message under a field; returns true when the field is fine
function roomFieldCheck(field, ok, msg){
  const input = field.querySelector('input');
  const err = field.querySelector('.room-form__error');
  err.textContent = ok ? '' : msg;
  err.style.display = ok ? 'none' : 'block';
  input.classList.toggle('is-invalid', !ok);
  return ok;
}

// ---- step 1: choose create or join ----
function renderOnlineHome(){
  const wrap = el(`<div class="setup-page room-page"></div>`);
  wrap.appendChild(roomHead());

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

  const quickChoice = el(`<button class="room-choice room-choice--join">
    <span class="room-choice__icon">🌐</span>
    <span class="room-choice__text"><span class="room-choice__label">بازی سریع</span><span class="room-choice__hint">با فارسی‌زبان‌های دیگه بازی کن</span></span>
    <span class="room-choice__chev"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></span>
  </button>`);
  quickChoice.addEventListener('click', openQuick);
  wrap.appendChild(quickChoice);

  const sr = savedRoom();
  if(sr){
    const back = el(`<button class="team-card__add room-rejoin"></button>`);
    back.textContent = `بازگشت به اتاق ${sr.code}`;
    back.addEventListener('click', rejoinSavedRoom);
    wrap.appendChild(back);
  }
  return wrap;
}

// ---- step 2a: create a room ----
function renderOnlineCreate(){
  const wrap = el(`<div class="setup-page room-page"></div>`);
  wrap.appendChild(roomHead());

  const form = el(`<form class="team-card room-form-card" novalidate></form>`);
  form.appendChild(el(`<h2 class="set-card__title">ساخت اتاق جدید</h2>`));
  form.appendChild(el(`<p class="room-form__lead">اسمت رو بنویس. بعد از ساخت، یه کد ۵ حرفی می‌گیری که دوستات باهاش وارد می‌شن.</p>`));
  const nameField = roomField('createNameInput', 'نام تو');
  form.appendChild(nameField);
  const btn = el(`<button type="submit" class="setup-start"><span>ساخت اتاق</span></button>`);
  form.appendChild(btn);
  const nameInput = nameField.querySelector('input');
  nameInput.value = LS.get('name', '') || '';
  nameInput.addEventListener('input', () => { if(nameInput.value.trim()) roomFieldCheck(nameField, true); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if(!roomFieldCheck(nameField, !!name, 'لطفاً اسمت رو وارد کن')){ nameInput.focus(); return; }
    if(NBSafety.bad(name)){ roomFieldCheck(nameField, false, 'این اسم مناسب نیست. یه اسم دیگه بنویس.'); nameInput.focus(); return; }
    btn.disabled = true;
    btn.firstChild.textContent = 'در حال ساخت…';
    onlineCreateRoom(name).finally(() => {
      btn.disabled = false;
      btn.firstChild.textContent = 'ساخت اتاق';
    });
  });
  wrap.appendChild(form);
  if(!nameInput.value) setTimeout(() => nameInput.focus(), 80);
  return wrap;
}

// ---- step 2b: join a friend's room ----
function renderOnlineJoin(){
  const wrap = el(`<div class="setup-page room-page"></div>`);
  wrap.appendChild(roomHead());

  const form = el(`<form class="team-card room-form-card" novalidate></form>`);
  form.appendChild(el(`<h2 class="set-card__title">ورود به اتاق دوستت</h2>`));
  form.appendChild(el(`<p class="room-form__lead">کد اتاق رو از کسی که اتاق رو ساخته بگیر.</p>`));
  const codeField = roomField('joinCodeInput', 'کد اتاق', { code: true, max: 5 });
  const nameField = roomField('joinNameInput', 'نام تو');
  form.appendChild(codeField);
  form.appendChild(nameField);
  const btn = el(`<button type="submit" class="setup-addteam"><span>ورود به اتاق</span></button>`);
  form.appendChild(btn);
  const codeInput = codeField.querySelector('input'), nameInput = nameField.querySelector('input');
  codeInput.value = state.joinCode || '';
  nameInput.value = LS.get('name', '') || '';
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(codeInput.value.length >= 5) roomFieldCheck(codeField, true);
  });
  nameInput.addEventListener('input', () => { if(nameInput.value.trim()) roomFieldCheck(nameField, true); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = codeInput.value.trim().toUpperCase(), name = nameInput.value.trim();
    // check both fields so every problem shows at once
    const codeOk = roomFieldCheck(codeField, code.length === 5, 'کد اتاق پنج حرفیه');
    const nameOk = roomFieldCheck(nameField, !!name, 'لطفاً اسمت رو وارد کن');
    if(!codeOk){ codeInput.focus(); return; }
    if(!nameOk){ nameInput.focus(); return; }
    if(NBSafety.bad(name)){ roomFieldCheck(nameField, false, 'این اسم مناسب نیست. یه اسم دیگه بنویس.'); nameInput.focus(); return; }
    btn.disabled = true;
    btn.firstChild.textContent = 'در حال ورود…';
    onlineJoinRoom(code, name).then(() => { if(state.screen !== 'online-join') state.joinCode = ''; }).finally(() => {
      btn.disabled = false;
      btn.firstChild.textContent = 'ورود به اتاق';
    });
  });
  wrap.appendChild(form);
  setTimeout(() => (codeInput.value ? nameInput : codeInput).focus(), 80);
  return wrap;
}

// ---- quick match: play with other Persian speakers ----
state.quick = { mode: 'text', rooms: null, busy: false, err: '' };
function pubRoomsFrom(v){
  return Object.entries(v || {}).map(([code, e]) => Object.assign({ code }, e)).filter(e =>
    e && typeof e.n === 'string' && typeof e.c === 'number' && e.c >= 1 && e.c < 8 && (e.m === 'text' || e.m === 'voice') && typeof e.t === 'number' && srvNow() - e.t < 30 * 60 * 1000);
}
function openQuick(){
  state.screen = 'online-quick';
  state.quick.err = '';
  render();
  loadQuickRooms();
}
function loadQuickRooms(){
  if(!window.FB || !window.FB.uid){ return; }
  window.FB.get(window.FB.ref(window.FB.db, 'publicRooms')).then(snap => {
    state.quick.rooms = pubRoomsFrom(snap.val()).sort((a, b) => b.c - a.c);
    if(state.screen === 'online-quick') render();
  }).catch(() => { state.quick.rooms = []; if(state.screen === 'online-quick') render(); });
}
// join the fullest open room that plays the way we want, otherwise open a new public room
async function quickMatch(name, mode){
  if(!fbReadyOrWarn()) return false;
  let rooms = [];
  try{ rooms = pubRoomsFrom((await window.FB.get(window.FB.ref(window.FB.db, 'publicRooms'))).val()); }catch(e){}
  rooms = rooms.filter(r => r.m === mode && r.h !== window.FB.uid).sort((a, b) => b.c - a.c);
  for(const r of rooms){
    if(await onlineJoinRoom(r.code, name, null, { silent: true, requireLobby: true, maxPlayers: 8 })) return true;
  }
  return onlineCreateRoom(name, { public: true, mode });
}
function renderOnlineQuick(){
  const wrap = el(`<div class="setup-page room-page"></div>`);
  wrap.appendChild(roomHead());
  const q = state.quick;
  const form = el(`<form class="team-card room-form-card" novalidate></form>`);
  form.appendChild(el(`<h2 class="set-card__title">بازی سریع</h2>`));
  form.appendChild(el(`<p class="room-form__lead">اسمت رو بنویس و روش بازی رو انتخاب کن؛ ما یه اتاق باز پیدا می‌کنیم یا یکی می‌سازیم. وقتی ۴ نفر جمع بشن، بازی خودکار شروع می‌شه.</p>`));
  const nameField = roomField('quickNameInput', 'نام تو');
  form.appendChild(nameField);
  const nameInput = nameField.querySelector('input');
  if(drafts.quickName === undefined) drafts.quickName = LS.get('name', '') || '';
  keepInput(nameInput, 'quickName');
  const modes = el(`<div class="set-presets quick-modes"></div>`);
  [['text', '⌨️ متنی (پیشنهادی)'], ['voice', '🎙️ صحبتی']].forEach(([id, label]) => {
    const b = el(`<button type="button" class="set-chip ${q.mode === id ? 'is-on' : ''}"></button>`);
    b.textContent = label;
    b.addEventListener('click', () => { q.mode = id; render(); loadQuickRooms(); });
    modes.appendChild(b);
  });
  form.appendChild(modes);
  form.appendChild(el(`<small class="set-hint">${q.mode === 'text' ? 'با غریبه‌ها تایپ کنید؛ بدون نیاز به میکروفون.' : 'همه باید تو یه تماس صوتی باشید؛ میزبان لینکش رو می‌ذاره.'}</small>`));
  const btn = el(`<button type="submit" class="setup-start"><span>${q.busy ? 'در حال پیدا کردن…' : 'پیدا کردن بازی'}</span></button>`);
  btn.disabled = q.busy;
  form.appendChild(btn);
  const err = el(`<div class="room-form__error" role="alert" style="display:${q.err ? 'block' : 'none'};"></div>`);
  err.textContent = q.err;
  form.appendChild(err);
  form.appendChild(el(`<small class="set-hint">با ورود به بازی عمومی، رعایت ادب با بقیه رو می‌پذیری. هر پیام نامناسبی رو می‌شه گزارش یا بلاک کرد.</small>`));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim().slice(0, 20);
    if(!name){ q.err = 'لطفاً اسمت رو وارد کن'; render(); return; }
    if(NBSafety.bad(name)){ q.err = 'این اسم مناسب نیست. یه اسم دیگه بنویس.'; render(); return; }
    q.err = ''; q.busy = true; render();
    quickMatch(name, q.mode).finally(() => { q.busy = false; if(state.screen === 'online-quick') render(); });
  });
  wrap.appendChild(form);

  // open rooms you can pick yourself
  const list = el(`<div class="team-card quick-list"><h2 class="set-card__title">اتاق‌های باز</h2></div>`);
  if(q.rooms === null){
    list.appendChild(el(`<p class="room-form__lead">در حال بارگذاری…</p>`));
  } else if(!q.rooms.length){
    list.appendChild(el(`<p class="room-form__lead">الان اتاق بازی نیست. «پیدا کردن بازی» یکی می‌سازه و بقیه بهت می‌پیوندن.</p>`));
  } else {
    q.rooms.forEach(r => {
      const row = el(`<div class="quick-row"><span class="quick-row__t"></span><span class="quick-row__m"></span></div>`);
      row.querySelector('.quick-row__t').textContent = `اتاق ${NBSafety.clean(r.n)} · ${faNum(r.c)} نفر`;
      row.querySelector('.quick-row__m').textContent = r.m === 'text' ? '⌨️' : '🎙️';
      const go = el(`<button type="button" class="set-chip quick-row__go">ورود</button>`);
      go.addEventListener('click', () => {
        const name = (drafts.quickName || '').trim().slice(0, 20);
        if(!name){ q.err = 'اول اسمت رو بنویس'; render(); return; }
        if(NBSafety.bad(name)){ q.err = 'این اسم مناسب نیست. یه اسم دیگه بنویس.'; render(); return; }
        onlineJoinRoom(r.code, name, null, { silent: true, requireLobby: true, maxPlayers: 8 }).then(ok => {
          if(!ok && state.screen === 'online-quick'){ q.err = 'این اتاق پر یا شروع شده؛ دوباره امتحان کن.'; loadQuickRooms(); render(); }
        });
      });
      row.appendChild(go);
      list.appendChild(row);
    });
  }
  const refresh = el(`<button type="button" class="lobby-call__rm">تازه‌سازی فهرست</button>`);
  refresh.addEventListener('click', () => { q.rooms = null; render(); loadQuickRooms(); });
  list.appendChild(refresh);
  wrap.appendChild(list);
  return wrap;
}

function renderOnlineLobby(){
  const wrap = el(`<div class="setup-page lobby"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">نخ بده</div></div>`));
  const room = online.room;
  if(!room){
    wrap.appendChild(el(`<div class="lobby-wait">در حال اتصال به اتاق…</div>`));
    return wrap;
  }

  ensureOnlineTicker();
  if(room.public){
    const left = room.autoStartAt ? Math.max(0, Math.ceil((room.autoStartAt - srvNow()) / 1000)) : 0;
    wrap.appendChild(el(`<div class="lobby-public">🌐 اتاق عمومی — ${room.autoStartAt
      ? `بازی تا ${faNum(left)} ثانیه‌ی دیگه شروع می‌شه`
      : 'وقتی ۴ نفر جمع بشن، بازی خودکار شروع می‌شه'}</div>`));
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
    const link = gameLink() + '?room=' + online.roomCode;
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
  wrap.appendChild(buildCallCard());

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
        chips.appendChild(el(`<span class="lobby-chip ${me ? 'is-me' : ''}">${avatarHtmlFor(t.memberAv[k], t.memberNames[k])}<span class="lobby-chip__n">${escHtml(t.memberNames[k])}${me ? ' (تو)' : ''}</span></span>`));
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
      un.appendChild(el(`<span class="lobby-chip ${me ? 'is-me' : ''}">${avatarHtmlFor(room.players[pid].av, room.players[pid].name)}<span class="lobby-chip__n">${escHtml(NBSafety.clean(room.players[pid].name))}${me ? ' (تو)' : ''}</span></span>`));
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
    const roomPacks = Array.isArray(room.packs) && room.packs.length ? room.packs : selectedPacks();
    const packCard = el(`<div class="team-card lobby-packs"><h2 class="set-card__title">پک کلمه‌ها</h2></div>`);
    packCard.appendChild(buildPackPicker(roomPacks, ids => { window.FB.update(fbRoomRef(), { packs: ids }); }));
    wrap.appendChild(packCard);
    if(MAPS.length > 1){
      const mapCard = el(`<div class="team-card lobby-packs"><h2 class="set-card__title">نقشه‌ی بازی</h2></div>`);
      mapCard.appendChild(buildMapPicker(room.mapId || selectedMapId(), id => { window.FB.update(fbRoomRef(), { mapId: id }); }));
      wrap.appendChild(mapCard);
    }
    wrap.appendChild(buildPlayModeCard());
    const readyTeams = teams.filter(t => t.memberIds.length > 0);
    const startBtn = el(`<button class="setup-start"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg><span>شروع بازی برای همه</span></button>`);
    startBtn.disabled = readyTeams.length < 2;
    startBtn.addEventListener('click', () => { startOnlineGame(); });
    wrap.appendChild(startBtn);
    if(readyTeams.length < 2){
      wrap.appendChild(el(`<div class="setup-note">حداقل ۲ تیم با عضو لازمه</div>`));
    }
  } else {
    if(Array.isArray(room.packs) && room.packs.length){
      const names = WORD_PACKS.filter(p => room.packs.includes(p.id)).map(p => p.icon + ' ' + p.name).join('، ');
      const info = el(`<div class="team-card lobby-packs"><h2 class="set-card__title">پک کلمه‌ها</h2><p class="lobby-packs__list"></p></div>`);
      info.querySelector('.lobby-packs__list').textContent = names;
      wrap.appendChild(info);
    }
    if(MAPS.length > 1 && room.mapId){ const mm = MAPS.find(x => x.id === room.mapId); if(mm){ const mi = el(`<div class="team-card lobby-packs"><h2 class="set-card__title">نقشه‌ی بازی</h2><p class="lobby-packs__list"></p></div>`); mi.querySelector('.lobby-packs__list').textContent = '🗺️ ' + mm.name; wrap.appendChild(mi); } }
    wrap.appendChild(buildPlayModeCard());
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
  const updates = {
    phase: 'playing',
    currentTeamId: teams[0].id,
    currentCardIdx: 0,
    wordSeed: Math.floor(Math.random() * 2147483646) + 1,
    packs: (online.room && Array.isArray(online.room.packs) && online.room.packs.length) ? online.room.packs : selectedPacks(),
    mapId: (online.room && online.room.mapId) || selectedMapId(),
    roundEndAt: null,
    correctCount: 0,
    skipCount: 0,
    roundEnded: false,
    actionPickActive: false,
    actionRevealedIdx: null,
    actionChosenCardIdx: null,
    winnerTeamId: null,
    lastRoundSummary: null,
    feed: null,
    lastCorrect: null,
    autoStartAt: null,
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
  setActiveMap(room.mapId || 'iran');
  const teams = onlineTeamsArray();
  state.teams = teams.map(t => ({
    id: t.id, name: t.name, color: t.color, position: t.position, score: t.score,
    describerIdx: t.describerIdx, members: t.memberNames.length ? t.memberNames : ['—'],
    memberIds: t.memberIds, memberAv: t.memberAv, timerOverride: room.teams[t.id].timerOverride || null,
    mods: room.teams[t.id].mods || {},
  }));
  const curIdx = state.teams.findIndex(t => t.id === room.currentTeamId);
  state.currentTeamIdx = curIdx >= 0 ? curIdx : 0;
  // the clock ring is scaled by the current team's timerOverride: online that is this round's length
  const curTeam = state.teams[state.currentTeamIdx];
  const roundTotal = (room.roundEndAt && room.roundTotal) ? room.roundTotal : ((curTeam && curTeam.timerOverride) || onlineBaseSec());
  if(curTeam) curTeam.timerOverride = roundTotal;
  state.correctCount = room.correctCount || 0;
  state.skipCount = room.skipCount || 0;
  state.roundEnded = !!room.roundEnded;
  state.foulCount = room.foulCount || 0;
  state.foulPending = !!room.foulPending;
  state.actionPickActive = !!room.actionPickActive;
  if(!state.actionPickActive){ resetWheel(); }
  else { state.wheelSpun = !!room.wheelSpun; }
  state.actionRevealedIdx = (room.actionRevealedIdx === undefined) ? null : room.actionRevealedIdx;
  state.actionChosenCard = (room.actionChosenCardIdx !== null && room.actionChosenCardIdx !== undefined) ? (ACTION_CARDS[room.actionChosenCardIdx] || null) : null;
  state.lastRoundSummary = room.lastRoundSummary || null;
  const curCardIdx = (room.currentCardIdx===undefined || room.currentCardIdx===null) ? 0 : room.currentCardIdx;
  state.currentCard = onlineWordAt(curCardIdx, room.wordSeed);
  if(room.winnerTeamId){
    const wt = state.teams.find(t => t.id === room.winnerTeamId);
    if(wt && !state.winner){ sfxVictory(); }
    state.winner = wt || null;
  } else {
    state.winner = null;
  }
  if(room.roundEndAt){
    state.timeLeft = Math.max(0, Math.ceil((room.roundEndAt - (room.foulPending ? (room.foulPausedAt || srvNow()) : srvNow()))/1000));
    state.timerRunning = state.timeLeft > 0;
  } else {
    state.timeLeft = roundTotal;
    state.timerRunning = false;
  }
}

function onlineMyTeamId(){
  const room = online.room;
  return room && room.players && room.players[online.playerId] ? room.players[online.playerId].teamId : null;
}

function onlineStartTimer(){
  const t = currentTeam();
  const nextCardIdx = onlineNextWordIdx();
  const myTeamRoom = online.room && online.room.teams && online.room.teams[t.id];
  const dur = (myTeamRoom && myTeamRoom.timerOverride) || onlineBaseSec();
  const endAt = srvNow() + dur*1000;
  window.FB.update(fbRoomRef(), { roundEndAt: endAt, roundTotal: dur, [`teams/${t.id}/timerOverride`]: null, correctCount: 0, skipCount: 0, foulCount: 0, foulPending: false, foulPausedAt: null, currentCardIdx: nextCardIdx, feed: null, lastCorrect: null });
  ensureOnlineLocalCountdown();
}

let onlineFinishTimeout = null;
// Every phone watches the round's deadline, so the round still ends when the describer's phone
// drops or reloads. The describer's phone acts first; the others only step in a moment later.
function ensureOnlineLocalCountdown(){
  if(onlineFinishTimeout){ clearTimeout(onlineFinishTimeout); onlineFinishTimeout = null; }
  const room = online.room;
  if(!room || !room.roundEndAt || room.foulPending) return;   // a foul freezes the round
  const t = onlineTeamsArray().find(x => x.id === room.currentTeamId);
  const mine = !!(t && t.memberIds.length && t.memberIds[(t.describerIdx || 0) % t.memberIds.length] === online.playerId);
  const wait = Math.max(0, room.roundEndAt - srvNow()) + (mine ? 150 : 2500);
  onlineFinishTimeout = setTimeout(() => {
    onlineFinishTimeout = null;
    const r = online.room;
    if(!r || !r.roundEndAt || r.foulPending) return;
    if(r.roundEndAt <= srvNow() + 200) finishRoundOnline();
    else ensureOnlineLocalCountdown();
  }, wait);
}

function onlineCorrect(){
  if(!state.timerRunning || state.foulPending) return;
  sfxCorrect();
  const nextCardIdx = onlineNextWordIdx();
  window.FB.update(fbRoomRef(), { correctCount: (state.correctCount||0)+1, currentCardIdx: nextCardIdx });
}
function onlineFoul(){
  if(!state.timerRunning || state.foulPending) return;
  sfxWrong();
  // everyone's clock has to stop, so we record when the pause began and
  // push the deadline back by the same amount when play resumes
  window.FB.update(fbRoomRef(), { foulPending: true, foulPausedAt: srvNow() });
}

function onlineResolveFoul(counted){
  const room = online.room;
  if(!room || !room.foulPending) return;
  const pausedFor = Math.max(0, srvNow() - (room.foulPausedAt || srvNow()));
  const updates = {
    foulPending: false,
    foulPausedAt: null,
    roundEndAt: (room.roundEndAt || srvNow()) + pausedFor
  };
  if(counted) updates.foulCount = (room.foulCount || 0) + 1;
  window.FB.update(fbRoomRef(), updates);
}

function onlineSkip(){
  if(!state.timerRunning || state.foulPending) return;
  sfxWrong();
  const nextCardIdx = onlineNextWordIdx();
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

function computeActionEffectUpdates(effect, selfTeam, targetTeam){
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
      updates[`teams/${selfTeam.id}/timerOverride`] = onlineBaseSec() + effect.seconds;
      break;
    case 'timeStealChoose':
      if(targetTeam) updates[`teams/${targetTeam.id}/timerOverride`] = Math.max(10, onlineBaseSec() - effect.seconds);
      updates[`teams/${selfTeam.id}/timerOverride`] = onlineBaseSec() + effect.seconds;
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
  const nextCardIdx = onlineNextWordIdx();
  const updates = Object.assign({
    [`teams/${t.id}/describerIdx`]: nextDescriberIdx,
    currentTeamId: nextTeam.id,
    currentCardIdx: nextCardIdx,
    roundEnded: false,
    actionPickActive: false,
    actionRevealedIdx: null,
    actionChosenCardIdx: null,
    feed: null,
    lastCorrect: null,
  }, effectUpdates || {});
  window.FB.update(fbRoomRef(), updates);
}

// ---------------- ONLINE: group call link + text mode ----------------
// The game is spoken, so players need a call. We don't run one: the host drops the link of
// any call (WhatsApp, Telegram, Google Meet...) into the room and everyone gets a join button.
function safeCallUrl(u){
  try{
    if(typeof u !== 'string' || u.length > 300) return null;
    const x = new URL(u.trim());
    return x.protocol === 'https:' ? x.href : null;
  }catch(e){ return null; }
}
function buildCallCard(){
  const room = online.room || {};
  const url = safeCallUrl(room.callUrl);
  const card = el(`<div class="team-card lobby-call"><h2 class="set-card__title">تماس صوتی</h2></div>`);
  const link = gameLink() + '?room=' + online.roomCode;
  const msg = `بیا توی اتاق «نخ بده»! کد اتاق: ${online.roomCode}`;
  if(url){
    const host = new URL(url).hostname.replace(/^www\./, '');
    card.appendChild(el(`<p class="lobby-call__txt">میزبان یه تماس گروهی گذاشته. وارد شو تا همدیگه رو بشنوید.</p>`));
    const a = el(`<a class="lobby-call__join" target="_blank" rel="noopener noreferrer"><span>پیوستن به تماس</span><small dir="ltr"></small></a>`);
    a.href = url;
    a.querySelector('small').textContent = host;
    card.appendChild(a);
  } else {
    card.appendChild(el(`<p class="lobby-call__txt">${online.isHost
      ? 'بازی با حرف زدنه. یه تماس گروهی بساز (واتس‌اپ، تلگرام یا Google Meet) و لینکش رو اینجا بذار تا بقیه با یه دکمه وارد بشن.'
      : 'میزبان هنوز لینک تماسی نذاشته. می‌تونید خودتون هم تو واتس‌اپ یا تلگرام تماس بگیرید.'}</p>`));
  }
  if(online.isHost){
    const quick = el(`<div class="lobby-call__quick"></div>`);
    const mk = (label, href) => { const a = el(`<a class="lobby-call__q" target="_blank" rel="noopener noreferrer"></a>`); a.textContent = label; a.href = href; return a; };
    quick.appendChild(mk('ساخت تماس Google Meet', 'https://meet.google.com/new'));
    quick.appendChild(mk('ارسال به تلگرام', 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(msg)));
    quick.appendChild(mk('ارسال به واتس‌اپ', 'https://wa.me/?text=' + encodeURIComponent(msg + '\n' + link)));
    card.appendChild(quick);
    const form = el(`<form class="lobby-call__form" autocomplete="off"><input class="room-form__input lobby-call__in" type="url" dir="ltr" placeholder="https://… لینک تماس رو اینجا بذار" maxlength="300"><button type="submit" class="lobby-call__save">ذخیره</button></form>`);
    keepInput(form.querySelector('input'), 'callUrl');
    const err = el(`<div class="lobby-call__err" role="alert" hidden>لینک باید با https شروع بشه.</div>`);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = safeCallUrl(form.querySelector('input').value);
      if(!v){ err.hidden = false; return; }
      err.hidden = true;
      drafts.callUrl = '';
      window.FB.update(fbRoomRef(), { callUrl: v });
    });
    card.appendChild(form);
    card.appendChild(err);
    if(url){
      const rm = el(`<button class="lobby-call__rm" type="button">حذف لینک تماس</button>`);
      rm.addEventListener('click', () => { window.FB.update(fbRoomRef(), { callUrl: null }); });
      card.appendChild(rm);
    }
  }
  return card;
}

const ROUND_CHOICES = [60, 90, 120, 180];
function buildPlayModeCard(){
  const room = online.room || {};
  const mode = room.mode === 'text' ? 'text' : 'voice';
  const sec = onlineBaseSec();
  const card = el(`<div class="team-card lobby-mode"><h2 class="set-card__title">روش بازی</h2></div>`);
  if(online.isHost){
    const modes = el(`<div class="set-presets"></div>`);
    [['voice', '🎙️ صحبتی'], ['text', '⌨️ متنی']].forEach(([id, label]) => {
      const b = el(`<button type="button" class="set-chip ${mode === id ? 'is-on' : ''}"></button>`);
      b.textContent = label;
      b.addEventListener('click', () => {
        const upd = { mode: id };
        if(id === 'text' && sec < 120) upd.roundSec = 120;   // typing is slower than talking
        window.FB.update(fbRoomRef(), upd);
      });
      modes.appendChild(b);
    });
    card.appendChild(modes);
  } else {
    card.appendChild(el(`<p class="lobby-packs__list">${mode === 'text' ? '⌨️ متنی' : '🎙️ صحبتی'}</p>`));
  }
  card.appendChild(el(`<small class="set-hint">${mode === 'text'
    ? 'توضیح‌دهنده سرنخ رو تایپ می‌کنه و هم‌تیمی‌ها حدسشون رو تایپ می‌کنن. حدس درست خودکار ثبت می‌شه و سرنخی که خود کلمه رو داشته باشه ارسال نمی‌شه.'
    : 'توضیح‌دهنده با صدا توضیح می‌ده (بهتره همه تو یه تماس باشید).'}</small>`));
  card.appendChild(el(`<h2 class="set-card__title lobby-mode__sub">زمان هر راند</h2>`));
  if(online.isHost){
    const row = el(`<div class="set-presets"></div>`);
    ROUND_CHOICES.forEach(v => {
      const b = el(`<button type="button" class="set-chip ${sec === v ? 'is-on' : ''}">${faNum(v)}</button>`);
      b.addEventListener('click', () => { window.FB.update(fbRoomRef(), { roundSec: v }); });
      row.appendChild(b);
    });
    card.appendChild(row);
  } else {
    card.appendChild(el(`<p class="lobby-packs__list">${faNum(sec)} ثانیه</p>`));
  }
  return card;
}

// ---- report and block ----
// Blocking is local (that player's messages are hidden on this phone). A report sends the
// message to the developers' inbox in the database; clients can write it but never read it.
function blockedMap(){ const b = LS.get('blocked', {}); return b && typeof b === 'object' ? b : {}; }
function isBlocked(uid){ return !!uid && !!blockedMap()[uid]; }
function blockPlayer(uid, name){
  const b = blockedMap(); b[uid] = { n: String(name || '').slice(0, 20), at: Date.now() };
  const keys = Object.keys(b); if(keys.length > 200) delete b[keys[0]];
  LS.set('blocked', b);
}
function reportMessage(m){
  if(!window.FB || !window.FB.uid) return;
  const id = 'r' + srvNow().toString(36) + Math.random().toString(36).slice(2, 6);
  window.FB.set(window.FB.ref(window.FB.db, 'reports/' + id), {
    r: String(online.roomCode || '').slice(0, 5), u: String(m.p || '').slice(0, 40), n: String(m.n || '').slice(0, 20),
    t: String(m.t || '').slice(0, 80), b: window.FB.uid, at: srvNow(),
  }).catch(() => {});
}
function openReportSheet(m){
  const back = el(`<div class="rp-back" role="dialog" aria-modal="true"></div>`);
  const sheet = el(`<div class="rp-sheet"><h3 class="rp-sheet__t">گزارش یا بلاک</h3><p class="rp-sheet__who"></p><p class="rp-sheet__msg"></p></div>`);
  sheet.querySelector('.rp-sheet__who').textContent = NBSafety.clean(String(m.n || '').slice(0, 20));
  sheet.querySelector('.rp-sheet__msg').textContent = NBSafety.clean(String(m.t || '').slice(0, 80));
  const close = () => { back.remove(); patchTextFeed(); };
  const mk = (label, cls, fn) => { const b = el(`<button type="button" class="rp-btn ${cls}"></button>`); b.textContent = label; b.addEventListener('click', fn); sheet.appendChild(b); };
  mk('گزارش پیام و بلاک این بازیکن', 'rp-btn--danger', () => { reportMessage(m); blockPlayer(m.p, m.n); close(); });
  mk('فقط بلاک (پیام‌هاش دیده نشه)', '', () => { blockPlayer(m.p, m.n); close(); });
  mk('انصراف', 'rp-btn--ghost', () => back.remove());
  back.addEventListener('click', (e) => { if(e.target === back) back.remove(); });
  back.appendChild(sheet);
  document.body.appendChild(back);
}

// ---- text mode: typed clues and guesses ----
// (nbNorm / nbParts live in safety.js)
// true when a clue gives the word away: it contains the whole word, or (for a
// several-word card) one of its words on its own
function clueHasWord(clue, word){
  const wn = nbNorm(word), cn = nbNorm(clue);
  if(wn.length >= 2 && cn.includes(wn)) return true;
  const wp = nbParts(word);
  if(wp.length > 1){
    const cp = nbParts(clue);
    return wp.some(p => p.length >= 3 && cp.includes(p));
  }
  return false;
}

let tpLastSend = 0;
function onlineTextSend(kind, text){
  const room = online.room;
  text = String(text || '').trim().slice(0, 80);
  if(!room || !text) return 'empty';
  if(NBSafety.bad(text)) return 'bad';
  if(kind === 'c' && clueHasWord(text, onlineWordAt(room.currentCardIdx || 0, room.wordSeed))) return 'word';
  if(Date.now() - tpLastSend < 350) return 'fast';
  tpLastSend = Date.now();
  const me = (room.players && room.players[online.playerId]) || {};
  const key = 'm' + srvNow().toString(36) + Math.random().toString(36).slice(2, 5);
  window.FB.set(fbRoomRef('feed/' + key), { c: room.currentCardIdx || 0, p: online.playerId, n: String(me.name || online.playerName || '').slice(0, 20), k: kind, t: text });
  return null;
}

// Only the describer's phone judges guesses (it is the one that already moves the
// round forward), so two teammates guessing at once can never count twice.
const tpJudged = new Set();
function onlineTextJudge(){
  const room = online.room;
  if(!room || room.mode !== 'text' || !room.feed || !room.roundEndAt || room.foulPending || room.roundEnded) return;
  if(room.roundEndAt <= srvNow()) return;
  const t = onlineTeamsArray().find(x => x.id === room.currentTeamId);
  if(!t || !t.memberIds.length) return;
  if(t.memberIds[(t.describerIdx || 0) % t.memberIds.length] !== online.playerId) return;
  const cur = room.currentCardIdx || 0;
  const word = onlineWordAt(cur, room.wordSeed);
  const wn = nbNorm(word);
  for(const k of Object.keys(room.feed).sort()){
    const m = room.feed[k];
    if(!m || m.k !== 'g' || m.c !== cur || m.ok || tpJudged.has(k)) continue;
    const g = room.players && room.players[m.p];
    if(!g || g.teamId !== t.id || m.p === online.playerId) continue;   // only teammates guess
    tpJudged.add(k);
    if(nbNorm(m.t) === wn){
      sfxCorrect();
      window.FB.update(fbRoomRef(), {
        correctCount: (room.correctCount || 0) + 1,
        currentCardIdx: cur + 1,
        ['feed/' + k + '/ok']: true,
        lastCorrect: { c: cur, w: word, n: String(m.n || '') },
      });
      return;
    }
  }
}

function buildTextFeed(room){
  const cur = room.currentCardIdx || 0;
  const box = el(`<div class="tp-feed" aria-live="polite"></div>`);
  const lc = room.lastCorrect;
  if(lc && lc.c === cur - 1){
    const ok = el(`<div class="tp-ok"></div>`);
    ok.textContent = `✓ «${lc.w}» درست بود${lc.n ? ' — ' + NBSafety.clean(String(lc.n).slice(0, 20)) : ''}`;
    box.appendChild(ok);
  }
  const msgs = Object.keys(room.feed || {}).sort().map(k => room.feed[k]).filter(m => m && m.c === cur && (m.k === 'c' || m.k === 'g') && !isBlocked(m.p)).slice(-8);
  if(!msgs.length && !(lc && lc.c === cur - 1)){
    box.appendChild(el(`<div class="tp-empty">${state.timerRunning ? 'هنوز سرنخی نیومده…' : 'بعد از شروع تایمر، سرنخ‌ها و حدس‌ها اینجا نشون داده می‌شن.'}</div>`));
  }
  msgs.forEach(m => {
    const b = el(`<div class="tp-msg ${m.k === 'c' ? 'tp-msg--clue' : 'tp-msg--guess'} ${m.ok ? 'is-ok' : ''}"><b class="tp-msg__n"></b><span class="tp-msg__t"></span></div>`);
    b.querySelector('.tp-msg__n').textContent = (m.k === 'c' ? '💡 ' : '') + NBSafety.clean(String(m.n || '').slice(0, 20));
    b.querySelector('.tp-msg__t').textContent = NBSafety.clean(String(m.t || '').slice(0, 80));
    if(m.p && m.p !== online.playerId){
      const flag = el(`<button type="button" class="tp-flag" aria-label="گزارش یا بلاک">⚑</button>`);
      flag.addEventListener('click', () => openReportSheet(m));
      b.appendChild(flag);
    }
    box.appendChild(b);
  });
  return box;
}
function patchTextFeed(){
  const old = document.querySelector('.tp-feed');
  if(!old || !online.room) return false;
  old.replaceWith(buildTextFeed(online.room));
  return true;
}

function buildTextPlay(isDescriber, isTurnTeam){
  const room = online.room;
  const box = el(`<div class="tp"></div>`);
  box.appendChild(buildTextFeed(room));
  if(!isDescriber && !isTurnTeam) return box;      // the rival team only watches
  const kind = isDescriber ? 'c' : 'g';
  const active = state.timerRunning && !state.foulPending;
  const form = el(`<form class="tp-form" autocomplete="off"><input class="tp-input" type="text" maxlength="80" enterkeyhint="send" autocapitalize="off"><button class="tp-send" type="submit">ارسال</button></form>`);
  const inp = form.querySelector('input');
  keepInput(inp, isDescriber ? 'tpClue' : 'tpGuess');
  inp.disabled = !active;
  inp.placeholder = !active ? 'منتظر شروع تایمر…' : (isDescriber ? 'سرنخ بنویس (نه خود کلمه!)' : 'حدست رو بنویس');
  form.querySelector('button').disabled = !active;
  const err = el(`<div class="tp-err" role="alert" hidden></div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = onlineTextSend(kind, inp.value);
    if(r === 'word'){ err.textContent = 'سرنخ نباید خود کلمه (یا بخشی از اون) رو داشته باشه.'; err.hidden = false; return; }
    if(r === 'bad'){ err.textContent = 'لطفاً مؤدبانه بنویس.'; err.hidden = false; return; }
    err.hidden = true;
    if(r === null){ drafts[isDescriber ? 'tpClue' : 'tpGuess'] = ''; inp.value = ''; }
  });
  box.appendChild(form);
  box.appendChild(err);
  return box;
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
  header.appendChild(el(`<div class="play-brand">نخ بده</div>`));
  wrap.appendChild(header);

  const status = el(`<div class="play-status"></div>`);
  status.appendChild(el(`<div class="play-status__item"><svg viewBox="0 0 24 24" width="16" height="16" fill="#E9B94C"><path d="M12 3 2.5 11h2.3v9h5.1v-5.6h4.2V20h5.1v-9h2.3L12 3Z"/></svg><span>خانه ${faNum(t.position + 1)} از ${faNum(state.trackLength)}</span></div>`));
  status.appendChild(el(`<span class="play-status__sep"></span>`));
  const dIdx = t.memberIds && t.memberIds.length ? (t.describerIdx||0) % t.memberIds.length : -1;
  const dName = dIdx >= 0 ? (t.members[dIdx] || '') : '';
  status.appendChild(el(`<div class="play-status__item play-status__role">${dIdx >= 0 ? avatarHtmlFor(t.memberAv && t.memberAv[dIdx], dName) : ''}<span>${roleLabel}</span></div>`));
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
      const choiceUI = buildEffectChoiceUI(effect, t.id, (targetId) => {
        const targetTeam = targetId ? state.teams.find(x => x.id === targetId) : null;
        const effectUpdates = computeActionEffectUpdates(effect, t, targetTeam);
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
  applyScene(wrap);
  wrap.appendChild(sceneStage(renderPlayTimer(), cardViewEl));
  wrap.appendChild(buildFoulRow(onlineFoul, onlineResolveFoul));
  if(room.mode === 'text') wrap.appendChild(buildTextPlay(isDescriber, isTurnTeam));

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
  const callUrl = safeCallUrl(room.callUrl);
  if(callUrl){
    const callBtn = el(`<a class="play-call" target="_blank" rel="noopener noreferrer">🎙️ پیوستن به تماس</a>`);
    callBtn.href = callUrl;
    wrap.appendChild(callBtn);
  }
  const leaveBtn = el(`<button class="play-leave">خروج از اتاق</button>`);
  leaveBtn.addEventListener('click', onlineLeaveRoom);
  wrap.appendChild(leaveBtn);
  return wrap;
}

function renderSettings(){
  const wrap = el(`<div class="setup-page settings"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">تنظیمات</div></div>`));

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
  [['sound', 'صدای بازی'], ['music', 'موسیقی پس‌زمینه'], ['haptic', 'لرزش']].forEach(([key, label]) => {
    const row = el(`<button class="set-switch" role="switch" aria-checked="${prefs[key]}"><span class="set-switch__lbl">${label}</span><span class="set-switch__knob" aria-hidden="true"></span></button>`);
    row.addEventListener('click', () => {
      prefs[key] = !prefs[key];
      LS.set(key, prefs[key]);
      if(key === 'music') musicSync();
      if(prefs[key]) sfxTap();
      render();
    });
    fbCard.appendChild(row);
  });
  wrap.appendChild(fbCard);

  // ---- about ----
  const aboutCard = el(`<div class="team-card set-card"><h2 class="set-card__title">درباره</h2></div>`);
  const privacyLink = el(`<a class="set-link" href="privacy.html" target="_blank" rel="noopener"><span>سیاست حریم خصوصی</span><span aria-hidden="true">←</span></a>`);
  aboutCard.appendChild(privacyLink);
  aboutCard.appendChild(el(`<small class="set-hint" dir="ltr" style="text-align:left;">Music: “Fun - Fun Music” by andriih (Pixabay Content License).</small>`));
  wrap.appendChild(aboutCard);

  // ---- board quality ----
  const mapCard = el(`<div class="team-card set-card"></div>`);
  mapCard.appendChild(el(`<h2 class="set-card__title">نقشه‌ی بازی</h2>`));
  const liteRow = el(`<button class="set-switch" role="switch" aria-checked="${LITE_MAP}"><span class="set-switch__lbl">نقشه‌ی سبک (برای گوشی‌های ضعیف)</span><span class="set-switch__knob" aria-hidden="true"></span></button>`);
  liteRow.addEventListener('click', () => {
    LS.set('liteMap', !LITE_MAP);
    sfxTap();
    toastHome('با بستن و باز کردن دوباره‌ی بازی اعمال می‌شود');
    liteRow.setAttribute('aria-checked', String(!LITE_MAP));
  });
  mapCard.appendChild(liteRow);
  const fxOn = LS.get('mapFx', null) === null ? !LITE_MAP : LS.get('mapFx', null) === true;
  const fxRow = el(`<button class="set-switch" role="switch" aria-checked="${fxOn}"><span class="set-switch__lbl">انیمیشن‌های نقشه (فواره، آب، دود...)</span><span class="set-switch__knob" aria-hidden="true"></span></button>`);
  fxRow.addEventListener('click', () => {
    const next = fxRow.getAttribute('aria-checked') !== 'true';
    LS.set('mapFx', next);
    sfxTap();
    toastHome('با بستن و باز کردن دوباره‌ی بازی اعمال می‌شود');
    fxRow.setAttribute('aria-checked', String(next));
  });
  mapCard.appendChild(fxRow);
  mapCard.appendChild(el(`<small class="set-hint">نقشه‌ی سبک حافظه‌ی کمتری می‌گیرد و روی گوشی‌های قدیمی روان‌تر است. جزئیات نقشه کمی کم‌تر دیده می‌شود. اگر بازی کند است یا بسته می‌شود، آن را روشن کن.</small>`));
  wrap.appendChild(mapCard);

  // ---- board facts ----
  const infoCard = el(`<div class="team-card set-card"></div>`);
  infoCard.appendChild(el(`<h2 class="set-card__title">اطلاعات نقشه</h2>`));
  infoCard.appendChild(el(`<div class="set-stats">
    <div class="set-stat"><b>${faNum(state.trackLength)}</b><span>خانه</span></div>
    <div class="set-stat"><b>${faNum(state.obstacles.length)}</b><span>خانه‌ی ویژه</span></div>
    <div class="set-stat"><b>${faNum(state.wordSource.length)}</b><span>کلمه</span></div>
  </div>`));
  wrap.appendChild(infoCard);

  // the rules live on the tutorial screen; no second copy here
  const learn = el(`<button class="team-card__add set-learn">قوانین و آموزش بازی</button>`);
  learn.addEventListener('click', () => { state.screen = 'tutorial'; render(); });
  wrap.appendChild(learn);

  return wrap;
}

// ---------------- SHOP SCREEN ----------------
let shopTab = 'pack';
function renderShop(){
  const p = loadProfile();
  const wrap = el(`<div class="setup-page shop"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">فروشگاه</div></div>`));
  wrap.appendChild(el(`<div class="team-card shop-wallet">
    <div class="shop-wallet__bal"><span>🪙</span><b>${faNum(p.coins)}</b></div>
    <p>سکه را با بازی کردن به دست می‌آوری: هر کلمه‌ی درست ۲ سکه، راند ۵ کلمه‌ای ۵ سکه‌ی جایزه، ورود به شهر جدید ۱۵ سکه و تمام کردن بازی ۳۰ سکه.</p>
  </div>`));
  const tabs = el(`<div class="shop-tabs" role="tablist"></div>`);
  SHOP_TABS.forEach(([k, label]) => {
    const t = el(`<button class="shop-tab ${k === shopTab ? 'is-on' : ''}" role="tab" aria-selected="${k === shopTab}">${label}</button>`);
    t.addEventListener('click', () => { shopTab = k; render(); });
    tabs.appendChild(t);
  });
  wrap.appendChild(tabs);

  const grid = el(`<div class="shop-grid"></div>`);
  SHOP_ITEMS.filter(i => i.kind === shopTab && (!i.free || i.kind === 'scene' || i.kind === 'pack' || i.kind === 'wheel' || i.kind === 'map')).forEach(it => {
    const owned = it.free || p.owned.includes(it.id);
    const equipped = (it.kind === 'avatar' && p.avatar === it.value) || (it.kind === 'frame' && p.frame === it.id) || (it.kind === 'confetti' && p.confetti === it.id) || (it.kind === 'scene' && p.scene === it.id) || (it.kind === 'wheel' && p.wheel === it.id) || (it.kind === 'map' && selectedMapId() === it.value);
    let preview = '';
    if(it.kind === 'avatar') preview = `<div class="shop-prev shop-prev--av">${it.value}</div>`;
    else if(it.kind === 'frame') preview = `<div class="shop-prev shop-prev--av" style="border-color:${it.value}; box-shadow:0 0 0 3px ${it.value}55;">${avatarMarkup(p)}</div>`;
    else if(it.kind === 'pack'){ const pk = WORD_PACKS.find(x => x.id === it.value); const ws = pk.words || WORD_LIST; preview = `<div class="shop-prev shop-prev--pk">${packIsFresh(pk) ? '<i class="pk-new">تازه</i>' : ''}<b>${pk.icon}</b><small>${faNum(ws.length)} کلمه</small><em>${escHtml(ws[0])} · ${escHtml(ws[3] || '')}</em></div>`; }
    else if(it.kind === 'map'){ const mm = MAPS.find(x => x.id === it.value); preview = `<div class="shop-prev shop-prev--map" style="background-image:url('${mm.preview || mm.lite}')"><small>${escHtml(mm.blurb)}</small></div>`; }
    else if(it.kind === 'wheel') preview = it.id === 'wh_slot' ? `<div class="shop-prev shop-prev--slot"><i>⭐</i><b>وقت اضافه</b></div>` : it.id === 'wh_classic' ? `<div class="shop-prev shop-prev--wh"><span class="wh-classic"></span></div>` : `<div class="shop-prev shop-prev--wh">${NBWheel.svg(it.id, true)}</div>`;
    else if(it.kind === 'scene') preview = `<div class="shop-prev shop-prev--sc" data-sc="${it.value}"><span>نخ بده</span></div>`;
    else preview = `<div class="shop-prev shop-prev--cf">${it.value.map((c, i) => `<i style="background:${c}; left:${8 + i * 17}%; top:${14 + (i % 2) * 26}%; transform:rotate(${i * 37}deg);"></i>`).join('')}</div>`;
    const cell = el(`<div class="shop-item ${owned ? 'is-owned' : ''} ${equipped ? 'is-eq' : ''}">${preview}<b class="shop-item__name"></b><button class="shop-buy"></button></div>`);
    cell.querySelector('.shop-item__name').textContent = it.name;
    const btn = cell.querySelector('.shop-buy');
    if(!owned){
      btn.innerHTML = `🪙 ${faNum(it.price)}`;
      btn.classList.toggle('is-cant', p.coins < it.price);
      btn.addEventListener('click', () => {
        const q = loadProfile();
        if(q.coins < it.price){ toastHome(`برای «${it.name}» ${faNum(it.price - q.coins)} سکه‌ی دیگر لازم داری`); return; }
        if(!confirm(`«${it.name}» را با ${it.price} سکه می‌خری؟`)) return;
        q.coins -= it.price; q.owned.push(it.id);
        if(it.kind === 'avatar') q.avatar = it.value; else if(it.kind === 'frame') q.frame = it.id; else if(it.kind === 'scene') q.scene = it.id; else if(it.kind === 'wheel') q.wheel = it.id; else if(it.kind === 'map'){ LS.set('mapId', it.value); setActiveMap(it.value); } else if(it.kind === 'pack'){ const sel = selectedPacks(); if(!sel.includes(it.value)) LS.set('packs', sel.concat(it.value)); } else q.confetti = it.id;
        saveProfile(q); sfxWin(); render();
      });
    } else if(it.kind === 'pack'){
      btn.textContent = it.free ? 'رایگان' : 'در اختیار توست ✓';
      btn.classList.add('is-own'); btn.disabled = true;
    } else {
      btn.textContent = equipped ? ((it.kind === 'avatar' || it.kind === 'scene' || it.kind === 'wheel' || it.kind === 'map') ? 'در حال استفاده' : 'برداشتن') : 'استفاده';
      btn.classList.add('is-own');
      btn.addEventListener('click', () => {
        const q = loadProfile();
        if(it.kind === 'avatar') q.avatar = it.value;
        else if(it.kind === 'frame') q.frame = equipped ? '' : it.id;
        else if(it.kind === 'scene') q.scene = it.id;
        else if(it.kind === 'wheel') q.wheel = it.id;
        else if(it.kind === 'map'){ LS.set('mapId', it.value); setActiveMap(it.value); }
        else q.confetti = equipped ? '' : it.id;
        saveProfile(q); sfxTap(); render();
      });
    }
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  wrap.appendChild(el(`<p class="prof-note">همه‌ی چیزها فقط ظاهری‌اند و روی امتیاز بازی اثری ندارند. سکه‌ها روی همین گوشی ذخیره می‌شوند.</p>`));
  return wrap;
}

// ---------------- PROFILE EDITOR (avatar builder + banner) ----------------
let profTab = 'face';
const PROF_TABS = [['face','چهره'],['hair','مو و ریش'],['acc','عینک و کلاه'],['look','لباس و پس‌زمینه'],['cover','کاور و قاب'],['emoji','شکلک']];
// The avatar editor edits a working copy (work.p); the caller stores it only on «ثبت تغییرات».
function buildAvatarEditor(work){
  const A = NBAvatar;
  const card = el(`<div class="team-card pe">
    <div class="pe-cover"></div>
    <div class="pe-who">
      <div class="pe-av"></div>
      <div class="prof-coins"><span>🪙</span><b></b><span>سکه</span></div>
    </div>
    <div class="pe-tabs" role="tablist"></div>
    <div class="pe-panel"></div>
    <div class="pe-acts"><button type="button" class="pe-btn" data-a="rnd">🎲 تصادفی</button><button type="button" class="pe-btn" data-a="rst">بازنشانی چهره</button></div>
  </div>`);

  const zoom = svg => svg.replace('viewBox="0 0 100 100"', 'viewBox="12 6 76 76"');
  const lockedLabel = (kind, i, p) => { const pr = partPrice(kind, i); return pr && !p.parts.includes(kind + ':' + i) ? pr : 0; };

  // buy a locked piece, or just pick an owned one; returns true if the pick went through
  function pick(kind, i){
    const q = work.p, pr = lockedLabel(kind, i, q);
    if(pr){
      if(q.coins < pr){ toastHome(`برای این گزینه ${faNum(pr - q.coins)} سکه‌ی دیگر لازم داری`); return false; }
      if(!confirm(`این گزینه را با ${pr} سکه می‌خری؟`)) return false;
      q.coins -= pr; q.parts.push(kind + ':' + i); sfxWin();
    } else sfxTap();
    if(kind === 'cover' || kind === 'ring') q[kind] = i; else q.look[kind] = i;
    q.avatar = '';
    return true;
  }

  function sw(title, kind, arr, names){
    const p = work.p, cur = kind === 'ring' ? p.ring : p.look[kind];
    const row = el(`<div class="pe-row"><h3></h3><div class="pe-sws"></div></div>`);
    row.querySelector('h3').textContent = title;
    arr.forEach((c, i) => {
      const lk = lockedLabel(kind, i, p);
      const b = el(`<button type="button" class="pe-sw ${i === cur && !p.avatar ? 'is-on' : ''}" style="background:${c}" aria-pressed="${i === cur}"></button>`);
      b.setAttribute('aria-label', names ? names[i] : String(c));
      if(lk) b.innerHTML = `<span class="pe-sw__lock">🔒</span>`;
      b.addEventListener('click', () => { if(pick(kind, i)) refresh(); });
      row.querySelector('.pe-sws').appendChild(b);
    });
    return row;
  }
  function grid(title, kind, list, render){
    const p = work.p, cur = kind === 'cover' ? p.cover : p.look[kind];
    const row = el(`<div class="pe-row"><h3></h3><div class="pe-opts"></div></div>`);
    row.querySelector('h3').textContent = title;
    list.forEach((it, i) => {
      const lk = lockedLabel(kind, i, p);
      const b = el(`<button type="button" class="pe-opt ${i === cur && !(p.avatar && kind !== 'cover') ? 'is-on' : ''}" aria-pressed="${i === cur}">${render(i, p)}${lk ? `<span class="pe-opt__lock">🔒 ${faNum(lk)}</span>` : ''}</button>`);
      b.setAttribute('aria-label', it[0]);
      b.addEventListener('click', () => { if(pick(kind, i)) refresh(); });
      row.querySelector('.pe-opts').appendChild(b);
    });
    return row;
  }
  const variant = (p, k, i) => { const l = Object.assign({}, p.look); l[k] = i; return zoom(A.svg(l)); };

  function panel(){
    const p = work.p, box = card.querySelector('.pe-panel');
    box.textContent = '';
    if(profTab === 'face'){
      box.appendChild(sw('رنگ پوست', 'skin', A.SKIN));
      box.appendChild(grid('شکل صورت', 'head', A.HEAD, (i, q) => variant(q, 'head', i)));
      box.appendChild(grid('چشم', 'eyes', A.EYES, (i, q) => variant(q, 'eyes', i)));
      box.appendChild(grid('دهان', 'mouth', A.MOUTH, (i, q) => variant(q, 'mouth', i)));
    } else if(profTab === 'hair'){
      box.appendChild(grid('مدل مو', 'hair', A.HAIR, (i, q) => variant(q, 'hair', i)));
      box.appendChild(sw('رنگ مو', 'hairC', A.HAIRC));
      box.appendChild(grid('ریش و سبیل', 'beard', A.BEARD, (i, q) => variant(q, 'beard', i)));
    } else if(profTab === 'acc'){
      box.appendChild(grid('عینک', 'glass', A.GLASS, (i, q) => variant(q, 'glass', i)));
      box.appendChild(grid('کلاه و تاج', 'hat', A.HAT, (i, q) => variant(q, 'hat', i)));
    } else if(profTab === 'look'){
      box.appendChild(sw('رنگ لباس', 'cloth', A.CLOTH));
      box.appendChild(sw('پس‌زمینه‌ی آواتار', 'bg', A.BG));
    } else if(profTab === 'cover'){
      box.appendChild(grid('کاور پشت عکس', 'cover', A.COVERS, i => A.cover(i)));
      box.appendChild(sw('رنگ قاب دور آواتار', 'ring', A.RING.map(r => r[0]), A.RING.map(r => r[1])));
    } else {
      const row = el(`<div class="pe-row"><h3>شکلک به جای چهره</h3><div class="prof-avs" role="radiogroup" aria-label="شکلک"></div></div>`);
      const g = row.querySelector('.prof-avs');
      const mine = el(`<button type="button" class="prof-avs__btn ${p.avatar ? '' : 'is-on'}" aria-label="چهره‌ی ساخته‌شده" style="padding:2px">${zoom(A.svg(p.look))}</button>`);
      mine.addEventListener('click', () => { const q = work.p; q.avatar = ''; sfxTap(); refresh(); });
      g.appendChild(mine);
      const ownedAv = SHOP_ITEMS.filter(i => i.kind === 'avatar' && (i.free || p.owned.includes(i.id))).map(i => i.value);
      [...new Set([...AVATARS, ...ownedAv])].forEach(av => {
        const b = el(`<button type="button" class="prof-avs__btn ${av === p.avatar ? 'is-on' : ''}" aria-label="شکلک"></button>`);
        b.textContent = av;
        b.addEventListener('click', () => { const q = work.p; q.avatar = av; sfxTap(); refresh(); });
        g.appendChild(b);
      });
      box.appendChild(row);
    }
  }
  function head(){
    const p = work.p;
    card.querySelector('.pe-cover').innerHTML = A.cover(p.cover);
    const av = card.querySelector('.pe-av');
    av.innerHTML = avatarMarkup(p); av.style.cssText = frameStyle(p);
    card.querySelector('.prof-coins b').textContent = faNum(p.coins);
  }
  function tabs(){
    const t = card.querySelector('.pe-tabs'); t.textContent = '';
    PROF_TABS.forEach(([k, label]) => {
      const b = el(`<button type="button" class="pe-tab ${k === profTab ? 'is-on' : ''}" role="tab" aria-selected="${k === profTab}"></button>`);
      b.textContent = label;
      b.addEventListener('click', () => { profTab = k; tabs(); panel(); sfxTap(); });
      t.appendChild(b);
    });
  }
  function refresh(){ head(); panel(); }
  card.querySelector('[data-a="rnd"]').addEventListener('click', () => {
    const q = work.p, r = n => Math.floor(Math.random() * n), L = A.LISTS;
    // only pieces that are free or already bought
    const free = (kind, n) => { for(let t = 0; t < 12; t++){ const v = r(n); if(!lockedLabel(kind, v, q)) return v; } return 0; };
    Object.keys(A.DEFAULT_LOOK).forEach(k => { q.look[k] = free(k, L[k].length); });
    q.cover = free('cover', L.cover.length); q.avatar = '';
    sfxTap(); refresh();
  });
  card.querySelector('[data-a="rst"]').addEventListener('click', () => {
    if(!confirm('چهره به حالت اول برگردد؟ چیزهایی که خریده‌ای می‌ماند.')) return;
    const q = work.p; q.look = Object.assign({}, A.DEFAULT_LOOK); q.avatar = ''; sfxTap(); refresh();
  });
  tabs(); refresh();
  return card;
}

// the player's card: name (saved with the button) and the entrance to the avatar window
function buildProfileCard(){
  const A = NBAvatar, p = loadProfile();
  const card = el(`<div class="team-card pe pe--sum">
    <div class="pe-cover"></div>
    <div class="pe-who">
      <div class="pe-av"></div>
      <div class="prof-coins"><span>🪙</span><b></b><span>سکه</span></div>
    </div>
    <label class="prof-lbl" for="profName">نام تو</label>
    <input class="prof-name" id="profName" type="text" maxlength="14" autocomplete="off" placeholder="بازیکن مهمان" />
    <div class="prof-hint">این نام بالای صفحه‌ی اول و برای بقیه‌ی بازیکنان آنلاین نشان داده می‌شود.</div>
    <div class="prof-err" role="alert" hidden></div>
    <div class="pe-acts">
      <button type="button" class="pe-btn" data-a="avatar">🎨 شخصی‌سازی آواتار</button>
      <button type="button" class="pe-btn pe-btn--save" data-a="save" disabled>ثبت تغییرات</button>
    </div>
  </div>`);
  card.querySelector('.pe-cover').innerHTML = A.cover(p.cover);
  const av = card.querySelector('.pe-av');
  av.innerHTML = avatarMarkup(p); av.style.cssText = frameStyle(p);
  card.querySelector('.prof-coins b').textContent = faNum(p.coins);
  const nameIn = card.querySelector('#profName'), save = card.querySelector('[data-a="save"]'), err = card.querySelector('.prof-err');
  let saved = p.name;
  nameIn.value = saved;
  nameIn.addEventListener('input', () => { err.hidden = true; save.disabled = nameIn.value.trim().slice(0, 14) === saved; save.textContent = 'ثبت تغییرات'; });
  save.addEventListener('click', () => {
    const name = nameIn.value.trim().slice(0, 14);
    if(NBSafety.bad(name)){ err.textContent = 'این اسم مناسب نیست. یه اسم دیگه بنویس.'; err.hidden = false; return; }
    const q = loadProfile(); q.name = name; saveProfile(q);
    saved = name; save.disabled = true; save.textContent = 'ذخیره شد ✓'; sfxWin();
  });
  card.querySelector('[data-a="avatar"]').addEventListener('click', openAvatarModal);
  return card;
}

// the avatar editor in its own window; changes (and anything bought in it) apply on «ثبت تغییرات»
function openAvatarModal(){
  const work = { p: loadProfile() };
  const before = JSON.stringify(work.p);
  const back = el(`<div class="pm-back" role="dialog" aria-modal="true" aria-label="شخصی‌سازی آواتار"></div>`);
  const sheet = el(`<div class="pm">
    <div class="pm-head"><h2>شخصی‌سازی آواتار</h2><button type="button" class="pm-x" aria-label="بستن">✕</button></div>
    <div class="pm-body"></div>
    <div class="pm-foot"><button type="button" class="pm-btn pm-btn--ghost">انصراف</button><button type="button" class="pm-btn pm-btn--save">ثبت تغییرات</button></div>
  </div>`);
  sheet.querySelector('.pm-body').appendChild(buildAvatarEditor(work));
  const close = () => { back.remove(); document.body.classList.remove('pm-open'); };
  const cancel = () => {
    if(JSON.stringify(work.p) !== before && !confirm('تغییرات ذخیره نشده از بین می‌رود. بسته شود؟')) return;
    close();
  };
  sheet.querySelector('.pm-x').addEventListener('click', cancel);
  sheet.querySelector('.pm-btn--ghost').addEventListener('click', cancel);
  back.addEventListener('click', (e) => { if(e.target === back) cancel(); });
  sheet.querySelector('.pm-btn--save').addEventListener('click', () => {
    if(JSON.stringify(work.p) !== before){ saveProfile(work.p); sfxWin(); }
    close();
    if(state.screen === 'profile') render();
  });
  back.appendChild(sheet);
  document.body.appendChild(back);
  document.body.classList.add('pm-open');
}

// ---------------- PROFILE SCREEN ----------------
function renderProfile(){
  const p = loadProfile(), s = p.stats;
  const wrap = el(`<div class="setup-page prof"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">پروفایل</div></div>`));

  wrap.appendChild(buildAccountCard());
  wrap.appendChild(buildProfileCard());

  const shopBtn = el(`<button class="team-card__add set-learn prof-shopbtn">🛍️ رفتن به فروشگاه</button>`);
  shopBtn.addEventListener('click', () => { state.screen = 'shop'; render(); });
  wrap.appendChild(shopBtn);

  const total = s.correct + s.skip;
  const acc = total ? Math.round(s.correct * 100 / total) : 0;
  const stat = (n, l) => `<div class="set-stat"><b>${faNum(n)}</b><span>${l}</span></div>`;
  const statsCard = el(`<div class="team-card set-card"></div>`);
  statsCard.appendChild(el(`<h2 class="set-card__title">آمار من</h2>`));
  statsCard.appendChild(el(`<div class="set-stats prof-stats">
    ${stat(s.games, 'بازی کامل')}${stat(s.rounds, 'راند')}${stat(s.correct, 'کلمه‌ی درست')}
    ${stat(s.best, 'بهترین راند')}${stat(acc, 'دقت (٪)')}${stat(s.cells, 'خانه جلو رفتی')}
  </div>`));
  if(!s.rounds) statsCard.appendChild(el(`<p class="prof-empty">هنوز راندی نبازی کرده‌ای. بعد از اولین راند، آمار اینجا ساخته می‌شود.</p>`));
  wrap.appendChild(statsCard);

  const badgeCard = el(`<div class="team-card set-card"></div>`);
  badgeCard.appendChild(el(`<h2 class="set-card__title">نشان‌ها</h2>`));
  const bg = el(`<div class="prof-badges"></div>`);
  PROFILE_BADGES.forEach(([ico, label, test]) => {
    const got = test(p);
    bg.appendChild(el(`<div class="prof-badge ${got ? 'is-got' : ''}"><span>${ico}</span><b>${label}</b></div>`));
  });
  badgeCard.appendChild(bg);
  wrap.appendChild(badgeCard);

  wrap.appendChild(el(`<p class="prof-note">آمار فقط روی همین گوشی ذخیره می‌شود و از بازی‌های محلی ساخته می‌شود.</p>`));
  const reset = el(`<button class="team-card__add set-learn prof-reset">پاک کردن آمار</button>`);
  reset.addEventListener('click', () => {
    if(!confirm('آمار و نشان‌ها پاک شود؟ نام و آواتار می‌ماند.')) return;
    const q = loadProfile(); q.stats = { games:0, rounds:0, correct:0, skip:0, best:0, cells:0 }; saveProfile(q); render();
  });
  wrap.appendChild(reset);
  return wrap;
}

// ---------------- TUTORIAL SCREEN ----------------
function renderTutorial(){
  LS.set('seenTutorial', true);
  const wrap = el(`<div class="setup-page tut"></div>`);
  wrap.appendChild(el(`<div class="setup-head"><div class="setup-brand">آموزش بازی</div></div>`));
  const dur = faNum(state.roundDuration);
  const last = faNum(state.trackLength);

  wrap.appendChild(el(`<div class="team-card tut-intro">
    <h2 class="set-card__title">آموزش بازی</h2>
    <p>«نخ بده» یک بازی حدس کلمات گروهیه. هر تیم می‌خواد زودتر از بقیه خودش رو به خانه‌ی آخر نقشه برسونه؛ و راهش اینه که کلمه‌ها رو درست توضیح بده و درست حدس بزنه.</p>
    <ol class="tut-steps">
      <li><span class="tut-steps__n">۱</span><span>توضیح بده</span></li>
      <li><span class="tut-steps__n">۲</span><span>حدس بزن</span></li>
      <li><span class="tut-steps__n">۳</span><span>امتیاز بگیر</span></li>
      <li><span class="tut-steps__n">۴</span><span>جلو برو</span></li>
    </ol>
    <div class="tut-facts">
      <div class="set-stat"><b>${dur}</b><span>ثانیه هر راند</span></div>
      <div class="set-stat"><b>${last}</b><span>خانه تا پایان</span></div>
      <div class="set-stat"><b>${faNum(state.obstacles.length)}</b><span>خانه‌ی ویژه</span></div>
    </div>
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
    ['🃏', 'کارت و کلمه', `
      <p>هر بار روی صفحه <b>یک کلمه</b> می‌آید. فقط توضیح‌دهنده اون رو می‌بینه و باید بدون گفتن خودِ کلمه، توضیحش بده تا هم‌تیمی‌ها حدس بزنن.</p>
      <p>با هر «درست» یا «رد شد» کلمه‌ی بعدی میاد. کلمه‌ها قاطی شدن و تا وقتی همه‌ی کلمه‌ها استفاده نشده، هیچ کلمه‌ای تکرار نمی‌شه.</p>`],
    ['💬', 'توضیح دادن', `
      <p>توضیح‌دهنده کلمه رو با جمله‌ها و مثال‌هاش توضیح می‌ده، ولی <b>نباید</b> خودِ کلمه رو بگه.</p>
      <p>اگه هم‌تیمی‌ها درست حدس زدن، دکمه‌ی «درست» رو بزن تا کارت بعدی بیاد. اگه توضیح دادن سخته، «رد شد» رو بزن؛ البته رد کردن امتیاز منفی داره.</p>
      <p>اگه توضیح‌دهنده راهنمایی غیرمجاز بده (مثلاً کلمه رو بگه)، هر کسی می‌تونه دکمه‌ی «راهنمایی غیرمجاز» رو بزنه. تایمر می‌ایسته و تیم مقابل تصمیم می‌گیره: تأیید یا برگردوندن. اگه تأیید بشه، یک امتیاز منفی ثبت می‌شه.</p>`],
    ['➕', 'امتیاز و حرکت', `
      <ul class="tut-list">
        <li><b dir="ltr">+۱</b><span>هر جواب درست</span></li>
        <li><b dir="ltr">−۱</b><span>هر «رد شد»</span></li>
        <li><b dir="ltr">−۱</b><span>هر راهنمایی غیرمجاز</span></li>
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

  const toggleAll = el(`<button class="tut-toggle"></button>`);
  const secEls = [];
  const syncToggle = () => { toggleAll.textContent = secEls.every(d => d.open) ? 'بستن همه‌ی بخش‌ها' : 'باز کردن همه‌ی بخش‌ها'; };
  toggleAll.addEventListener('click', () => {
    const open = !secEls.every(d => d.open);
    secEls.forEach(d => { d.open = open; });
    syncToggle();
  });
  wrap.appendChild(toggleAll);

  sections.forEach(([icon, title, body], i) => {
    const d = el(`<details class="team-card tut-sec"${i === 0 ? ' open' : ''}>
      <summary><span class="tut-sec__ico">${icon}</span><span class="tut-sec__title">${title}</span><span class="tut-sec__chev" aria-hidden="true"></span></summary>
      <div class="about-body tut-sec__body">${body}</div>
    </details>`);
    d.addEventListener('toggle', syncToggle);
    secEls.push(d);
    wrap.appendChild(d);
  });
  syncToggle();

  const start = el(`<button class="setup-start tut-start"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.5 19 12 8 18.5 Z"/></svg><span>شروع بازی</span></button>`);
  start.addEventListener('click', () => { state.screen = 'setup'; render(); });
  wrap.appendChild(start);
  return wrap;
}

// Screens you may leave with a visible control. The board is deliberately
// excluded: a round in progress should not be abandoned by a stray tap.
const NO_BACK_SCREENS = ['welcome', 'home', 'board', 'online-board'];

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
  } else if(s === 'settings' || s === 'profile' || s === 'shop' || s === 'friends' || s === 'cards' || s === 'setup' || s === 'online-home' || s === 'tutorial'){
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
  const ownHeader = ['welcome','home','online-home','online-create','online-join','setup','board','online-board','online-lobby','settings','profile','shop','friends','cards','tutorial','online-quick','daily'];
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
  state.customDeck = false;   // the custom-words box starts empty on every build of this screen
  const wrap = el(`<div class="setup-page"></div>`);

  // ---- header ----
  const header = el(`<div class="setup-head"></div>`);
  header.appendChild(el(`<div class="setup-brand">نخ بده</div>`));
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

    const frs = loadFriends().filter(f => !state.teams.some(t => t.members.includes(f.name)));
    if(frs.length){
      const row = el(`<div class="frn-pick"><span>از دوستان:</span></div>`);
      frs.slice(0, 8).forEach(f => {
        const chip = el(`<button class="frn-pick__chip"></button>`);
        chip.textContent = f.name;
        chip.addEventListener('click', () => {
          const slot = team.members.findIndex(m => /^بازیکن\s*[0-9۰-۹]+$/.test(String(m).trim()) || !String(m).trim());
          if(slot >= 0) team.members[slot] = f.name;
          else if(team.members.length < 10) team.members.push(f.name);
          else { toastHome('این تیم پر است'); return; }
          render();
        });
        row.appendChild(chip);
      });
      block.appendChild(row);
    }

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

  // ---- board ----
  if(MAPS.length > 1){
    const mapCard = el(`<div class="deck-card"><h2 class="deck-card__title">نقشه‌ی بازی</h2><p class="deck-card__sub">روی کدام نقشه بازی کنید؟ نقشه‌های قفل‌دار را از فروشگاه می‌خری.</p></div>`);
    mapCard.appendChild(buildMapPicker(selectedMapId(), () => render()));
    wrap.appendChild(mapCard);
  }

  // ---- word packs ----
  const packCard = el(`<div class="deck-card"><h2 class="deck-card__title">پک کلمه‌ها</h2><p class="deck-card__sub">یک یا چند پک را انتخاب کن. پک‌های قفل‌دار را از فروشگاه می‌خری.</p></div>`);
  packCard.appendChild(buildPackPicker(selectedPacks(), () => render()));
  wrap.appendChild(packCard);

  // ---- custom word cards ----
  const deckCard = el(`<div class="deck-card">
    <h2 class="deck-card__title">کلمه‌های بازی</h2>
    <p class="deck-card__sub">با پک‌های بالا بازی کلمه‌ی آماده داره. اگه خواستی خودت کلمه‌ها رو جایگزین کنی، اینجا بنویس (هر خط یک کلمه، حداقل ۱۰ تا).</p>
    <textarea class="deck-card__area" id="deckInput" placeholder="برای جایگزینی، کلمه‌های خودت رو اینجا بنویس..."></textarea>
    <small class="deck-card__count" id="deckCount" aria-live="polite"></small>
  </div>`);
  const ta = deckCard.querySelector('#deckInput');
  const count = deckCard.querySelector('#deckCount');
  ta.value = '';
  ta.addEventListener('change', e => {
    const words = e.target.value.split(/[\n,،]+/).map(w => w.trim()).filter(Boolean);
    if(words.length >= 10){
      state.wordSource = words; state.customDeck = true;
      count.textContent = `بازی با ${faNum(words.length)} کلمه‌ی خودت انجام می‌شه.`;
    } else {
      state.customDeck = false;
      count.textContent = words.length ? 'برای جایگزینی، حداقل ۱۰ کلمه لازمه؛ کلمه‌های آماده استفاده می‌شن.' : '';
    }
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
  setActiveMap(selectedMapId());
  state.deck = [];
  if(!state.customDeck) state.wordSource = wordsForPacks(selectedPacks());
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
  LS.set('game', { v:1, mapId: activeMapId, teams: JSON.parse(JSON.stringify(state.teams)), currentTeamIdx: state.currentTeamIdx, roundDuration: state.roundDuration, at: Date.now() });
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
    setActiveMap(g.mapId || 'iran');
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
  state.teams.forEach(t => { if(t.mods){ delete t.mods.forcedNumber; delete t.mods.predictNumber; delete t.mods.predictBonus; } });
  state.deck = [];
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

// ---- words ----
function mulberry32(seed){
  let a = seed | 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(list, rand){
  const a = list.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Online, every phone has to show the same word. The host picks a seed when the
// game starts and the room only counts how many words have been used; each phone
// shuffles the list with that seed and reads the same position.
const wordOrderCache = {};
function onlineWordAt(idx, seed){
  const key = (seed | 0) || 1;
  const ids = (online.room && Array.isArray(online.room.packs)) ? online.room.packs : null;
  const ck = key + ':' + (ids ? ids.join(',') : '');
  const order = wordOrderCache[ck] || (wordOrderCache[ck] = shuffled(ids ? wordsForPacks(ids) : WORD_LIST, mulberry32(key)));
  return order[((idx % order.length) + order.length) % order.length];
}
function onlineNextWordIdx(){
  const cur = online.room && online.room.currentCardIdx;
  return (cur == null ? 0 : cur) + 1;
}

// One word per card, taken from a shuffle so nothing repeats until the list runs out.
function drawCard(){
  if(state.deck.length === 0){
    state.deck = shuffled(state.wordSource, Math.random);
  }
  state.currentCard = state.deck.pop();
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
  header.appendChild(el(`<div class="play-brand">نخ بده</div>`));
  wrap.appendChild(header);

  // ---- compact status row: cell | role | viewer select ----
  const status = el(`<div class="play-status"></div>`);
  status.appendChild(el(`<div class="play-status__item"><svg viewBox="0 0 24 24" width="16" height="16" fill="#E9B94C"><path d="M12 3 2.5 11h2.3v9h5.1v-5.6h4.2V20h5.1v-9h2.3L12 3Z"/></svg><span>خانه ${faNum(currentTeam().position + 1)} از ${faNum(state.trackLength)}</span></div>`));
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
    const choiceUI = buildEffectChoiceUI(effect, t.id, (targetId) => {
      const targetTeam = targetId ? state.teams.find(x => x.id === targetId) : null;
      applyActionCardEffect(effect, t, targetTeam);
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
  const timerView = renderPlayTimer();

  // ---- main word card (visual focus) ----
  const cardViewEl = renderCardView(isDescriber, isTurnTeam);
  if(state.flashFeedback === 'correct') cardViewEl.classList.add('flash-correct');
  if(state.flashFeedback === 'wrong') cardViewEl.classList.add('flash-wrong');
  applyScene(wrap);
  wrap.appendChild(sceneStage(timerView, cardViewEl));

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

// The word scene the player picked in the shop. It is a class on the play screen
// (the look lives in CSS) plus a decoration layer and a stage that holds clock and card.
function applyScene(wrap){
  const sc = sceneName();
  wrap.classList.add('sc-' + sc);
  const deco = el(`<div class="sc-deco" aria-hidden="true"><i></i><i></i></div>`);
  if(sc === 'neon'){
    const pool = (state.wordSource && state.wordSource.length ? state.wordSource : WORD_LIST);
    for(let k = 0; k < 6; k++){ const b = el(`<b></b>`); b.textContent = pool[Math.floor(Math.random() * pool.length)]; deco.appendChild(b); }
  }
  wrap.insertBefore(deco, wrap.firstChild);
}
function sceneStage(timer, card){
  const st = el(`<div class="sc-stage"></div>`);
  st.appendChild(timer); st.appendChild(card);
  return st;
}

function renderPlayTimer(){
  const total = currentTeam().timerOverride || state.roundDuration;
  const pct = Math.max(0, Math.min(1, state.timeLeft / total));
  const deg = Math.round(pct * 360);
  const left = state.timeLeft;
  // the ring warms up as the round runs out
  let tier = 'calm', colour = 'var(--sc-calm, #E9B94C)';
  if(state.timerRunning && left <= 10){ tier = 'hot';  colour = '#FF5A46'; }
  else if(state.timerRunning && left <= 25){ tier = 'warm'; colour = '#FF9B3D'; }
  // The board is rebuilt on every tap, so keying the beat to "is the timer
  // running" replayed it on each click. Only beat when the second changes.
  const beat = state.timerRunning && left !== lastTimerSecond;
  lastTimerSecond = left;
  const ring = el(`<div class="play-timer is-${tier} ${beat ? 'is-tick' : ''}">
    <div class="play-timer__ring" style="background: conic-gradient(${colour} ${deg}deg, var(--sc-track, rgba(255,255,255,.10)) ${deg}deg);">
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
  let tier = 'calm', colour = 'var(--sc-calm, #E9B94C)';
  if(state.timerRunning && left <= 10){ tier = 'hot';  colour = '#FF5A46'; }
  else if(state.timerRunning && left <= 25){ tier = 'warm'; colour = '#FF9B3D'; }

  const face = timerEl.querySelector('.play-timer__face');
  const ring = timerEl.querySelector('.play-timer__ring');
  if(!face || !ring) return false;
  timerEl.classList.remove('is-calm','is-warm','is-hot','is-tick');
  timerEl.classList.add('is-' + tier);
  ring.style.background = `conic-gradient(${colour} ${deg}deg, var(--sc-track, rgba(255,255,255,.10)) ${deg}deg)`;
  face.textContent = faNum(left);
  if(state.timerRunning && left !== lastTimerSecond){
    void timerEl.offsetWidth;
    timerEl.classList.add('is-tick');
  }
  lastTimerSecond = left;
  return true;
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
  return {scoreChange, moved};
}

function clearOneRoundMods(team){
  if(!team.mods) { team.mods = {}; return; }
  // forcedNumber / predictNumber / predictBonus come from cards that no longer exist;
  // they are cleared so an old saved game cannot carry them forward
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

function applyActionCardEffect(effect, selfTeam, targetTeam){
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

// Builds the target-team picker UI shown inside the card-reveal modal
// when the drawn card's effect needs a choice before it can be confirmed.
// onConfirm(targetTeamId|null) is called once the required choice is made.
function buildEffectChoiceUI(effect, selfTeamId, onConfirm){
  const box = el(`<div style="margin-top:10px; text-align:center;"></div>`);
  if(!effect || !effect.needsTarget){
    const okBtn = el(`<button class="btn btn-primary">باشه، ادامه</button>`);
    okBtn.addEventListener('click', () => onConfirm(null));
    box.appendChild(okBtn);
    return box;
  }
  let chosenTarget = null;
  box.appendChild(el(`<div style="color:#fdf6e3; font-size:13px; margin-bottom:8px;">یه تیم رقیب رو انتخاب کن:</div>`));
  const row = el(`<div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:10px;"></div>`);
  state.teams.filter(x => x.id !== selfTeamId).forEach(x => {
    const b = el(`<button class="btn btn-ghost" style="width:auto; padding:8px 14px; border-color:${x.color};">${x.name}</button>`);
    b.addEventListener('click', () => {
      chosenTarget = x.id;
      Array.from(row.children).forEach(c => c.style.background = 'transparent');
      b.style.background = x.color;
      okBtn.disabled = false;
    });
    row.appendChild(b);
  });
  box.appendChild(row);
  const okBtn = el(`<button class="btn btn-primary" disabled>باشه، ادامه</button>`);
  okBtn.addEventListener('click', () => onConfirm(chosenTarget));
  box.appendChild(okBtn);
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
    if(Math.abs(vel) > 90){ state.wheelVel = vel; onFlick(); }
  };
  wrap.addEventListener('pointerdown', down);
  wrap.addEventListener('pointermove', move);
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
}

function renderWheelStage(targetIdx, spun, canSpin, onSpin){
  const skin = NBWheel.get(loadProfile().wheel);
  if(skin.key === 'slot') return renderSlotStage(targetIdx, spun, canSpin, onSpin);
  const N = ACTION_CARDS.length, seg = 360 / N;
  const stage = el(`<div class="wheel-stage"></div>`);
  stage.appendChild(el(`<div class="wheel-lead">${canSpin && !spun ? 'گردونه رو با انگشتت بچرخون' : 'گردونه در حال چرخشه'}</div>`));
  stage.appendChild(el(`<div class="wheel-ptr" style="border-top-color:${skin.ptr}"></div>`));
  const wrap = el(`<div class="wheel-wrap ${canSpin && !spun ? 'is-grabbable' : ''}"></div>`);
  const disc = el(`<div class="wheel-disc"></div>`);
  disc.innerHTML = skin.key === 'classic' ? wheelSVG() : NBWheel.svg(skin.id);
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
      stage.appendChild(el(`<div class="wheel-hint wheel-hint--go">با یک حرکت انگشت بچرخونش 👆</div>`));
    } else {
      stage.appendChild(el(`<div class="wheel-hint">منتظر چرخوندن گردونه…</div>`));
    }
  } else {
    stage.appendChild(el(`<div class="wheel-hint">در حال چرخیدن…</div>`));
  }
  return stage;
}

// swipe the reel up or down; a quick enough swipe sets it spinning, otherwise it springs back
function attachSlotDrag(strip, wrap, home, onFlick){
  let down = false, y0 = 0, lastY = 0, lastT = 0, vel = 0, dy = 0;
  wrap.classList.add('is-grabbable');
  wrap.addEventListener('pointerdown', e => {
    down = true; y0 = lastY = e.clientY; lastT = performance.now(); vel = 0; dy = 0;
    strip.style.transition = 'none';
    try { wrap.setPointerCapture(e.pointerId); } catch(_){}
  });
  wrap.addEventListener('pointermove', e => {
    if(!down) return;
    const now = performance.now(), dt = Math.max(8, now - lastT);
    vel = 0.7 * vel + 0.3 * ((e.clientY - lastY) / dt * 1000);
    lastY = e.clientY; lastT = now;
    dy = e.clientY - y0;
    strip.style.transform = `translateY(calc(${home.slice(11, -1)} + ${Math.max(-60, Math.min(60, dy))}px))`;
    e.preventDefault();
  });
  const up = () => {
    if(!down) return;
    down = false;
    if(Math.abs(vel) > 250 || Math.abs(dy) > 70){ state.wheelVel = Math.abs(vel); onFlick(); }
    else { strip.style.transition = ''; strip.style.transform = home; }
  };
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
}

// the slot skin: a column of actions that scrolls and stops on the chosen card
function renderSlotStage(targetIdx, spun, canSpin, onSpin){
  const N = ACTION_CARDS.length, H = 80;
  const stage = el(`<div class="wheel-stage"></div>`);
  stage.appendChild(el(`<div class="wheel-lead">${canSpin && !spun ? 'ستون رو با انگشتت بکش بالا یا پایین' : 'در حال چرخیدن'}</div>`));
  const items = [];
  for(let c = 0; c < 4; c++) for(let i = 0; i < N; i++) items.push(`<div class="reel__it"><i>${NBWheel.ICON[i]}</i>${NBWheel.SHORT[i]}</div>`);
  const wrap = el(`<div class="wheel-wrap wheel-wrap--slot"><div class="reel"><div class="reel__win"></div><div class="reel__strip">${items.join('')}</div></div></div>`);
  const strip = wrap.querySelector('.reel__strip');
  const at = idx => `translateY(${H - idx * H}px)`;
  const final = N * 2 + (targetIdx || 0);
  stage.appendChild(wrap);
  if(spun && !state.wheelAnimStarted){
    state.wheelAnimStarted = true;
    strip.style.transition = 'none';
    strip.style.transform = at(0);
    requestAnimationFrame(() => {
      strip.style.transition = '';
      requestAnimationFrame(() => { strip.style.transform = at(final); });
    });
    [120, 300, 500, 740, 1020, 1350, 1730, 2160, 2620, 3080, 3500, 3850, 4100, 4260].forEach(t => setTimeout(() => { haptic(8); sfxTick(); }, t));
    setTimeout(() => stage.classList.add('is-landed'), 4180);
    state.wheelTimer = setTimeout(() => {
      state.wheelTimer = null;
      state.wheelDone = true;
      sfxCardReveal();
      render();
    }, 4300);
  } else {
    strip.style.transition = 'none';
    strip.style.transform = at(spun ? final : 0);
    if(canSpin && !spun) attachSlotDrag(strip, wrap, at(0), onSpin);
  }
  if(!spun){
    if(canSpin){
      stage.appendChild(el(`<div class="wheel-hint wheel-hint--go">با یک حرکت انگشت بچرخونش 👆</div>`));
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
  try{ const seen = LS.get('seenCards', {}) || {}; seen[idx] = (seen[idx] | 0) + 1; LS.set('seenCards', seen); }catch(e){}
  return idx;
}

function renderCardView(isDescriber, isTurnTeam){
  if(isTurnTeam && !isDescriber){
    return el(`<div class="play-card play-card--hidden">
      <div class="play-card__hidden">🙈<span>نوبت تیم توئه — فقط گوش کن و حدس بزن</span></div>
    </div>`);
  }
  const word = state.currentCard || '—';

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
  card.appendChild(el(`<span class="play-card__corner play-card__corner--tr"></span>`));
  card.appendChild(el(`<span class="play-card__corner play-card__corner--tl"></span>`));
  card.appendChild(el(`<span class="play-card__corner play-card__corner--br"></span>`));
  card.appendChild(el(`<span class="play-card__corner play-card__corner--bl"></span>`));
  const wordEl = el(`<div class="play-card__word"></div>`);
  wordEl.textContent = word;
  card.appendChild(wordEl);
  return card;
}

function buildRoundResult(onNext, label){
  const s = state.lastRoundSummary || {};
  const correct = s.correct ?? 0, skip = s.skip ?? 0, foul = s.foul ?? 0;
  const score = s.scoreChange ?? 0, moved = s.moved ?? 0;
  const cell0 = s.landedCell ?? 0, landed = cell0 + 1;
  const team = state.teams.find(t => t.name === s.teamName) || currentTeam() || state.teams[0];
  const box = el(`<div class="res res--map"></div>`);
  box.appendChild(renderMapFullScreen());

  // ---- the stats screen: a centred card over the dimmed board ----
  const total = correct + skip + foul;
  const acc = total ? Math.round(correct * 100 / total) : null;
  const left = Math.max(0, state.trackLength - landed);
  const nextSpecial = state.obstacles.filter(o => o > cell0).sort((x, y) => x - y)[0];
  const onSpecial = state.obstacles.includes(cell0);
  const city = mapCities()[cityOf(cell0)];
  const dirCls = moved > 0 ? 'is-fwd' : (moved < 0 ? 'is-back' : 'is-stay');
  const dirTxt = moved > 0 ? 'به جلو' : (moved < 0 ? 'به عقب' : 'بدون حرکت');
  const praise = (s.correct ?? 0) >= 8 ? 'راند فوق‌العاده!' : (correct >= 5 ? 'راند عالی!' : (correct >= 2 ? 'راند خوبی بود' : (correct === 0 ? 'راند سختی بود' : 'ادامه بده!')));
  const tile = (cls, ico, to, lbl, sign) => `<div class="st-tile st-tile--${cls}">${ico}<span class="st-tile__num js-count" data-to="${to}" ${sign ? `data-sign="${sign}"` : ''}></span><span class="st-tile__lbl">${lbl}</span></div>`;
  const ICO_OK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17.5 L19 7"/></svg>';
  const ICO_NO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';
  const ICO_FOUL = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L22 20 L2 20 Z"/><path d="M12 9.6v4.2"/><path d="M12 17h.01"/></svg>';
  const ICO_PT = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.6Z"/></svg>';

  const ranked = state.teams.slice().sort((x, y) => (y.position - x.position) || (y.score - x.score));
  const rows = ranked.map((t, i) => `<div class="st-row ${t === team ? 'is-me' : ''}">
      <span class="st-row__rank">${faNum(i + 1)}</span>
      <i class="st-row__dot" style="background:${t.color}"></i>
      <span class="st-row__name">${t.name}</span>
      <span class="st-row__cell">خانه ${faNum(Math.min(t.position, state.trackLength - 1) + 1)}</span>
      <b class="st-row__score">${faNum(t.score)}</b>
    </div>`).join('');
  const dots = state.teams.map(t => `<i class="st-prog__dot" style="--f:${routeFrac(t)}; background:${t.color};"></i>`).join('');
  const starts = cityStart();
  const marks = mapCities().map((n, i) => `<span class="st-prog__city" style="--f:${(starts[i] / (state.trackLength - 1)).toFixed(4)}"><i></i><em>${n}</em></span>`).join('');

  const overlay = el(`<div class="stats-overlay">
    <div class="stats-card">
      <div class="st-head">
        <span class="st-head__badge" style="background:${team ? team.color : '#E9B94C'}"></span>
        <div><small>نتیجه راند</small><h2>${s.teamName || ''}</h2></div>
        <span class="st-head__praise">${praise}</span>
      </div>
      <div class="st-move ${dirCls}">
        <b>${moved > 0 ? '+' : (moved < 0 ? '−' : '')}${faNum(Math.abs(moved))}</b>
        <span>خانه ${dirTxt}</span>
        <small>رسیدی به خانه‌ی ${faNum(landed)} در ${city}</small>
      </div>
      <div class="st-tiles">
        ${tile('ok', ICO_OK, correct, 'درست')}
        ${tile('no', ICO_NO, skip, 'رد شده')}
        ${foul ? tile('foul', ICO_FOUL, foul, 'خطا') : ''}
        ${tile('pt', ICO_PT, Math.abs(score), 'امتیاز راند', score >= 0 ? '+' : '−')}
      </div>
      ${s.coins ? `<div class="st-coins"><span class="st-coins__ico">🪙</span><b>+${faNum(s.coins)}</b><span>سکه گرفتی</span></div>` : ''}
      ${acc === null ? '' : `<div class="st-acc"><span>دقت راند</span><div class="st-acc__bar"><i style="width:${acc}%"></i></div><b>${faNum(acc)}٪</b></div>`}
      <div class="st-prog">
        <div class="st-prog__track">${marks}${dots}</div>
        <div class="st-prog__txt">${left ? `<b>${faNum(left)}</b> خانه تا ${curMap().finish}` : `به ${curMap().finish} رسیدی!`}${nextSpecial !== undefined && left ? ` · خانه‌ی ویژه‌ی بعدی: <b>${faNum(nextSpecial + 1)}</b>` : ''}</div>
      </div>
      ${onSpecial ? '<div class="st-special">روی خانه‌ی ویژه افتادی! یک کارت اکشن در انتظار توست.</div>' : ''}
      <div class="st-board"><small>جدول</small>${rows}</div>
      <button class="res-next st-next">${label || 'ادامه — نوبت بعدی'}<span class="res-next__chev"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6 L8 12 L14 18"/></svg></span></button>
    </div>
  </div>`);
  overlay.querySelector('.st-next').addEventListener('click', onNext);
  box.appendChild(overlay);

  // the card appears once the camera has eased back; a fallback covers boards that never zoom
  let shown = false;
  const reveal = () => {
    if(shown || !overlay.isConnected) return;
    shown = true;
    box.classList.add('is-stats');
    overlay.classList.add('is-in');
    const fromCell = cell0 - moved;
    const newCity = moved > 0 && cityOf(cell0) > cityOf(fromCell);
    const goal = landed >= state.trackLength;
    if(goal || newCity || correct >= 5 || moved >= 5){
      setTimeout(() => celebrate(document.body, goal || (newCity && correct >= 5) || correct >= 8), 250);
    }
    overlay.querySelectorAll('.js-count').forEach((n, i) => {
      n.dataset.sign = n.dataset.sign || '';
      n.textContent = '';
      setTimeout(() => countUp(n, Number(n.dataset.to) || 0, 650), 380 + i * 110);
    });
  };
  overlay._reveal = reveal;
  setTimeout(reveal, 2600);
  return box;
}

// The board is a tall portrait strip (2160 x 11880): Bandar Abbas at the bottom,
// the Azadi Tower at the top. It is followed vertically by the camera.
const MAP_FOLLOW_W = 640;       // board width in px while following a pawn
const MAP_FIT_VIEW_RATIO = 1.4142;   // sets where the round summary panel starts
const MAP_SETTLE_SCALE = 0.78;       // how far the camera eases back once the pawn has landed
const MAP_FIT_TOP = 50;         // gap above the board in the pulled-back view
const MAP_FIT_MAX_W = 460;      // board never wider than the app's content column
const MAP_SUMMARY_GAP = 10;     // space between the board and the summary
let camLastX = null, camLastY = null, camLastS = 1;
let tokLastPos = {};
let mapCamEl = null, mapWorldEl = null, mapClipEl = null, mapFrameEl = null;
let lastShownWord = null;
let lastRenderedScreen = null;
let lastTimerSecond = null;
let lastStreakShown = 0;
let timerEl = null;
let screenInTimer = null;

function resetMapCamera(){ timerEl = null; lastShownWord = null; lastTimerSecond = null; camLastX = null; camLastY = null; camLastS = 1; tokLastPos = {}; mapCamEl = null; mapWorldEl = null; mapClipEl = null; mapFrameEl = null; state.mapFit = false; }

function summaryTopFor(cw){
  // The board is pinned MAP_FIT_TOP from the top and its height is a pure
  // function of width, so the summary's place never depends on the viewport
  // height (which moves as the browser bar slides).
  const boardH = Math.min(cw, MAP_FIT_MAX_W) / MAP_FIT_VIEW_RATIO;
  return Math.round(MAP_FIT_TOP + boardH + MAP_SUMMARY_GAP);
}

function pinSummary(panel, cw){
  if(!panel || !cw) return;
  panel.style.top = summaryTopFor(cw) + 'px';
}

function positionMapCamera(cam, world){
  const cw = cam.clientWidth, ch = cam.clientHeight;
  if(!cw || !ch) return;

  // The board is always laid out at the close-up size; zooming out is done
  // with a transform scale so it can animate smoothly instead of relaying out.
  const baseW = MAP_FOLLOW_W;
  const baseH = baseW / curMap().ratio;
  world.style.width = baseW + 'px';
  world.style.height = baseH + 'px';

  const t = currentTeam();
  const cell = Math.max(0, Math.min(t ? t.position : 0, curMap().coords.length - 1));
  const tokenX = baseW * curMap().coords[cell][0] / 100;
  const tokenY = baseH * curMap().coords[cell][1] / 100;

  let s, x, y;
  const clip = mapClipEl, frame = mapFrameEl;
  if(state.mapFit){
    // Settle: ease back a little (not out to a tiny window) and keep the pawn in
    // the middle of the part of the screen above the summary panel, which is
    // pinned from the viewport WIDTH only.
    const aboveH = ch;
    s = MAP_SETTLE_SCALE;
    const sw = baseW * s, sh = baseH * s;
    x = Math.max(Math.min(0, cw - sw), Math.min(0, cw / 2 - tokenX * s));
    y = Math.min(0, Math.max(ch - sh, aboveH / 2 - tokenY * s));
    if(clip) clip.style.clipPath = '';
    if(frame) frame.style.opacity = '0';
  } else {
    s = 1;
    // keep the moving pawn centred, but never show past the edges of the board
    x = Math.max(Math.min(0, cw - baseW), Math.min(0, cw / 2 - tokenX));
    y = Math.max(Math.min(0, ch - baseH), Math.min(0, ch / 2 - tokenY));
    if(frame) frame.style.opacity = '0';
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
  const TOK_H = 44, TOK_MIN_PX = 15;
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
  const cur = currentTeam();
  const tk = cur && mapWorldEl.querySelector(`.mapcam__tok[data-team="${cur.id}"]`);
  if(tk){ tk.classList.remove('is-arrive'); void tk.offsetWidth; tk.classList.add('is-arrive'); }
  const ov = document.querySelector('.stats-overlay');
  if(ov && ov._reveal) setTimeout(ov._reveal, 1500);   // let the camera ease back and the ring play first
  positionMapCamera(mapCamEl, mapWorldEl);
}


// ---------- journey: cities, route bar, arrival banner ----------
const mapCities = () => curMap().cities;
const cityStart = () => curMap().cities.map((_, i) => Math.max(0, curMap().cellCity.indexOf(i)));
function cityOf(cell){ const cc = curMap().cellCity; return cc[Math.max(0, Math.min(cc.length - 1, cell | 0))] ?? 0; }

function buildRouteBar(){
  const bar = el(`<div class="routebar" aria-hidden="true"></div>`);
  bar.appendChild(el(`<div class="routebar__line"></div>`));
  const starts = cityStart();
  mapCities().forEach((n, i) => {
    const frac = starts[i] / (state.trackLength - 1);
    const last = i === mapCities().length - 1;
    bar.appendChild(el(`<div class="routebar__city ${last ? 'is-goal' : ''}" style="--f:${Math.min(frac, 1).toFixed(4)};"><i></i><span>${n}</span></div>`));
  });
  state.teams.forEach(t => {
    bar.appendChild(el(`<div class="routebar__team" data-team="${t.id}" style="--f:${routeFrac(t)}; background:${t.color};"></div>`));
  });
  return bar;
}
function routeFrac(t){ return Math.max(0, Math.min(1, t.position / (state.trackLength - 1))).toFixed(4); }
function updateRouteBar(){
  if(!mapCamEl) return;
  state.teams.forEach(t => {
    const d = mapCamEl.querySelector(`.routebar__team[data-team="${t.id}"]`);
    if(d) d.style.setProperty('--f', routeFrac(t));
  });
}

let cityBannerTimer = null;
function showCityBanner(fromPos, toPos){
  const a = cityOf(fromPos), b = cityOf(toPos);
  if(a === b) return;
  const forward = b > a;
  const goal = b === mapCities().length - 1 && forward;
  const text = goal ? curMap().goalText
             : forward ? `وارد ${mapCities()[b]} شدی` : `برگشتی به ${mapCities()[b]}`;
  document.querySelectorAll('.city-banner').forEach(n => n.remove());
  const b2 = el(`<div class="city-banner ${goal ? 'is-goal' : ''}"><small>${forward ? 'منزل بعدی' : 'عقب‌نشینی'}</small><b>${text}</b></div>`);
  document.body.appendChild(b2);
  clearTimeout(cityBannerTimer);
  cityBannerTimer = setTimeout(() => { b2.classList.add('is-out'); setTimeout(() => b2.remove(), 500); }, 2800);
}

function renderMapFullScreen(){
  const cam = el(`<div class="mapcam"></div>`);
  const world = el(`<div class="mapcam__world ${state.mapFit ? 'is-fitting' : ''}"></div>`);
  world.appendChild(el(`<img class="mapcam__img" src="${mapImageOf(curMap())}" alt="" />`));
  if(MAP_FX && curMap().fx){ const fx = el(NBMapFx.html(curMap().id)); world.appendChild(fx); NBMapFx.mount(fx); }

  const byCell = {};
  state.teams.forEach((t, ti) => {
    const c = Math.max(0, Math.min(t.position, curMap().coords.length - 1));
    if(!byCell[c]) byCell[c] = [];
    byCell[c].push({ t, ti });
  });
  Object.keys(byCell).forEach(c => {
    const group = byCell[c];
    const [px, py] = curMap().coords[parseInt(c)];
    group.forEach((g, gi) => {
      const ang = (gi / group.length) * 2 * Math.PI;
      const r = group.length > 1 ? 1.5 : 0;               // % of the board width
      const ox = r * Math.cos(ang), oy = r * Math.sin(ang) * curMap().ratio;
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

  const clip = el(`<div class="mapcam__clip"></div>`);
  clip.appendChild(world);
  const frame = null;
  cam.appendChild(clip);
  cam.appendChild(buildRouteBar());
  mapCamEl = cam; mapWorldEl = world; mapClipEl = clip; mapFrameEl = frame;
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
  const cell = Math.max(0, Math.min(team.position, curMap().coords.length - 1));
  const [nx, ny] = curMap().coords[cell];

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
  updateRouteBar();
  return true;
}

function buildMapWrap(large){
  const mapWrap = el(`<div style="position:relative; margin-bottom:${large?'8px':'12px'};"></div>`);
  const mapImg = el(`<img src="${mapImageOf(curMap())}" style="width:100%; border-radius:${large?'16px':'14px'}; border:2px solid var(--gold); display:block;" />`);
  mapWrap.appendChild(mapImg);
  const tokSize = large ? 20 : 15;
  const byCell = {};
  state.teams.forEach((t,ti) => {
    const c = Math.min(t.position, curMap().coords.length-1);
    if(!byCell[c]) byCell[c] = [];
    byCell[c].push({t,ti});
  });
  Object.keys(byCell).forEach(c => {
    const group = byCell[c];
    const [px,py] = curMap().coords[parseInt(c)];
    group.forEach((g, gi) => {
      const offsetAngle = (gi/group.length) * 2*Math.PI;
      const offsetR = group.length>1 ? 1.4 : 0;
      const ox = offsetR*Math.cos(offsetAngle);
      const oy = offsetR*Math.sin(offsetAngle)*curMap().ratio;
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
  const earnedSum = { correct: state.correctCount, skip: state.skipCount, moved: moved, from: fromPos, to: toPos };
  recordRound(earnedSum);
  state.pendingSummary = {
    coins: earnedSum.earned || 0,
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
      showCityBanner(fromPos, toPos);
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
    recordGameFinished();
    sfxVictory();
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
    if(state.screen === 'welcome') state.screen = 'home';   // an invite link goes straight to joining
    history.replaceState(null, '', location.pathname);
  }
} catch(e){}
window.addEventListener('fb-ready', () => { if(state.screen === 'welcome') render(); });

// a soft tick on every button, except the ones that play their own game sound
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('button');
  if(!b || b.disabled || b.closest('.play-actions, .foul-row, .wheel-stage')) return;
  // picking an item (chip, tab, switch, shop/avatar/map/pack tile) sounds different from a plain button
  if(b.closest('[role=switch], [role=tab], .set-chip, .shop-grid, .pm-panel, .pm-tabs, .map-grid, .pack-grid, .hm-sheet-back, .rp-back') || /chip|tile|swatch|pick|opt|tab|item|choice/.test(b.className || '')){ sfxSelect(); return; }
  sfxTap();
}, { passive: true });
// a window (sheet / modal) opening or closing
let dlgWas = false;
new MutationObserver(() => {
  const now = !!document.querySelector('[role=dialog]');
  if(now !== dlgWas){ dlgWas = now; if(now) sfxOpen(); else sfxClose(); }   // not on every re-render of an open window
}).observe(document.body, { childList: true, subtree: true });
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && state.homeSheet){ state.homeSheet = false; render(); }
});

render();
installBackHandler();
try {
} catch(e){}
