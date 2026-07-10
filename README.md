# BasketballCoach 🏀

Le playbook numérique de votre club : dessinez vos systèmes de jeu, animez-les en temps réel, enregistrez-les sur votre compte et partagez-les à l'équipe.

## Démarrage

Il n'y a que deux commandes à connaître.

### Développement

```bash
make dev
```

Lance PostgreSQL (Docker), l'API (uv, rechargement auto) et le front (Vite, HMR). Ouvre **http://localhost:5173/app/**. Ctrl+C arrête tout.

Prérequis : Docker, [uv](https://docs.astral.sh/uv/), Node 20+.

### Production (VPS ou test local complet)

```bash
make prod
```

Au premier lancement, un `.env` est créé : renseigne `POSTGRES_PASSWORD`, et `SITE_ADDRESS=tondomaine.fr` pour le HTTPS automatique (Let's Encrypt). Si le port 80 est déjà pris sur ta machine, change `HTTP_PORT` (ex. 8080).

Tout tourne dans Docker : PostgreSQL, API, et Caddy qui sert la landing à la racine, l'app sous `/app/` et proxifie `/api/`.

Autres commandes : `make stop` (tout arrêter), `make logs`, `make backup` (dump PostgreSQL).

## Structure

```
├── index.html            Landing page statique (racine du site)
├── frontend/             App React + TypeScript + Vite (servie sous /app/)
│   └── src/
│       ├── engine/       Moteur pur (types, géométrie, sampler, situations) — zéro dépendance
│       ├── render/       Rendu canvas (projection, dessin, scène)
│       ├── components/   UI (sidebar, phases, playbar, terrain, modales, bibliothèque)
│       └── pages/        Éditeur + visionneuse de partage (/app/s/<token>)
├── backend/              API FastAPI + SQLAlchemy async + PostgreSQL (JSONB) — géré avec uv
├── caddy/                Reverse proxy (Caddyfile + image : landing + build React + proxy API)
├── docker-compose.yml    Production
├── docker-compose.dev.yml  Développement (PostgreSQL seul)
└── Makefile              make dev · make prod · make stop · make logs · make backup
```

## Fonctionnalités

- **Éditeur** : drag and drop des joueurs et du ballon (passe, tir), écrans en T, trajectoires courbes, dribble animé, demi-terrain ou terrain complet FIBA, situations initiales (touches, lancers francs), undo, exports vidéo / images / planche PDF / JSON.
- **Mode invité** : tout fonctionne sans compte, sauvegarde dans le navigateur (localStorage).
- **Comptes** : email + mot de passe, sessions cookie httpOnly. Systèmes en JSONB, rangés dans des dossiers.
- **Partage** : lien public en lecture seule (`/app/s/<token>`), révocable, sans compte pour le lecteur.

## API

`POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
`GET|POST /api/folders` · `PATCH|DELETE /api/folders/{id}`
`GET|POST /api/systems` · `GET|PUT|DELETE /api/systems/{id}`
`POST|DELETE /api/systems/{id}/share` · `GET /api/shared/{token}` (public)

## Notes

- La vue demi-terrain est une rotation pure de la vue complète : la gauche du panier reste à gauche.
- Le moteur (`frontend/src/engine`) est un module TS pur, réutilisable (visionneuse, exports, future télestration).
- Format JSON versionné, compatible avec les exports de l'ancienne version mono-fichier (`app.html`, conservée pour référence; prototype Streamlit dans la branche `V1`).
- Avant une ouverture large au public : ajouter des migrations (Alembic) et un rate limiting sur l'auth.
