"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  idToken: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

  useEffect(() => {
    const stored = localStorage.getItem("prode_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem("prode_user"); }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const email = username.includes("@") ? username : `${username}@prode.app`;

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Credenciales incorrectas");

    // Buscar displayName en Firestore
    let displayName = data.displayName || username;
    try {
      const snap = await getDoc(doc(db, "users", data.localId));
      if (snap.exists()) displayName = snap.data().displayName ?? displayName;
    } catch { /* sin conexión a Firestore, usar lo que trajo auth */ }

    const authUser: AuthUser = {
      uid: data.localId,
      email: data.email,
      displayName,
      idToken: data.idToken,
    };

    localStorage.setItem("prode_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("prode_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
