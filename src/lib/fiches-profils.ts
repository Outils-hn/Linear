// Fiche technique Index liee a chaque profile (par son nom), retenue sur ce poste
// pour tous les projets : « Profilé Z 40 » garde sa fiche d'un chantier a l'autre.
import { useCallback, useEffect, useState } from "react";
import type { FicheRef } from "./index-fiches";

const KEY = "linear:fiches-index:v1";
type Carte = Record<string, FicheRef>;

function lire(): Carte {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as Carte; } catch { return {}; }
}

export function useFichesProfils() {
  const [carte, setCarte] = useState<Carte>({});
  useEffect(() => setCarte(lire()), []);
  const lier = useCallback((profil: string, fiche: FicheRef | null) => {
    setCarte((c) => {
      const n = { ...c };
      if (fiche) n[profil] = fiche; else delete n[profil];
      try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* stockage bloque */ }
      return n;
    });
  }, []);
  return { carte, lier };
}
