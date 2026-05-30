"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { buildCard } from "@/lib/buildCard";

export default function ProfilePage() {
  const { user, loading, completeProfile } = useAuth();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [apodo, setApodo] = useState("");
  const [edad, setEdad] = useState("");
  const [altura, setAltura] = useState("");
  const [sector, setSector] = useState<"Administración" | "Taller" | "">("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [cardPreview, setCardPreview] = useState("");
  const [cardReady, setCardReady] = useState(false);
  const [compositing, setCompositing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user?.profileCompleted) router.push("/dashboard");
  }, [user, loading, router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setCardPreview("");
    setCardReady(false);
  }

  useEffect(() => {
    if (!photoPreview) return;
    setCompositing(true);
    const t = setTimeout(async () => {
      try {
        const blob = await buildCard(photoPreview, apellido, nombre, edad, altura, sector);
        setCardPreview(URL.createObjectURL(blob));
        setCardReady(true);
      } catch {
        setCardReady(false);
      } finally {
        setCompositing(false);
      }
    }, 600);
    return () => { clearTimeout(t); setCompositing(false); };
  }, [photoPreview, apellido, nombre, edad, altura, sector]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sector) { setError("Elegí un sector"); return; }
    if (!newPassword) { setError("Tenés que elegir una contraseña nueva"); return; }
    if (newPassword.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      let photoUrl: string | undefined;
      if (photoPreview) {
        let uploadBlob: Blob;
        try { uploadBlob = await buildCard(photoPreview, apellido, nombre, edad, altura, sector); }
        catch { uploadBlob = photoFile!; }
        const fd = new FormData();
        fd.append("file", new File([uploadBlob], "avatar.jpg", { type: "image/jpeg" }));
        fd.append("uid", user.uid);
        const up = await fetch("/api/profile/avatar", { method: "POST", body: fd });
        if (up.ok) { const { url } = await up.json(); photoUrl = url; }
      }
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, nombre, apellido, apodo, edad, altura, sector, photo: photoUrl, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");
      completeProfile(apodo, photoUrl);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  const displaySrc = cardReady ? cardPreview : photoPreview;
  const isCard = cardReady && !compositing;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white mb-1">Completá tu perfil</h1>
          <p className="text-gray-400 text-sm">Antes de empezar a pronosticar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2 mb-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
              {displaySrc ? (
                <div className={`relative overflow-hidden border-2 border-green-600 shadow-lg transition-all duration-300 ${isCard ? "w-44 h-60 rounded-xl" : "w-28 h-28 rounded-full"}`}>
                  <img src={displaySrc} alt="preview" className="w-full h-full object-cover" />
                  {compositing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-green-400" /></div>}
                  <div className="absolute bottom-1 right-1 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity">✎</div>
                </div>
              ) : (
                <div className="relative w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 group-hover:border-green-500 flex items-center justify-center transition-colors">
                  <div className="text-center"><div className="text-3xl">📷</div><div className="text-xs text-gray-500 mt-1">Tu foto</div></div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-sm shadow">+</div>
                </div>
              )}
            </button>
            {isCard && <p className="text-xs text-green-400">Tu figurita del Mundial 🃏</p>}
            {compositing && photoPreview && <p className="text-xs text-gray-500">Generando figurita...</p>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Nombre" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
            <input type="text" value={apellido} onChange={e => setApellido(e.target.value)} required placeholder="Apellido" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
          </div>
          <input type="text" value={apodo} onChange={e => setApodo(e.target.value)} required placeholder="Apodo (se muestra en el ranking)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={edad} onChange={e => setEdad(e.target.value)} required min={1} max={99} placeholder="Edad" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
            <input type="text" value={altura} onChange={e => setAltura(e.target.value)} placeholder="Altura (ej: 1.74)" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Contraseña nueva" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirmar contraseña" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2 font-medium">Sector</p>
            <div className="grid grid-cols-2 gap-3">
              {(["Administración", "Taller"] as const).map(s => (
                <button key={s} type="button" onClick={() => setSector(s)} className={`py-4 rounded-xl font-semibold text-sm border-2 transition-all ${sector === s ? "bg-green-600 border-green-500 text-white scale-[1.02]" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                  {s === "Administración" ? "🏢 Administración" : "🔧 Taller"}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-base mt-2">
            {saving ? "Guardando..." : "Guardar y entrar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
