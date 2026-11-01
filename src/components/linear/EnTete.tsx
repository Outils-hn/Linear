import { MoreHorizontal, Trash2, FileDown, History, Save, FilePlus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LinearMark } from "@/components/LinearMark";
import { SelecteurApplis } from "@/components/SelecteurApplis";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bandeau } from "@/components/Bandeau";
import { exporterProjetJson, exporterTousJson } from "@/lib/backup";
import type { LinearApp } from "@/hooks/use-linear-app";

/** En-tete : titre, projets enregistres, import/export, sauvegarde, PDF. */
export function EnTete({ app }: { app: LinearApp }) {
  const { chargerProjet, currentProjectId, enregistrerImport, exporter, importConflits, importerJson, nouveauProjet, ouvrirSauvegarde, perime, projects, resultat, saving, setImportConflits, setSidebarOpen, sidebarOpen, supprimerProjet, verification } = app;
  const pdfBloque = perime ? "Relancez d'abord l'optimisation : la saisie a changé" : verification && !verification.ok ? "PDF bloqué : la vérification a trouvé des erreurs" : "";
  return (
    <Bandeau
      marque={<>
        <LinearMark />
        <SelecteurApplis />
        <span className="sr-only">Optimisation de découpe 1D</span>
      </>}
      theme={<ThemeToggle className="bandeau-icone" />}
      actions={<>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="bandeau-btn bandeau-bureau">
                <History /> Mes projets
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
                      title="Supprimer ce projet"
                      aria-label={`Supprimer le projet ${p.chantier || "sans nom"}`}
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
          <Button variant="outline" onClick={nouveauProjet} className="bandeau-btn bandeau-bureau">
            <FilePlus /> Nouveau
          </Button>
          <Button variant="outline" onClick={ouvrirSauvegarde} disabled={saving} className="bandeau-btn bandeau-bureau">
            <Save /> {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
          {resultat && (
            <Button onClick={() => exporter()} className="bandeau-btn primaire bandeau-bureau" disabled={!!pdfBloque} title={pdfBloque || undefined}>
              <FileDown /> PDF atelier
            </Button>
          )}
          {/* Telephone : les actions du bandeau dans un seul menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bandeau-icone bandeau-mobile" aria-label="Plus d'actions"><MoreHorizontal /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuItem onSelect={() => setSidebarOpen(true)}><History className="h-4 w-4" /> Mes projets</DropdownMenuItem>
              <DropdownMenuItem onSelect={nouveauProjet}><FilePlus className="h-4 w-4" /> Nouveau</DropdownMenuItem>
              <DropdownMenuItem onSelect={ouvrirSauvegarde} disabled={saving}><Save className="h-4 w-4" /> Sauvegarder</DropdownMenuItem>
              {resultat && <DropdownMenuItem onSelect={() => exporter()} disabled={!!pdfBloque}><FileDown className="h-4 w-4" /> PDF atelier</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
      </>}
    />
  );
}
