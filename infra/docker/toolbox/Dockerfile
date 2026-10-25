# Toolbox: the development environment. The host needs only Docker.
# Every project command runs in here through ./toolbox (see AGENTS.md).
FROM node:24.22.1-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.15.0 \
  && mkdir -p /home/node/.local/share/pnpm /home/node/.cache /workspace \
  && chown -R node:node /home/node /workspace \
  && git config --system --add safe.directory /workspace

ENV PNPM_HOME=/home/node/.local/share/pnpm \
  PNPM_STORE_DIR=/home/node/.local/share/pnpm/store \
  TURBO_TELEMETRY_DISABLED=1 \
  DO_NOT_TRACK=1

USER node
WORKDIR /workspace
