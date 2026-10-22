
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBY_vabH407vCfILubS7FgdSmkJvFTqTv8",
  authDomain: "recorrido-19fb1.firebaseapp.com",
  projectId: "recorrido-19fb1",
  storageBucket: "recorrido-19fb1.firebasestorage.app",
  messagingSenderId: "400562975656",
  appId: "1:400562975656:web:971193d4bca82f6e22a39d",
  measurementId: "G-1NTWZH01BX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const iniciarSesionAnonima = () =>
    signInAnonymously(auth);
