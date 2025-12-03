// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';


// TEMPORARY CONFIG - nanti diganti dengan config asli dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyApdO8p_K5pmA8P3pqJo-IibwTeZBf5MEE",
  authDomain: "erm-oeka.firebaseapp.com",
  projectId: "erm-oeka",
  storageBucket: "erm-oeka.firebasestorage.app",
  messagingSenderId: "132980696352",
  appId: "1:132980696352:web:ecc7b45f4996bf5c51e345",
  measurementId: "G-WZ7CWNEQ0C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Pastikan ini ada



export default app;