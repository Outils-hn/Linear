import { useState } from "react";
import { toast } from "sonner";
import { CloudDownload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lire, lister, monId, partager, retirer, chantierDe, type CalculBase } from "@/lib/calculs-base";
import { chantierAccueil } from "@/lib/chantier-accueil";
import type { LocalProject } from "@/lib/local-store";

export async function partagerProjet(p: LocalProject) {
  try { await partager(p); toast.success("Partagé sur la base commune : visible dans le dossier du chantier"); }
  catch (e) { toast.error(e instanceof Error ? e.message : "Partage impossible"); }
}

/** Calculs Linear partages : on choisit le chantier de l'Accueil, ou tous. */
export function BaseCommune({ onOuvrir }: { onOuvrir: (p: LocalProject) => void }) {
  const [liste, setListe] = useState<CalculBase[] | null>(null);
  const [charge, setCharge] = useState(false);
  const numero = chantierDe(chantierAccueil()).numero;

  const actualiser = async (tous: boolean) => {
    setCharge(true);
    try { setListe(await lister(tous ? "" : numero)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lecture impossible"); }
    finally { setCharge(false); }
  };
  const ouvrir = async (id: string) => {
    try {
      const c = await lire(id);
      if (c?.donnees && Array.isArray(c.donnees.pieces)) onOuvrir(c.donnees); else toast.error("Calcul illisible.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ouverture impossible"); }
  };
  const enlever = async (id: string) => {
    try { await retirer(id); setListe((l) => l && l.filter((x) => x.id !== id)); toast.success("Retiré de la base (corbeille 30 jours)"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Suppression impossible"); }
  };

  return (
    <div className="mt-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base commune</span>
        <Button variant="outline" size="sm" className="ml-auto gap-2" disabled={charge} onClick={() => void actualiser(false)}>
          <CloudDownload className="h-4 w-4" /> {numero ? `Chantier ${numero}` : "Tous"}
        </Button>
        {numero && <Button variant="ghost" size="sm" disabled={charge} onClick={() => void actualiser(true)}>Tous</Button>}
      </div>
      {liste && (
        <ul className="mt-2 space-y-1">
          {liste.length === 0 && <li className="py-2 text-center text-xs text-muted-foreground">Rien de partagé pour l'instant.</li>}
          {liste.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
              <button className="flex-1 text-left" onClick={() => void ouvrir(c.id)}>
                <div className="text-sm font-medium">{c.nom || "Sans nom"}</div>
                <div className="text-xs text-muted-foreground">{c.auteur_email.split("@")[0]} · {new Date(c.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</div>
              </button>
              {c.auteur === monId() && (
                <Button variant="ghost" size="icon" aria-label="Retirer de la base" title="Retirer de la base" className="text-muted-foreground hover:text-destructive" onClick={() => void enlever(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
