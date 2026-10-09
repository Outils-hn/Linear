// Sauvegarde / restauration .json des projets (format versionné).
import type { LocalProject } from "./local-store";
import { lireOptionsChutes } from "./offcut-settings";

export const FORMAT_VERSION = 1;

export interface FichierProjet {
  format: "linear-projet";
  version: number;
  exporte_le: string;
  projet: LocalProject;
}
export interface FichierSauvegarde {
  format: "linear-sauvegarde";
  version: number;
  exporte_le: string;
  projets: LocalProject[];
}

const date = () => new Date().toISOString().slice(0, 10);
const propre = (s: string) => s.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_") || "Projet";

function telecharger(nom: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exporterProjetJson(p: LocalProject) {
  const f: FichierProjet = { format: "linear-projet", version: FORMAT_VERSION, exporte_le: new Date().toISOString(), projet: p };
  telecharger(`Linear_${propre(p.chantier)}_${date()}.json`, f);
}

export function exporterTousJson(projets: LocalProject[]) {
  const f: FichierSauvegarde = { format: "linear-sauvegarde", version: FORMAT_VERSION, exporte_le: new Date().toISOString(), projets };
  telecharger(`Linear_sauvegarde_${date()}.json`, f);
}

function valide(p: unknown): p is LocalProject {
  const o = p as LocalProject;
  return !!o && typeof o === "object" && Array.isArray(o.pieces) && typeof o.longueur_barre === "number";
}

/** Lit un fichier projet ou sauvegarde ; lève une erreur lisible sinon. */
export function lireJson(texte: string): LocalProject[] {
  let data: unknown;
  try {
    data = JSON.parse(texte);
  } catch {
    throw new Error("Fichier illisible (JSON invalide)");
  }
  const d = data as { format?: string; version?: number; projet?: unknown; projets?: unknown };
  if (typeof d.version === "number" && d.version > FORMAT_VERSION)
    throw new Error(`Fichier créé par une version plus récente (format ${d.version})`);
  let liste: unknown[];
  if (d.format === "linear-projet") liste = [d.projet];
  else if (d.format === "linear-sauvegarde" && Array.isArray(d.projets)) liste = d.projets;
  else throw new Error("Ce fichier n'est pas une sauvegarde Linear");
  const ok = liste.filter(valide);
  if (ok.length === 0) throw new Error("Aucun projet valide dans le fichier");
  return ok.map((p) => ({ ...p, stock: Array.isArray(p.stock) ? p.stock : [], chantier: p.chantier ?? "", chutes_pdf: lireOptionsChutes(p.chutes_pdf) }));
}
