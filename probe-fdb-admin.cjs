// Probe whether the Admin SDK (env credentials, as on Railway) can read the user DB.
const admin = require("firebase-admin");

(async () => {
    let credential = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        credential = admin.credential.cert(svc);
        console.log("using FIREBASE_SERVICE_ACCOUNT_JSON");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        credential = admin.credential.applicationDefault();
        console.log("using GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
        console.log("NO ADMIN CREDENTIALS in env — cannot probe admin path");
        process.exit(0);
    }
    const app = admin.initializeApp({
        credential,
        databaseURL: "https://chatweb-2e06a-default-rtdb.firebaseio.com",
    }, "probe-admin");
    const rdb = admin.database(app);
    try {
        const snap = await rdb.ref("user_data/Profile").limitToFirst(1).get();
        console.log("ADMIN READ user_data/Profile OK, exists=", snap.exists());
    } catch (e) {
        console.log("ADMIN READ Profile FAILED:", e.code || "", e.message);
    }
    try {
        const snap = await rdb.ref("user_data/AudioHub").limitToFirst(1).get();
        console.log("ADMIN READ user_data/AudioHub OK, exists=", snap.exists());
    } catch (e) {
        console.log("ADMIN READ AudioHub FAILED:", e.code || "", e.message);
    }
    process.exit(0);
})();
