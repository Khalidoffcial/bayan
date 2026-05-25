// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");
const { getDatabase, ref, set, get, update, child, push, query, equalTo, orderByChild } = require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyBWMBlurKyunm81JkOKNLFcQxAWtqXJWkg",
    authDomain: "chatweb-2e06a.firebaseapp.com",
    databaseURL: "https://chatweb-2e06a-default-rtdb.firebaseio.com",
    projectId: "chatweb-2e06a",
    storageBucket: "chatweb-2e06a.firebasestorage.app",
    messagingSenderId: "166944814017",
    appId: "1:166944814017:web:276cc29b64c7c68b4a3540",
    measurementId: "G-PLBHJ8PNR5"
};

const contentApp = initializeApp(firebaseConfig, "contentApp");
const storage = getStorage(contentApp);
const db = getDatabase(contentApp);

module.exports = { db, storage, ref, set, get, update, child, push, query, equalTo, orderByChild };