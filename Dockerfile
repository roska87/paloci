# Paloci — a candlelit viewer for your MemPalace.
# Zero npm dependencies: we only need a Node ≥ 22.5 runtime for node:sqlite.
FROM node:22-alpine

# Run as the unprivileged "node" user that ships with the image (uid 1000).
# Its home is /home/node, where we mount the palace so auto-discovery just works.
ENV NODE_ENV=production
# Point straight at the mounted palace. An explicit MEMPALACE_DB wins over
# auto-discovery, which would otherwise read an absolute host path from
# ~/.mempalace/config.json that doesn't exist inside the container.
ENV MEMPALACE_DB=/home/node/.mempalace/palace/chroma.sqlite3
# Bind to all interfaces inside the container so the mapped port is reachable
# (the native default is 127.0.0.1). Docker's port mapping controls exposure.
ENV HOST=0.0.0.0
WORKDIR /app

# Copy the source. There are no npm dependencies, so there's no npm ci step.
COPY --chown=node:node . .

USER node

EXPOSE 8787

# The MemPalace database is expected at /home/node/.mempalace (mount it read-only).
CMD ["node", "--no-warnings", "server.js"]
