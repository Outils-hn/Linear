import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LinearMark } from "@/components/LinearMark";
import {
  APP_NAME,
  APP_VERSION,
  APP_AUTHOR,
  APP_YEAR,
  APP_UPDATED,
  APP_TAGLINE,
} from "@/lib/version";

/**
 * Signature discrète, uniquement à l'écran (jamais dans le PDF ni Excel) :
 * pied de page centré en bas de chaque page, « Conçu par … » ouvre la
 * fenêtre « À propos ».
 */
export function AppFooter() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="py-4 text-center">
      <p className="text-xs text-muted-foreground/60">
        {APP_NAME} v{APP_VERSION} ·{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-inherit underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Conçu par {APP_AUTHOR}
        </button>{" "}
        · {APP_YEAR}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            <div className="mb-1 flex items-center justify-center gap-2">
              <LinearMark size={32} />
              <DialogTitle className="text-xl tracking-tight">
                {APP_NAME}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              À propos de {APP_NAME}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
              Version {APP_VERSION}
            </p>
            <p className="text-foreground">Conçu et développé par {APP_AUTHOR}</p>
            <p className="leading-relaxed">{APP_TAGLINE}</p>
            <p className="pt-1 text-xs text-muted-foreground/70">
              Dernière mise à jour : {APP_UPDATED}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
