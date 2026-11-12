# The GraphQL API. Node runs the TypeScript source directly (type stripping), so there is no build step.
# Build from the repo root:  docker compose build api
FROM node:24.22.3-trixie-slim
ENV NODE_ENV=production
WORKDIR /app/explorer
COPY explorer/package.json explorer/package-lock.json ./
COPY explorer/packages ./packages
# only the API's runtime dependencies (and the contract it imports)
RUN npm ci --omit=dev --ignore-scripts --workspace @grivei/api --workspace @grivei/contract
USER node
EXPOSE 4000
CMD ["node", "packages/api/src/main.ts"]
