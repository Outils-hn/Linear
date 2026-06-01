import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, FileDown, Scissors, Calculator, Package } from "lucide-react";
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

function Index() {
  const [chantier, setChantier] = useState("");
  const [numeroTache, setNumeroTache] = useState("");
  const [longueurBarre, setLongueurBarre] = useState(6000);
  const [margeSecurite, setMargeSecurite] = useState(100);
  const [traitScie, setTraitScie] = useState(3);
  const [strategie, setStrategie] = useState<Strategie>("min-barres");
  const [stock, setStock] = useState<StockBarre[]>([
    { id: nextStockId(), longueur: 4200, quantite: 4 },
  ]);
  const [pieces, setPieces] = useState<Piece[]>([
    { id: nextId(), nom: "Montant A", longueur: 1200, quantite: 4 },
    { id: nextId(), nom: "Traverse B", longueur: 800, quantite: 6 },
    { id: nextId(), nom: "Renfort C", longueur: 450, quantite: 8 },
  ]);
  const [resultat, setResultat] = useState<ReturnType<typeof optimiser> | null>(null);

  const pieceIds = useMemo(() => pieces.map((p) => p.id), [pieces]);
  const longueurUtile = Math.max(0, longueurBarre - margeSecurite);

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

  const lancer = () => {
    const r = optimiser(pieces, {
      longueurBarreUtileDefaut: longueurUtile,
      longueurBarreBruteDefaut: longueurBarre,
      margeSecurite,
      traitScie,
      strategie,
      stock: strategie === "priorite-stock" ? stock : [],
    });
    setResultat(r);
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
      infos: { chantier, numeroTache },
    });
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
          {resultat && (
            <Button onClick={exporter} className="gap-2">
              <FileDown className="h-4 w-4" /> Exporter pour l'atelier
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations du projet</CardTitle>
            <CardDescription>
              Ces informations apparaîtront en haut de la fiche de débit PDF (facultatif).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
                      <TableCell className="text-sm text-muted-foreground">
                        {utile} mm
                      </TableCell>
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
