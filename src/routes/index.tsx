import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { profilDemarrage } from "@/lib/local-store";
import { useLinearApp } from "@/hooks/use-linear-app";
import { EnTete } from "@/components/linear/EnTete";
import { InfosProjet } from "@/components/linear/InfosProjet";
import { ParametresProfile } from "@/components/linear/ParametresProfile";
import { PiecesACouper } from "@/components/linear/PiecesACouper";
import { StockBarres } from "@/components/linear/StockBarres";
import { Resultats } from "@/components/linear/Resultats";
import { DialoguesProjet } from "@/components/linear/DialoguesProjet";

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

function Index() {
  const [profileId, setProfileId] = useState<string | null>(null);

  // Plus d'ecran de profil : on ouvre directement le profil de travail
  useEffect(() => {
    setProfileId(profilDemarrage());
  }, []);

  if (!profileId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }
  return <App profileId={profileId} />;
}

function App({ profileId }: { profileId: string }) {
  const app = useLinearApp(profileId);
  const { strategie, resultat } = app;
  // Ctrl + Entree (Cmd + Entree sur Mac) : lance l'optimisation depuis n'importe quel champ
  const lancerRef = useRef(app.lancer);
  lancerRef.current = app.lancer;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void lancerRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="rail-page flex-1">
      <EnTete app={app} />

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <InfosProjet app={app} />

        <div className="grid gap-6 lg:grid-cols-3">
          <ParametresProfile app={app} />

          <PiecesACouper app={app} />
        </div>


        {strategie === "priorite-stock" && (
          <StockBarres app={app} />
        )}

        {resultat && resultat.nbBarres > 0 && (
          <Resultats app={app} />
        )}

        {resultat && resultat.nbBarres === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune pièce valide à optimiser. Vérifiez que les longueurs ne dépassent pas celle de la barre.
            </CardContent>
          </Card>
        )}
      </main>

      <DialoguesProjet app={app} />
    </div>
  );
}
