# BasketballCoach

BasketballCoach est un outil web ultra simple pour dessiner, animer et exporter des systèmes de jeu de basketball.

Le projet tient volontairement en deux fichiers HTML : une landing page et un éditeur. Pas de backend, pas de compte, pas de base de données, pas de build.

![Landing page](docs/screenshots/landing.png)

![Éditeur BasketballCoach](docs/screenshots/editor.png)

## Fonctionnalités

- Création de systèmes phase par phase.
- Déplacement des joueurs directement sur le terrain.
- Gestion du ballon : porteur, passe et tir.
- Défenseurs optionnels avec placement automatique.
- Écrans, trajectoires courbes et animation de lecture.
- Demi-terrain ou terrain complet.
- Sauvegarde automatique locale dans le navigateur.
- Import/export JSON.
- Export PNG par phase.
- Export planche imprimable / PDF.
- Export vidéo MP4/WebM selon le navigateur.

## Démo Locale

Le site peut être ouvert directement avec `index.html`. Pour éviter les petites différences entre navigateurs, le plus propre est de servir le dossier :

```bash
python3 -m http.server 8080
```

Puis ouvrir :

```text
http://localhost:8080
```

## Structure

```text
.
├── index.html   # landing page
├── app.html     # éditeur complet
├── .nojekyll    # compatibilité GitHub Pages
└── README.md
```

## Déploiement GitHub Pages

1. Pousser le dépôt sur GitHub.
2. Aller dans `Settings` -> `Pages`.
3. Choisir `Deploy from a branch`.
4. Sélectionner la branche de publication.
5. Choisir le dossier `/root`.
6. Ouvrir l'URL GitHub Pages générée.

Les liens sont relatifs, donc le site fonctionne aussi dans un sous-chemin :

```text
https://utilisateur.github.io/nom-du-repo/
```

## Données

BasketballCoach ne stocke rien sur un serveur. Le système courant est sauvegardé dans `localStorage`, puis peut être conservé ou partagé via export JSON.

## Roadmap Possible

- Templates de systèmes prêts à l'emploi.
- Meilleure gestion mobile/tablette.
- Mode présentation plein écran.
- Bibliothèque locale de systèmes.
- Icônes et assets visuels personnalisés.

## Licence

Projet personnel. Licence à préciser.
