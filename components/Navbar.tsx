"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.push("/");
  }

  const navLink = (href: string, label: string) => (
    <Link href={href} className={`text-sm font-medium transition-colors ${pathname === href ? "text-green-400" : "text-gray-400 hover:text-white"}`}>
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-white flex items-center gap-2">
          🏆 <span className="hidden sm:inline">Prode Mundial 2026</span>
        </Link>

        <div className="flex items-center gap-6">
          {isAdmin && navLink("/admin", "Admin")}
          {isAdmin && navLink("/leaderboard", "Tabla")}
          {isAdmin && navLink("/dashboard/rules", "Reglas")}
        </div>

        <div className="flex items-center gap-3">
          {user?.photo ? (
            <img src={user.photo} alt={user.displayName} className="w-8 h-8 rounded-full object-cover border border-gray-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
              {user?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-sm text-gray-300 hidden sm:block">{user?.displayName}</span>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
