/// <reference lib="webworker" />
// Calcul de la mise en barre dans un fil separe : l'ecran reste fluide pendant l'optimisation.
import { optimiserParProfil } from "./multi-profil";

self.onmessage = (e: MessageEvent<Parameters<typeof optimiserParProfil>>) => {
  try {
    self.postMessage({ ok: true, resultat: optimiserParProfil(...e.data) });
  } catch (err) {
    self.postMessage({ ok: false, erreur: String(err) });
  }
};
