// Probe: does the RTDB honor auth-token-based rules? Try with a dummy auth token
// and with anonymous sign-in (if enabled). This tells us what auth state the
// backend client SDK would need.
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");
const { getAuth, signInAnonymously } = require("firebase/auth");

const cfg = {
    apiKey: "AIzaSyBWMBlurKyunm81JkOKNLFcQxAWtqXJWkg",
    authDomain: "chatweb-2e06a.firebaseapp.com",
    databaseURL: "https://chatweb-2e06a-default-rtdb.firebaseio.com",
    projectId: "chatweb-2e06a",
    storageBucket: "chatweb-2e06a.firebasestorage.app",
    messagingSenderId: "166944814017",
    appId: "1:166944814017:web:276cc29b64c7c68b4a3540",
};

(async () => {
    const app = initializeApp(cfg, "probe-auth");
    // 1) Try custom token placeholder (will fail signature but shows rules behavior)
    const db = getDatabase(app);
    try {
        const snap = await get(ref(db, "user_data/Profile"));
        console.log("no-auth read OK, exists=", snap.exists());
    } catch (e) {
        console.log("no-auth read:", e.code || e.message);
    }
    // 2) Anonymous auth
    try {
        const auth = getAuth(app);
        const cred = await signInAnonymously(auth);
        console.log("anon sign-in OK uid=", cred.user.uid);
        const snap = await get(ref(db, "user_data/Profile"));
        console.log("anon read OK, exists=", snap.exists());
    } catch (e) {
        console.log("anon:", e.code || e.message);
    }
    process.exit(0);
})();
