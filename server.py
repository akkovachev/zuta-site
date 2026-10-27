#!/usr/bin/env python3
"""Tiny web server for zuta-site: static files, a visitor counter and a joke endpoint.

No third-party dependencies. Counts are stored in a JSON file (DATA_FILE).
Visitors are de-duplicated with a first-party cookie; no IPs are stored.
"""
import json
import os
import random
import re
import secrets
import tempfile
import threading
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from jokes import JOKES

PORT = int(os.environ.get("PORT", "8080"))
DATA_FILE = os.environ.get("DATA_FILE", "/data/counter.json")
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
COOKIE_NAME = "zuta_v"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365
BOT_RE = re.compile(r"bot|crawl|spider|slurp|curl|wget|python-requests|monitor|uptime|headless|preview", re.I)

STATIC = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "application/javascript; charset=utf-8"),
}

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
}

_lock = threading.Lock()


def _load():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            d = json.load(f)
        return {"visitors": int(d.get("visitors", 0)), "views": int(d.get("views", 0))}
    except (FileNotFoundError, ValueError):
        return {"visitors": 0, "views": 0}


def _save(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(DATA_FILE), prefix=".counter-")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f)
    os.replace(tmp, DATA_FILE)


def pick_joke(last=None):
    idx = random.randrange(len(JOKES))
    if last is not None and len(JOKES) > 1:
        while idx == last:
            idx = random.randrange(len(JOKES))
    return idx, JOKES[idx]


class Handler(BaseHTTPRequestHandler):
    server_version = "zuta"
    sys_version = ""

    def log_message(self, fmt, *args):  # quiet, no IPs in logs
        pass

    def _send(self, status, body, ctype, extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in SECURITY_HEADERS.items():
            self.send_header(k, v)
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status, obj, extra=None):
        h = {"Cache-Control": "no-store"}
        h.update(extra or {})
        self._send(status, json.dumps(obj).encode(), "application/json", h)

    def _has_cookie(self):
        c = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        return COOKIE_NAME in c

    def _is_https(self):
        return self.headers.get("X-Forwarded-Proto", "").lower() == "https"

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path
        if path in STATIC:
            name, ctype = STATIC[path]
            with open(os.path.join(PUBLIC_DIR, name), "rb") as f:
                body = f.read()
            return self._send(200, body, ctype, {"Cache-Control": "no-cache"})
        if path == "/healthz":
            return self._json(200, {"ok": True})
        if path == "/api/joke":
            q = parse_qs(url.query)
            try:
                last = int(q.get("last", [""])[0])
            except ValueError:
                last = None
            idx, joke = pick_joke(last)
            return self._json(200, {"id": idx, "setup": joke[0], "punchline": joke[1], "emoji": joke[2]})
        if path == "/api/count":
            with _lock:
                return self._json(200, _load())
        self._send(404, b"Not found", "text/plain; charset=utf-8")

    def do_POST(self):
        if urlparse(self.path).path != "/api/visit":
            return self._send(404, b"Not found", "text/plain; charset=utf-8")
        ua = self.headers.get("User-Agent", "")
        extra = {}
        new_visitor = False
        with _lock:
            data = _load()
            if not BOT_RE.search(ua):
                data["views"] += 1
                if not self._has_cookie():
                    data["visitors"] += 1
                    new_visitor = True
                _save(data)
            if new_visitor:
                attrs = f"{COOKIE_NAME}={secrets.token_hex(8)}; Max-Age={COOKIE_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax"
                if self._is_https():
                    attrs += "; Secure"
                extra["Set-Cookie"] = attrs
        self._json(200, {**data, "new_visitor": new_visitor}, extra)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
