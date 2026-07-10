# BasketballCoach 🏀

Le playbook numérique de votre club : dessinez vos systèmes de jeu, animez-les en temps réel, enregistrez-les sur votre compte et partagez-les à l'équipe.

> L'ancien prototype Streamlit + Manim est conservé dans la branche [`V1`](../../tree/V1). La version mono-fichier précédente reste disponible dans `app.html`.

## Architecture

```
├── index.html            Landing page statique (racine du site)
├── frontend/             Application React + TypeScript + Vite (servie sous /app/)
│   └── src/
│       ├── engine/       Moteur pur (types, géométrie, sampler, situations) — zéro dépendance
│       ├── render/       Rendu canvas (projection, dessin, scène)
│       ├── components/   UI (sidebar, phases, playbar, terrain, modales, bibliothèque)
│       └── pages/        Éditeur + visionneuse de partage (/app/s/<token>)
├── backend/              API FastAPI + SQLAlchemy async + PostgreSQL (JSONB) — géré avec uv
├── caddy/                Reverse proxy : Caddyfile + image (landing + build React + proxy API)
├── docker-compose.yml    Production : PostgreSQL + API + Caddy (HTTPS auto)
└── docker-compose.dev.yml  Développement : PostgreSQL seul
```

## Fonctionnalités

- **Éditeur** : drag and drop des joueurs et du ballon (passe, tir), écrans en T, trajectoires courbes (Catmull-Rom), dribble animé, demi-terrain ou terrain complet FIBA, situations initiales (touches, lancers francs), undo, exports vidéo / images / planche PDF / JSON.
- **Mode invité** : tout fonctionne sans compte, le travail est sauvegardé dans le navigateur (localStorage). L'enregistrement sur le compte et le partage nécessitent une connexion.
- **Comptes** : email + mot de passe (scrypt), sessions par cookie httpOnly. Systèmes stockés en JSONB, rangés dans des dossiers.
- **Partage** : lien public en lecture seule (`/app/s/<token>`), révocable, lecture immédiate sans compte.

## Développement

**Workflow recommandé** : le même PostgreSQL que la prod (dans Docker), l'API et le front en direct avec rechargement à chaud.

```bash
# 1. La base (une seule fois, reste en tâche de fond)
docker compose -f docker-compose.dev.yml up -d

# 2. L'API (uv gère Python et les dépendances, rechargement auto)
cd backend
uv sync
DATABASE_URL="postgresql+asyncpg://bball:bball@localhost:5432/bball" COOKIE_SECURE=0 \
  uv run uvicorn app.main:app --reload

# 3. Le front (HMR, proxy /api vers le port 8000)
cd frontend
npm install
npm run dev        # http://localhost:5173/app/
```

**Stack complète en local** (identique à la prod, pour valider avant déploiement) :

```bash
cp .env.example .env && docker compose up --build
# http://localhost/  (landing)  ·  http://localhost/app/  (application)
```

**Dépannage sans Docker** : l'API accepte n'importe quelle URL SQLAlchemy, donc `DATABASE_URL="sqlite+aiosqlite:///./dev.db"` fonctionne pour un test rapide sans PostgreSQL. À réserver au dépannage : SQLite ne se comporte pas exactement comme PostgreSQL (timezones, concurrence, requêtes JSONB), développer dessus expose à des bugs qui n'apparaîtraient qu'en prod.

Mode mono-processus (l'API sert aussi la landing et le build React, pratique sans Caddy) :

```bash
cd frontend && npm run build
cd ../backend && SERVE_STATIC=1 COOKIE_SECURE=0 DATABASE_URL=... uv run uvicorn app.main:app
# http://localhost:8000/  (landing)  ·  http://localhost:8000/app/  (application)
```

## Déploiement sur un VPS

Prérequis : Docker + Docker Compose, un domaine pointant vers le serveur (optionnel mais recommandé pour le HTTPS automatique).

```bash
git clone <repo> && cd BasketBallCoach
cp .env.example .env        # définir POSTGRES_PASSWORD et SITE_ADDRESS=mondomaine.fr
docker compose up -d --build
```

Caddy sert la landing à la racine, l'app React sous `/app/`, proxifie `/api/` vers FastAPI, et obtient automatiquement les certificats Let's Encrypt si `SITE_ADDRESS` est un domaine.

Sauvegarde de la base :

```bash
docker compose exec db pg_dump -U bball bball > backup_$(date +%F).sql
```

## API

`POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
`GET|POST /api/folders` · `PATCH|DELETE /api/folders/{id}`
`GET|POST /api/systems` · `GET|PUT|DELETE /api/systems/{id}`
`POST|DELETE /api/systems/{id}/share` · `GET /api/shared/{token}` (public)

## Notes techniques

- Coordonnées en mètres sur le terrain FIBA 28×15 (paniers à x = 1.575 / 26.425). La vue demi-terrain est une rotation pure de la vue complète : la gauche du panier reste à gauche.
- Le moteur (`frontend/src/engine`) est un module TypeScript pur, sans dépendance : réutilisable pour la visionneuse, les exports serveur ou de futurs usages (télestration).
- Format JSON versionné (`app: "basketballcoach-web", version: 1`), compatible avec les exports de la version mono-fichier.
- Pas encore de migrations (create_all au démarrage) ni de rate limiting : à ajouter avant une ouverture large au public.
