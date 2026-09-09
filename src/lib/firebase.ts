import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDCT4mwFa00zIsVnAvcH_VQrlMVniDPlbQ",
  authDomain: "servitrack-14905.firebaseapp.com",
  projectId: "servitrack-14905",
  storageBucket: "servitrack-14905.firebasestorage.app",
  messagingSenderId: "1003236741278",
  appId: "1:1003236741278:web:416d01de60d1dc05636b8f"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
