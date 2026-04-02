import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCvo-s3ZhDuthe_xW8ypv2IejYLWCLd4",
  authDomain: "cidademae-gestao.firebaseapp.com",
  projectId: "cidademae-gestao",
  storageBucket: "cidademae-gestao.firebasestorage.app",
  messagingSenderId: "366462510169",
  appId: "1:366462510169:web:ea6ee3e56dd2199843d48",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let secondaryApp;
try {
  secondaryApp = getApp("secondary");
} catch {
  secondaryApp = initializeApp(firebaseConfig, "secondary");
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);