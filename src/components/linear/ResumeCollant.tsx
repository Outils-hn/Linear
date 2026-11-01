import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { formatNombre as fmt } from "@/lib/format-number";
import type { LinearApp } from "@/hooks/use-linear-app";

/** Pastille en bas de l'ecran apres un calcul : resume + lien vers le resultat (visible seulement si le resultat est hors ecran). */
export function ResumeCollant({ app }: { app: LinearApp }) {
  const { resultat, perime } = app;
  const [horsEcran, setHorsEcran] = useState(false);
  const actif = !!resultat && resultat.nbBarres > 0 && !perime;
  useEffect(() => {
    if (!actif) { setHorsEcran(false); return; }
    const el = document.getElementById("resultats");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHorsEcran(!e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [actif, resultat]);
  if (!actif || !horsEcran || !resultat) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex justify-center sm:inset-x-auto sm:bottom-5 sm:right-5 print:hidden">
      <button type="button" onClick={() => document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" })}
        className="flex w-full items-center justify-between gap-3 rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_12px_32px_-8px_rgb(0_0_0/0.35)] sm:w-auto">
        <span className="tabular-nums">{fmt(resultat.nbBarres)} barre{resultat.nbBarres > 1 ? "s" : ""} · {fmt(resultat.rendement, 1)} %</span>
        <span className="flex items-center gap-1 opacity-90">Voir le résultat <ArrowDown className="size-4" /></span>
      </button>
    </div>
  );
}
