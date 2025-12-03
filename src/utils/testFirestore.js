// src/utils/testFirestore.js - Test koneksi manual
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const testFirestoreConnection = async (uid) => {
  try {
    console.log("🧪 TESTING FIRESTORE CONNECTION...");
    console.log("🎯 UID:", uid);
    
    const userRef = doc(db, "users", uid);
    console.log("📄 Document reference created");
    
    const snap = await getDoc(userRef);
    console.log("✅ Document fetched, exists:", snap.exists());
    
    if (snap.exists()) {
      const data = snap.data();
      console.log("📊 DATA:", data);
      return data;
    } else {
      console.log("❌ Document does not exist");
      return null;
    }
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    return null;
  }
};