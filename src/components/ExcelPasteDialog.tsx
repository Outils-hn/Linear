import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Piece } from "@/lib/optimizer";

type ColRole = "repere" | "longueur" | "quantite" | "barre" | "ignorer";
const MAP_KEY = "linear:excel-colmap:v1";

export function parseNombre(s: string): number {
  const c = (s ?? "").replace(/[\s\u00A0\u202F]/g, "").replace(",", ".");
  if (c === "" || !/^-?\d*\.?\d+$/.test(c)) return NaN;
  return Number(c);
}

// Extrait le nombre d'une cellule en ignorant le texte autour (unités, espaces insécables)
function extraireNombre(s: string): { valeur: number; unite: string } | null {
  const c = (s ?? "").replace(/[\s\u00A0\u202F]/g, "").replace(",", ".");
  const m = c.match(/(-?\d*\.?\d+)([a-zA-Z]*)/);
  if (!m) return null;
  return { valeur: Number(m[1]), unite: (m[2] ?? "").toLowerCase() };
}

export function parseLongueur(s: string): number {
  const e = extraireNombre(s);
  if (!e) return NaN;
  if (e.unite === "cm") return e.valeur * 10;
  if (e.unite === "m") return e.valeur * 1000;
  if (e.unite === "" || e.unite === "mm") return e.valeur;
  return NaN; // unité inconnue
}

export function parseQuantite(s: string): number {
  const e = extraireNombre(s);
  if (!e) return NaN;
  if (e.unite === "" || /^(pces?|pcs?|u|unites?|x)$/.test(e.unite)) return e.valeur;
  return NaN;
}

function splitRows(text: string): string[][] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => l.split("\t").map((c) => c.trim()));
}

function roleFromHeader(h: string): ColRole | null {
  const s = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (/^(rep|designation|profil|nom|ref)/.test(s)) return "repere";
  if (/^(barre|stock)/.test(s)) return "barre";
  if (/^(long|l$|l\s|lg)/.test(s)) return "longueur";
  if (/^(qte|qt|quantite|nb|nombre|q$)/.test(s)) return "quantite";
  return null;
}

function detect(rows: string[][], nCols: number): { header: boolean; roles: ColRole[] } {
  const first = rows[0] ?? [];
  const header = first.some((c) => c !== "" && isNaN(parseNombre(c))) &&
    first.some((c) => roleFromHeader(c) !== null);
  let roles: ColRole[] = Array(nCols).fill("ignorer");
  const used = new Set<ColRole>();
  if (header) {
    first.forEach((h, i) => {
      const r = roleFromHeader(h);
      if (r && !used.has(r)) { roles[i] = r; used.add(r); }
    });
  }
  if (!used.has("longueur") || !used.has("repere") || !used.has("quantite")) {
    const data = header ? rows.slice(1) : rows;
    const stats = Array.from({ length: nCols }, (_, i) => {
      const vals = data.map((r) => r[i] ?? "").filter((v) => v !== "");
      const nums = vals.map((v) => { const n = parseLongueur(v); return isNaN(n) ? parseNombre(v) : n; }).filter((n) => !isNaN(n));
      const numeric = vals.length > 0 && nums.length / vals.length > 0.8;
      const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      const ints = nums.every((n) => Number.isInteger(n));
      return { i, numeric, avg, ints, has: vals.length > 0 };
    });
    const free = stats.filter((s) => roles[s.i] === "ignorer" && s.has);
    if (!used.has("longueur")) {
      const c = free.filter((s) => s.numeric).sort((a, b) => b.avg - a.avg)[0];
      if (c) { roles[c.i] = "longueur"; used.add("longueur"); }
    }
    if (!used.has("quantite")) {
      const c = free.filter((s) => roles[s.i] === "ignorer" && s.numeric && s.ints && s.avg < 1000)
        .sort((a, b) => a.avg - b.avg)[0];
      if (c) { roles[c.i] = "quantite"; used.add("quantite"); }
    }
    if (!used.has("repere")) {
      const c = free.find((s) => roles[s.i] === "ignorer" && !s.numeric);
      if (c) { roles[c.i] = "repere"; used.add("repere"); }
    }
  }
  return { header, roles };
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialText: string;
  longueurBarre: number;
  onSetBarre: (v: number) => void;
  onImport: (pieces: Omit<Piece, "id">[], mode: "replace" | "append", info: { lignes: number; ignorees: number }) => void;
}

