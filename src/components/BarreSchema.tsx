import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { BarreOptimisee, Piece } from "@/lib/optimizer";
import { SEUIL_CHUTE_REUTILISABLE } from "@/lib/optimizer";
import { colorForPieceId } from "@/lib/piece-colors";
import { segmentsBarre, cotesFinSeries, type SegmentBarre } from "@/lib/bar-drawing";
import { seriesPieces, DETAIL_COTES_RUBAN, type MethodeCoupe } from "@/lib/cut-method";
import { formatNombre as fmt } from "@/lib/format-number";
import { etiquettesPieces, LABEL_BASE_PX } from "@/lib/piece-labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

// Un seul canvas de mesure du texte pour toutes les barres
let canvas: CanvasRenderingContext2D | null | undefined;
const canvasPartage = () => {
  if (canvas === undefined) canvas = document.createElement("canvas").getContext("2d");
  return canvas;
};

interface Props { barre: BarreOptimisee; traitScie: number; pieceIds: string[]; libelle?: string; methodeCoupe?: MethodeCoupe }

function BarreSVG({ barre, traitScie, pieceIds, zone, regle = false, onZone, methodeCoupe = "butee" }: Props & { zone: [number, number]; regle?: boolean; onZone?: (zone: [number, number]) => void }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<SegmentBarre | null>(null);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const mesure = useRef<CanvasRenderingContext2D | null>(null);
  const [largeur, setLargeur] = useState(0);
  // Police deja chargee (cas courant apres la premiere barre) : pas de second dessin a attendre
  const [fontReady, setFontReady] = useState(() => typeof document !== "undefined" && document.fonts?.status === "loaded");
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    mesure.current = canvasPartage();
    // La largeur vient du ResizeObserver (sans forcer un recalcul de mise en page a chaque barre)
    const observer = new ResizeObserver(([e]) => { if (e) setLargeur(Math.max(1, e.contentRect.width)); });
    observer.observe(element);
    if (!fontReady) void document.fonts.ready.then(() => setFontReady(true));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const span = zone[1] - zone[0];
  const x = (mm: number) => (mm - zone[0]) / span * largeur;
  const segments = useMemo(() => segmentsBarre(barre, traitScie), [barre, traitScie]);
  const barHeight = regle ? 90 : 36;
  // Etiquettes calculees seulement quand la largeur, la zone ou la police changent
  const labels = useMemo(() => (fontReady && largeur > 0 ? etiquettesPieces(segments, x, largeur, barHeight, (text, size) => {
    const context = mesure.current;
    if (!context) return Infinity;
    context.font = `400 ${size}px "IBM Plex Sans"`;
    return context.measureText(text).width;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }) : []), [segments, largeur, barHeight, fontReady, zone[0], zone[1]]);
  const references = labels.filter(l => !l.lignes.length);
  // Reperes cumules sous la barre : utiles seulement au ruban (en butee, ils sont dans le tableau)
  const cotes = fontReady && methodeCoupe === "ruban" ? cotesFinSeries(seriesPieces(segments.filter(s => s.type === "piece")), x, largeur, text => {
    const context = mesure.current;
    if (!context) return Infinity;
    context.font = '400 10px "IBM Plex Sans"';
    return context.measureText(text).width;
  }) : [];
  const top = regle ? 45 : references.length ? (Math.max(...references.map(l => l.niveau)) + 1) * 16 + 4 : 0;
  const height = regle ? 256 : top + barHeight + (cotes.length ? 23 : 4);
  const pos = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(zone[0], Math.min(zone[1], zone[0] + (e.clientX - r.left) / r.width * span));
  };
  const stepBase = span / 10;
  const power = 10 ** Math.floor(Math.log10(stepBase));
  const step = [1, 2, 5, 10].map(n => n * power).find(n => n >= stepBase) ?? power * 10;
  const ticks: number[] = [];
  for (let n = Math.ceil(zone[0] / step) * step; n <= zone[1]; n += step) ticks.push(n);
  return <div ref={container} className="relative w-full">
    <svg aria-label="Dessin de la barre" viewBox={`0 0 ${largeur} ${height}`} preserveAspectRatio="none" width={largeur} height={height} className={regle ? "h-64 w-full touch-none select-none" : "block h-auto! w-full! rounded-sm pointer-events-auto!"}
      onPointerDown={e => { if (!onZone) return; e.currentTarget.setPointerCapture(e.pointerId); const n = pos(e); setSelection([n, n]); }}
      onPointerMove={e => { if (selection) setSelection([selection[0], pos(e)]); }}
      onPointerUp={e => { if (!selection || !onZone) return; const end = pos(e); if (Math.abs(end - selection[0]) > span * 0.01) onZone([Math.min(end, selection[0]), Math.max(end, selection[0])]); setSelection(null); }}
      onPointerCancel={() => setSelection(null)}>
      <defs>
        <pattern id={`${id}-marge`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" className="fill-waste"/><path d="M0 6L6 0" className="stroke-hatch" strokeWidth="0.5"/></pattern>
        <pattern id={`${id}-dechet`} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" className="fill-waste"/><path d="M-2 2L2 -2M0 10L10 0M8 12L12 8" className="stroke-hatch" strokeWidth="0.5"/></pattern>
        <pattern id={`${id}-reutilisable`} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" className="fill-offcut-paper"/><path d="M-2 8L2 12M0 0L10 10M8 -2L12 2" className="stroke-warning" strokeWidth="1"/></pattern>
      </defs>
      {segments.filter(s => s.fin >= zone[0] && s.debut <= zone[1]).map((s, i) => {
        const left = x(s.debut), w = s.longueur / span * largeur;
        const fill = s.type === "piece" ? colorForPieceId(s.pieceId ?? "", pieceIds) : s.type === "scie" ? "var(--cut-separator)" : `url(#${id}-${s.type})`;
        const label = `${s.nom} · ${fmt(s.longueur)} mm${s.type === "piece" ? ` · Début ${fmt(s.debut)} mm · Fin ${fmt(s.fin)} mm depuis le bout brut` : ""}`;
        return <g key={i} tabIndex={s.type === "scie" ? undefined : 0} aria-label={label} onPointerEnter={() => setHover(s)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(s)} onBlur={() => setHover(null)}>
          <title>{label}</title>
          <rect x={left} y={top} width={w} height={barHeight} fill={fill} stroke={hover === s ? "var(--primary)" : "var(--cut-separator)"} strokeWidth={hover === s ? 2.5 : 2} vectorEffect="non-scaling-stroke" opacity={hover && hover !== s ? 0.65 : 1}/>
        </g>;
      })}
      {labels.map((label, i) => {
        const center = (label.gauche + label.droite) / 2;
        if (!label.lignes.length) {
          const text = String(label.ligneTableau);
          if (mesure.current) mesure.current.font = `400 ${LABEL_BASE_PX}px "IBM Plex Sans"`;
          const width = mesure.current?.measureText(text).width ?? 12;
          const cx = Math.max(width / 2, Math.min(largeur - width / 2, center));
          const y = top - 8 - label.niveau * 16;
          return <g key={`label-${i}`} pointerEvents="none"><path d={`M${center} ${top}V${y + 5}H${cx}`} className="stroke-piece-ink" fill="none" strokeWidth="0.5"/><text x={cx} y={y} dominantBaseline="middle" textAnchor="middle" fontSize={LABEL_BASE_PX} className="bar-piece-label fill-piece-ink">{text}</text></g>;
        }
        return <g key={`label-${i}`} pointerEvents="none">
          <defs><clipPath id={`${id}-label-${i}`}><rect x={label.gauche + 4} y={top} width={Math.max(0, label.droite - label.gauche - 8)} height={barHeight}/></clipPath></defs>
          <text data-piece-label="true" data-row={label.ligneTableau} x={center} textAnchor="middle" dominantBaseline="middle" fontSize={label.taille} className="bar-piece-label fill-piece-ink" clipPath={`url(#${id}-label-${i})`}>
            {label.lignes.map((line, j) => <tspan key={j} x={center} y={top + barHeight / 2 + (j - (label.lignes.length - 1) / 2) * label.taille * 1.2}>{line}</tspan>)}
          </text>
        </g>;
      })}
      <g data-dimensions="series" className="fill-piece-ink stroke-hatch" fontSize="10" pointerEvents="none">
        {cotes.map(c => <g key={c.valeur}>
          <path d={`M${c.x} ${top + barHeight}V${top + barHeight + 5}L${c.labelX} ${top + barHeight + 10}`} fill="none" strokeWidth="0.5" />
          <text x={c.labelX} y={top + barHeight + 19} textAnchor="middle" stroke="none">{fmt(c.valeur)}</text>
        </g>)}
      </g>
      {regle && <g className="fill-foreground stroke-muted-foreground" fontSize="12">
        <line x1="0" x2={largeur} y1="155" y2="155"/>
        {ticks.map(n => <g key={n}><line x1={x(n)} x2={x(n)} y1="155" y2="165"/><text x={Math.max(25, Math.min(largeur - 25, x(n)))} y="185" textAnchor="middle" stroke="none">{fmt(n)}</text></g>)}
      </g>}
      {selection && <rect x={x(Math.min(...selection))} y="45" width={Math.abs(selection[1] - selection[0]) / span * largeur} height="90" className="fill-primary/20 stroke-primary" strokeWidth="2" pointerEvents="none"/>}
    </svg>
    {hover && <div role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 max-w-full rounded-md border border-border bg-popover px-3 py-2 text-left text-xs text-popover-foreground shadow-md">
      <div className="font-semibold">{hover.nom} · {fmt(hover.longueur)} mm</div>
      {hover.type === "piece" && <div>Début : {fmt(hover.debut)} mm · Fin : {fmt(hover.fin)} mm — bout brut</div>}
    </div>}
  </div>;
}

