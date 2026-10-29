# PDF worker (apps/pdf-worker, book-designer.md §9): Node, Typst and the fonts, in a container of
# its own, never in the API's or the web app's. In development it runs the workspace's code
# (compose.yaml); production packaging comes with hosting, as for the other apps.
FROM node:24.22.1-bookworm-slim

# poppler-utils counts a PDF's pages for the cover's spine.
ARG TYPST_VERSION=0.15.1
ARG TYPST_SHA256=a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl xz-utils unzip poppler-utils \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL -o /tmp/typst.tar.xz \
    "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" \
  && echo "${TYPST_SHA256}  /tmp/typst.tar.xz" | sha256sum -c - \
  && tar -xJf /tmp/typst.tar.xz -C /tmp \
  && install -m 0755 /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst \
  && rm -rf /tmp/typst*

# The fonts, as recorded in docs/license-evidence (gentium, ezra-sil): same files, same hashes.
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

ENV FONT_PATH=/fonts
USER node
WORKDIR /workspace
