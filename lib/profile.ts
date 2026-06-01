export interface UserProfile {
  nombre: string;
  apellido: string;
  apodo: string;
  edad: string;
  altura: string;
  sector: string;
  grupos?: string[];   // multiple groups
  grupo?: string;      // legacy single group (backward compat)
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

// Returns all groups a user belongs to (supports both legacy and new format)
export function getGrupos(displayName: string): string[] {
  try {
    const p = JSON.parse(displayName);
    if (Array.isArray(p.grupos) && p.grupos.length > 0) return p.grupos;
    if (p.grupo) return [p.grupo];
  } catch {}
  return [];
}

// Legacy: returns first group (or undefined)
export function getGrupo(displayName: string): string | undefined {
  return getGrupos(displayName)[0];
}

export function getPhoto(displayName: string): string | undefined {
  return parseProfile(displayName)?.photo;
}
