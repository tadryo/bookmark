#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_SRC="$DIR/com.bookmark.server.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.bookmark.server.plist"
LABEL="com.bookmark.server"

echo "==> Setting up Bookmark Server"

# Create logs directory
mkdir -p "$DIR/logs"

# Copy example bookmarks if not present
if [ ! -f "$DIR/bookmarks.md" ]; then
  cp "$DIR/bookmarks.example.md" "$DIR/bookmarks.md"
  echo "==> Created bookmarks.md from example"
fi

# Generate plist with actual path
sed "s|__BOOKMARK_DIR__|$DIR|g" "$PLIST_SRC" > "$PLIST_DST"
echo "==> Installed plist to $PLIST_DST"

# Unload if already loaded (ignore errors)
launchctl unload "$PLIST_DST" 2>/dev/null || true

# Load and start
launchctl load "$PLIST_DST"
echo "==> Server started at http://localhost:8765"

echo ""
echo "========================================"
echo " New Tab Page Setup"
echo "========================================"
echo ""
echo "Chrome:"
echo "  1. Install 'New Tab Redirect' extension"
echo "     https://chrome.google.com/webstore/detail/new-tab-redirect/icpgjfneehieebagbmdbhnlpiopdcmlh"
echo "  2. Set redirect URL to: http://localhost:8765"
echo ""
echo "Safari:"
echo "  Settings > General > Homepage: http://localhost:8765"
echo "  (New tab behavior can be set via extensions like 'Custom New Tab Page')"
echo ""
echo "========================================"
echo " Usage"
echo "========================================"
echo "  Edit bookmarks:  \$EDITOR $DIR/bookmarks.md"
echo "  View logs:       tail -f $DIR/logs/server.log"
echo "  Stop server:     launchctl unload $PLIST_DST"
echo "  Start server:    launchctl load $PLIST_DST"
echo ""
