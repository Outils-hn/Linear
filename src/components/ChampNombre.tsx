import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface Props extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (n: number) => void;
  /** Signalé quand le champ est vide ou non numérique (rien n'est alors écrit dans le modèle). */
  onVide?: (vide: boolean) => void;
  /** Affiche le contour rouge d'erreur. */
  erreur?: boolean;
}

/**
 * Champ numérique de saisie atelier :
 * - un champ vidé reste vide pendant la saisie (jamais de 0 forcé) ;
 * - le contenu est sélectionné au clic pour taper directement par-dessus ;
 * - la valeur du modèle n'est mise à jour que quand le texte est un nombre valide.
 */
export function ChampNombre({ value, onChange, onVide, erreur, onFocus, onBlur, ...rest }: Props) {
  const [texte, setTexte] = useState(String(value));
  const focusRef = useRef(false);

  useEffect(() => {
    if (!focusRef.current) setTexte(String(value));
  }, [value]);

  return (
    <Input
      {...rest}
      type="number"
      value={texte}
      aria-invalid={erreur || undefined}
      className={`${rest.className ?? ""} ${erreur ? "border-destructive focus-visible:ring-destructive" : ""}`.trim()}
      onFocus={(e) => {
        focusRef.current = true;
        e.target.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusRef.current = false;
        onBlur?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setTexte(v);
        if (v.trim() === "") {
          onVide?.(true);
          return;
        }
        const n = Number(v);
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
