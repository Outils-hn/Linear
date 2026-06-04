import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  FileDown,
  Scissors,
  Calculator,
  Package,
  LogOut,
  History,
  Save,
  FilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { optimiser, type Piece, type Strategie, type StockBarre } from "@/lib/optimizer";
import { BarreSchema } from "@/components/BarreSchema";
import {
  exporterPDF,
  grouperBarresIdentiques,
  grouperCoupesConsecutives,
  libelleGroupe,
} from "@/lib/export-pdf";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Smartcut — Optimisation de découpe linéaire" },
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

interface ProjectRow {
  id: string;
  chantier: string;
  numero_tache: string;
  client: string;
  date_projet: string;
  longueur_barre: number;
  marge_securite: number;
  trait_scie: number;
  strategie: string;
  pieces: unknown;
  stock: unknown;
  created_at: string;
}

const DEFAULT_PIECES: Piece[] = [
  { id: "p-default-1", nom: "Montant A", longueur: 1200, quantite: 4 },
  { id: "p-default-2", nom: "Traverse B", longueur: 800, quantite: 6 },
  { id: "p-default-3", nom: "Renfort C", longueur: 450, quantite: 8 },
];

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (!session) return <AuthForm />;
  return <App userEmail={session.user.email ?? ""} />;
}

