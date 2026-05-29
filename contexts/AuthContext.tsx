"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface AuthUser {
  uid: string;
  username: string;
  displayName: string;
  profileCompleted: boolean;
  photo?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  completeProfile: (apodo: string, photo?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseDisplayName(raw: string): { displayName: string; profileCompleted: boolean; photo?: string } {
  try {
    const p = JSON.parse(raw);
    if (p.nombre && p.apellido && p.apodo && p.edad && p.sector) {
      return { displayName: p.apodo, profileCompleted: true, photo: p.photo };
    }
  } catch {}
  return { displayName: raw, profileCompleted: false };
}

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
    const email = `${username.toLowerCase()}@prode.app`;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description || err.msg || `Error ${res.status}`);
    }

    const data = await res.json();
    const uid = data.user?.id;
    if (!uid) throw new Error("No se recibio ID de usuario");

    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/users?uid=eq.${uid}&select=display_name`,
      { headers: { "apikey": supabaseKey } }
    );
    const profiles = profileRes.ok ? await profileRes.json() : [];
    const raw: string = profiles?.[0]?.display_name ?? username;

    const { displayName, profileCompleted, photo } = parseDisplayName(raw);
    const authUser: AuthUser = { uid, username, displayName, profileCompleted, photo };
    localStorage.setItem("prode_user", JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("prode_user");
    setUser(null);
  };

  const completeProfile = (apodo: string, photo?: string) => {
    if (!user) return;
    const updated: AuthUser = { ...user, displayName: apodo, profileCompleted: true, photo };
    localStorage.setItem("prode_user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, completeProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
