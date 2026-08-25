import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from 'firebase/storage';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDp8KBaKHW3tTLZ_Cu75H_qFQBOiXuoVzk",
  authDomain: "tiaralamal.firebaseapp.com",
  databaseURL: "https://tiaralamal-default-rtdb.firebaseio.com",
  projectId: "tiaralamal",
  storageBucket: "tiaralamal.appspot.com",
  messagingSenderId: "1002825392926",
  appId: "1:1002825392926:web:7a9be96a344edd96b69f0f",
  measurementId: "G-9FEE4TMD5S"
};

const storageApp = getApps().find(a => a.name === "storageApp")
  || initializeApp(firebaseConfig, "storageApp");

export const database = getDatabase(storageApp);
export const storage = getStorage(storageApp);
export const auth = getAuth(storageApp);
