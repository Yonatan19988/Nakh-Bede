// The Firebase SDK (app, realtime database and anonymous auth only) is bundled in js/firebase-sdk.js,
// so nothing is loaded from Google's servers except the live connection to the database itself.
import { initializeApp, getDatabase, ref, set, get, update, onValue, off, remove, onDisconnect, query, orderByChild, limitToLast, endAt, limitToFirst, getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, linkWithPopup, signInWithCredential, signOut } from "./firebase-sdk.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSrLKHeMsY6qD2FZggiBqZY4GNmhdj3q8",
  authDomain: "nakh-bede.firebaseapp.com",
  databaseURL: "https://nakh-bede-default-rtdb.firebaseio.com",
  projectId: "nakh-bede",
  storageBucket: "nakh-bede.firebasestorage.app",
  messagingSenderId: "511670245242",
  appId: "1:511670245242:web:d203a63417ba9868f928c3"
};

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);
const auth = getAuth(fbApp);
window.FB = { ref, set, get, update, onValue, off, remove, onDisconnect, query, orderByChild, limitToLast, endAt, limitToFirst, db, uid: null, offset: 0 };
// how far this phone's clock is from the database's; shared timers are measured on the database clock
onValue(ref(db, '.info/serverTimeOffset'), (snap) => { window.FB.offset = Number(snap.val()) || 0; });
// the security rules identify players by their auth uid, so nothing goes
// online until an anonymous identity exists
onAuthStateChanged(auth, (user) => {
  if(!user) return;
  window.FB.uid = user.uid;
  window.__fbAuthError = null;
  if(!window.__fbReady){
    window.__fbReady = true;
    window.dispatchEvent(new Event('fb-ready'));
  }
});
signInAnonymously(auth).catch((err) => {
  window.__fbAuthError = (err && (err.code || err.message)) || 'unknown';
  console.error('Anonymous sign-in failed:', err);
});

// ---- Google account ----
// The player starts as an anonymous user. Signing in with Google LINKS that same user to the Google
// account, so the uid (rooms, daily scores, saved profile) stays the same. If the Google account was
// already used on another phone, we switch to it instead ("switched").
const googleProvider = new GoogleAuthProvider();
window.FB.account = {
  user: () => auth.currentUser,
  isGoogle: () => !!(auth.currentUser && !auth.currentUser.isAnonymous),
  displayName: () => (auth.currentUser && auth.currentUser.displayName) || '',
  async google(){
    const cur = auth.currentUser;
    try{
      await linkWithPopup(cur, googleProvider);
      return 'linked';
    }catch(e){
      if(e && e.code === 'auth/credential-already-in-use'){
        const cred = GoogleAuthProvider.credentialFromError(e);
        if(cred){ await signInWithCredential(auth, cred); return 'switched'; }
      }
      throw e;
    }
  },
  async signOut(){ await signOut(auth); await signInAnonymously(auth); },
};
