#!/bin/zsh
cd "${0:A:h}" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
url="http://127.0.0.1:4387"
if curl -fsS "$url/api/status" | /usr/bin/grep -q '"enabled"'; then
  open "$url"
else
  node tools/studio-server.mjs &
  studio_pid=$!
  trap 'kill $studio_pid 2>/dev/null' EXIT
  for attempt in {1..25}; do
    if curl -fsS "$url/api/status" 2>/dev/null | /usr/bin/grep -q '"enabled"'; then open "$url"; break; fi
    sleep 0.2
  done
  wait $studio_pid
fi
