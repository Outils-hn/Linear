import { Save, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LinearApp } from "@/hooks/use-linear-app";

/** Fenetres : avertissement PDF et enregistrement du projet. */
export function DialoguesProjet({ app }: { app: LinearApp }) {
  const { chantier, confirmerNouveau, currentProjectId, exporter, newProjectName, numeroTache, pdfWarnOpen, persister, saveDialogOpen, saveMode, saving, setNewProjectName, setPdfWarnOpen, setSaveDialogOpen, setSaveMode, stock } = app;
  return (
    <>
      <Dialog open={pdfWarnOpen} onOpenChange={setPdfWarnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-[0.18em]">Informations manquantes</DialogTitle>
            <DialogDescription>
              {[!chantier.trim() && "Chantier", !numeroTache.trim() && "Numéro de tâche"].filter(Boolean).join(" et ")}{" "}
              {!chantier.trim() && !numeroTache.trim() ? "sont vides" : "est vide"}. La fiche de débit sera difficile à identifier en atelier.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setPdfWarnOpen(false)}>Compléter</Button>
            <Button size="sm" onClick={() => exporter(true)}>Exporter quand même</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-[0.18em]">
              Sauvegarder le projet
            </DialogTitle>
            <DialogDescription>
              {currentProjectId
                ? "Choisissez comment enregistrer vos modifications."
                : "Donnez un nom à ce nouveau projet pour l'ajouter à votre historique local."}
            </DialogDescription>
          </DialogHeader>
          {saveMode === "choice" && currentProjectId ? (
            <div className="space-y-3 py-2">
              <button
                type="button"
                onClick={() => persister({ id: currentProjectId })}
                disabled={saving}
                className="w-full rounded-md border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent/40 disabled:opacity-60"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Save className="h-4 w-4 text-primary" /> Mettre à jour le projet actuel
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Écrase le projet en cours ({chantier || "sans nom"}) avec les données affichées.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSaveMode("new")}
                disabled={saving}
                className="w-full rounded-md border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent/40 disabled:opacity-60"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FilePlus className="h-4 w-4 text-primary" /> Enregistrer comme nouveau projet
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Crée une copie distincte dans l'historique sans effacer l'original.
                </p>
              </button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <Label htmlFor="new-project-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                Nom du nouveau projet
              </Label>
              <Input
                id="new-project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmerNouveau();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Les paramètres, pièces et stock affichés à l'écran restent intacts.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {saveMode === "new" && currentProjectId && (
              <Button variant="ghost" size="sm" onClick={() => setSaveMode("choice")} disabled={saving}>
                Retour
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            {saveMode === "new" && (
              <Button size="sm" onClick={confirmerNouveau} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Sauvegarde…" : "Enregistrer la copie"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
