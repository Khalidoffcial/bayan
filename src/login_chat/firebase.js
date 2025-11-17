// src/login_chat/firebase.js  ← خليه .js أو .jsx براحتك

import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  child,
  push,
  query,
  equalTo,
  orderByChild
} from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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

// التسمية دي صح لأن عندك أكثر من تطبيق
const contentApp = initializeApp(firebaseConfig, "contentApp");

// Realtime DB
export const db = getDatabase(contentApp);

// Storage
export const storage = getStorage(contentApp);

// Auth & Google Login
export const auth = getAuth(contentApp);
export const googleProvider = new GoogleAuthProvider();
