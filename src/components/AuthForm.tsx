import { useEffect, useState, type FormEvent } from "react";
import { LinearMark } from "@/components/LinearMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Plus, Trash2 } from "lucide-react";
import { listProfiles, deleteProfile, type ProfileMeta } from "@/lib/local-store";
import { formatNombre } from "@/lib/format-number";

export function AuthForm({ onSelect }: { onSelect: (profileId: string) => void }) {
  const [profiles, setProfiles] = useState<ProfileMeta[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfiles(listProfiles());
  }, []);

  const refresh = () => setProfiles(listProfiles());

  const create = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("Indiquez un nom de profil ou de poste de travail.");
      return;
    }
    setError(null);
    onSelect(name);
  };

  const remove = (id: string) => {
    deleteProfile(id);
    refresh();
  };

  return (
    <div className="relative flex flex-1 items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </div>
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="items-center text-center">
          <LinearMark size={44} className="mx-auto" />
          <CardTitle className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.28em]">
            Linear
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Atelier · Optimisation de débit 1D
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profil de travail</p>
            <p className="text-sm text-foreground/90">
              Choisissez un profil existant ou créez un nouveau poste. Tous les projets sont conservés localement
              sur ce navigateur, sans aucun compte ni connexion.
            </p>
          </div>

          {profiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Profils existants
              </Label>
              <div className="space-y-1.5">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="group flex items-center gap-2 rounded-md border border-border bg-background/40 p-2 transition hover:border-primary/50"
                  >
                    <button
                      onClick={() => onSelect(p.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatNombre(p.projectCount)} projet{p.projectCount > 1 ? "s" : ""}
                        </span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(p.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Supprimer ce profil et tous ses projets"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={create} className="space-y-3 border-t border-border pt-4">
            <Label htmlFor="profile-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Nouveau profil
            </Label>
            <Input
              id="profile-name"
              placeholder="Ex : Atelier — Poste 1, Jean, Menuiserie…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Créer et entrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
