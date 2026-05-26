const { initializeApp, getApps, getApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");
const { getDatabase, ref, set, get, update, child, push, query, equalTo, orderByChild, limitToLast, limitToFirst,runTransaction } = require('firebase/database');

// import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const firebaseconfig = {
    apiKey: "AIzaSyDp8KBaKHW3tTLZ_Cu75H_qFQBOiXuoVzk",
    authDomain: "tiaralamal.firebaseapp.com",
    databaseURL: "https://tiaralamal-default-rtdb.firebaseio.com",
    projectId: "tiaralamal",
    storageBucket: "tiaralamal.appspot.com",
    messagingSenderId: "1002825392926",
    appId: "1:1002825392926:web:7a9be96a344edd96b69f0f",
    measurementId: "G-9FEE4TMD5S"
}
const authApp = initializeApp(firebaseconfig, "authApp");
const db = getDatabase(authApp)
const storage = getStorage(authApp);
// const auth = getAuth(app);

module.exports = { db, storage, ref, set, get, update, child, push, query, equalTo, orderByChild, limitToLast, limitToFirst,runTransaction };