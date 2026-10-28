import { memo } from "react";
import { formatNombre as fmt } from "@/lib/format-number";
import type { Piece } from "@/lib/optimizer";
import { naviguerClavier } from "@/lib/navigation-clavier";
import { Plus, Trash2, Calculator, Loader2, ClipboardCopy, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { longueurPourProfil } from "@/lib/multi-profil";
import { ExcelPasteDialog } from "@/components/ExcelPasteDialog";
import { ChampNombre } from "@/components/ChampNombre";
import { copierPourExcel, telechargerExcel } from "@/lib/export-excel";
import { nextId } from "@/hooks/use-linear-app";
import type { LinearApp } from "@/hooks/use-linear-app";

const COLONNES = ["nom", "profil", "longueur", "quantite"] as const;

/** Carte « Pieces a couper » (tableau des pieces, collage Excel). */
export function PiecesACouper({ app }: { app: LinearApp }) {
  const { addPiece, chantier, dateProjet, enCours, erreursChamps, lancer, longueurBarre, longueursProfils, margeSecurite, marquerVide, numeroTache, pasteOpen, pasteText, perime, pieces, removePiece, resultat, setLongueurBarre, setPasteOpen, setPasteText, setPieces, updatePiece } = app;
  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Pièces à couper</CardTitle>
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
            disabled={pieces.length === 0 || enCours}
            aria-busy={enCours}
            onClick={async () => {
              try {
                const n = await copierPourExcel(pieces);
                toast.success(`${fmt(n)} ligne${n > 1 ? "s" : ""} copiée${n > 1 ? "s" : ""}, collez-les dans Excel avec Ctrl+V`);
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
            disabled={pieces.length === 0 || enCours}
            aria-busy={enCours}
            onClick={async () => {
              try {
                // Resultat perime : on n'exporte que la liste, pas un calcul qui ne lui correspond plus
                await telechargerExcel(pieces, perime ? null : resultat, { chantier, numeroTache, date: dateProjet });
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
          onSetBarre={(v) => { setLongueurBarre(v); toast.success(`Barre de base réglée sur ${fmt(v)} mm`); }}
          onImport={(list, mode, info) => {
            const nouvelles = list.map((x) => ({ ...x, id: nextId() }));
            setPieces((p) => (mode === "replace" ? nouvelles : [...p, ...nouvelles]));
            const total = list.reduce((s, x) => s + x.quantite, 0);
            toast.success(
              `${fmt(total)} pièces importées (${fmt(info.lignes)} lignes)` +
                (info.ignorees ? `, ${fmt(info.ignorees)} ligne${info.ignorees > 1 ? "s" : ""} ignorée${info.ignorees > 1 ? "s" : ""}` : ""),
            );
          }}
        />
      </CardHeader>
      <CardContent>
        <Table className="pieces-table table-fixed sm:min-w-[540px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24%] sm:w-[20%]">Repère</TableHead>
              <TableHead className="w-[24%] sm:w-[35%]">Profilé</TableHead>
              <TableHead className="numeric w-[26%] sm:w-[20%]">Longueur (mm)</TableHead>
              <TableHead className="numeric w-[16%] sm:w-[15%]"><span className="sm:hidden">Qté</span><span className="hidden sm:inline">Quantité</span></TableHead>
              <TableHead className="w-[10%]"></TableHead>
            </TableRow>
          </TableHeader>
          {/* Comme dans Excel : Tab passe a la cellule suivante (corbeille ignoree),
              Entree et les fleches deplacent d'une case (voir lib/navigation-clavier). */}
          <TableBody onKeyDown={(e) => naviguerClavier(e, COLONNES)}>
            {pieces.map((p) => (
              <LignePiece
                key={p.id}
                p={p}
                erreurLongueur={erreursChamps.has(`piece-${p.id}-longueur`)}
                erreurQuantite={erreursChamps.has(`piece-${p.id}-quantite`)}
                updatePiece={updatePiece}
                removePiece={removePiece}
                marquerVide={marquerVide}
              />
            ))}
            {pieces.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Aucune pièce. Copiez vos lignes dans Excel puis faites Ctrl + V ici, ou cliquez sur « Ajouter ».
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Button
            onClick={lancer}
            size="lg"
            className="optimization-launch gap-2 sm:self-end"
            disabled={pieces.length === 0 || enCours}
            aria-busy={enCours}
          >
            {enCours ? <><Loader2 className="h-4 w-4 animate-spin" /> Optimisation en cours...</> : <><Calculator className="h-4 w-4" /> Lancer l'optimisation</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Une ligne du tableau, memorisee : modifier une piece ne redessine que sa ligne. */
const LignePiece = memo(function LignePiece({ p, erreurLongueur, erreurQuantite, updatePiece, removePiece, marquerVide }: {
  p: Piece;
  erreurLongueur: boolean;
  erreurQuantite: boolean;
  updatePiece: (id: string, patch: Partial<Piece>) => void;
  removePiece: (id: string) => void;
  marquerVide: (cle: string, vide: boolean) => void;
}) {
  return (
    <TableRow key={p.id}>
      <TableCell>
        <Input data-col="nom" aria-label={`Repère de ${p.nom || "la pièce"}`} value={p.nom} onChange={(e) => updatePiece(p.id, { nom: e.target.value })} />
      </TableCell>
      <TableCell>
        <Input
          data-col="profil"
          aria-label={`Profilé de ${p.nom || "la pièce"}`}
          value={p.profil ?? ""}
          className="normal-case"
          placeholder="—"
          onChange={(e) => updatePiece(p.id, { profil: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <ChampNombre
          data-col="longueur"
          aria-label={`Longueur de ${p.nom || "la pièce"}`}
          value={p.longueur}
          onChange={(n) => updatePiece(p.id, { longueur: n })}
          onVide={(v) => marquerVide(`piece-${p.id}-longueur`, v)}
          erreur={erreurLongueur}
        />
      </TableCell>
      <TableCell>
        <ChampNombre
          data-col="quantite"
          aria-label={`Quantité de ${p.nom || "la pièce"}`}
          value={p.quantite}
          onChange={(n) => updatePiece(p.id, { quantite: n })}
          onVide={(v) => marquerVide(`piece-${p.id}-quantite`, v)}
          erreur={erreurQuantite}
        />
      </TableCell>
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removePiece(p.id)}
          tabIndex={-1}
          aria-label={`Supprimer ${p.nom || "la pièce"}`}
          className="text-muted-foreground hover:text-destructive lg:h-8 lg:w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});
