#!/usr/bin/env bash
# Installs design-kickoff for every project on this machine (user-level Claude Code config).
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
dest="$HOME/.claude/skills/design-kickoff"
mkdir -p "$HOME/.claude/skills"
rm -rf "$dest"
cp -r "$src" "$dest"
rule_marker="<!-- design-kickoff -->"
claude_md="$HOME/.claude/CLAUDE.md"
touch "$claude_md"
if ! grep -q "$rule_marker" "$claude_md"; then
  cat >> "$claude_md" <<'RULE'

<!-- design-kickoff -->
## Design kickoff (mandatory)
At the start of any project or task that produces visual output (app, website, landing page, dashboard, UI feature, redesign, branding), invoke the `design-kickoff` skill BEFORE writing design or frontend code: run its catalog, show the user example styles with reference links, recommend one, get their choice, and record it in `docs/design/DESIGN_DIRECTION.md`. Skip only if that file already exists.
RULE
fi
echo "Installed to $dest and updated $claude_md"
