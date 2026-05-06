import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Reemplaza esto con tu configuración de Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBFHZT8_ACLpYHZoW9tUapGBcsBO5XyWME",
  authDomain: "soma-os.firebaseapp.com",
  projectId: "soma-os",
  storageBucket: "soma-os.firebasestorage.app",
  messagingSenderId: "528998219351",
  appId: "1:528998219351:web:602601440bea9a7b58ad12"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);