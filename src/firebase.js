import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAtLz84CPiG8oRYN4ivglf2eEXz81yA8o",
  authDomain: "cantinho-da-vit.firebaseapp.com",
  projectId: "cantinho-da-vit",
  storageBucket: "cantinho-da-vit.firebasestorage.app",
  messagingSenderId: "153927080521",
  appId: "1:153927080521:web:db068a3607a1de6687fd98",
  measurementId: "G-5ZZHSBG3RW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
