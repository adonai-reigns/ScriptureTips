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

# Typst and poppler-utils (page counts and previews), as in the PDF worker's image
# (infra/docker/pdf-worker), for the render tests and the engine trial (tools/pdf-trial).
ARG TYPST_VERSION=0.15.1
ARG TYPST_SHA256=a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl xz-utils unzip poppler-utils \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL -o /tmp/typst.tar.xz \
    "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" \
  && echo "${TYPST_SHA256}  /tmp/typst.tar.xz" | sha256sum -c - \
  && tar -xJf /tmp/typst.tar.xz -C /tmp \
  && install -m 0755 /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst \
  && rm -rf /tmp/typst*

# The PDF fonts, as in the PDF worker's image (infra/docker/pdf-worker), for the render tests.
RUN mkdir -p /fonts \
  && curl -fsSL -o /tmp/gentium.zip \
    https://github.com/silnrsi/font-gentium/releases/download/v7.000/Gentium-7.000.zip \
  && echo "313e64963ba27851356060a725d36ce01680e5c5c63f46e4b40f15741c043e21  /tmp/gentium.zip" | sha256sum -c - \
  && curl -fsSL -o /tmp/ezra.zip https://software.sil.org/downloads/r/ezra/EzraSIL-2.51.zip \
  && echo "f16bcb3ec4473ac6a9f138ee0dbde7cc2f835e93a90cbe8649b3f32677760cc1  /tmp/ezra.zip" | sha256sum -c - \
  && unzip -j -q /tmp/gentium.zip "*.ttf" -d /fonts \
  && unzip -j -q /tmp/ezra.zip "*.ttf" -d /fonts \
  && chmod -R a+rX /fonts \
  && rm /tmp/*.zip

ENV FONT_PATH=/fonts \
  PNPM_HOME=/home/node/.local/share/pnpm \
  PNPM_STORE_DIR=/home/node/.local/share/pnpm/store \
  # Node 24's V8 headers need C++20; some native modules (tree-sitter 0.25) still ask for C++17.
  CXXFLAGS=-std=c++20 \
  TURBO_TELEMETRY_DISABLED=1 \
  DO_NOT_TRACK=1

USER node
WORKDIR /workspace
