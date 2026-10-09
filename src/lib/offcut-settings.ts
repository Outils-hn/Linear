import type { BarreOptimisee } from "./optimizer";
import type { LigneChute, ChutesProfil } from "./chutes";

export type ModeChutesPDF = "none" | "indicative" | "instruction";
export interface ChoixChute { conserver: boolean; note: string }
export interface OptionsChutesPDF {
  mode: ModeChutesPDF;
  etiquettes: boolean;
  choix: Record<string, ChoixChute>;
}
export const MODES_CHUTES: Record<ModeChutesPDF, string> = {
  none: "Ne pas afficher",
  indicative: "Chutes conservables (indicatif)",
  instruction: "Chutes à conserver (consigne)",
};
export const optionsChutesDefaut = (): OptionsChutesPDF => ({ mode: "indicative", etiquettes: false, choix: {} });
// Keys follow the existing profile/length recap rows, not transient bar numbers.
export const cleChute = (profil: string | undefined, longueur: number) => JSON.stringify([(profil ?? "").trim(), longueur]);
export function choixChute(options: OptionsChutesPDF, chute: Pick<LigneChute, "profil" | "longueur">): ChoixChute {
  return options.choix[cleChute(chute.profil, chute.longueur)] ?? { conserver: true, note: "" };
}
export function choixBarre(options: OptionsChutesPDF, barre: BarreOptimisee): ChoixChute {
  return choixChute(options, { profil: barre.profil ?? "", longueur: barre.chute });
}
export function chutesSelectionnees(groupes: ChutesProfil[], options: OptionsChutesPDF): ChutesProfil[] {
  return groupes.map(g => {
    const lignes = g.lignes.filter(l => choixChute(options, l).conserver);
    return { ...g, lignes, totalMm: lignes.reduce((s, l) => s + l.longueur * l.quantite, 0) };
  }).filter(g => g.lignes.length > 0);
}
export function lireOptionsChutes(value: unknown): OptionsChutesPDF {
  const defaults = optionsChutesDefaut();
  if (!value || typeof value !== "object") return defaults;
  const v = value as Partial<OptionsChutesPDF>;
  const choix: Record<string, ChoixChute> = {};
  if (v.choix && typeof v.choix === "object") {
    for (const [key, c] of Object.entries(v.choix)) {
      if (c && typeof c === "object") choix[key] = { conserver: c.conserver !== false, note: typeof c.note === "string" ? c.note : "" };
    }
  }
  return { mode: v.mode === "none" || v.mode === "instruction" ? v.mode : "indicative", etiquettes: v.etiquettes === true, choix };
}