import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
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

const app = getApps().find(a => a.name === "[DEFAULT]") || initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
