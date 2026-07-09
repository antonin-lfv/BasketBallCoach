# BasketballCoach 🏀

Éditeur de systèmes de jeu de basketball, 100% côté client. Un seul fichier, aucune dépendance, aucun build.

> L'ancien prototype Streamlit + Manim est conservé dans la branche [`V1`](../../tree/V1).

## Lancer

Ouvrir `index.html` dans un navigateur (double-clic suffit). Pour le partager : héberger le fichier n'importe où (GitHub Pages, Netlify, un simple serveur) ou l'envoyer tel quel.

## Fonctionnement

Le principe est celui des **phases** (keyframes) : chaque phase mémorise la position de tous les joueurs et le porteur du ballon. L'animation interpole entre les phases, en temps réel, sans aucune génération.

- **Déplacer un joueur** : glisser-déposer sur le terrain (édite la phase sélectionnée).
- **Passe** : glisser le ballon sur un autre attaquant.
- **Tir** : glisser le ballon sur le panier.
- **Écran** : glisser un joueur sans ballon sur un défenseur, puis confirmer. L'écran est noté par un symbole en T orienté selon la position du poseur. Cliquer sur le T pour le retirer.
- **Trajectoires courbes** : tirer sur le petit point au milieu d'une flèche pour la courber (spline Catmull-Rom). Chaque segment expose une nouvelle poignée pour affiner. Double-clic sur un point pour le retirer.
- **Dribble** : pendant la lecture, le ballon rebondit (variation de taille) quand son porteur se déplace.
- **Fantômes et flèches** : la vue d'édition montre la phase précédente en transparence, avec flèches de déplacement (pleines) et de passe/tir (pointillées).
- **Lecture** : bouton ▶ ou Espace, vitesse réglable, timeline scrubbable.
- **Terrain** : demi-terrain ou terrain complet (FIBA 28×15 m).
- **Défenseurs** : 0 à 5, avec placement automatique entre l'attaquant et le panier.
- **Situations initiales** : sélecteur de mises en place pour la phase 1 (côté gauche/droit, fond gauche/droit, lancer franc attaque/défense). Gauche et droite sont automatiquement inversés en vue terrain complet.
- **Export JSON** : sauvegarde/rechargement d'un système.
- **Export vidéo** : enregistre la lecture en WebM/MP4 via MediaRecorder.
- **Export images** : un PNG par phase, avec flèches et écrans, pour impression ou partage.
- **Planche imprimable / PDF** : toutes les phases en grille dans une page prête à imprimer (Cmd/Ctrl+P → enregistrer en PDF).
- **Annuler** : Ctrl+Z / Cmd+Z. Sauvegarde automatique dans le navigateur (localStorage).

## Détails techniques

- Coordonnées stockées en mètres sur le terrain complet FIBA (paniers à x = 1.575 et 26.425, axe y centré à 7.5). La vue demi-terrain est une rotation portrait du côté gauche.
- Rendu Canvas 2D avec transformation uniforme mètres → pixels, compatible haute densité (devicePixelRatio).
- Interpolation smoothstep entre phases; le ballon suit le porteur, décrit un arc lors des passes et des tirs.
- Format JSON versionné (`app: "basketballcoach-web", version: 1`).
