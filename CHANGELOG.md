# Journal des versions — Linear

Le numéro de version se met à jour dans `src/lib/version.ts` (pied de page et fenêtre « À propos » le lisent).

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 3.19 — 9 novembre 2026

- Nouveauté : Linear s'installe sur le téléphone (menu du navigateur, « Ajouter à l'écran d'accueil ») et s'ouvre aussi sans réseau. Les projets restent sur le poste.

## 3.18 — 9 novembre 2026

- Nouveauté : au téléphone, les liens du pied de page (« Conçu par », « Sauvegarde », « Suggestion / bug ») se touchent plus facilement.

## 3.17 — 9 novembre 2026

- Nouveauté : un résultat qui s'arrondit à zéro s'affiche « 0 » et plus jamais « -0 ».

## 3.16 — 9 novembre 2026

- Nouveauté : les nombres collés d'Excel sont lus correctement (« 1.250,5 » donne 1250,5 mm) ; un nombre illisible (« 12..5 », « 1,2,3 ») est refusé au lieu d'être deviné.

## 3.15 — 9 novembre 2026

- Nouveauté : un plan avec beaucoup de longueurs différentes (plus de 60 dans un même profilé) ne fait plus planter l'onglet : le calcul rapide est gardé au lieu du mode Ultra, qui manquait de mémoire.

## 3.14 — 8 novembre 2026

- Technique : nettoyage de la configuration, qui pointait encore vers d'anciens projets Supabase ; aucun changement visible.

## 3.13 — 8 novembre 2026

- Technique : les données sont passées sur le nouveau serveur Supabase en Suisse (adresse, clé et mémoire de connexion mises à jour). Il faut se reconnecter une fois.

## 3.12 — 7 novembre 2026

- Correction : le texte de l'écran de connexion est raccourci pour tenir sur une ligne.

## 3.11 — 7 novembre 2026

- Nouveauté : le menu des applis propose maintenant Joint (dilatation et joints) et Membrane (étanchéité).

## 3.10 — 6 novembre 2026

- Le menu des applis propose Joint (en préparation), pour le concepteur seulement : aucune Nouveauté à annoncer à l'équipe.

## 3.9 — 4 novembre 2026

- Nouveauté : sans compte, on ne peut plus exporter ni importer de fichier JSON (sauvegarde complète, projets) : un message invite à se connecter avec son compte Index. Les exports PDF et Excel gardent leurs 3 essais gratuits.

## 3.8 — 4 novembre 2026

- Nouveauté : en mode sombre, les champs de date (calendrier et chiffres) ne restent plus noirs sur fond sombre : ils suivent le thème et se lisent bien.

## 3.7 — 4 novembre 2026

- Nouveauté : le bandeau affiche seulement l'adresse email quand on est connecté (sans « Connecté · »), comme dans toutes les autres applis.

## 3.6 — 4 novembre 2026

- Nouveauté : « Se connecter » est maintenant en haut de la page, comme dans Index ; se connecter dans une appli connecte toutes les autres.
- Nouveauté : sans compte, Linear reste utilisable (saisie, calcul, enregistrement local) et offre 3 exports de découverte (PDF atelier, Excel, projets .json, sauvegarde). Ensuite, les exports demandent de se connecter avec son compte Index.

## 3.5 — 1er novembre 2026

- Nouveauté : sur téléphone, Linear s'affiche sans déborder, chaque pièce est une carte facile à remplir, et une pastille « Voir le résultat » apparaît après un calcul.
- Les actions du bandeau (Mes projets, Nouveau, Sauvegarder, PDF atelier) sont regroupées dans un menu « ⋯ » sur téléphone ; boutons de 40 px minimum.
- Message plus précis quand aucune pièce n'a pu être placée.
- Lien « Aller à Lancer l'optimisation » au clavier ; colonne d'actions nommée pour les lecteurs d'écran.

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
