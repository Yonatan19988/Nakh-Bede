// Google account and the cloud copy of the player's profile.
// Needs: app.js (el, LS, state, render, srvNow, faNum, loadProfile) and firebase.js (window.FB.account).
//
// What is backed up: the profile (name, avatar, coins, purchases, stats), friends, the daily-word streak,
// the saved name and the block list. It lives at users/<uid> as one JSON string, readable only by its owner.

const ACCOUNT_KEYS = ['profile', 'friends', 'dailyStreak', 'name', 'blocked'];
let acc = { busy: false, err: '', note: '', pushTimer: null, checked: false };

function accountReady(){ return !!(window.FB && window.FB.account && window.FB.uid); }
function accountIsGoogle(){ return accountReady() && window.FB.account.isGoogle(); }
function accountRef(){
  const u = window.FB.account.user();
  return window.FB.ref(window.FB.db, 'users/' + (u ? u.uid : window.FB.uid));
}

// every change to the synced data comes through here (see saveProfile, saveFriends, dailyBumpStreak)
function accountTouch(){
  LS.set('profileAt', srvNow());
  if(!accountIsGoogle()) return;
  clearTimeout(acc.pushTimer);
  acc.pushTimer = setTimeout(accountPush, 4000);
}
function accountSnapshot(){
  const o = {};
  ACCOUNT_KEYS.forEach(k => { const v = LS.get(k, null); if(v !== null && v !== undefined) o[k] = v; });
  return o;
}
function accountPush(){
  if(!accountIsGoogle()) return Promise.resolve(false);
  const at = LS.get('profileAt', 0) || srvNow();
  const p = JSON.stringify(accountSnapshot());
  if(p.length > 12000) return Promise.resolve(false);
  return window.FB.set(accountRef(), { p, at, v: 1 }).then(() => { LS.set('cloudAt', at); return true; }).catch(() => false);
}
// replace this phone's data by the cloud copy, then restart so every screen reads the new data
function accountRestore(cloud){
  let obj = null;
  try{ obj = JSON.parse(cloud.p); }catch(e){}
  if(!obj || typeof obj !== 'object') return false;
  ACCOUNT_KEYS.forEach(k => { if(obj[k] !== undefined) LS.set(k, obj[k]); else LS.del(k); });
  LS.set('profileAt', cloud.at || srvNow());
  LS.set('cloudAt', cloud.at || srvNow());
  location.reload();
  return true;
}
// decide between this phone's data and the account's
async function accountSync(askFirst){
  if(!accountIsGoogle()) return;
  let cloud = null;
  try{ cloud = (await window.FB.get(accountRef())).val(); }catch(e){ return; }
  const hasLocal = !!LS.get('profile', null);
  const localAt = LS.get('profileAt', 0) || 0;
  if(!cloud || typeof cloud.p !== 'string'){ await accountPush(); return; }
  if(!hasLocal){ accountRestore(cloud); return; }
  if((cloud.at || 0) > localAt + 1000 && (cloud.at || 0) !== LS.get('cloudAt', 0)){
    const useCloud = confirm(askFirst
      ? 'روی حساب گوگل‌ت یه پروفایل ذخیره شده. به‌جای پروفایل همین گوشی بارگذاری بشه؟\n\nباشه = پروفایل حساب  ·  لغو = پروفایل همین گوشی (جایگزین نسخه‌ی حساب می‌شه)'
      : 'روی حساب گوگل‌ت یه نسخه‌ی تازه‌تر ذخیره شده. بارگذاری بشه؟\n\nباشه = بارگذاری  ·  لغو = نگه داشتن همین گوشی');
    if(useCloud){ accountRestore(cloud); return; }
  }
  await accountPush();
}
// once per launch: a returning Google player picks up newer data from another phone
window.addEventListener('fb-ready', () => {
  if(acc.checked) return;
  acc.checked = true;
  if(accountIsGoogle()) accountSync(false);
});

