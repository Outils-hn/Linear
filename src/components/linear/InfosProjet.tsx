import { lireStatutMatiere, STATUTS_MATIERE } from "@/lib/material-status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LinearApp } from "@/hooks/use-linear-app";

/** Carte « Informations du projet » (chantier, tache, client, statut matiere). */
export function InfosProjet({ app }: { app: LinearApp }) {
  const { chantier, client, dateProjet, numeroTache, setChantier, setClient, setDateProjet, setNumeroTache, setStatutMatiere, statutMatiere } = app;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du projet</CardTitle>
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
        <div className="space-y-2">
          <Label htmlFor="statut-matiere">Statut de la matière</Label>
          <Select value={statutMatiere.statut} onValueChange={v => setStatutMatiere(s => ({ ...s, statut: lireStatutMatiere({ statut: v }).statut }))}>
            <SelectTrigger id="statut-matiere" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STATUTS_MATIERE).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {statutMatiere.statut === "commandee" && <>
          <div className="space-y-2"><Label htmlFor="date-commande">Date de commande</Label><Input id="date-commande" type="date" value={statutMatiere.dateCommande} onChange={e => setStatutMatiere(s => ({ ...s, dateCommande: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="fournisseur">Fournisseur</Label><Input id="fournisseur" value={statutMatiere.fournisseur} onChange={e => setStatutMatiere(s => ({ ...s, fournisseur: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="numero-commande">N° de commande</Label><Input id="numero-commande" value={statutMatiere.numeroCommande} onChange={e => setStatutMatiere(s => ({ ...s, numeroCommande: e.target.value }))} /></div>
        </>}
      </CardContent>
    </Card>
  );
}
