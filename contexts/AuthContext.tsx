"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface AuthUser {
  uid: string;
  username: string;
  displayName: string;
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
    const email = `${username.toLowerCase()}@prode.app`;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description || err.msg || `Error ${res.status}`);
    }

    const data = await res.json();
    const uid = data.user?.id;
    if (!uid) throw new Error("No se recibio ID de usuario");

    const { data: profile } = await supabase
      .from("users")
      .select("display_name")
      .eq("uid", uid)
      .single();

    const authUser: AuthUser = {
      uid,
      username,
      displayName: profile?.display_name ?? username,
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
