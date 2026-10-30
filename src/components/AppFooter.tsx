import { LienRetour } from "./LienRetour";
import { useState } from "react";
import { BackupLink, BackupReminder } from "@/components/BackupControls";
import { BACKUP_CONFIG } from "@/lib/backup-config";
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
        · {APP_YEAR} · <BackupLink cfg={BACKUP_CONFIG} appName={APP_NAME} /> · <LienRetour app="Linear" version={APP_VERSION} />
      </p>
      <BackupReminder cfg={BACKUP_CONFIG} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm text-left">
          {/* Meme presentation que Format : titre, logo + nom + version, auteur, description, date */}
          <DialogHeader className="text-left">
            <DialogTitle className="mb-1 text-sm font-semibold text-foreground">À propos</DialogTitle>
            <DialogDescription className="sr-only">À propos de {APP_NAME}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <LinearMark size={40} className="shrink-0" />
            <div>
              <p className="text-lg font-bold leading-tight text-foreground">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">Version {APP_VERSION}</p>
            </div>
          </div>
          <p className="text-sm text-foreground">Conçu et développé par {APP_AUTHOR}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{APP_TAGLINE}</p>
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">Dernière mise à jour : {APP_UPDATED}</p>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
