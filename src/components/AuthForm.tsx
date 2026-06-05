import { useState, type FormEvent } from "react";
import { Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (mode: "signin" | "signup", e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setInfo("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-5 w-5" />
          </div>
          <CardTitle className="mt-2">Optibarre</CardTitle>
          <CardDescription>Connectez-vous pour accéder à vos projets de débit</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            {(["signin", "signup"] as const).map((mode) => (
              <TabsContent key={mode} value={mode}>
                <form onSubmit={(e) => submit(mode, e)} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor={`email-${mode}`}>Email</Label>
                    <Input
                      id={`email-${mode}`}
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`password-${mode}`}>Mot de passe</Label>
                    <Input
                      id={`password-${mode}`}
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {info && <p className="text-sm text-muted-foreground">{info}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? "Veuillez patienter…"
                      : mode === "signin"
                      ? "Se connecter"
                      : "Créer mon compte"}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
