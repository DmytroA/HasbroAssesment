FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci
COPY apps ./apps
COPY packages ./packages
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 PUBLIC_URL=http://localhost:3000 DATABASE_PATH=data/tabletop.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["npm", "start"]
