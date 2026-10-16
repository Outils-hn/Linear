import { formatNombre as fmt } from "@/lib/format-number";
import { Plus, Trash2, Package, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { listeProfils, libelleProfil } from "@/lib/multi-profil";
import { ChampNombre } from "@/components/ChampNombre";
import type { LinearApp } from "@/hooks/use-linear-app";

/** Carte du stock : barres et chutes disponibles (strategie priorite stock). */
export function StockBarres({ app }: { app: LinearApp }) {
  const { addStock, erreursChamps, longueurBarre, margeSecurite, marquerVide, pieces, removeStock, stock, updateStock } = app;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <div>
            <CardTitle className="text-base">Chutes et barres disponibles</CardTitle>
            <CardDescription>
              Chutes gardées à l'atelier ou barres déjà là pour ce projet : elles sont utilisées en premier. La
              barre de base ({longueurBarre} mm) complète si elles ne suffisent pas.
            </CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={addStock} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une ligne
        </Button>
      </CardHeader>
      <CardContent>
        {(() => {
          // Le stock n'a pas de profilé : avec plusieurs profilés, il est attribué
          // à un seul (même règle que optimiserParProfil). On le dit clairement.
          const profils = listeProfils(pieces);
          if (profils.length < 2 || stock.length === 0) return null;
          const profilStock = profils.includes("") ? "" : profils[0];
          return (
            <div role="alert" className="mb-4 flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Ces chutes ne sont pas encore rattachées à un profilé : avec plusieurs profilés, elles sont toutes
                attribuées à <strong>« {libelleProfil(profilStock)} »</strong>. Vérifiez qu'il s'agit bien de ce profilé,
                ou optimisez chaque profilé dans un projet séparé.
              </span>
            </div>
          );
        })()}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="numeric w-48">Longueur de barre (mm)</TableHead>
              <TableHead className="numeric w-32">Quantité</TableHead>
              <TableHead className="w-40">Appliquer la marge</TableHead>
              <TableHead className="numeric">Longueur utile</TableHead>
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
                    <ChampNombre
                      value={s.longueur}
                      onChange={(n) => updateStock(s.id, { longueur: n })}
                      onVide={(v) => marquerVide(`stock-${s.id}-longueur`, v)}
                      erreur={erreursChamps.has(`stock-${s.id}-longueur`)}
                    />
                  </TableCell>
                  <TableCell>
                    <ChampNombre
                      value={s.quantite}
                      onChange={(n) => updateStock(s.id, { quantite: n })}
                      onVide={(v) => marquerVide(`stock-${s.id}-quantite`, v)}
                      erreur={erreursChamps.has(`stock-${s.id}-quantite`)}
                    />
                  </TableCell>
                  <TableCell>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={margeOn}
                        onCheckedChange={(v) => updateStock(s.id, { appliquerMarge: v === true })}
                      />
                      {margeOn ? `−${fmt(margeSecurite)} mm` : "Aucune"}
                    </label>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{fmt(utile)} mm</TableCell>
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
  );
}