function accountErrorText(e){
  const c = String((e && e.code) || '');
  if(c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  if(c === 'auth/popup-blocked') return 'پنجره‌ی ورود باز نشد. اجازه‌ی پنجره‌ی بازشو (popup) را بده و دوباره امتحان کن.';
  if(c === 'auth/unauthorized-domain') return 'این آدرس بازی هنوز در Firebase مجاز نشده است (Authentication ← Settings ← Authorized domains).';
  if(c === 'auth/operation-not-allowed') return 'این روش ورود هنوز در Firebase فعال نشده است.';
  if(c === 'auth/network-request-failed') return 'اتصال به اینترنت برقرار نیست.';
  if(c === 'auth/operation-not-supported-in-this-environment' || c === 'auth/web-storage-unsupported') return 'این مرورگر ورود با گوگل را پشتیبانی نمی‌کند. بازی را در Chrome یا Safari باز کن.';
  return 'ورود انجام نشد. دوباره امتحان کن. (' + (c || 'خطای نامشخص') + ')';
}

async function accountSignIn(kind){
  if(acc.busy || !accountReady()) return;
  acc.busy = true; acc.err = ''; acc.note = ''; render();
  try{
    const how = await (kind === 'apple' ? window.FB.account.apple() : window.FB.account.google());
    await accountSync(how === 'switched');
    acc.note = how === 'linked' ? 'حساب گوگل وصل شد؛ پروفایلت از الان ذخیره‌ی ابری می‌شود.' : 'وارد حساب گوگل شدی.';
    if(how === 'switched'){ location.reload(); return; }
  }catch(e){
    acc.err = accountErrorText(e);
  }
  acc.busy = false; render();
}
async function accountSignOut(){
  if(acc.busy || !accountReady()) return;
  if(!confirm('از حساب گوگل خارج بشی؟ پروفایل روی همین گوشی می‌ماند ولی دیگر ذخیره‌ی ابری نمی‌شود.')) return;
  acc.busy = true; render();
  try{
    // save the latest changes, unless the account already holds a newer copy from another phone
    let cloud = null;
    try{ cloud = (await window.FB.get(accountRef())).val(); }catch(e){}
    if(!cloud || (LS.get('profileAt', 0) || 0) >= (cloud.at || 0)) await accountPush();
    await window.FB.account.signOut();
  }catch(e){}
  location.reload();
}

function buildAccountCard(){
  const card = el(`<div class="team-card set-card acc"></div>`);
  card.appendChild(el(`<h2 class="set-card__title">حساب گوگل</h2>`));
  if(IS_NATIVE){
    // Google's sign-in page refuses to open inside an app's web view; the native sign-in comes later
    card.appendChild(el(`<p class="acc__txt">ورود با گوگل در نسخه‌ی اپلیکیشن به‌زودی اضافه می‌شود. تا آن موقع پروفایلت روی همین گوشی می‌ماند.</p>`));
    return card;
  }
  if(!accountReady()){
    card.appendChild(el(`<p class="acc__txt">برای ورود، اتصال به اینترنت لازم است.</p>`));
    return card;
  }
  if(accountIsGoogle()){
    const name = (window.FB.account.displayName() || '').split(' ')[0] || 'حساب گوگل';
    const row = el(`<p class="acc__txt"></p>`);
    row.textContent = `✓ وارد شدی (${name}). پروفایل، سکه‌ها، دوستان و روزهای پشت‌هم‌ات روی حسابت ذخیره می‌شود و در گوشی دیگر هم می‌توانی واردش شوی.`;
    card.appendChild(row);
    const out = el(`<button type="button" class="lobby-call__rm">خروج از حساب</button>`);
    out.addEventListener('click', accountSignOut);
    card.appendChild(out);
  } else {
    card.appendChild(el(`<p class="acc__txt">با حساب گوگل وارد شو تا پروفایل، سکه‌ها و خریدهات روی حسابت بمانند و اگر گوشی را عوض کردی یا برنامه را پاک کردی از دست نروند.</p>`));
    const btn = el(`<button type="button" class="acc__google"><span class="acc__g">G</span><span>${acc.busy ? 'در حال ورود…' : 'ورود با گوگل'}</span></button>`);
    btn.disabled = acc.busy;
    btn.addEventListener('click', () => accountSignIn());
    card.appendChild(btn);
    if(APPLE_LOGIN){
      const ab = el(`<button type="button" class="acc__google acc__apple"><span class="acc__g">\uF8FF</span><span>${acc.busy ? 'در حال ورود…' : 'ورود با اپل'}</span></button>`);
      ab.disabled = acc.busy;
      ab.addEventListener('click', () => accountSignIn('apple'));
      card.appendChild(ab);
    }
  }
  if(acc.err){ const e = el(`<div class="room-form__error" role="alert" style="display:block;"></div>`); e.textContent = acc.err; card.appendChild(e); }
  if(acc.note){ const n = el(`<small class="set-hint"></small>`); n.textContent = acc.note; card.appendChild(n); }
  return card;
}
