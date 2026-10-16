import { Trash2, FileDown, History, Save, FilePlus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LinearMark } from "@/components/LinearMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { exporterProjetJson, exporterTousJson } from "@/lib/backup";
import type { LinearApp } from "@/hooks/use-linear-app";

/** En-tete : titre, projets enregistres, import/export, sauvegarde, PDF. */
export function EnTete({ app }: { app: LinearApp }) {
  const { chargerProjet, currentProjectId, enregistrerImport, exporter, importConflits, importerJson, nouveauProjet, ouvrirSauvegarde, projects, resultat, saving, setImportConflits, setSidebarOpen, sidebarOpen, supprimerProjet } = app;
  return (
    <header className="border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <LinearMark size={34} />
          <div className="leading-tight">
            <h1 className="font-display text-lg font-bold uppercase tracking-[0.22em] text-foreground">Linear</h1>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Optimisation de découpe 1D
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" /> Mes projets
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Mes projets / Historique</SheetTitle>
                <SheetDescription>
                  Projets enregistrés dans ce navigateur. Cliquez pour recharger.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" disabled={projects.length === 0} onClick={() => exporterTousJson(projects)}>
                  <Download className="h-4 w-4" /> Exporter tous les projets (.json)
                </Button>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4" /> Importer (.json)
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importerJson(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
              </div>
              <div className="mt-4 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 200px)" }}>
                {projects.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Aucun projet sauvegardé pour l'instant.
                  </p>
                )}
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className={
                      "group flex items-start justify-between gap-2 rounded-md border border-border p-3 transition hover:bg-accent " +
                      (currentProjectId === p.id ? "border-primary bg-accent/40" : "")
                    }
                  >
                    <button onClick={() => chargerProjet(p)} className="flex-1 text-left">
                      <div className="text-sm font-semibold">{p.chantier || "Projet sans nom"}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.numero_tache && <span>Tâche {p.numero_tache} · </span>}
                        {p.client && <span>{p.client} · </span>}
                        {new Date(p.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Exporter ce projet (.json)"
                      aria-label="Exporter ce projet (.json)"
                      onClick={() => exporterProjetJson(p)}
                      className="text-muted-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => supprimerProjet(p.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Dialog open={!!importConflits} onOpenChange={(o) => !o && setImportConflits(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Projet déjà existant</DialogTitle>
                <DialogDescription>
                  Un projet du même nom existe déjà : {importConflits?.noms.map((n) => `« ${n || "sans nom"} »`).join(", ")}.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => importConflits && enregistrerImport(importConflits.projets, "garder")}>Garder les deux</Button>
                <Button onClick={() => importConflits && enregistrerImport(importConflits.projets, "remplacer")}>Remplacer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={nouveauProjet} className="gap-2">
            <FilePlus className="h-4 w-4" /> Nouveau
          </Button>
          <Button variant="outline" size="sm" onClick={ouvrirSauvegarde} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
          {resultat && (
            <Button onClick={() => exporter()} size="sm" className="gap-2">
              <FileDown className="h-4 w-4" /> PDF atelier
            </Button>
          )}
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}
