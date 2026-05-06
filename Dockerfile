FROM node:lts-trixie-slim AS base
ARG USER_UID=1000
ARG USER_GID=1000
RUN apt-get update \
   && apt-get install -y --no-install-recommends ca-certificates gosu curl git wget ripgrep python3 \
   && rm -rf /var/lib/apt/lists/* \
   && corepack enable

# Modify the existing node user/group to have the specified UID/GID to match host user
RUN usermod -u $USER_UID --non-unique node \
  && groupmod -g $USER_GID --non-unique node \
  && usermod -g $USER_GID -d /paperclip node

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY cli/package.json cli/
COPY server/package.json server/
COPY ui/package.json ui/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/adapter-utils/package.json packages/adapter-utils/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/adapters/claude-local/package.json packages/adapters/claude-local/
COPY packages/adapters/codex-local/package.json packages/adapters/codex-local/
COPY packages/adapters/cursor-local/package.json packages/adapters/cursor-local/
COPY packages/adapters/gemini-local/package.json packages/adapters/gemini-local/
COPY packages/adapters/openclaw-gateway/package.json packages/adapters/openclaw-gateway/
COPY packages/adapters/opencode-local/package.json packages/adapters/opencode-local/
COPY packages/adapters/pi-local/package.json packages/adapters/pi-local/
COPY packages/plugins/sdk/package.json packages/plugins/sdk/
COPY patches/ patches/

RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @paperclipai/ui build
RUN pnpm --filter @paperclipai/plugin-sdk build
RUN pnpm --filter @paperclipai/server build
RUN test -f server/dist/index.js || (echo "ERROR: server build output missing" && exit 1)

FROM base AS production
ARG USER_UID=1000
ARG USER_GID=1000
WORKDIR /app
COPY --chown=node:node --from=build /app /app
RUN npm install --global --omit=dev @anthropic-ai/claude-code@latest @openai/codex@latest opencode-ai \
  && mkdir -p /paperclip \
  && chown node:node /paperclip

COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production \
  HOME=/paperclip \
  HOST=0.0.0.0 \
  PORT=3100 \
  SERVE_UI=true \
  PAPERCLIP_HOME=/paperclip \
  PAPERCLIP_INSTANCE_ID=default \
  USER_UID=${USER_UID} \
  USER_GID=${USER_GID} \
  PAPERCLIP_CONFIG=/paperclip/instances/default/config.json \
  PAPERCLIP_DEPLOYMENT_MODE=public \
  PAPERCLIP_DEPLOYMENT_EXPOSURE=public \
  OPENCODE_ALLOW_ALL_MODELS=true

#VOLUME ["/paperclip"]
EXPOSE 3100

RUN mkdir -p /paperclip/instances/default && echo '{"$meta":{"version":1,"updatedAt":"2026-05-06T00:00:00.000Z","source":"docker"},"database":{"mode":"embedded-postgres","embeddedPostgresDataDir":"/paperclip/instances/default/db","embeddedPostgresPort":54329,"backup":{"enabled":true,"intervalMinutes":60,"retentionDays":30,"dir":"/paperclip/instances/default/data/backups"}},"logging":{"mode":"file","logDir":"/paperclip/instances/default/logs"},"server":{"deploymentMode":"authenticated","exposure":"public","bind":"lan","host":"0.0.0.0","port":3100,"allowedHostnames":["paperclip-production-f663.up.railway.app"],"serveUi":true},"auth":{"baseUrlMode":"explicit","disableSignUp":false},"telemetry":{"enabled":true},"storage":{"provider":"local_disk","localDisk":{"baseDir":"/paperclip/instances/default/data/storage"}},"secrets":{"provider":"local_encrypted","strictMode":false,"localEncrypted":{"keyFilePath":"/paperclip/instances/default/secrets/master.key"}}}' > /paperclip/instances/default/config.json && chown -R node:node /paperclip
