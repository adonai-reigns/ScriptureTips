#!/usr/bin/env bash
# Claude Code Stop hook: run `pnpm verify` before the agent hands back, if code has changed.
# On failure, exit 2 sends the report back to the agent so it can fix the problem first.
set -uo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"

# Already blocked once this turn: let it stop, so a failure it can't fix doesn't loop forever.
if [ "$(jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

# Only docs changed (or nothing): skip.
changed="$(git -C "$repo" status --porcelain --untracked-files=all |
  cut -c4- | grep -v -E '^docs/|\.md$' || true)"
if [ -z "$changed" ]; then
  exit 0
fi

if ! output="$("$repo/toolbox" pnpm verify 2>&1)"; then
  {
    echo "pnpm verify failed. Fix these before finishing (testing.md §7):"
    echo "$output" | grep -v -E '^ ?Container ' | tail -60
  } >&2
  exit 2
fi
exit 0
