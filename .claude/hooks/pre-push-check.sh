#!/usr/bin/env sh
# PreToolUse hook: blocks `git push` and the deploy command until the full
# gate passes. Exit code 2 blocks the tool call and surfaces stderr to Claude.
# Only matches push/deploy commands — everything else is allowed through.

input="$(cat)"
command=$(printf '%s' "$input" | node -e "
let data = '';
process.stdin.on('data', d => data += d);
process.stdin.on('end', () => {
  try { process.stdout.write(JSON.parse(data).tool_input?.command ?? ''); }
  catch { process.stdout.write(''); }
});
")

case "$command" in
  *"git push"*|*"vercel --prod"*|*"npm run deploy"*)
    ;;
  *)
    exit 0
    ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0
if npm run verify; then
  exit 0
else
  echo "npm run verify failed — push/deploy blocked until the gate is green." >&2
  exit 2
fi
