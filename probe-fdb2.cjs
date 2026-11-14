// Probe content DB (tiaralamal) accessibility — compare with chatweb-2e06a.
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

const cfg = {
    apiKey: "AIzaSyDp8KBaKHW3tTLZ_Cu75H_qFQBOiXuoVzk",
    authDomain: "tiaralamal.firebaseapp.com",
    databaseURL: "https://tiaralamal-default-rtdb.firebaseio.com",
    projectId: "tiaralamal",
    storageBucket: "tiaralamal.appspot.com",
    messagingSenderId: "1002825392926",
    appId: "1:1002825392926:web:7a9be96a344edd96b69f0f",
};

(async () => {
    const app = initializeApp(cfg, "probe2");
    const db = getDatabase(app);
    try {
        const snap = await get(ref(db, "posts"));
        console.log("READ tiaralamal posts OK, exists=", snap.exists());
    } catch (e) {
        console.log("READ tiaralamal posts FAILED:", e.code || "", e.message);
    }
    process.exit(0);
})();
