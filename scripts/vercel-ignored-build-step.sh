#!/usr/bin/env bash
# Vercel Ignored Build Step — exit 0 = skip build, exit 1 = build.
# Project Settings → Git → Ignored Build Step (or vercel.json ignoreCommand).
#
# Skips when every changed file lives outside web-relevant paths (e.g. apps/mobile only).
# Force a build: include [vercel build] or [force deploy] in the commit message.

set -uo pipefail

if echo "${VERCEL_GIT_COMMIT_MESSAGE:-}" | grep -qiE '\[(vercel build|force deploy)\]'; then
  echo "[ignore-build] Force build requested in commit message."
  exit 1
fi

if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "[ignore-build] No parent commit (initial deploy or shallow clone) — building."
  exit 1
fi

# Pathspec excludes — edits only under these paths do not require a Next.js deploy.
EXCLUDES=(
  ':(exclude)apps/mobile'
  ':(exclude)docs'
  ':(exclude)android'
  ':(exclude)games'
  ':(exclude).cursor'
  ':(exclude)agent-transcripts'
  ':(exclude)build-log.txt'
  ':(exclude)vercel-fail-logs.txt'
  ':(exclude,glob)*.md'
  ':(exclude,glob)**/*.md'
)

if git diff HEAD^ HEAD --quiet -- . "${EXCLUDES[@]}"; then
  echo "[ignore-build] Only non-web paths changed — skipping Vercel build."
  exit 0
fi

echo "[ignore-build] Web-relevant changes detected — building."
exit 1
