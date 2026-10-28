# Toolbox: the development environment. The host needs only Docker.
# Every project command runs in here through ./toolbox (see AGENTS.md).
FROM node:24.22.1-bookworm-slim

# python3, make and g++ build native modules that have no prebuilt binary for this Node
# version (tree-sitter, used by usfm-grammar).
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@12.15.0 \
  && mkdir -p /home/node/.local/share/pnpm /home/node/.cache /workspace \
  && chown -R node:node /home/node /workspace \
  && git config --system --add safe.directory /workspace

# Playwright's Chromium and the system libraries it needs, for screenshots and end-to-end
# tests (testing.md §3). Keep the version equal to @playwright/test in package.json.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx -y playwright@1.64.0 install --with-deps chromium \
  && chmod -R a+rX /ms-playwright \
  && rm -rf /var/lib/apt/lists/* /root/.npm

ENV PNPM_HOME=/home/node/.local/share/pnpm \
  PNPM_STORE_DIR=/home/node/.local/share/pnpm/store \
  # Node 24's V8 headers need C++20; some native modules (tree-sitter 0.25) still ask for C++17.
  CXXFLAGS=-std=c++20 \
  TURBO_TELEMETRY_DISABLED=1 \
  DO_NOT_TRACK=1

USER node
WORKDIR /workspace
