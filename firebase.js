import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getDatabase, ref, set, get, update, onValue, off, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
  import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
  window.FB = { ref, set, get, update, onValue, off, remove, onDisconnect, db, uid: null };
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
