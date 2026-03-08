import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyC_lbg1D0o7DYt-7dVIXVqhsA5SxJRBn1Y",
  authDomain: "medxpress-45c36.firebaseapp.com",
  projectId: "medxpress-45c36",
  storageBucket: "medxpress-45c36.firebasestorage.app",
  messagingSenderId: "224764969217",
  appId: "1:224764969217:web:79986dc959c8d74060db00"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
