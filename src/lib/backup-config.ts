import type { BackupConfig } from "./full-backup";

/** Sauvegarde complete de l'appli : quelles cles localStorage, et rappel apres combien de jours. */
export const BACKUP_CONFIG: BackupConfig = {
  app: "linear",
  prefixes: ["linear:", "linear-theme"],
  dateKey: "linear:full-backup-date",
  reminderDays: 7,
};
