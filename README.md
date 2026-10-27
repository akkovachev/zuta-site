# zuta-site

Simple personal page for Kaloyan, aka Zuta. A tiny Python server (standard library only) serves the page, a random joke on every visit and a visitor counter, all in one Docker image.

## Features

- **Joke of the visit:** a random joke from `jokes.py` on every page load, plus an "Another one" button. Add jokes by appending `(setup, punchline)` pairs.
- **Visitor counter:** counts unique visitors (first-party cookie, one year) and total page views. Obvious bots are ignored. No IP addresses are stored. Counts are kept in `/data/counter.json` on a Docker volume, so they survive restarts and rebuilds.

## Run

```bash
docker compose up -d --build
# http://127.0.0.1:8480
```

Or without compose:

```bash
docker build -t zuta-site .
docker run -d --name zuta-site --restart unless-stopped \
  -p 127.0.0.1:8480:8080 -v zuta-data:/data zuta-site
```

## Endpoints

- `GET /` page
- `GET /api/joke?last=<id>` random joke (avoids repeating `last`)
- `POST /api/visit` registers a visit, returns `{visitors, views}`
- `GET /api/count` current counts
- `GET /healthz` health check

## Edit

Page content: `public/index.html`, styling: `public/style.css`, behaviour: `public/app.js`. Rebuild the image after changes.