function App({ userEmail }: { userEmail: string }) {
  const [chantier, setChantier] = useState("");
  const [numeroTache, setNumeroTache] = useState("");
  const [client, setClient] = useState("");
  const [dateProjet, setDateProjet] = useState(() => new Date().toISOString().slice(0, 10));
  const [longueurBarre, setLongueurBarre] = useState(6000);
  const [margeSecurite, setMargeSecurite] = useState(100);
  const [traitScie, setTraitScie] = useState(3);
  const [strategie, setStrategie] = useState<Strategie>("min-barres");
  const [stock, setStock] = useState<StockBarre[]>([
    { id: nextStockId(), longueur: 4200, quantite: 4 },
  ]);
  const [pieces, setPieces] = useState<Piece[]>(DEFAULT_PIECES);
  const [resultat, setResultat] = useState<ReturnType<typeof optimiser> | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pieceIds = useMemo(() => pieces.map((p) => p.id), [pieces]);
  const longueurUtile = Math.max(0, longueurBarre - margeSecurite);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Impossible de charger l'historique : " + error.message);
      return;
    }
    setProjects((data ?? []) as ProjectRow[]);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const addPiece = () =>
    setPieces((p) => [...p, { id: nextId(), nom: `Pièce ${p.length + 1}`, longueur: 1000, quantite: 1 }]);
  const removePiece = (id: string) => setPieces((p) => p.filter((x) => x.id !== id));
  const updatePiece = (id: string, patch: Partial<Piece>) =>
    setPieces((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addStock = () =>
    setStock((s) => [...s, { id: nextStockId(), longueur: 4000, quantite: 1 }]);
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
  }) => {
    const p = overrides?.pieces ?? pieces;
    const s = overrides?.stock ?? stock;
    const lb = overrides?.longueurBarre ?? longueurBarre;
    const ms = overrides?.margeSecurite ?? margeSecurite;
    const ts = overrides?.traitScie ?? traitScie;
    const st = overrides?.strategie ?? strategie;
    const lu = Math.max(0, lb - ms);
    return optimiser(p, {
      longueurBarreUtileDefaut: lu,
      longueurBarreBruteDefaut: lb,
      margeSecurite: ms,
      traitScie: ts,
      strategie: st,
      stock: st === "priorite-stock" ? s : [],
    });
  };

  const lancer = () => {
    setResultat(calculer());
    setTimeout(() => {
      document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const exporter = () => {
    if (!resultat) return;
    exporterPDF(resultat, pieces, {
      longueurBarreBrute: longueurBarre,
      longueurBarreUtile: longueurUtile,
      margeSecurite,
      traitScie,
      strategie,
      stock: strategie === "priorite-stock" ? stock : [],
      infos: { chantier, numeroTache, client, date: dateProjet },
    });
  };

  const nouveauProjet = () => {
    setCurrentProjectId(null);
    setChantier("");
    setNumeroTache("");
    setClient("");
    setDateProjet(new Date().toISOString().slice(0, 10));
    setLongueurBarre(6000);
    setMargeSecurite(100);
    setTraitScie(3);
    setStrategie("min-barres");
    setStock([{ id: nextStockId(), longueur: 4200, quantite: 4 }]);
    setPieces([
      { id: nextId(), nom: "Pièce 1", longueur: 1000, quantite: 1 },
    ]);
    setResultat(null);
    toast.success("Nouveau projet prêt");
  };

  const sauvegarder = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      toast.error("Session expirée");
      return;
    }
    const payload = {
      user_id: userId,
      chantier,
      numero_tache: numeroTache,
      client,
      date_projet: dateProjet,
      longueur_barre: longueurBarre,
      marge_securite: margeSecurite,
      trait_scie: traitScie,
      strategie,
      pieces: pieces as unknown as import("@/integrations/supabase/types").Json,
      stock: stock as unknown as import("@/integrations/supabase/types").Json,
    };
    if (currentProjectId) {
      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", currentProjectId);
      if (error) {
        toast.error("Erreur de sauvegarde : " + error.message);
      } else {
        toast.success("Projet mis à jour");
      }
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error("Erreur de sauvegarde : " + error.message);
      } else if (data) {
        setCurrentProjectId(data.id);
        toast.success("Projet sauvegardé");
      }
    }
    setSaving(false);
    await loadProjects();
  };

  const chargerProjet = (proj: ProjectRow) => {
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
    setSidebarOpen(false);
    const r = calculer({
      pieces: loadedPieces,
      stock: loadedStock,
      longueurBarre: proj.longueur_barre,
      margeSecurite: proj.marge_securite,
      traitScie: proj.trait_scie,
      strategie: st,
    });
    setResultat(r);
    toast.success(`Projet « ${proj.chantier || "sans nom"} » chargé`);
    setTimeout(() => {
      document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  const supprimerProjet = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible : " + error.message);
      return;
    }
    if (currentProjectId === id) setCurrentProjectId(null);
    toast.success("Projet supprimé");
    await loadProjects();
  };

  const deconnexion = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Smartcut</h1>
              <p className="text-xs text-muted-foreground">Optimisation de découpe linéaire 1D</p>
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
                    Cliquez sur un projet pour le recharger et relancer le calcul.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 140px)" }}>
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
                      <button
                        onClick={() => chargerProjet(p)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-semibold">
                          {p.chantier || "Projet sans nom"}
                        </div>
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
            <Button variant="outline" size="sm" onClick={nouveauProjet} className="gap-2">
              <FilePlus className="h-4 w-4" /> Nouveau
            </Button>
            <Button variant="outline" size="sm" onClick={sauvegarder} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
            {resultat && (
              <Button onClick={exporter} size="sm" className="gap-2">
                <FileDown className="h-4 w-4" /> PDF atelier
              </Button>
            )}
            <div className="ml-2 hidden text-xs text-muted-foreground sm:block">{userEmail}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={deconnexion}
              title="Déconnexion"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
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
              <Input
                id="date"
                type="date"
                value={dateProjet}
                onChange={(e) => setDateProjet(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
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
                  {strategie === "min-barres" &&
                    "Utilise le moins de barres possible à partir de la barre de base."}
                  {strategie === "priorite-stock" &&
                    "Place d'abord les coupes dans les barres du stock, complète avec la barre de base."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Pièces à couper</CardTitle>
                <CardDescription>Liste des pièces et quantités requises</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addPiece} className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repère</TableHead>
                    <TableHead className="w-40">Longueur (mm)</TableHead>
                    <TableHead className="w-32">Quantité</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pieces.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Input
                          value={p.nom}
                          onChange={(e) => updatePiece(p.id, { nom: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={p.longueur}
                          onChange={(e) =>
                            updatePiece(p.id, { longueur: Number(e.target.value) || 0 })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={p.quantite}
                          onChange={(e) =>
                            updatePiece(p.id, { quantite: Number(e.target.value) || 0 })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePiece(p.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pieces.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Aucune pièce. Cliquez sur « Ajouter » pour commencer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end">
                <Button onClick={lancer} size="lg" className="gap-2" disabled={pieces.length === 0}>
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
                    Ces barres seront utilisées en priorité. La barre de base ({longueurBarre} mm)
                    complète si le stock est insuffisant.
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
                            onChange={(e) =>
                              updateStock(s.id, { longueur: Number(e.target.value) || 0 })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={s.quantite}
                            onChange={(e) =>
                              updateStock(s.id, { quantite: Number(e.target.value) || 0 })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox
                              checked={margeOn}
                              onCheckedChange={(v) =>
                                updateStock(s.id, { appliquerMarge: v === true })
                              }
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Barres utilisées"
                value={`${resultat.nbBarres}`}
                hint={
                  strategie === "priorite-stock"
                    ? `${resultat.nbBarresStock} stock + ${resultat.nbBarresDefaut} base`
                    : `${resultat.longueurTotale} mm au total`
                }
              />
              <StatCard
                label="Rendement global"
                value={`${resultat.rendement.toFixed(1)} %`}
                hint={`${resultat.longueurUtile} mm utiles`}
                accent="success"
              />
              <StatCard
                label="Chutes totales"
                value={`${resultat.longueurChutes} mm`}
                hint={`${resultat.pourcentageChutes.toFixed(1)} % de la matière`}
              />
              <StatCard
                label="Chutes réutilisables"
                value={`${resultat.longueurChutesReutilisables} mm`}
                hint={`Déchets : ${resultat.longueurDechets} mm`}
                accent="warning"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan de découpe par barre</CardTitle>
                <CardDescription>
                  Schéma visuel et instructions de coupe — chutes ≥ 500 mm signalées en orange
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {grouperBarresIdentiques(resultat.barres).map((groupe) => {
                  const barre = groupe.reference;
                  const coupesGroupes = grouperCoupesConsecutives(barre.coupes, traitScie);
                  const qte = groupe.barres.length;
                  return (
                    <div
                      key={groupe.signature}
                      className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                          {libelleGroupe(groupe)}
                          <span className="ml-2 font-normal text-muted-foreground">
                            · {barre.longueurBrute} mm
                            {barre.longueurBrute !== barre.longueurBarre
                              ? ` (utile ${barre.longueurBarre} mm)`
                              : ""}
                            · {barre.coupes.length} coupe{barre.coupes.length > 1 ? "s" : ""}
                            {qte > 1 ? ` · Quantité : ${qte} barres identiques` : ""}
                          </span>
                        </h3>
                      </div>

                      <BarreSchema barre={barre} traitScie={traitScie} pieceIds={pieceIds} />

                      <ol className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                        {coupesGroupes.map((g, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-semibold text-foreground">
                              {i + 1}
                            </span>
                            <span className="font-medium text-foreground">{g.nom}</span>
                            <span>— {g.longueur} mm</span>
                            {g.quantite > 1 && (
                              <span className="text-foreground">× {g.quantite}</span>
                            )}
                            <span className="ml-auto font-semibold text-foreground">
                              Repère : {g.reperes.join(" / ")} mm
                            </span>
                          </li>
                        ))}
                      </ol>

                      <p className="text-xs text-muted-foreground">
                        Chute finale : <span className="font-medium text-foreground">{barre.chute} mm</span>
                      </p>
                    </div>
                  );
                })}
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
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "success" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={
            "mt-2 text-2xl font-semibold tracking-tight " +
            (accent === "success"
              ? "text-[color:var(--color-success)]"
              : accent === "warning"
              ? "text-[color:var(--color-warning)]"
              : "text-foreground")
          }
        >
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
