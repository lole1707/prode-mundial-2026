export interface UserProfile {
  nombre: string;
  apellido: string;
  apodo: string;
  edad: string;
  altura: string;
  sector: string;
  grupo?: string;
  photo?: string;
}

export function parseProfile(displayName: string): UserProfile | null {
  try {
    const p = JSON.parse(displayName);
    if (p.nombre && p.apellido && p.apodo && p.edad && p.sector) return { altura: "", ...p } as UserProfile;
  } catch {}
  return null;
}

export function getDisplayName(displayName: string): string {
  const profile = parseProfile(displayName);
  if (profile) return profile.apodo;
  // Pre-profile state: admin created with { grupo, _name }
  try {
    const p = JSON.parse(displayName);
    if (p._name) return p._name;
  } catch {}
  return displayName;
}

export function getGrupo(displayName: string): string | undefined {
  try {
    const p = JSON.parse(displayName);
    return p.grupo ?? undefined;
  } catch { return undefined; }
}

export function getPhoto(displayName: string): string | undefined {
  return parseProfile(displayName)?.photo;
}
