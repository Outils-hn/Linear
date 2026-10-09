import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  FileDown,
  Calculator,
  Package,
  LogOut,
  History,
  Save,
  FilePlus,
  ClipboardCopy,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

import { AuthForm } from "@/components/AuthForm";
import { POSITION_MARGE_LABELS, type PositionMarge, type Piece, type Strategie, type StockBarre } from "@/lib/optimizer";
import { BarreSchema, LegendeBarres } from "@/components/BarreSchema";
import { optimiserParProfil, listeProfils, libelleProfil, longueurPourProfil, type ResultatMulti } from "@/lib/multi-profil";
import { ExcelPasteDialog } from "@/components/ExcelPasteDialog";
import { LinearMark } from "@/components/LinearMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { exporterPDF, grouperBarresIdentiques, grouperCoupesConsecutives, libelleGroupe } from "@/lib/export-pdf";
import { verifierResultat } from "@/lib/verification";
import { exporterProjetJson, exporterTousJson, lireJson } from "@/lib/backup";
import { copierPourExcel, telechargerExcel } from "@/lib/export-excel";
import {
  ensureProfile,
  getActiveProfile,
  setActiveProfile,
  listProjects,
  upsertProject,
  deleteProject,
  type LocalProject,
} from "@/lib/local-store";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Linear · Optimisation de découpe en atelier" },
      { property: "og:title", content: "Linear · Optimisation de découpe en atelier" },
      { property: "og:description", content: "Plans de découpe linéaire, bilan matière, chutes réutilisables et fiches de débit pour l’atelier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Application d'optimisation de mise en barre 1D pour l'atelier : calcul intelligent des coupes, gestion des chutes réutilisables, export PDF.",
      },
    ],
  }),
});

let idCounter = 0;
const nextId = () => `p${++idCounter}`;
let stockCounter = 0;
const nextStockId = () => `s${++stockCounter}`;

const DEFAULT_PIECES: Piece[] = [
  { id: "p-default-1", nom: "Montant A", longueur: 1200, quantite: 4 },
  { id: "p-default-2", nom: "Traverse B", longueur: 800, quantite: 6 },
  { id: "p-default-3", nom: "Renfort C", longueur: 450, quantite: 8 },
];

function Index() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfileId(getActiveProfile());
    setReady(true);
  }, []);

  const selectProfile = (name: string) => {
    const id = ensureProfile(name);
    setActiveProfile(id);
    setProfileId(id);
  };

  const exitProfile = () => {
    setActiveProfile(null);
    setProfileId(null);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (!profileId) return <AuthForm onSelect={selectProfile} />;
  return <App profileId={profileId} onExitProfile={exitProfile} />;
}

