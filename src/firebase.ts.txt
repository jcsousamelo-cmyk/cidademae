import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCvo-s3ZhDuthe_xW8ypv2IejYLWCLd4",
  authDomain: "cidademae-gestao.firebaseapp.com",
  projectId: "cidademae-gestao",
  storageBucket: "cidademae-gestao.firebasestorage.app",
  messagingSenderId: "366462510169",
  appId: "1:366462510169:web:ea6ee3e56dd2199843d48",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);