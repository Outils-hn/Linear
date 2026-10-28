import { useState } from "react";
import { formatNombre as fmt } from "@/lib/format-number";
import { libelleStatutMatiere, detailsCommande } from "@/lib/material-status";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarreSchema, LegendeBarres } from "@/components/BarreSchema";
import { libelleProfil, lignesCommande, longueurDuStock, texteStock } from "@/lib/multi-profil";
import { lignesReperes, RAPPEL_RUBAN } from "@/lib/cut-method";
import { grouperBarresIdentiques, grouperCoupesConsecutives, libelleGroupe } from "@/lib/export-pdf";
import { QualiteResultat } from "@/components/QualiteResultat";
import { ChutesAConserver } from "./ChutesAConserver";
import { StatCard } from "./StatCard";
import type { LinearApp } from "@/hooks/use-linear-app";

/** Resultats : synthese, bilan matiere, chutes, plans de decoupe par barre. */
export function Resultats({ app }: { app: LinearApp }) {
  const { chutesPDF, longueurBarre, matiere, methodeCoupe, pieceIds, pieces, resultat, setChutesPDF, statutMatiere, traitScie, verification } = app;
  const [toutDeplie, setToutDeplie] = useState(false);
  // Affiche seulement quand il y a un resultat (la page ne monte ce composant qu'apres un calcul)
  if (!resultat) return null;
  return (
    <section id="resultats" className="space-y-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-sm font-medium uppercase tracking-[0.12em]">Résultats</h2>
        {verification && <div role="status" className={"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs " + (verification.ok ? "border-success/20 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive")}>
          <span className={"h-1.5 w-1.5 rounded-full " + (verification.ok ? "bg-success" : "bg-destructive")} />
          {verification.ok ? "Vérification OK" : `Erreur de calcul (${verification.problemes.length})`}
        </div>}
        <QualiteResultat optimal={resultat.optimal} nbBarres={resultat.nbBarres} borneMin={resultat.borneMin} />
      </div>
      {verification && !verification.ok && <ul className="list-disc space-y-1 pl-6 text-sm text-destructive">{verification.problemes.map((pb, i) => <li key={i}>{pb}</li>)}</ul>}
      {/* Bandeau principal (style Epure) : ce qu'il faut commander en grand, le rendement a droite */}
      <div className="border-t border-foreground pt-5">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-5">
          <div className="flex flex-wrap gap-x-14 gap-y-5">
            {lignesCommande(resultat, longueurBarre).map((ligne, i) => (
              <div key={i}>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {libelleStatutMatiere(statutMatiere)}{ligne.profil ? ` · ${ligne.profil}` : ""}
                </p>
                <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                  {fmt(ligne.nb)} <span className="text-lg font-medium text-muted-foreground">× {fmt(ligne.longueurBarre)} mm</span>
                </p>
                {ligne.stock > 0 && <p className="mt-1.5 text-sm tabular-nums text-warning">{texteStock(ligne.stock)}</p>}
                {detailsCommande(statutMatiere) && <p className="mt-1 text-sm tabular-nums text-muted-foreground">— {detailsCommande(statutMatiere)}</p>}
              </div>
            ))}
          </div>
          <div className="min-w-0 sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Rendement</p>
            <p className="mt-1 text-[56px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground">{fmt(resultat.rendement, 1)}<span className="text-2xl text-muted-foreground"> %</span></p>
          </div>
        </div>
        <p className="mt-4 text-xs tabular-nums text-muted-foreground">{fmt(resultat.longueurUtile)} mm de pièces / {fmt(resultat.longueurTotale)} mm {resultat.nbBarresStock > 0 ? `de barres (dont ${fmt(longueurDuStock(resultat))} mm du stock)` : "achetés"}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Chutes réutilisables" value={`${fmt(resultat.longueurChutesReutilisables)} mm (${fmt(matiere?.parts[1].affiche ?? 0, 1)} %)`} hint="De la matière achetée" accent="warning" />
        <StatCard label="Perte définitive" value={`${fmt(matiere?.perte ?? 0)} mm (${fmt(matiere?.parts[2].affiche ?? 0, 1)} %)`} hint="Matière réellement jetée" />
      </div>
      <ChutesAConserver resultat={resultat} options={chutesPDF} onChange={setChutesPDF} />
      <div className="border-y border-border py-4 text-sm tabular-nums">
        <h2 className="mb-1 font-semibold">Bilan matière</h2>
        <p>{fmt(resultat.longueurTotale)} mm = {fmt(resultat.longueurUtile)} pièces + {fmt(resultat.longueurTraitsScie)} traits de scie + {fmt(resultat.longueurMarges)} marges + {fmt(resultat.longueurChutes)} chutes</p>
        <p className="mt-2">{matiere?.repartition}</p>
        <div aria-label="Répartition du bilan matière" className="mt-4 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
          {matiere?.parts.map((part, i) => <div key={i} title={`${["Pièces", "Chutes réutilisables", "Perte définitive"][i]} : ${fmt(part.value)} mm (${fmt(part.affiche, 1)} %)`} className={["bg-foreground", "bg-signal", "bg-[color:var(--hatch)]"][i]} style={{ width: `${part.pourcentage}%` }} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {matiere?.parts.map((part, i) => <span key={i} className="flex items-center gap-2"><i className={"h-2.5 w-2.5 rounded-sm " + ["bg-foreground", "bg-signal", "bg-[color:var(--hatch)]"][i]} />{["Pièces", "Chutes réutilisables", "Perte définitive"][i]} <span className="font-mono text-foreground">{fmt(part.value)} mm</span></span>)}
        </div>
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Plan de découpe par barre</CardTitle>
            <CardDescription>
              Schéma visuel et instructions de coupe — chutes à conserver signalées en bleu
            </CardDescription>
          </div>
          <button type="button" onClick={() => setToutDeplie((v) => !v)} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {toutDeplie ? "Replier les détails" : "Déplier tous les détails"}
          </button>
        </CardHeader>
        <CardContent className="space-y-10">
          <LegendeBarres pieces={pieces} pieceIds={pieceIds} />
          {resultat.profils.map((rp) => (
          <div key={rp.profil || "_"} className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-foreground/80 pb-2">
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em]">Profilé : {libelleProfil(rp.profil)}</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              Barre {fmt(rp.longueurBarre)} mm · Sous-total : <span className="font-semibold text-foreground">{fmt(rp.resultat.nbBarres)} barre{rp.resultat.nbBarres > 1 ? "s" : ""}</span> · Rendement {fmt(rp.resultat.rendement, 1)} %
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
                      · {fmt(barre.longueurBrute)} mm
                      {barre.longueurBrute !== barre.longueurBarre
                        ? ` (utile ${fmt(barre.longueurBarre)} mm)`
                        : ""}· {barre.coupes.length} coupe{barre.coupes.length > 1 ? "s" : ""}
                    </span>
                  </h3>
                </div>
                <BarreSchema barre={barre} traitScie={traitScie} pieceIds={pieceIds} libelle={libelleGroupe(groupe)} methodeCoupe={methodeCoupe} />
                {/* Tableau de coupe replie par defaut a l'ecran (le PDF atelier le garde toujours) */}
                <details key={`${groupe.signature}-${toutDeplie}`} open={toutDeplie || undefined} className="group">
                <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
                  Détail des coupes ({coupesGroupes.length} ligne{coupesGroupes.length > 1 ? "s" : ""})
                </summary>
                <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground">Cotes mesurées depuis l’extrémité brute de la barre</p>
                {methodeCoupe === "ruban" && <p className="text-xs font-semibold text-foreground">{RAPPEL_RUBAN}</p>}
                <div className="overflow-hidden rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-12 text-right text-xs font-semibold text-foreground">#</TableHead>
                        <TableHead className="w-[25%] text-xs font-semibold text-foreground">Pièce</TableHead>
                        <TableHead className="w-40 text-right text-xs font-semibold text-foreground">Longueur de coupe (mm)</TableHead>
                        <TableHead className="w-24 text-right text-xs font-semibold text-foreground">Quantité</TableHead>
                        <TableHead className="w-[40%] whitespace-nowrap text-right text-xs font-semibold text-foreground">Repère cumulé (mm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupesGroupes.map((g, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-right text-xs tabular-nums font-semibold text-foreground">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium text-foreground">{g.nom}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{fmt(g.longueur)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{fmt(g.quantite)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right text-xs tabular-nums">{lignesReperes(g.reperes, methodeCoupe).map((l, k) => <div key={k}>{l}</div>)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </div>
                </details>
              </div>
            );
          })}
          </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
