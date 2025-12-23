// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection,
  query, 
  where, 
  getDocs,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log("🔄 Auth state changed:", user?.email);

    if (!user) {
      setCurrentUser(null);
      setUserData(null);
      setLoading(false);
      return;
    }

    setCurrentUser(user);

    try {
      let userData = null;

      // 1️⃣ Coba ambil user by UID
      const userDocRef = doc(db, "users", user.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        userData = snap.data();
        console.log(`✅ ${user.email} found by UID`);
      } else {
        // 2️⃣ Fallback: query by email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data();
          console.log(`✅ ${user.email} found by email query`);
        }
      }

      // 🚨 TIDAK ADA DATA USER → LOGOUT
      if (!userData) {
        console.log(`❌ No user data for ${user.email}, force logout`);
        await signOut(auth);
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      // 🚫 USER NON-AKTIF → BLOKIR LOGIN
      if (userData.status !== 'active') {
        console.warn(`🚫 ${user.email} is INACTIVE, force logout`);
        alert('Akun Anda telah dinonaktifkan. Hubungi administrator.');
        await signOut(auth);
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      // 3️⃣ Normalize role (LOGIC LAMA TETAP)
      const role = userData.role?.toString().trim().toUpperCase();
      const allowedRoles = [
        'STAFF',
        'RISK_OWNER',
        'RISK_MANAGER',
        'DIRECTOR',
        'ADMIN'
      ];
      const normalizedRole = allowedRoles.includes(role) ? role : 'STAFF';

      setUserData({
        ...userData,
        uid: user.uid,
        role: normalizedRole
      });

      console.log(`🎯 ${user.email} role: ${normalizedRole}`);

    } catch (error) {
      console.error("Auth error:", error);
      setUserData(null);
    }

    setLoading(false);
  });

  return unsubscribe;
}, []);


  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};