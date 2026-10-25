#!/usr/bin/env bash
# Claude Code PostToolUse hook: format and organize imports in the file just edited,
# using Biome in the toolbox container. Never blocks; Biome problems surface in `pnpm verify`.
set -uo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"

file="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')"
case "$file" in
  "$repo"/*) ;;
  *) exit 0 ;;
esac
case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css) ;;
  *) exit 0 ;;
esac

"$repo/toolbox" pnpm exec biome check --write --no-errors-on-unmatched \
  "${file#"$repo"/}" >/dev/null 2>&1
exit 0