export function BarreSchema({ barre, traitScie, pieceIds, libelle, methodeCoupe = "butee" }: Props) {
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState<[number, number]>([0, barre.longueurBrute]);
  const zoom = (factor: number) => {
    const size = Math.max(barre.longueurBrute / 100, Math.min(barre.longueurBrute, (zone[1] - zone[0]) * factor));
    const start = Math.max(0, Math.min(barre.longueurBrute - size, (zone[0] + zone[1] - size) / 2));
    setZone([start, start + size]);
  };
  return <div className="w-full font-mono font-normal">
    <Button variant="ghost" aria-label={`Agrandir ${libelle ?? `barre ${barre.index}`}`} className="block h-auto w-full rounded-md border border-border p-0 hover:bg-transparent" onClick={() => { setZone([0, barre.longueurBrute]); setOpen(true); }}>
      <BarreSVG barre={barre} traitScie={traitScie} pieceIds={pieceIds} zone={[0, barre.longueurBrute]} methodeCoupe={methodeCoupe}/>
    </Button>
    {methodeCoupe === "ruban" && <p className="mt-1 text-left text-xs text-muted-foreground">{DETAIL_COTES_RUBAN}</p>}
    <div className="mt-1 text-xs text-muted-foreground">Marge début : {fmt(barre.margeDebut ?? 0)} mm · Marge fin : {fmt(barre.margeFin ?? 0)} mm · Chute : <span className={barre.chuteReutilisable ? "font-semibold text-warning" : "font-semibold text-muted-foreground"}>{fmt(barre.chute)} mm — {barre.chuteReutilisable ? `Réutilisable (≥ ${fmt(barre.seuilChute ?? SEUIL_CHUTE_REUTILISABLE)} mm)` : "Déchet"}</span></div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-6xl sm:max-w-6xl">
        <DialogHeader><DialogTitle>{libelle ?? `Barre n°${barre.index}`}</DialogTitle><DialogDescription>Cotes mesurées depuis l’extrémité brute de la barre</DialogDescription></DialogHeader>
        <TooltipProvider><div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm tabular-nums">{fmt(zone[0])} à {fmt(zone[1])} mm · x {fmt(barre.longueurBrute / (zone[1] - zone[0]))}</span>
          <div className="flex gap-1">{[{ label: "Zoomer", Icon: ZoomIn, action: () => zoom(0.5) }, { label: "Dézoomer", Icon: ZoomOut, action: () => zoom(2) }, { label: "Vue complète", Icon: RotateCcw, action: () => setZone([0, barre.longueurBrute]) }].map(({label, Icon, action}) => <Tooltip key={label}><TooltipTrigger asChild><Button size="icon" variant="outline" aria-label={label} onClick={action}><Icon className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>)}</div>
        </div></TooltipProvider>
        <BarreSVG barre={barre} traitScie={traitScie} pieceIds={pieceIds} zone={zone} regle onZone={setZone} methodeCoupe={methodeCoupe}/>
        <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Zone</span><input aria-label="Déplacer la zone de zoom" type="range" min="0" max={Math.max(0, barre.longueurBrute - (zone[1] - zone[0]))} step="1" value={zone[0]} disabled={zone[1] - zone[0] >= barre.longueurBrute} className="w-full accent-primary" onChange={e => { const start = Number(e.target.value); setZone([start, start + zone[1] - zone[0]]); }}/></div>
      </DialogContent>
    </Dialog>
  </div>;
}

export function LegendeBarres({ pieces, pieceIds }: { pieces: Piece[]; pieceIds: string[] }) {
  return <div aria-label="Légende du plan de découpe" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border pb-4 text-xs">
    {pieces.filter(p => p.quantite > 0 && p.longueur > 0).map(p => <span key={p.id} className="flex max-w-full items-center gap-2"><svg width="14" height="14" className="shrink-0" aria-hidden="true"><rect width="14" height="14" fill={colorForPieceId(p.id, pieceIds)}/></svg><span className="break-words">{p.nom}</span></span>)}
    <span className="flex items-center gap-2"><i className="margin-hatch h-3.5 w-3.5 bg-muted"/>Marge</span>
    <span className="flex items-center gap-2"><i className="reusable-hatch h-3.5 w-3.5"/>Chute réutilisable</span>
    <span className="flex items-center gap-2"><i className="offcut-hatch h-3.5 w-3.5 bg-waste"/>Déchet</span>
  </div>;
}
