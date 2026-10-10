/** Project presentation only: never used by optimization or material accounting. */
export const STATUTS_MATIERE = {
  "a-commander": "À commander",
  commandee: "Commandée",
  disponible: "Matière déjà disponible",
} as const;

export interface StatutMatiere {
  statut: keyof typeof STATUTS_MATIERE;
  dateCommande: string;
  fournisseur: string;
  numeroCommande: string;
}

export function lireStatutMatiere(value?: unknown): StatutMatiere {
  const v = value && typeof value === "object" ? value as Partial<StatutMatiere> : {};
  return {
    statut: v.statut === "commandee" || v.statut === "disponible" ? v.statut : "a-commander",
    dateCommande: typeof v.dateCommande === "string" ? v.dateCommande : "",
    fournisseur: typeof v.fournisseur === "string" ? v.fournisseur : "",
    numeroCommande: typeof v.numeroCommande === "string" ? v.numeroCommande : "",
  };
}

export function libelleStatutMatiere(value: StatutMatiere): string {
  return value.statut === "commandee" ? "Barres commandées" : value.statut === "disponible" ? "Barres à prendre en stock" : "Barres à commander";
}

export function detailsCommande(value: StatutMatiere): string {
  if (value.statut !== "commandee") return "";
  const details: string[] = [];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.dateCommande);
  if (match) details.push(`commande du ${match[3]}/${match[2]}/${match[1]}`);
  if (value.fournisseur.trim()) details.push(value.fournisseur.trim());
  if (value.numeroCommande.trim()) details.push(`n° ${value.numeroCommande.trim()}`);
  return details.join(", ");
}