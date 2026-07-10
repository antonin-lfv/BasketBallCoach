# Contexte de build : la racine du dépôt (voir docker-compose.yml)

# Étape 1 : build du frontend React
FROM node:20-alpine AS build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend .
RUN npm run build

# Étape 2 : Caddy sert la landing + le build et proxifie l'API
FROM caddy:2-alpine
COPY caddy/Caddyfile /etc/caddy/Caddyfile
COPY index.html /srv/landing/index.html
COPY --from=build /build/dist /srv/app
