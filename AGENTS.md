# Architecture rules
- Keep optimization search and pattern feasibility unchanged; apply final-kerf material accounting only after placement to preserve the existing optimum engine.
- Carry actual start/end margins on each calculated bar, so screen and PDF cumulative dimensions share the same raw-end origin, including stock bars without margins.- Multi-profile optimization runs the unchanged engine once per profile (src/lib/multi-profil.ts) and merges results; screen and PDF iterate `resultat.profils` so each profile keeps its own bar length and subtotal.
- Screen and PDF resolve the same palette from CSS theme tokens via visual-theme.ts; keep export colors centralized to prevent visual drift.
- Result verification lives in src/lib/verification.ts and recomputes everything from the bars without calling the engine, so it can catch engine bugs independently.
- Project backups (.json) carry a format version (src/lib/backup.ts); readers reject newer versions so future formats stay compatible.
- Bar grouping and segment coordinates live in the browser-safe bar-drawing module; screen and PDF consume placed results without changing optimization or verification.
- Atelier PDF drawings use dynamically loaded svg2pdf.js and SVG geometry; collision-aware dimensions and measured table pagination keep print content legible.
- Embed CDN-hosted Plex Sans font assets exclusively in PDF exports and use tabular digit metrics with explicit per-column alignment shared by headers and values, so workshop printouts remain proportional and aligned.
- Format displayed measurements through the browser-safe format-number module for consistent French screen/PDF labels; keep numeric calculations and editable values unchanged.
