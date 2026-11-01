# Journal des versions — Linear

Le numéro de version se met à jour dans `src/lib/version.ts` (pied de page et fenêtre « À propos » le lisent).

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 3.4 — 1er novembre 2026

- Nouveauté : le mode clair ou sombre que tu choisis dans une appli est repris dans toutes les autres.
- Le réglage clair / sombre est aussi enregistré dans une clé commune à toutes les applis (`outils-theme`, même site) ; la clé propre à l'appli est conservée.

## 3.3 — 31 octobre 2026

- Toutes les applis sont maintenant sur GitHub Pages : le sélecteur d'applis pointe vers `https://outils-hn.github.io/<Appli>/` à la place des adresses Lovable. Les liens vers les fiches d'Index (`?fiche=`, `?q=`, création de compte) ouvrent `https://outils-hn.github.io/Index/`.

## 3.2 — 31 octobre 2026

- Publication sur GitHub Pages (`https://outils-hn.github.io/Linear/`) : l'appli est construite en mode SPA statique, sans serveur.
- Nouveau workflow « Pages » : construction avec le sous-dossier `/Linear/`, page de repli `404.html`, déploiement automatique à chaque fusion sur `main`.
- Pages « Page introuvable » et « Cette page ne s'est pas chargée » en français.
- Les données gardées dans le navigateur à l'ancienne adresse (`lovable.app`) ne suivent pas automatiquement : faire une « Sauvegarde » avant de changer d'adresse, puis la restaurer à la nouvelle.

## 3.1 — 31 octobre 2026

- Adresses mises à jour après le renommage du compte GitHub en `outils-hn` : « Suggestion / bug » ouvre l'Accueil sur `https://outils-hn.github.io/`, et le sélecteur d'applis pointe vers Strate (`https://outils-hn.github.io/Strate/`) et Trame (`https://outils-hn.github.io/Trame/`), publiées sur GitHub Pages.
