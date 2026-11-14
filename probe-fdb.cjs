// Probe production Firebase RTDB accessibility (same config the backend uses).
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

const firebaseConfig = {
    apiKey: "AIzaSyBWMBlurKyunm81JkOKNLFcQxAWtqXJWkg",
    authDomain: "chatweb-2e06a.firebaseapp.com",
    databaseURL: "https://chatweb-2e06a-default-rtdb.firebaseio.com",
    projectId: "chatweb-2e06a",
    storageBucket: "chatweb-2e06a.firebasestorage.app",
    messagingSenderId: "166944814017",
    appId: "1:166944814017:web:276cc29b64c7c68b4a3540",
};

(async () => {
    const app = initializeApp(firebaseConfig, "probe");
    const db = getDatabase(app);
    try {
        const snap = await get(ref(db, "user_data/Profile"));
        console.log("READ user_data/Profile OK, exists=", snap.exists(), "keys=", snap.exists() ? Object.keys(snap.val()).length : 0);
    } catch (e) {
        console.log("READ user_data/Profile FAILED:", e.code || "", e.message);
    }
    try {
        const snap = await get(ref(db, "user_data/AudioHub"));
        console.log("READ user_data/AudioHub OK, exists=", snap.exists());
    } catch (e) {
        console.log("READ user_data/AudioHub FAILED:", e.code || "", e.message);
    }
    process.exit(0);
})();
