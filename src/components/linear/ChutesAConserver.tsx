import { formatNombre as fmt } from "@/lib/format-number";
import { Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { libelleProfil, type ResultatMulti } from "@/lib/multi-profil";
import { chutesAConserver } from "@/lib/chutes";
import { OffcutPDFOptions } from "@/components/OffcutPDFOptions";
import { cleChute, choixChute, type OptionsChutesPDF } from "@/lib/offcut-settings";

export function ChutesAConserver({ resultat, options, onChange }: { resultat: ResultatMulti; options: OptionsChutesPDF; onChange: (v: OptionsChutesPDF) => void }) {
  const groupes = chutesAConserver(resultat);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{options.mode === "instruction" ? "Chutes à conserver" : options.mode === "indicative" ? "Chutes conservables" : "Chutes réutilisables"}</CardTitle>
        <CardDescription>Par profilé, de la plus longue à la plus courte</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4"><OffcutPDFOptions value={options} onChange={onChange} /></div>
        {groupes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune chute à conserver.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Profilé</TableHead>
                  <TableHead className="w-[20%] text-right">Longueur de chute (mm)</TableHead>
                  <TableHead className="w-[15%] text-right">Quantité</TableHead>
                  <TableHead className="text-left">Barres d’origine</TableHead>
                  {options.mode === "instruction" && <><TableHead>À conserver</TableHead><TableHead className="min-w-56">Note</TableHead></>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupes.map((g) => (
                  <Fragment key={g.profil || "_"}>
                    {g.lignes.map((l) => (
                      <TableRow key={l.longueur}>
                        <TableCell className="text-xs normal-case">{libelleProfil(g.profil)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt(l.longueur)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmt(l.quantite)}</TableCell>
                        <TableCell className="text-left text-xs tabular-nums">{l.origine}</TableCell>
                        {options.mode === "instruction" && <>
                          <TableCell><Checkbox aria-label={`À conserver : ${libelleProfil(g.profil)}, ${fmt(l.longueur)} mm`} checked={choixChute(options, l).conserver} onCheckedChange={v => onChange({ ...options, choix: { ...options.choix, [cleChute(g.profil, l.longueur)]: { ...choixChute(options, l), conserver: v === true } } })} /></TableCell>
                          <TableCell><Input aria-label={`Note : ${libelleProfil(g.profil)}, ${fmt(l.longueur)} mm`} value={choixChute(options, l).note} onChange={e => onChange({ ...options, choix: { ...options.choix, [cleChute(g.profil, l.longueur)]: { ...choixChute(options, l), note: e.target.value } } })} /></TableCell>
                        </>}
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell className="text-xs font-semibold normal-case">Total {libelleProfil(g.profil)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">{fmt(g.totalMm / 1000, 2)} m linéaires réutilisables{options.mode === "instruction" && ` · ${fmt(g.lignes.filter(l => choixChute(options, l).conserver).reduce((s, l) => s + l.longueur * l.quantite, 0) / 1000, 2)} m à conserver`}</TableCell>
                      <TableCell colSpan={options.mode === "instruction" ? 4 : 2} />
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
