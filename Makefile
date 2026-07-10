# BasketballCoach — deux commandes à connaître :
#   make dev    développement (rechargement à chaud)
#   make prod   production (VPS ou test local complet)

.PHONY: dev prod stop logs backup

## Développement : Postgres en Docker, API + front en direct. Ctrl+C arrête tout.
dev:
	docker compose -f docker-compose.dev.yml up -d
	cd backend && uv sync -q
	cd frontend && npm install --silent
	@echo ""
	@echo "  ➜  Application : http://localhost:5173/app/"
	@echo ""
	@trap 'kill 0' INT TERM; \
	( cd backend && DATABASE_URL="postgresql+asyncpg://bball:bball@localhost:5432/bball" \
	  COOKIE_SECURE=0 uv run uvicorn app.main:app --reload ) & \
	( cd frontend && npm run dev ) & \
	wait

## Production : tout dans Docker (Postgres + API + Caddy). Nécessite un .env.
prod:
	@test -f .env || { cp .env.example .env; echo "→ .env créé depuis .env.example : édite-le puis relance make prod"; exit 1; }
	docker compose up -d --build
	@echo ""
	@echo "  ➜  Landing : http://localhost:$${HTTP_PORT:-80}/   Application : http://localhost:$${HTTP_PORT:-80}/app/"
	@echo ""

## Tout arrêter (dev et prod)
stop:
	-docker compose down
	-docker compose -f docker-compose.dev.yml down

## Logs de la prod
logs:
	docker compose logs -f

## Sauvegarde de la base de production
backup:
	docker compose exec db pg_dump -U bball bball > backup_$$(date +%F).sql
	@echo "→ backup_$$(date +%F).sql"
