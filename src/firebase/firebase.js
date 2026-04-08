import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbVzVtw3agOWzRz3HljRbuPrPbps3oeeQ",
  authDomain: "dhyan-attendance.firebaseapp.com",
  projectId: "dhyan-attendance",
  storageBucket: "dhyan-attendance.firebasestorage.app",
  messagingSenderId: "52807826777",
  appId: "1:52807826777:web:c8b27788b71f8990dea048"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Secondary app — for creating users without logging out admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);