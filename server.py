#!/usr/bin/env python3
import http.server
import json
import os
import re
import threading
from urllib.parse import urlparse

PORT = int(os.environ.get("BOOKMARK_PORT", 8765))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BOOKMARKS_FILE = os.path.join(BASE_DIR, "bookmarks.md")
EXAMPLE_FILE = os.path.join(BASE_DIR, "bookmarks.example.md")
CLICKS_FILE = os.path.join(BASE_DIR, "logs", "click_log.json")

_lock = threading.Lock()

BOOKMARK_RE = re.compile(r"^\s*-\s+\[([^\]]+)\]\(([^)]+)\)(.*)")
TAG_RE = re.compile(r"#(\w+)")


def _favicon(url):
    domain = urlparse(url).netloc
    return f"https://favicon.im/{domain}"


def parse_bookmarks():
    path = BOOKMARKS_FILE if os.path.exists(BOOKMARKS_FILE) else EXAMPLE_FILE
    bookmarks = []
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                m = BOOKMARK_RE.match(line)
                if not m:
                    continue
                title, url, rest = m.group(1), m.group(2), m.group(3)
                tags = TAG_RE.findall(rest)
                bookmarks.append({"title": title, "url": url, "tags": tags, "favicon": _favicon(url)})
    except OSError:
        pass
    return bookmarks


def append_bookmark(title, url, tags):
    tag_str = " ".join(f"#{t.lstrip('#')}" for t in tags) if tags else ""
    line = f"- [{title}]({url}){' ' + tag_str if tag_str else ''}\n"
    path = BOOKMARKS_FILE if os.path.exists(BOOKMARKS_FILE) else BOOKMARKS_FILE
    with _lock:
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f:
                f.write("# Bookmarks\n\n")
        with open(path, "a", encoding="utf-8") as f:
            f.write(line)


def read_clicks():
    with _lock:
        try:
            with open(CLICKS_FILE, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return {}


def record_click(url):
    with _lock:
        try:
            with open(CLICKS_FILE, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            data = {}
        data[url] = data.get(url, 0) + 1
        os.makedirs(os.path.dirname(CLICKS_FILE), exist_ok=True)
        with open(CLICKS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        if self.path == "/api/bookmarks":
            self._json(parse_bookmarks())
        elif self.path == "/api/clicks":
            self._json(read_clicks())
        else:
            super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._error(400, "invalid JSON")
            return

        if self.path == "/api/click":
            url = data.get("url", "")
            if not url:
                self._error(400, "url required")
                return
            record_click(url)
            self._json({"ok": True})
        elif self.path == "/api/bookmark":
            title = data.get("title", "").strip()
            url = data.get("url", "").strip()
            tags = data.get("tags", [])
            if not title or not url:
                self._error(400, "title and url required")
                return
            append_bookmark(title, url, tags)
            self._json({"ok": True})
        else:
            self._error(404, "not found")

    def _json(self, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _error(self, code, msg):
        body = json.dumps({"error": msg}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.makedirs(os.path.join(BASE_DIR, "logs"), exist_ok=True)
    server = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Bookmark server running at http://localhost:{PORT}")
    server.serve_forever()
