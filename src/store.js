import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const COLLECTION = "vitData";

export const store = {
  async get(key) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, key));
      return snap.exists() ? snap.data().value : null;
    } catch (e) {
      console.error("Firestore get error:", e);
      return null;
    }
  },
  async set(key, val) {
    try {
      await setDoc(doc(db, COLLECTION, key), { value: val, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error("Firestore set error:", e);
    }
  },
};
