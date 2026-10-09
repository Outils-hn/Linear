# Architecture rules
- Keep optimization search and pattern feasibility unchanged; apply final-kerf material accounting only after placement to preserve the existing optimum engine.
- Carry actual start/end margins on each calculated bar, so screen and PDF cumulative dimensions share the same raw-end origin, including stock bars without margins.- Multi-profile optimization runs the unchanged engine once per profile (src/lib/multi-profil.ts) and merges results; screen and PDF iterate `resultat.profils` so each profile keeps its own bar length and subtotal.
- Screen and PDF share one hex piece palette (piece-colors.ts) so colors match exactly.
