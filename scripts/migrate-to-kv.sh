#!/usr/bin/env bash
# bookmarks.md の内容を Cloudflare KV にアップロードする
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$DIR/bookmarks.md" ]; then
  echo "Error: bookmarks.md が見つかりません"
  exit 1
fi

if [ -z "${KV_NAMESPACE_ID:-}" ]; then
  echo "Usage: KV_NAMESPACE_ID=xxx bash scripts/migrate-to-kv.sh"
  echo ""
  echo "KV Namespace ID は wrangler.toml の id フィールドを確認してください"
  exit 1
fi

echo "==> bookmarks.md を JSON に変換中..."
TMPFILE=$(mktemp /tmp/bookmarks_kv.XXXXXX.json)

python3 - "$DIR/bookmarks.md" > "$TMPFILE" <<'PYEOF'
import re, json, sys
from urllib.parse import urlparse

BOOKMARK_RE = re.compile(r'^\s*-\s+\[([^\]]+)\]\(([^)]+)\)(.*)')
TAG_RE = re.compile(r'#(\w+)')

bookmarks = []
with open(sys.argv[1], encoding='utf-8') as f:
    for line in f:
        m = BOOKMARK_RE.match(line)
        if m:
            title, url, rest = m.group(1), m.group(2), m.group(3)
            if 'localhost' in url:
                continue
            tags = TAG_RE.findall(rest)
            domain = urlparse(url).netloc
            bookmarks.append({
                'title': title,
                'url': url,
                'tags': tags,
                'favicon': f'https://favicon.im/{domain}'
            })

print(json.dumps(bookmarks, ensure_ascii=False))
PYEOF

COUNT=$(python3 -c "import json; print(len(json.load(open('$TMPFILE'))))")
echo "==> ${COUNT} 件のブックマークを KV にアップロード中..."

wrangler kv key put "bookmarks" \
  --namespace-id="$KV_NAMESPACE_ID" \
  --path="$TMPFILE" \
  --remote

rm -f "$TMPFILE"
echo "==> 完了！"
