// Logique de l'ecran principal de Linear, sortie de src/routes/index.tsx sans modification.
import { formatNombre as fmt } from "@/lib/format-number";
import { bilanMatiere } from "@/lib/material-summary";
import { lireStatutMatiere, type StatutMatiere } from "@/lib/material-status";
import { useEffect, useMemo, useState } from "react";
import { ecrireReglages, lireReglages } from "@/lib/reglages";
import { toast } from "sonner";
import { type PositionMarge, type Piece, type Strategie, type StockBarre } from "@/lib/optimizer";
import { optimiserParProfil, listeProfils, seuilPourProfil, piecesTropLongues, type ResultatMulti } from "@/lib/multi-profil";
import { optionsChutesDefaut, lireOptionsChutes, type OptionsChutesPDF } from "@/lib/offcut-settings";
import { lireMethodeCoupe, type MethodeCoupe } from "@/lib/cut-method";
import { exporterPDF } from "@/lib/export-pdf";
import { verifierResultat } from "@/lib/verification";
import { lireJson } from "@/lib/backup";
import { listProjects, upsertProject, deleteProject, type LocalProject } from "@/lib/local-store";
import { raisonRefus, type TypeChamp } from "@/lib/controle-saisie";
import { CLE_PROJET_COURANT, empreinteCalcul, lireProjetCourant, type ProjetCourant } from "@/lib/projet-courant";


export let idCounter = 0;
export const nextId = () => `p${++idCounter}`;
export let stockCounter = 0;
export const nextStockId = () => `s${++stockCounter}`;
/** Apres un rechargement ou l'ouverture d'un projet : les compteurs repartent apres les
 *  identifiants deja presents (sinon une piece ajoutee reprend l'id « p1 » d'une piece existante). */
export function avancerCompteurs(pieces: { id: string }[], stock: { id: string }[]) {
  const max = (ids: string[], prefixe: string) =>
    ids.reduce((m, id) => (id.startsWith(prefixe) && /^\d+$/.test(id.slice(1)) ? Math.max(m, Number(id.slice(1))) : m), 0);
  idCounter = Math.max(idCounter, max(pieces.map((p) => p.id), "p"));
  stockCounter = Math.max(stockCounter, max(stock.map((x) => x.id), "s"));
}

// Plus de pieces d'exemple au demarrage : on les confondait avec une vraie liste.
export const DEFAULT_PIECES: Piece[] = [];


/**
 * Tout l'etat et toute la logique de l'ecran Linear (projets, pieces, calcul, exports).
 * Les composants de src/components/linear/ recoivent ce que renvoie ce hook (`app`)
 * et ne font qu'afficher : la logique reste a un seul endroit.
 */
