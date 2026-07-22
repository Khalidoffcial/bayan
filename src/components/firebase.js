import {initializeApp } from "firebase/app";
import {getDatabase } from "firebase/database";
import { getStorage } from 'firebase/storage';
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

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
const app = initializeApp(firebaseconfig);
const database = getDatabase(app)
const storage = getStorage(app);
const auth = getAuth(app);

console.log(database);
export {database ,storage,auth};