// Lance optimiserParProfil dans un Web Worker (ecran fluide, bouton « en cours » visible).
// Si le navigateur refuse le worker, le calcul se fait comme avant, sur le fil principal.
import { optimiserParProfil, type ResultatMulti } from "./multi-profil";

type Args = Parameters<typeof optimiserParProfil>;

export function optimiserEnArrierePlan(...args: Args): Promise<ResultatMulti> {
  let w: Worker;
  try {
    w = new Worker(new URL("./optimiseur-worker.ts", import.meta.url), { type: "module" });
  } catch {
    return Promise.resolve(optimiserParProfil(...args));
  }
  return new Promise((resolve, reject) => {
    w.onmessage = (e) => {
      w.terminate();
      if (e.data.ok) resolve(e.data.resultat as ResultatMulti); else reject(new Error(e.data.erreur));
    };
    w.onerror = (e) => {
      w.terminate();
      // Worker introuvable ou bloque : on retombe sur le calcul direct
      e.preventDefault();
      try { resolve(optimiserParProfil(...args)); } catch (err) { reject(err); }
    };
    w.postMessage(args);
  });
}
