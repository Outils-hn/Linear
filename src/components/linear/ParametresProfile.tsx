import { formatNombre as fmt } from "@/lib/format-number";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POSITION_MARGE_LABELS, type PositionMarge, type Strategie } from "@/lib/optimizer";
import { seuilPourProfil } from "@/lib/multi-profil";
import { ChampNombre } from "@/components/ChampNombre";
import { lireMethodeCoupe, METHODES_COUPE } from "@/lib/cut-method";
import type { LinearApp } from "@/hooks/use-linear-app";

/** Carte « Parametres du profile » (barre, marge, trait de scie, strategie). */
export function ParametresProfile({ app }: { app: LinearApp }) {
  const { erreursChamps, longueurBarre, longueurUtile, longueursProfils, margeSecurite, marquerVide, methodeCoupe, positionMarge, profilsNommes, resultat, setLongueurBarre, setLongueursProfils, setMargeSecurite, setMethodeCoupe, setPositionMarge, setResultat, setSeuilChute, setSeuilsProfils, setStrategie, setTraitScie, seuilChute, seuilsProfils, stock, strategie, traitScie } = app;
  return (
    <Card className="min-w-0 lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base">Paramètres du profilé</CardTitle>
        <CardDescription>Configuration de la barre de base</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lb">Longueur de la barre de base</Label>
          <div className="parameter-measure">
          <ChampNombre
            id="lb"
            value={longueurBarre}
            onChange={setLongueurBarre}
            onVide={(v) => marquerVide("lb", v)}
            erreur={erreursChamps.has("lb")}
          />
            <span aria-hidden="true">mm</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ms">Marge de rafraîchissement / sécurité</Label>
          <div className="parameter-measure">
          <ChampNombre
            id="ms"
            value={margeSecurite}
            onChange={setMargeSecurite}
            onVide={(v) => marquerVide("ms", v)}
            erreur={erreursChamps.has("ms")}
          />
            <span aria-hidden="true">mm</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Longueur utile pour l'optimisation :{" "}
            <span className="font-semibold text-foreground">{fmt(longueurUtile)} mm</span>
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
          <Label htmlFor="methode-coupe">Méthode de coupe à l'atelier</Label>
          <Select value={methodeCoupe} onValueChange={(v) => setMethodeCoupe(lireMethodeCoupe(v))}>
            <SelectTrigger id="methode-coupe"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(METHODES_COUPE).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ts">Épaisseur du trait de scie</Label>
          <div className="parameter-measure">
          <ChampNombre
            id="ts"
            value={traitScie}
            onChange={setTraitScie}
            onVide={(v) => marquerVide("ts", v)}
            erreur={erreursChamps.has("ts")}
          />
            <span aria-hidden="true">mm</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="seuil-chute">Chute mini à conserver{profilsNommes.length > 0 ? " (sans profilé)" : ""}</Label>
          <div className="parameter-measure">
          <ChampNombre
            id="seuil-chute"
            value={seuilChute}
            onChange={(n) => setSeuilChute(Math.max(0, n))}
            onVide={(v) => marquerVide("seuil-chute", v)}
            erreur={erreursChamps.has("seuil-chute")}
          />
            <span aria-hidden="true">mm</span>
          </div>
        </div>
        {profilsNommes.length > 0 && (
          <div className="space-y-2">
            <Label>Longueur de barre par profilé</Label>
            {profilsNommes.map((pr) => (
              <div key={pr} className="grid grid-cols-2 items-center gap-2">
                <Label htmlFor={`longueur-profile-${pr}`} className="whitespace-normal break-words text-xs font-medium normal-case">{pr}</Label>
                <div className="parameter-measure">
                <ChampNombre
                  id={`longueur-profile-${pr}`}
                  className="h-8"
                  value={longueursProfils[pr] ?? longueurBarre}
                  onChange={(n) => setLongueursProfils((m) => ({ ...m, [pr]: n }))}
                  onVide={(v) => marquerVide(`longueur-profile-${pr}`, v)}
                  erreur={erreursChamps.has(`longueur-profile-${pr}`)}
                />
                  <span aria-hidden="true">mm</span>
                </div>
                <Label htmlFor={`seuil-profile-${pr}`} className="text-xs font-normal normal-case text-muted-foreground">Chute mini à conserver</Label>
                <div className="parameter-measure">
                <ChampNombre
                  id={`seuil-profile-${pr}`}
                  className="h-8"
                  value={seuilPourProfil(pr, seuilsProfils, seuilChute)}
                  onChange={(n) => setSeuilsProfils((m) => ({ ...m, [pr]: Math.max(0, n) }))}
                  onVide={(v) => marquerVide(`seuil-profile-${pr}`, v)}
                  erreur={erreursChamps.has(`seuil-profile-${pr}`)}
                />
                  <span aria-hidden="true">mm</span>
                </div>
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
              <SelectItem value="priorite-stock">Utiliser d'abord les chutes disponibles</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {strategie === "min-barres" && "Utilise le moins de barres possible à partir de la barre de base."}
            {strategie === "priorite-stock" &&
              "Place d'abord les coupes dans les chutes et barres disponibles, complète avec la barre de base."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
