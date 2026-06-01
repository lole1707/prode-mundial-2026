"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildCard, PhotoTransform } from "@/lib/buildCard";
import PhotoPositioner from "@/components/PhotoPositioner";
import { UserProfile } from "@/lib/profile";

interface Props {
  current: UserProfile;
  onClose: () => void;
  onSaved: (apodo: string, photo?: string) => void;
}

const INPUT = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm";

export default function EditProfileModal({ current, onClose, onSaved }: Props) {
  const { user } = useAuth();

  const [nombre, setNombre] = useState(current.nombre);
  const [apellido, setApellido] = useState(current.apellido);
  const [apodo, setApodo] = useState(current.apodo);
  const [edad, setEdad] = useState(current.edad);
  const [altura, setAltura] = useState(current.altura ?? "");
  const [sector, setSector] = useState<"Administración" | "Taller" | "">(current.sector as "Administración" | "Taller" | "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(current.photo ?? "");
  const [photoTransform, setPhotoTransform] = useState<PhotoTransform | undefined>();
  const [positioning, setPositioning] = useState(false);
  const [cardPreview, setCardPreview] = useState("");
  const [cardReady, setCardReady] = useState(false);
  const [compositing, setCompositing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Rebuild card preview on field changes
  useEffect(() => {
    if (!photoPreview || positioning) return;
    setCompositing(true);
    const t = setTimeout(async () => {
      try {
        const blob = await buildCard(photoPreview, apellido, nombre, edad, altura, sector, photoTransform);
        setCardPreview(URL.createObjectURL(blob));
        setCardReady(true);
      } catch {
        setCardReady(false);
      } finally {
        setCompositing(false);
      }
    }, 600);
    return () => { clearTimeout(t); setCompositing(false); };
  }, [photoPreview, apellido, nombre, edad, altura, sector, photoTransform, positioning]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setCardPreview("");
    setCardReady(false);
    setPhotoTransform(undefined);
    setPositioning(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isProwork = current.grupo === "Prowork";
    if (isProwork && !sector) { setError("Elegí un sector"); return; }
    if (newPassword && newPassword.length < 4) { setError("La contraseña debe tener al menos 4 caracteres"); return; }
    if (newPassword && newPassword !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      let photoUrl: string | undefined = current.photo;

      // Upload photo if: new file selected OR existing photo was repositioned
      if (photoFile || (photoTransform && photoPreview)) {
        let uploadBlob: Blob;
        try {
          uploadBlob = await buildCard(photoPreview, apellido, nombre, edad, altura, sector, photoTransform);
        } catch {
          uploadBlob = photoFile ?? new Blob(); // fallback
        }
        if (uploadBlob.size > 0) {
          const fd = new FormData();
          fd.append("file", new File([uploadBlob], "avatar.jpg", { type: "image/jpeg" }));
          fd.append("uid", user.uid);
          const up = await fetch("/api/profile/avatar", { method: "POST", body: fd });
          if (up.ok) { const { url } = await up.json(); photoUrl = url; }
        }
      }

      const body: Record<string, string> = { uid: user.uid, nombre, apellido, apodo, edad, altura, sector };
      if (photoUrl) body.photo = photoUrl;
      if (newPassword) body.newPassword = newPassword;

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");

      onSaved(apodo, photoUrl);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const displaySrc = cardReady ? cardPreview : photoPreview;
  const isCard = cardReady && !compositing;

  if (positioning && photoPreview) {
    return (
      <PhotoPositioner
        photoSrc={photoPreview}
        onConfirm={(t) => {
          setPhotoTransform(t);
          setPositioning(false);
          setCompositing(true);
          buildCard(photoPreview, apellido, nombre, edad, altura, sector, t)
            .then(blob => { setCardPreview(URL.createObjectURL(blob)); setCardReady(true); })
            .catch(() => setCardReady(false))
            .finally(() => setCompositing(false));
        }}
        onCancel={() => setPositioning(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Editar perfil</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
              {displaySrc ? (
                <div className={`relative overflow-hidden border-2 border-green-600 shadow-lg transition-all duration-300 ${isCard ? "w-40 h-56 rounded-xl" : "w-24 h-24 rounded-full"}`}>
                  <img src={displaySrc} alt="preview" className="w-full h-full object-cover" />
                  {compositing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-green-400" /></div>}
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity">✎</div>
                </div>
              ) : (
                <div className="relative w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 group-hover:border-green-500 flex items-center justify-center transition-colors">
                  <div className="text-center"><div className="text-2xl">📷</div><div className="text-xs text-gray-500 mt-1">Foto</div></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs shadow">+</div>
                </div>
              )}
            </button>
            {isCard && <p className="text-xs text-green-400">Figurita actualizada 🃏</p>}
            {compositing && <p className="text-xs text-gray-500">Generando figurita...</p>}
            {photoPreview && !compositing && (
              <button type="button" onClick={() => setPositioning(true)} className="text-xs text-gray-400 hover:text-white underline">
                Ajustar posición
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Nombre" className={INPUT} />
            <input type="text" value={apellido} onChange={e => setApellido(e.target.value)} required placeholder="Apellido" className={INPUT} />
          </div>

          <input type="text" value={apodo} onChange={e => setApodo(e.target.value)} required placeholder="Apodo" className={INPUT} />

          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={edad} onChange={e => setEdad(e.target.value)} required min={1} max={99} placeholder="Edad" className={INPUT} />
            <input type="text" value={altura} onChange={e => setAltura(e.target.value)} placeholder="Altura (ej: 1.74)" className={INPUT} />
          </div>

          {current.grupo === "Prowork" && (
          <div>
            <p className="text-sm text-gray-400 mb-2">Sector</p>
            <div className="grid grid-cols-2 gap-3">
              {(["Administración", "Taller"] as const).map(s => (
                <button key={s} type="button" onClick={() => setSector(s)}
                  className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${sector === s ? "bg-green-600 border-green-500 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                  {s === "Administración" ? "🏢 Administración" : "🔧 Taller"}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Optional password change */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-sm text-gray-400 mb-2">Cambiar contraseña <span className="text-gray-600 text-xs">(opcional)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nueva contraseña" className={INPUT} />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar" className={INPUT} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition-colors text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
