# Caddy serving the landing page (site/) at / and /ro/, and the explorer build at /explore/ and /ro/explore/.
# Build from the repo root:  docker compose build web
FROM node:24.22.3-trixie-slim AS app
WORKDIR /app/explorer
COPY explorer/package.json explorer/package-lock.json ./
COPY explorer/packages ./packages
RUN npm ci --ignore-scripts --workspace @grivei/app --include-workspace-root=false
RUN npm run build --workspace @grivei/app

FROM caddy:2.11.9-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY site /srv/site
COPY --from=app /app/explorer/packages/app/dist /srv/explore
EXPOSE 8080