export function useLinearApp(profileId: string) {
  const [chantier, setChantier] = useState("");
  const [numeroTache, setNumeroTache] = useState("");
  const [client, setClient] = useState("");
  const [dateProjet, setDateProjet] = useState(() => new Date().toISOString().slice(0, 10));
  // Reglages : on repart des derniers utilises (retenus dans le navigateur)
  const [reglagesInitiaux] = useState(lireReglages);
  const [longueurBarre, setLongueurBarre] = useState(reglagesInitiaux.longueurBarre);
  const [margeSecurite, setMargeSecurite] = useState(reglagesInitiaux.margeSecurite);
  const [positionMarge, setPositionMarge] = useState<PositionMarge>(reglagesInitiaux.positionMarge);
  const [traitScie, setTraitScie] = useState(reglagesInitiaux.traitScie);
  const [strategie, setStrategie] = useState<Strategie>(reglagesInitiaux.strategie);
  const [enCours, setEnCours] = useState(false);
  const [stock, setStock] = useState<StockBarre[]>([{ id: nextStockId(), longueur: 4200, quantite: 4 }]);
  const [pieces, setPieces] = useState<Piece[]>(DEFAULT_PIECES);
  const [resultat, setResultat] = useState<ResultatMulti | null>(null);
  // Empreinte des donnees au moment du calcul : si la saisie change ensuite, le resultat est perime.
  const [empreinteResultat, setEmpreinteResultat] = useState<string | null>(null);
  const matiere = resultat ? bilanMatiere(resultat) : null;
  const [longueursProfils, setLongueursProfils] = useState<Record<string, number>>({});
  const [seuilsProfils, setSeuilsProfils] = useState<Record<string, number>>({});
  const [seuilChute, setSeuilChute] = useState(reglagesInitiaux.seuilChute);
  const [chutesPDF, setChutesPDF] = useState<OptionsChutesPDF>(optionsChutesDefaut);
  const [methodeCoupe, setMethodeCoupe] = useState<MethodeCoupe>(reglagesInitiaux.methodeCoupe);
  useEffect(() => {
    ecrireReglages({ longueurBarre, margeSecurite, positionMarge, traitScie, seuilChute, methodeCoupe, strategie });
  }, [longueurBarre, margeSecurite, positionMarge, traitScie, seuilChute, methodeCoupe, strategie]);
  const [statutMatiere, setStatutMatiere] = useState<StatutMatiere>(() => lireStatutMatiere());
  const [pdfWarnOpen, setPdfWarnOpen] = useState(false);
  const [verifCtx, setVerifCtx] = useState<{ pieces: Piece[]; traitScie: number } | null>(null);
  const verification = useMemo(
    () => (resultat && verifCtx ? verifierResultat(resultat, verifCtx.pieces, { traitScie: verifCtx.traitScie, positionMarge }) : null),
    [resultat, verifCtx, positionMarge],
  );
  const [importConflits, setImportConflits] = useState<{ projets: LocalProject[]; noms: string[] } | null>(null);
  const profilsNommes = useMemo(() => listeProfils(pieces).filter(Boolean), [pieces]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<"choice" | "new">("choice");
  const [newProjectName, setNewProjectName] = useState("");
  // Champs numériques vides pendant la saisie, et champs signalés en erreur au lancement.
  const [champsVides, setChampsVides] = useState<Set<string>>(new Set());
  const [erreursChamps, setErreursChamps] = useState<Set<string>>(new Set());
  const marquerVide = (cle: string, vide: boolean) => {
    setChampsVides((s) => {
      const n = new Set(s);
      if (vide) n.add(cle); else n.delete(cle);
      return n;
    });
    if (!vide) setErreursChamps((s) => (s.has(cle) ? new Set([...s].filter((k) => k !== cle)) : s));
  };

  const pieceIds = useMemo(() => pieces.map((p) => p.id), [pieces]);
  const empreinteActuelle = empreinteCalcul({ pieces, stock, longueurBarre, margeSecurite, traitScie, strategie, longueursProfils, seuilsProfils, seuilChute });
  const perime = !!resultat && empreinteResultat !== null && empreinteResultat !== empreinteActuelle;
  const longueurUtile = Math.max(0, longueurBarre - margeSecurite);

  const refreshProjects = () => setProjects(listProjects(profileId));

  // Projet en cours : photo de la saisie, enregistree a chaque modification et relue au lancement.
  const photo = (): ProjetCourant => ({
    projetId: currentProjectId, chantier, numeroTache, client, dateProjet,
    pieces, stock, longueursProfils, seuilsProfils, chutesPDF, statutMatiere,
  });
  const appliquerPhoto = (pc: ProjetCourant) => {
    setCurrentProjectId(pc.projetId);
    setChantier(pc.chantier);
    setNumeroTache(pc.numeroTache);
    setClient(pc.client);
    if (pc.dateProjet) setDateProjet(pc.dateProjet);
    avancerCompteurs(pc.pieces, pc.stock);
    setPieces(pc.pieces);
    setStock(pc.stock);
    setLongueursProfils(pc.longueursProfils);
    setSeuilsProfils(pc.seuilsProfils);
    if (pc.chutesPDF !== undefined) setChutesPDF(lireOptionsChutes(pc.chutesPDF));
    if (pc.statutMatiere !== undefined) setStatutMatiere(lireStatutMatiere(pc.statutMatiere));
    setResultat(null);
    setChampsVides(new Set());
    setErreursChamps(new Set());
  };
  const [courantRelu, setCourantRelu] = useState(false);
  useEffect(() => {
    try {
      const pc = lireProjetCourant(window.localStorage.getItem(CLE_PROJET_COURANT(profileId)));
      if (pc) appliquerPhoto(pc);
    } catch { /* stockage bloque */ }
    setCourantRelu(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);
  useEffect(() => {
    if (!courantRelu) return;
    try { window.localStorage.setItem(CLE_PROJET_COURANT(profileId), JSON.stringify(photo())); } catch { /* stockage plein ou bloque */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courantRelu, profileId, currentProjectId, chantier, numeroTache, client, dateProjet, pieces, stock, longueursProfils, seuilsProfils, chutesPDF, statutMatiere]);

  useEffect(() => {
    refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const txt = e.clipboardData?.getData("text/plain") ?? "";
      if (!txt.trim()) return;
      e.preventDefault();
      setPasteText(txt);
      setPasteOpen(true);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
  const addPiece = () =>
    setPieces((p) => [...p, { id: nextId(), nom: `Pièce ${p.length + 1}`, longueur: 1000, quantite: 1 }]);
  const removePiece = (id: string) => setPieces((p) => p.filter((x) => x.id !== id));
  const updatePiece = (id: string, patch: Partial<Piece>) =>
    setPieces((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addStock = () => setStock((s) => [...s, { id: nextStockId(), longueur: 4000, quantite: 1 }]);
  const removeStock = (id: string) => setStock((s) => s.filter((x) => x.id !== id));
  const updateStock = (id: string, patch: Partial<StockBarre>) =>
    setStock((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const calculer = (overrides?: {
    pieces?: Piece[];
    stock?: StockBarre[];
    longueurBarre?: number;
    margeSecurite?: number;
    traitScie?: number;
    strategie?: Strategie;
    longueursProfils?: Record<string, number>;
    seuilsProfils?: Record<string, number>;
    seuilChute?: number;
  }) => {
    const p = overrides?.pieces ?? pieces;
    const s = overrides?.stock ?? stock;
    const lb = overrides?.longueurBarre ?? longueurBarre;
    const ms = overrides?.margeSecurite ?? margeSecurite;
    const ts = overrides?.traitScie ?? traitScie;
    const st = overrides?.strategie ?? strategie;
    setVerifCtx({ pieces: p, traitScie: ts });
    setEmpreinteResultat(empreinteCalcul({
      pieces: p, stock: s, longueurBarre: lb, margeSecurite: ms, traitScie: ts, strategie: st,
      longueursProfils: overrides?.longueursProfils ?? longueursProfils,
      seuilsProfils: overrides?.seuilsProfils ?? seuilsProfils,
      seuilChute: overrides?.seuilChute ?? seuilChute,
    }));
    return optimiserParProfil(p, overrides?.longueursProfils ?? longueursProfils, {
      longueurBarreDefaut: lb,
      margeSecurite: ms,
      positionMarge,
      traitScie: ts,
      strategie: st,
      stock: st === "priorite-stock" ? s : [],
      seuilsProfils: overrides?.seuilsProfils ?? seuilsProfils,
      seuilChuteDefaut: overrides?.seuilChute ?? seuilChute,
    });
  };

  // Amene le curseur sur le premier champ en erreur (apres l'affichage du cadre rouge)
  const focusPremiereErreur = () => setTimeout(() => {
    const champ = document.querySelector<HTMLElement>('main [aria-invalid="true"]');
    champ?.scrollIntoView({ behavior: "smooth", block: "center" });
    champ?.focus({ preventScroll: true });
  }, 80);

  const lancer = () => {
    if (enCours) return;
    // Bloque le lancement si un champ est vide ou hors des valeurs possibles (voir lib/controle-saisie) :
    // marge ou trait de scie negatifs, quantite non entiere, longueur sous 1 mm...
    const erreurs = new Set<string>();
    const problemes: string[] = [];
    const requis = (cle: string, valeur: number, type: TypeChamp, libelle: string) => {
      const raison = raisonRefus(type, valeur, champsVides.has(cle));
      if (raison) {
        erreurs.add(cle);
        if (problemes.length < 4) problemes.push(`${libelle} ${raison}`);
      }
    };
    requis("lb", longueurBarre, "longueur", "La longueur de la barre de base");
    requis("ms", margeSecurite, "marge", "La marge de sécurité");
    requis("ts", traitScie, "trait", "L'épaisseur du trait de scie");
    requis("seuil-chute", seuilChute, "seuil", "La chute mini à conserver");
    for (const pr of profilsNommes) {
      requis(`longueur-profile-${pr}`, longueursProfils[pr] ?? longueurBarre, "longueur", `La longueur de barre du profilé « ${pr} »`);
      requis(`seuil-profile-${pr}`, seuilPourProfil(pr, seuilsProfils, seuilChute), "seuil", `La chute mini du profilé « ${pr} »`);
    }
    for (const p of pieces) {
      requis(`piece-${p.id}-longueur`, p.longueur, "longueur", `La longueur de « ${p.nom || "sans repère"} »`);
      requis(`piece-${p.id}-quantite`, p.quantite, "quantite", `La quantité de « ${p.nom || "sans repère"} »`);
    }
    if (strategie === "priorite-stock") {
      for (const s of stock) {
        requis(`stock-${s.id}-longueur`, s.longueur, "longueur", "La longueur d'une chute disponible");
        requis(`stock-${s.id}-quantite`, s.quantite, "quantite", "La quantité d'une chute disponible");
      }
    }
    if (erreurs.size > 0) {
      setErreursChamps(erreurs);
      focusPremiereErreur();
      toast.error(
        `Optimisation impossible : ${problemes.join(" ; ")}${erreurs.size > problemes.length ? ` ; et ${erreurs.size - problemes.length} autre(s) champ(s) en rouge` : ""}.`,
      );
      return;
    }
    // Bloque aussi les pièces plus longues que la barre utile de leur profilé :
    // ce n'est pas une erreur de calcul, mais une saisie impossible à débiter.
    const tropLongues = piecesTropLongues(pieces, longueursProfils, {
      longueurBarreDefaut: longueurBarre,
      margeSecurite,
      stock: strategie === "priorite-stock" ? stock : [],
    });
    if (tropLongues.length > 0) {
      setErreursChamps(new Set(tropLongues.map((p) => `piece-${p.id}-longueur`)));
      focusPremiereErreur();
      const details = tropLongues
        .slice(0, 3)
        .map((p) => `« ${p.nom || "sans repère"} » (${fmt(p.longueur)} mm) est plus longue que la barre utile (${fmt(p.longueurUtile)} mm)`);
      toast.error(
        `Optimisation impossible : ${details.join(" ; ")}${tropLongues.length > 3 ? ` ; et ${tropLongues.length - 3} autre(s)` : ""}.`,
      );
      return;
    }
    setErreursChamps(new Set());
    setEnCours(true);
    // Laisse le navigateur afficher l'état « en cours » avant un éventuel SmartCut.
    setTimeout(() => {
      try {
        setResultat(calculer());
      } finally {
        setEnCours(false);
      }
      setTimeout(() => {
        document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }, 30);
  };

  const exporter = (force = false) => {
    if (!resultat) return;
    if (perime) {
      toast.error("La saisie a changé depuis le calcul : relancez l'optimisation avant d'exporter.");
      return;
    }
    if (verification && !verification.ok) {
      toast.error("PDF bloqué : la vérification a trouvé des erreurs dans le calcul.");
      return;
    }
    if (!force && (!chantier.trim() || !numeroTache.trim())) {
      setPdfWarnOpen(true);
      return;
    }
    setPdfWarnOpen(false);
    void exporterPDF(resultat, pieces, {
      longueurBarreBrute: longueurBarre,
      longueurBarreUtile: longueurUtile,
      margeSecurite,
      positionMarge,
      traitScie,
      strategie,
      longueursProfils,
      stock: strategie === "priorite-stock" ? stock : [],
      infos: { chantier, numeroTache, client, date: dateProjet },
      verification: verification ?? undefined,
      chutesPDF,
      methodeCoupe,
      statutMatiere,
    }).catch(() => toast.error("L’export PDF a échoué. Veuillez réessayer."));
  };

  const nouveauProjet = () => {
    // Saisie precedente gardee 10 s : « Annuler » la remet telle quelle
    const avant = photo();
    setCurrentProjectId(null);
    setChantier("");
    setNumeroTache("");
    setClient("");
    setDateProjet(new Date().toISOString().slice(0, 10));
    // Les reglages (barre, marge, trait de scie, chute mini, methode, strategie, options PDF)
    // sont gardes d'un projet a l'autre : seules les donnees du chantier repartent de zero.
    setStatutMatiere(lireStatutMatiere());
    setStock([{ id: nextStockId(), longueur: 4200, quantite: 4 }]);
    setPieces([]);
    setResultat(null);
    setChampsVides(new Set());
    setErreursChamps(new Set());
    toast.success("Nouveau projet prêt", {
      duration: 10000,
      action: { label: "Annuler", onClick: () => { appliquerPhoto(avant); toast.success("Saisie précédente rétablie"); } },
    });
  };

  const ouvrirSauvegarde = () => {
    const base = (chantier || "Projet sans nom").trim();
    setNewProjectName(currentProjectId ? `${base} (Copie)` : base);
    setSaveMode(currentProjectId ? "choice" : "new");
    setSaveDialogOpen(true);
  };

  const persister = (opts: { id: string | null; chantierOverride?: string }) => {
    setSaving(true);
    try {
      const saved = upsertProject(profileId, {
        id: opts.id,
        chantier: opts.chantierOverride ?? chantier,
        numero_tache: numeroTache,
        client,
        date_projet: dateProjet,
        longueur_barre: longueurBarre,
        marge_securite: margeSecurite,
        trait_scie: traitScie,
        strategie,
        pieces,
        stock,
        longueurs_profils: longueursProfils,
        seuils_profils: seuilsProfils,
        seuil_chute: seuilChute,
        chutes_pdf: chutesPDF,
        methode_coupe: methodeCoupe,
        statut_matiere: statutMatiere,
      });
      setCurrentProjectId(saved.id);
      if (opts.chantierOverride !== undefined) setChantier(opts.chantierOverride);
      refreshProjects();
      toast.success(opts.id ? "Projet mis à jour" : "Nouveau projet enregistré");
      setSaveDialogOpen(false);
    } catch (e) {
      toast.error("Erreur de sauvegarde : " + (e instanceof Error ? e.message : "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  const confirmerNouveau = () => {
    const nom = newProjectName.trim();
    if (!nom) {
      toast.error("Nom de projet requis");
      return;
    }
    persister({ id: null, chantierOverride: nom });
  };

  const chargerProjet = (proj: LocalProject) => {
    setCurrentProjectId(proj.id);
    setChantier(proj.chantier);
    setNumeroTache(proj.numero_tache);
    setClient(proj.client);
    setDateProjet(proj.date_projet);
    setLongueurBarre(proj.longueur_barre);
    setMargeSecurite(proj.marge_securite);
    setTraitScie(proj.trait_scie);
    const st = (proj.strategie as Strategie) ?? "min-barres";
    setStrategie(st);
    const loadedPieces = Array.isArray(proj.pieces) ? (proj.pieces as Piece[]) : [];
    const loadedStock = Array.isArray(proj.stock) ? (proj.stock as StockBarre[]) : [];
    avancerCompteurs(loadedPieces, loadedStock);
    setPieces(loadedPieces);
    setStock(loadedStock);
    const lp = proj.longueurs_profils ?? {};
    setLongueursProfils(lp);
    const sp = proj.seuils_profils ?? {};
    const sg = proj.seuil_chute ?? 500;
    setSeuilsProfils(sp);
    setSeuilChute(sg);
    setChutesPDF(lireOptionsChutes(proj.chutes_pdf));
    setMethodeCoupe(lireMethodeCoupe(proj.methode_coupe));
    setStatutMatiere(lireStatutMatiere(proj.statut_matiere));
    setSidebarOpen(false);
    const r = calculer({
      pieces: loadedPieces,
      stock: loadedStock,
      longueurBarre: proj.longueur_barre,
      margeSecurite: proj.marge_securite,
      traitScie: proj.trait_scie,
      strategie: st,
      longueursProfils: lp,
      seuilsProfils: sp,
      seuilChute: sg,
    });
    setResultat(r);
    toast.success(`Projet « ${proj.chantier || "sans nom"} » chargé`);
    setTimeout(() => {
      document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  const enregistrerImport = (liste: LocalProject[], mode: "remplacer" | "garder") => {
    const existants = listProjects(profileId);
    for (const p of liste) {
      const { id: _id, created_at: _c, updated_at: _u, ...data } = p;
      void _id; void _c; void _u;
      const meme = existants.find((e) => (e.chantier || "").trim() === (p.chantier || "").trim());
      upsertProject(profileId, { ...data, id: mode === "remplacer" && meme ? meme.id : null });
    }
    refreshProjects();
    setImportConflits(null);
    toast.success(`${fmt(liste.length)} projet(s) importé(s)`);
  };

  const importerJson = async (file: File) => {
    try {
      const liste = lireJson(await file.text());
      const existants = listProjects(profileId).map((e) => (e.chantier || "").trim());
      const noms = liste.map((p) => (p.chantier || "").trim()).filter((n) => existants.includes(n));
      if (noms.length > 0) setImportConflits({ projets: liste, noms: [...new Set(noms)] });
      else enregistrerImport(liste, "garder");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    }
  };

  const supprimerProjet = (id: string) => {
    const supprime = listProjects(profileId).find((p) => p.id === id);
    deleteProject(profileId, id);
    if (currentProjectId === id) setCurrentProjectId(null);
    refreshProjects();
    toast.success(`Projet « ${supprime?.chantier || "sans nom"} » supprimé`, {
      duration: 10000,
      action: supprime ? {
        label: "Annuler",
        onClick: () => {
          // Remis tel quel, avec son identifiant (upsert recree un projet absent sous cet id)
          upsertProject(profileId, supprime);
          refreshProjects();
          toast.success("Projet restauré");
        },
      } : undefined,
    });
  };


  return {
    profileId,
    chantier,
    setChantier,
    numeroTache,
    setNumeroTache,
    client,
    setClient,
    dateProjet,
    setDateProjet,
    longueurBarre,
    setLongueurBarre,
    margeSecurite,
    setMargeSecurite,
    positionMarge,
    setPositionMarge,
    traitScie,
    setTraitScie,
    strategie,
    setStrategie,
    enCours,
    setEnCours,
    stock,
    setStock,
    pieces,
    setPieces,
    resultat,
    setResultat,
    perime,
    matiere,
    longueursProfils,
    setLongueursProfils,
    seuilsProfils,
    setSeuilsProfils,
    seuilChute,
    setSeuilChute,
    chutesPDF,
    setChutesPDF,
    methodeCoupe,
    setMethodeCoupe,
    statutMatiere,
    setStatutMatiere,
    pdfWarnOpen,
    setPdfWarnOpen,
    verifCtx,
    setVerifCtx,
    verification,
    importConflits,
    setImportConflits,
    profilsNommes,
    currentProjectId,
    setCurrentProjectId,
    projects,
    setProjects,
    sidebarOpen,
    setSidebarOpen,
    saving,
    setSaving,
    saveDialogOpen,
    setSaveDialogOpen,
    saveMode,
    setSaveMode,
    newProjectName,
    setNewProjectName,
    champsVides,
    setChampsVides,
    erreursChamps,
    setErreursChamps,
    marquerVide,
    pieceIds,
    longueurUtile,
    refreshProjects,
    pasteOpen,
    setPasteOpen,
    pasteText,
    setPasteText,
    addPiece,
    removePiece,
    updatePiece,
    addStock,
    removeStock,
    updateStock,
    calculer,
    lancer,
    exporter,
    nouveauProjet,
    ouvrirSauvegarde,
    persister,
    confirmerNouveau,
    chargerProjet,
    enregistrerImport,
    importerJson,
    supprimerProjet,
  };
}

export type LinearApp = ReturnType<typeof useLinearApp>;