export function ExcelPasteDialog({ open, onOpenChange, initialText, longueurBarre, onSetBarre, onImport }: Props) {
  const [text, setText] = useState("");
  const [roles, setRoles] = useState<ColRole[]>([]);
  const [header, setHeader] = useState(false);
  const [fusion, setFusion] = useState(true);

  useEffect(() => { if (open) setText(initialText); }, [open, initialText]);

  const rows = useMemo(() => splitRows(text), [text]);
  const nCols = useMemo(() => rows.reduce((m, r) => Math.max(m, r.length), 0), [rows]);

  useEffect(() => {
    if (!nCols) { setRoles([]); return; }
    const d = detect(rows, nCols);
    setHeader(d.header);
    let r = d.roles;
    try {
      const saved = JSON.parse(localStorage.getItem(MAP_KEY) || "null");
      if (saved && Array.isArray(saved.roles) && saved.roles.length === nCols) r = saved.roles;
    } catch { /* ignore */ }
    setRoles(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const setRole = (i: number, r: ColRole) => {
    const next = roles.map((x, j) => (j === i ? r : r !== "ignorer" && x === r ? "ignorer" : x));
    setRoles(next);
    try { localStorage.setItem(MAP_KEY, JSON.stringify({ roles: next })); } catch { /* ignore */ }
  };

  const analyse = useMemo(() => {
    const iR = roles.indexOf("repere"), iL = roles.indexOf("longueur"), iQ = roles.indexOf("quantite"), iB = roles.indexOf("barre");
    const data = (header ? rows.slice(1) : rows).map((r, k) => ({ r, ligne: k + 1 + (header ? 1 : 0) }));
    const valides: Omit<Piece, "id">[] = [];
    const erreurs: { ligne: number; msg: string }[] = [];
    const barreVals: number[] = [];
    for (const { r, ligne } of data) {
      const nom = iR >= 0 ? r[iR] ?? "" : "";
      const L = iL >= 0 ? parseLongueur(r[iL] ?? "") : NaN;
      const Q = iQ >= 0 ? parseQuantite(r[iQ] ?? "") : 1;
      if (iB >= 0) { const b = parseLongueur(r[iB] ?? ""); if (!isNaN(b) && b > 0) barreVals.push(b); }
      if (iL < 0 || isNaN(L) || L <= 0) { erreurs.push({ ligne, msg: "longueur vide ou non numérique" }); continue; }
      if (L > longueurBarre) { erreurs.push({ ligne, msg: `longueur ${L} > barre ${longueurBarre}` }); continue; }
      if (isNaN(Q) || !Number.isInteger(Q) || Q <= 0) { erreurs.push({ ligne, msg: "quantité non entière ou nulle" }); continue; }
      valides.push({ nom, longueur: L, quantite: Q });
    }
    let out = valides;
    if (fusion) {
      const m = new Map<string, Omit<Piece, "id">>();
      for (const v of valides) {
        const k = `${v.nom}\u0000${v.longueur}`;
        const e = m.get(k);
        if (e) e.quantite += v.quantite; else m.set(k, { ...v });
      }
      out = [...m.values()];
    }
    const barreUnique = barreVals.length > 0 && barreVals.every((b) => b === barreVals[0]) ? barreVals[0] : null;
    const barreVariee = barreVals.length > 1 && barreUnique === null;
    return { out, erreurs, nValides: valides.length, barreUnique, barreVariee };
  }, [rows, roles, header, fusion, longueurBarre]);

  const doImport = (mode: "replace" | "append") => {
    onImport(analyse.out, mode, { lignes: analyse.nValides, ignorees: analyse.erreurs.length });
    onOpenChange(false);
  };

  const preview = rows.slice(0, 5);
  const errLines = new Set(analyse.erreurs.map((e) => e.ligne));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Coller depuis Excel</DialogTitle>
          <DialogDescription>Copiez vos cellules dans Excel puis collez-les ici (Ctrl+V).</DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Repère\tLongueur\tQté\nMontant\t2450\t4"}
          className="h-28 w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
          autoFocus
        />
        {nCols > 0 && (
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="w-10 p-1 text-muted-foreground">#</th>
                  {Array.from({ length: nCols }, (_, i) => (
                    <th key={i} className="p-1">
                      <Select value={roles[i] ?? "ignorer"} onValueChange={(v) => setRole(i, v as ColRole)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="repere">Repère</SelectItem>
                          <SelectItem value="longueur">Longueur (mm)</SelectItem>
                          <SelectItem value="quantite">Quantité</SelectItem>
                          <SelectItem value="ignorer">Ignorer</SelectItem>
                        </SelectContent>
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, k) => {
                  const isHead = header && k === 0;
                  const bad = errLines.has(k + 1);
                  return (
                    <tr key={k} className={isHead ? "bg-muted font-semibold" : bad ? "bg-destructive/10 text-destructive" : ""}>
                      <td className="p-1 text-center text-muted-foreground">{k + 1}</td>
                      {Array.from({ length: nCols }, (_, i) => (
                        <td key={i} className={`p-1 ${roles[i] === "ignorer" ? "opacity-40" : ""}`}>{r[i] ?? ""}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 5 && <p className="p-1 text-xs text-muted-foreground">… {rows.length - 5} autre(s) ligne(s)</p>}
          </div>
        )}
        {analyse.erreurs.length > 0 && (
          <div className="max-h-28 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {analyse.erreurs.map((e) => (
              <div key={e.ligne}>Ligne {e.ligne} : {e.msg}</div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Checkbox id="fusion" checked={fusion} onCheckedChange={(v) => setFusion(!!v)} />
            <Label htmlFor="fusion">Fusionner les doublons</Label>
          </div>
          <span className="text-muted-foreground">
            {analyse.nValides} ligne(s) valide(s) · {analyse.erreurs.length} invalide(s)
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={!analyse.out.length} onClick={() => doImport("append")}>Ajouter à la liste</Button>
          <Button disabled={!analyse.out.length} onClick={() => doImport("replace")}>Remplacer la liste</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
