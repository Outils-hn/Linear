import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatNombre } from "@/lib/format-number";
import { parseNombre } from "@/lib/parse-nombre";

interface Props extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (n: number) => void;
  /** Signalé quand le champ est vide ou non numérique (rien n'est alors écrit dans le modèle). */
  onVide?: (vide: boolean) => void;
  /** Affiche le contour rouge d'erreur. */
  erreur?: boolean;
}

/** Affichage au format suisse/francais du reste de l'appli : « 1 200 », « 437,5 ». */
const afficher = (n: number) => (Number.isFinite(n) ? formatNombre(n) : "");

/**
 * Champ numérique de saisie atelier :
 * - affiche les nombres comme partout ailleurs (« 1 200 », « 437,5 ») ;
 * - accepte la virgule ou le point, et les séparateurs de milliers (espace, apostrophe) ;
 * - un champ vidé reste vide pendant la saisie (jamais de 0 forcé) ;
 * - le contenu est sélectionné au clic pour taper directement par-dessus.
 */
export function ChampNombre({ value, onChange, onVide, erreur, onFocus, onBlur, ...rest }: Props) {
  const [texte, setTexte] = useState(afficher(value));
  const focusRef = useRef(false);

  useEffect(() => {
    if (!focusRef.current) setTexte(afficher(value));
  }, [value]);

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={texte}
      aria-invalid={erreur || undefined}
      className={`champ-nombre ${rest.className ?? ""} ${erreur ? "border-destructive focus-visible:ring-destructive" : ""}`.trim()}
      onFocus={(e) => {
        focusRef.current = true;
        e.target.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusRef.current = false;
        // Remise en forme a la sortie du champ (« 1200 » devient « 1 200 »), sauf s'il est vide ou illisible
        const n = parseNombre(texte);
        if (Number.isFinite(n)) setTexte(afficher(n));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setTexte(v);
        if (v.trim() === "") {
          onVide?.(true);
          return;
        }
        const n = parseNombre(v);
        if (Number.isFinite(n)) {
          onVide?.(false);
          onChange(n);
        } else {
          onVide?.(true);
        }
      }}
    />
  );
}
