# zuta-site

Simple personal page for Kaloyan, aka Zuta. Static HTML/CSS served by nginx in a Docker image.

## Run

```bash
docker compose up -d --build
# http://127.0.0.1:8480
```

Or without compose:

```bash
docker build -t zuta-site .
docker run -d --name zuta-site --restart unless-stopped -p 127.0.0.1:8480:8080 zuta-site
```

## Edit

Page content lives in `public/index.html`, styling in `public/style.css`. Rebuild the image after changes.
