import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "COLE_A_APIKEY_DA_TELA",
  authDomain: "COLE_O_AUTHDOMAIN_DA_TELA",
  projectId: "COLE_O_PROJECTID_DA_TELA",
  storageBucket: "COLE_O_STORAGEBUCKET_DA_TELA",
  messagingSenderId: "COLE_O_MESSAGINGSENDERID_DA_TELA",
  appId: "COLE_O_APPID_DA_TELA",
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