function App({ profileId, onExitProfile }: { profileId: string; onExitProfile: () => void }) {
  const [chantier, setChantier] = useState("");
  const [numeroTache, setNumeroTache] = useState("");
  const [client, setClient] = useState("");
  const [dateProjet, setDateProjet] = useState(() => new Date().toISOString().slice(0, 10));
  const [longueurBarre, setLongueurBarre] = useState(6000);
  const [margeSecurite, setMargeSecurite] = useState(100);
  const [positionMarge, setPositionMarge] = useState<PositionMarge>("debut");
  const [traitScie, setTraitScie] = useState(3);
  const [strategie, setStrategie] = useState<Strategie>("min-barres");
  const [modeUltra, setModeUltra] = useState(false);
  const [stock, setStock] = useState<StockBarre[]>([{ id: nextStockId(), longueur: 4200, quantite: 4 }]);
  const [pieces, setPieces] = useState<Piece[]>(DEFAULT_PIECES);
  const [resultat, setResultat] = useState<ResultatMulti | null>(null);
  const [longueursProfils, setLongueursProfils] = useState<Record<string, number>>({});
  const [pdfWarnOpen, setPdfWarnOpen] = useState(false);
  const [verifCtx, setVerifCtx] = useState<{ pieces: Piece[]; traitScie: number } | null>(null);
  const verification = useMemo(
    () => (resultat && verifCtx ? verifierResultat(resultat, verifCtx.pieces, { traitScie: verifCtx.traitScie, positionMarge }) : null),
    [resultat, verifCtx, positionMarge],
  );
  const [importConflits, setImportConflits] = useState<{ projets: LocalProject[]; noms: string[] } | null>(null);
  const profilsNommes = useMemo(() => listeProfils(pieces).filter(Boolean), [pieces]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<"choice" | "new">("choice");
  const [newProjectName, setNewProjectName] = useState("");

  const pieceIds = useMemo(() => pieces.map((p) => p.id), [pieces]);
  const longueurUtile = Math.max(0, longueurBarre - margeSecurite);

  const refreshProjects = () => setProjects(listProjects(profileId));

  useEffect(() => {
    refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const txt = e.clipboardData?.getData("text/plain") ?? "";
      if (!txt.trim()) return;
      e.preventDefault();
      setPasteText(txt);
      setPasteOpen(true);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
  const addPiece = () =>
    setPieces((p) => [...p, { id: nextId(), nom: `Pièce ${p.length + 1}`, longueur: 1000, quantite: 1 }]);
  const removePiece = (id: string) => setPieces((p) => p.filter((x) => x.id !== id));
  const updatePiece = (id: string, patch: Partial<Piece>) =>
    setPieces((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addStock = () => setStock((s) => [...s, { id: nextStockId(), longueur: 4000, quantite: 1 }]);
  const removeStock = (id: string) => setStock((s) => s.filter((x) => x.id !== id));
  const updateStock = (id: string, patch: Partial<StockBarre>) =>
    setStock((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const calculer = (overrides?: {
    pieces?: Piece[];
    stock?: StockBarre[];
    longueurBarre?: number;
    margeSecurite?: number;
    traitScie?: number;
    strategie?: Strategie;
    longueursProfils?: Record<string, number>;
  }) => {
    const p = overrides?.pieces ?? pieces;
    const s = overrides?.stock ?? stock;
    const lb = overrides?.longueurBarre ?? longueurBarre;
    const ms = overrides?.margeSecurite ?? margeSecurite;
    const ts = overrides?.traitScie ?? traitScie;
    const st = overrides?.strategie ?? strategie;
    setVerifCtx({ pieces: p, traitScie: ts });
    const lu = Math.max(0, lb - ms);
    void lu;
    return optimiserParProfil(p, overrides?.longueursProfils ?? longueursProfils, {
      longueurBarreDefaut: lb,
      margeSecurite: ms,
      positionMarge,
      traitScie: ts,
      strategie: st,
      stock: st === "priorite-stock" ? s : [],
      modeUltra,
    });
  };

  const lancer = () => {
    setResultat(calculer());
    setTimeout(() => {
      document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const exporter = (force = false) => {
    if (!resultat) return;
    if (!force && (!chantier.trim() || !numeroTache.trim())) {
      setPdfWarnOpen(true);
      return;
    }
    setPdfWarnOpen(false);
    void exporterPDF(resultat, pieces, {
      longueurBarreBrute: longueurBarre,
      longueurBarreUtile: longueurUtile,
      margeSecurite,
      positionMarge,
      traitScie,
      strategie,
      longueursProfils,
      stock: strategie === "priorite-stock" ? stock : [],
      infos: { chantier, numeroTache, client, date: dateProjet },
      verification: verification ?? undefined,
    }).catch(() => toast.error("L’export PDF a échoué. Veuillez réessayer."));
  };

  const nouveauProjet = () => {
    setCurrentProjectId(null);
    setChantier("");
    setNumeroTache("");
    setClient("");
    setDateProjet(new Date().toISOString().slice(0, 10));
    setLongueurBarre(6000);
    setMargeSecurite(100);
    setPositionMarge("debut");
    setLongueursProfils({});
    setTraitScie(3);
    setStrategie("min-barres");
    setStock([{ id: nextStockId(), longueur: 4200, quantite: 4 }]);
    setPieces([{ id: nextId(), nom: "Pièce 1", longueur: 1000, quantite: 1 }]);
    setResultat(null);
    toast.success("Nouveau projet prêt");
  };

  const ouvrirSauvegarde = () => {
    const base = (chantier || "Projet sans nom").trim();
    setNewProjectName(currentProjectId ? `${base} (Copie)` : base);
    setSaveMode(currentProjectId ? "choice" : "new");
    setSaveDialogOpen(true);
  };

  const persister = (opts: { id: string | null; chantierOverride?: string }) => {
    setSaving(true);
    try {
      const saved = upsertProject(profileId, {
        id: opts.id,
        chantier: opts.chantierOverride ?? chantier,
        numero_tache: numeroTache,
        client,
        date_projet: dateProjet,
        longueur_barre: longueurBarre,
        marge_securite: margeSecurite,
        trait_scie: traitScie,
        strategie,
        pieces,
        stock,
        longueurs_profils: longueursProfils,
      });
      setCurrentProjectId(saved.id);
      if (opts.chantierOverride !== undefined) setChantier(opts.chantierOverride);
      refreshProjects();
      toast.success(opts.id ? "Projet mis à jour" : "Nouveau projet enregistré");
      setSaveDialogOpen(false);
    } catch (e) {
      toast.error("Erreur de sauvegarde : " + (e instanceof Error ? e.message : "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  const confirmerNouveau = () => {
    const nom = newProjectName.trim();
    if (!nom) {
      toast.error("Nom de projet requis");
      return;
    }
    persister({ id: null, chantierOverride: nom });
  };

  const chargerProjet = (proj: LocalProject) => {
    setCurrentProjectId(proj.id);
    setChantier(proj.chantier);
    setNumeroTache(proj.numero_tache);
    setClient(proj.client);
    setDateProjet(proj.date_projet);
    setLongueurBarre(proj.longueur_barre);
    setMargeSecurite(proj.marge_securite);
    setTraitScie(proj.trait_scie);
    const st = (proj.strategie as Strategie) ?? "min-barres";
    setStrategie(st);
    const loadedPieces = Array.isArray(proj.pieces) ? (proj.pieces as Piece[]) : [];
    const loadedStock = Array.isArray(proj.stock) ? (proj.stock as StockBarre[]) : [];
    setPieces(loadedPieces);
    setStock(loadedStock);
    const lp = proj.longueurs_profils ?? {};
    setLongueursProfils(lp);
    setSidebarOpen(false);
    const r = calculer({
      pieces: loadedPieces,
      stock: loadedStock,
      longueurBarre: proj.longueur_barre,
      margeSecurite: proj.marge_securite,
      traitScie: proj.trait_scie,
      strategie: st,
      longueursProfils: lp,
    });
    setResultat(r);
    toast.success(`Projet « ${proj.chantier || "sans nom"} » chargé`);
    setTimeout(() => {
      document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  const enregistrerImport = (liste: LocalProject[], mode: "remplacer" | "garder") => {
    const existants = listProjects(profileId);
    for (const p of liste) {
      const { id: _id, created_at: _c, updated_at: _u, ...data } = p;
      void _id; void _c; void _u;
      const meme = existants.find((e) => (e.chantier || "").trim() === (p.chantier || "").trim());
      upsertProject(profileId, { ...data, id: mode === "remplacer" && meme ? meme.id : null });
    }
    refreshProjects();
    setImportConflits(null);
    toast.success(`${liste.length} projet(s) importé(s)`);
  };

  const importerJson = async (file: File) => {
    try {
      const liste = lireJson(await file.text());
      const existants = listProjects(profileId).map((e) => (e.chantier || "").trim());
      const noms = liste.map((p) => (p.chantier || "").trim()).filter((n) => existants.includes(n));
      if (noms.length > 0) setImportConflits({ projets: liste, noms: [...new Set(noms)] });
      else enregistrerImport(liste, "garder");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    }
  };

  const supprimerProjet = (id: string) => {
    deleteProject(profileId, id);
    if (currentProjectId === id) setCurrentProjectId(null);
    refreshProjects();
    toast.success("Projet supprimé");
  };

  return (
    <div className="rail-page min-h-screen">
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
                    Projets enregistrés localement sous le profil « {profileId} ». Cliquez pour recharger.
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
            <div className="ml-1 hidden text-xs text-muted-foreground sm:block">{profileId}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onExitProfile}
              title="Changer de profil"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-8 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations du projet</CardTitle>
            <CardDescription>
              Ces informations apparaîtront en haut de la fiche de débit PDF et identifient votre projet sauvegardé.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="chantier">Chantier</Label>
              <Input
                id="chantier"
                placeholder="Ex : Résidence Les Tilleuls"
                value={chantier}
                onChange={(e) => setChantier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numTache">Numéro de tâche</Label>
              <Input
                id="numTache"
                placeholder="Ex : TSK-2024-128"
                value={numeroTache}
                onChange={(e) => setNumeroTache(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                placeholder="Ex : Dupont SAS"
                value={client}
                onChange={(e) => setClient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={dateProjet} onChange={(e) => setDateProjet(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Paramètres du profilé</CardTitle>
              <CardDescription>Configuration de la barre de base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lb">Longueur de la barre de base (mm)</Label>
                <Input
                  id="lb"
                  type="number"
                  value={longueurBarre}
                  onChange={(e) => setLongueurBarre(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ms">Marge de rafraîchissement / sécurité (mm)</Label>
                <Input
                  id="ms"
                  type="number"
                  value={margeSecurite}
                  onChange={(e) => setMargeSecurite(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Longueur utile pour l'optimisation :{" "}
                  <span className="font-semibold text-foreground">{longueurUtile} mm</span>
                </p>
                <Label htmlFor="position-marge">Position de la marge</Label>
                <Select value={positionMarge} onValueChange={(v) => {
                  const position = v as PositionMarge;
                  setPositionMarge(position);
                  setResultat((r) => {
                    if (!r) return r;
                    const maj = (b: (typeof r.barres)[number]) => {
                      const marge = Math.max(0, b.longueurBrute - b.longueurBarre);
                      const debut = position === "fin" ? 0 : position === "deux-bouts" ? marge / 2 : marge;
                      return { ...b, margeDebut: debut, margeFin: marge - debut };
                    };
                    const profils = r.profils.map((rp) => ({ ...rp, resultat: { ...rp.resultat, barres: rp.resultat.barres.map(maj) } }));
                    return { ...r, profils, barres: profils.flatMap((rp) => rp.resultat.barres) };
                  });
                }}>
                  <SelectTrigger id="position-marge"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(POSITION_MARGE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ts">Épaisseur du trait de scie (mm)</Label>
                <Input
                  id="ts"
                  type="number"
                  value={traitScie}
                  onChange={(e) => setTraitScie(Number(e.target.value) || 0)}
                />
              </div>
              {profilsNommes.length > 0 && (
                <div className="space-y-2">
                  <Label>Longueur de barre par profilé (mm)</Label>
                  {profilsNommes.map((pr) => (
                    <div key={pr} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                      <span className="whitespace-normal break-words text-xs font-medium">{pr}</span>
                      <Input
                        type="number"
                        className="h-8"
                        value={longueursProfils[pr] ?? longueurBarre}
                        onChange={(e) => setLongueursProfils((m) => ({ ...m, [pr]: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Les pièces sans profilé utilisent la barre de base.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Stratégie d'optimisation</Label>
                <Select value={strategie} onValueChange={(v) => setStrategie(v as Strategie)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="min-barres">Minimum de barres utilisées</SelectItem>
                    <SelectItem value="priorite-stock">Priorité aux longueurs du stock</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {strategie === "min-barres" && "Utilise le moins de barres possible à partir de la barre de base."}
                  {strategie === "priorite-stock" &&
                    "Place d'abord les coupes dans les barres du stock, complète avec la barre de base."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="text-base">Pièces à couper</CardTitle>
                <CardDescription>Liste des pièces et quantités requises</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPasteText(""); setPasteOpen(true); }}>
                  Coller depuis Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={pieces.length === 0}
                  onClick={async () => {
                    try {
                      const n = await copierPourExcel(pieces);
                      toast.success(`${n} ligne${n > 1 ? "s" : ""} copiée${n > 1 ? "s" : ""}, collez-les dans Excel avec Ctrl+V`);
                    } catch {
                      toast.error("Copie impossible : autorisez l'accès au presse-papiers");
                    }
                  }}
                >
                  <ClipboardCopy className="h-4 w-4" /> Copier pour Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={pieces.length === 0}
                  onClick={async () => {
                    try {
                      await telechargerExcel(pieces, resultat);
                      toast.success("Fichier Excel téléchargé");
                    } catch {
                      toast.error("Échec de la génération du fichier Excel");
                    }
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4" /> Télécharger en Excel
                </Button>
                <Button variant="outline" size="sm" onClick={addPiece} className="gap-2">
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </div>
              <ExcelPasteDialog
                open={pasteOpen}
                onOpenChange={setPasteOpen}
                initialText={pasteText}
                longueurBarre={longueurBarre}
                longueurMax={(pr) => Math.max(0, longueurPourProfil(pr, longueursProfils, longueurBarre) - margeSecurite)}
                onSetBarre={(v) => { setLongueurBarre(v); toast.success(`Barre de base réglée sur ${v} mm`); }}
                onImport={(list, mode, info) => {
                  const nouvelles = list.map((x) => ({ ...x, id: nextId() }));
                  setPieces((p) => (mode === "replace" ? nouvelles : [...p, ...nouvelles]));
                  const total = list.reduce((s, x) => s + x.quantite, 0);
                  toast.success(
                    `${total} pièces importées (${info.lignes} lignes)` +
                      (info.ignorees ? `, ${info.ignorees} ligne${info.ignorees > 1 ? "s" : ""} ignorée${info.ignorees > 1 ? "s" : ""}` : ""),
                  );
                }}
              />
            </CardHeader>
            <CardContent>
              <Table className="lg:table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="lg:w-[25%]">Repère</TableHead>
                    <TableHead className="w-40 lg:w-[35%]">Profilé</TableHead>
                    <TableHead className="numeric w-40 lg:w-[20%]">Longueur (mm)</TableHead>
                    <TableHead className="numeric w-32 lg:w-[15%]">Quantité</TableHead>
                    <TableHead className="w-12 lg:w-[5%] lg:px-1"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pieces.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Input value={p.nom} onChange={(e) => updatePiece(p.id, { nom: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={p.profil ?? ""}
                          placeholder="—"
                          onChange={(e) => updatePiece(p.id, { profil: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={p.longueur}
                          onChange={(e) => updatePiece(p.id, { longueur: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={p.quantite}
                          onChange={(e) => updatePiece(p.id, { quantite: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell className="lg:px-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePiece(p.id)}
                          className="text-muted-foreground hover:text-destructive lg:h-8 lg:w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pieces.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Aucune pièce. Cliquez sur « Ajouter » pour commencer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
                <label
                  htmlFor="mode-ultra"
                  className="flex flex-1 cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/40 p-3"
                >
                  <Switch id="mode-ultra" checked={modeUltra} onCheckedChange={setModeUltra} />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      🚀 Mode Optimisation Ultra <span className="text-primary">(SmartCut)</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Prend 2 secondes de plus mais teste des milliers de combinaisons pour
                      économiser un maximum de barres.
                    </span>
                  </span>
                </label>
                <Button
                  onClick={lancer}
                  size="lg"
                  className="gap-2 sm:self-end"
                  disabled={pieces.length === 0}
                >
                  <Calculator className="h-4 w-4" /> Lancer l'optimisation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>


        {strategie === "priorite-stock" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <div>
                  <CardTitle className="text-base">Gestion du stock de barres</CardTitle>
                  <CardDescription>
                    Ces barres seront utilisées en priorité. La barre de base ({longueurBarre} mm) complète si le stock
                    est insuffisant.
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={addStock} className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter une ligne
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Longueur de barre (mm)</TableHead>
                    <TableHead className="w-32">Quantité</TableHead>
                    <TableHead className="w-40">Appliquer la marge</TableHead>
                    <TableHead>Longueur utile</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((s) => {
                    const margeOn = s.appliquerMarge !== false;
                    const utile = Math.max(0, s.longueur - (margeOn ? margeSecurite : 0));
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Input
                            type="number"
                            value={s.longueur}
                            onChange={(e) => updateStock(s.id, { longueur: Number(e.target.value) || 0 })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={s.quantite}
                            onChange={(e) => updateStock(s.id, { quantite: Number(e.target.value) || 0 })}
                          />
                        </TableCell>
                        <TableCell>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox
                              checked={margeOn}
                              onCheckedChange={(v) => updateStock(s.id, { appliquerMarge: v === true })}
                            />
                            {margeOn ? `−${margeSecurite} mm` : "Aucune"}
                          </label>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{utile} mm</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStock(s.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {stock.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        Aucune barre en stock — toutes les coupes utiliseront la barre de base.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {resultat && resultat.nbBarres > 0 && (
          <section id="resultats" className="space-y-6 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-sm font-medium uppercase tracking-[0.12em]">Résultats</h2>
              {verification && <div role="status" className={"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs " + (verification.ok ? "border-success/20 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive")}>
                <span className={"h-1.5 w-1.5 rounded-full " + (verification.ok ? "bg-success" : "bg-destructive")} />
                {verification.ok ? "Vérification OK" : `Erreur de calcul (${verification.problemes.length})`}
              </div>}
            </div>
            {verification && !verification.ok && <ul className="list-disc space-y-1 pl-6 text-sm text-destructive">{verification.problemes.map((pb, i) => <li key={i}>{pb}</li>)}</ul>}
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard large label="Barres utilisées" value={`${resultat.nbBarres}`} hint={strategie === "priorite-stock" ? `${resultat.nbBarresStock} stock + ${resultat.nbBarresDefaut} base` : `${resultat.longueurTotale} mm au total`} />
              <StatCard large label="Rendement hors chutes réutilisables" value={`${resultat.rendementHorsChutesReutilisables.toFixed(1)} %`} hint={`${resultat.longueurTotale - resultat.longueurChutesReutilisables} mm consommés`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Rendement brut" value={`${resultat.rendement.toFixed(1)} %`} hint={`${resultat.longueurUtile} mm utiles`} />
              <StatCard label="Chutes totales" value={`${resultat.longueurChutes} mm`} hint={`${resultat.pourcentageChutes.toFixed(1)} % de la matière`} />
              <StatCard label="Chutes réutilisables" value={`${resultat.longueurChutesReutilisables} mm`} hint={`Déchets : ${resultat.longueurDechets} mm`} accent="warning" />
            </div>

            <div className="border-y border-border py-4 text-sm tabular-nums">
              <h2 className="mb-1 font-semibold">Bilan matière</h2>
              <p>{resultat.longueurTotale} mm = {resultat.longueurUtile} pièces + {resultat.longueurTraitsScie} traits de scie + {resultat.longueurMarges} marges + {resultat.longueurChutes} chutes</p>
              <div aria-label="Répartition du bilan matière" className="mt-4 flex h-3 w-full overflow-hidden rounded-sm">
                {[{ label: "Pièces", value: resultat.longueurUtile, style: "bg-piece-1" }, { label: "Traits de scie", value: resultat.longueurTraitsScie, style: "bg-heading" }, { label: "Marges", value: resultat.longueurMarges, style: "margin-hatch bg-muted" }, { label: "Chutes", value: resultat.longueurChutes, style: "offcut-hatch" }].map(segment => <div key={segment.label} title={`${segment.label} : ${segment.value} mm`} className={segment.style} style={{ width: `${segment.value / resultat.longueurTotale * 100}%` }} />)}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {[{ label: "Pièces", value: resultat.longueurUtile, style: "bg-piece-1" }, { label: "Traits de scie", value: resultat.longueurTraitsScie, style: "bg-heading" }, { label: "Marges", value: resultat.longueurMarges, style: "margin-hatch bg-muted" }, { label: "Chutes", value: resultat.longueurChutes, style: "offcut-hatch" }].map(segment => <span key={segment.label} className="flex items-center gap-2"><i className={"h-2.5 w-2.5 rounded-sm " + segment.style} />{segment.label} <span className="font-mono text-foreground">{segment.value} mm</span></span>)}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan de découpe par barre</CardTitle>
                <CardDescription>
                  Schéma visuel et instructions de coupe — chutes ≥ 500 mm signalées en orange
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-10">
                <LegendeBarres pieces={pieces} pieceIds={pieceIds} />
                {resultat.profils.map((rp) => (
                <div key={rp.profil || "_"} className="space-y-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-foreground/80 pb-2">
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em]">Profilé : {libelleProfil(rp.profil)}</h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Barre {rp.longueurBarre} mm · Sous-total : <span className="font-semibold text-foreground">{rp.resultat.nbBarres} barre{rp.resultat.nbBarres > 1 ? "s" : ""}</span> · Rendement {rp.resultat.rendement.toFixed(1)} %
                  </span>
                </div>
                {grouperBarresIdentiques(rp.resultat.barres).map((groupe) => {
                  const barre = groupe.reference;
                  const coupesGroupes = grouperCoupesConsecutives(barre.coupes, traitScie, barre.margeDebut ?? 0);
                  const qte = groupe.barres.length;
                  return (
                    <div
                      key={groupe.signature}
                      className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                          {libelleGroupe(groupe)}
                          {qte > 1 && <span className="ml-2 inline-flex rounded border border-border bg-muted px-2 py-0.5 text-xs tabular-nums">x {qte}</span>}
                          <span className="ml-2 font-normal text-muted-foreground">
                            · {barre.longueurBrute} mm
                            {barre.longueurBrute !== barre.longueurBarre
                              ? ` (utile ${barre.longueurBarre} mm)`
                              : ""}· {barre.coupes.length} coupe{barre.coupes.length > 1 ? "s" : ""}
                          </span>
                        </h3>
                      </div>

                      <BarreSchema barre={barre} traitScie={traitScie} pieceIds={pieceIds} libelle={libelleGroupe(groupe)} />
                      <p className="text-xs text-muted-foreground">Cotes mesurées depuis l’extrémité brute de la barre</p>

                      <div className="overflow-hidden rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="w-12 text-center text-xs font-semibold text-foreground">#</TableHead>
                              <TableHead className="text-xs font-semibold text-foreground">Pièce</TableHead>
                              <TableHead className="w-40 text-right text-xs font-semibold text-foreground">Longueur de coupe (mm)</TableHead>
                              <TableHead className="w-24 text-right text-xs font-semibold text-foreground">Quantité</TableHead>
                              <TableHead className="w-56 text-right text-xs font-semibold text-foreground">Repère cumulé (mm)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {coupesGroupes.map((g, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-center text-xs font-semibold text-foreground">{i + 1}</TableCell>
                                <TableCell className="text-xs font-medium text-foreground">{g.nom}</TableCell>
                                <TableCell className="text-right text-xs tabular-nums">{g.longueur}</TableCell>
                                <TableCell className="text-right text-xs tabular-nums">{g.quantite}</TableCell>
                                <TableCell className="text-right text-xs tabular-nums">{g.reperes.join(" / ")}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Chute finale : <span className="font-medium text-foreground">{barre.chute} mm</span>
                      </p>
                    </div>
                  );
                })}
                </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {resultat && resultat.nbBarres === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune pièce valide à optimiser. Vérifiez que les longueurs ne dépassent pas celle de la barre.
            </CardContent>
          </Card>
        )}
      </main>

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
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
  large = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "success" | "warning";
  large?: boolean;
}) {
  return (
    <Card>
      <CardContent className={large ? "p-6" : "p-4"}>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={
            "mt-2 font-mono font-normal " + (large ? "text-5xl text-primary " : "text-2xl ") +
            (accent === "success"
              ? "text-[color:var(--color-success)]"
              : accent === "warning"
                ? "text-[color:var(--color-warning)]"
                : large ? "text-primary" : "text-foreground")
          }
        >
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
