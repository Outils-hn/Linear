// Local-only storage for profiles + projects.
// Everything lives in localStorage; no network calls.

import type { Piece, StockBarre } from "./optimizer";

const PROFILES_KEY = "linear:profiles:v1";
const PROJECTS_KEY = (profileId: string) => `linear:projects:v1:${profileId}`;

export interface ProfileMeta {
  id: string; // also the display name
  name: string;
  projectCount: number;
  createdAt: string;
}

export interface LocalProject {
  id: string;
  chantier: string;
  numero_tache: string;
  client: string;
  date_projet: string;
  longueur_barre: number;
  marge_securite: number;
  trait_scie: number;
  strategie: string;
  pieces: Piece[];
  stock: StockBarre[];
  created_at: string;
  updated_at: string;
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[local-store] write failed", e);
  }
}

interface ProfilesFile {
  profiles: { id: string; name: string; createdAt: string }[];
}

function readProfilesFile(): ProfilesFile {
  return safeRead<ProfilesFile>(PROFILES_KEY, { profiles: [] });
}

function writeProfilesFile(file: ProfilesFile) {
  safeWrite(PROFILES_KEY, file);
}

export function listProfiles(): ProfileMeta[] {
  const file = readProfilesFile();
  return file.profiles.map((p) => ({
    ...p,
    projectCount: listProjects(p.id).length,
  }));
}

export function ensureProfile(name: string): string {
  const id = name.trim();
  if (!id) throw new Error("Nom de profil vide");
  const file = readProfilesFile();
  if (!file.profiles.find((p) => p.id === id)) {
    file.profiles.push({ id, name: id, createdAt: new Date().toISOString() });
    writeProfilesFile(file);
  }
  return id;
}

export function deleteProfile(id: string) {
  const file = readProfilesFile();
  file.profiles = file.profiles.filter((p) => p.id !== id);
  writeProfilesFile(file);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(PROJECTS_KEY(id));
    } catch {
      // ignore
    }
  }
}

export function listProjects(profileId: string): LocalProject[] {
  const list = safeRead<LocalProject[]>(PROJECTS_KEY(profileId), []);
  return [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function writeProjects(profileId: string, projects: LocalProject[]) {
  safeWrite(PROJECTS_KEY(profileId), projects);
}

function uid() {
  return `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertProject(
  profileId: string,
  project: Omit<LocalProject, "id" | "created_at" | "updated_at"> & {
    id?: string | null;
  },
): LocalProject {
  const projects = listProjects(profileId);
  const now = new Date().toISOString();
  if (project.id) {
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      const updated: LocalProject = {
        ...projects[idx],
        ...project,
        id: project.id,
        updated_at: now,
      };
      projects[idx] = updated;
      writeProjects(profileId, projects);
      return updated;
    }
  }
  const created: LocalProject = {
    ...project,
    id: project.id ?? uid(),
    created_at: now,
    updated_at: now,
  };
  projects.unshift(created);
  writeProjects(profileId, projects);
  return created;
}

export function deleteProject(profileId: string, projectId: string) {
  const projects = listProjects(profileId).filter((p) => p.id !== projectId);
  writeProjects(profileId, projects);
}

const ACTIVE_KEY = "linear:active-profile:v1";

export function getActiveProfile(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfile(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // ignore
  }
}
