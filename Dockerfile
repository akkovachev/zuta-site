FROM python:3.13-alpine
RUN addgroup -S app && adduser -S -G app app \
    && mkdir -p /app/public /data && chown app:app /data
WORKDIR /app
COPY server.py jokes.py ./
COPY public/ ./public/
ENV PORT=8080 DATA_FILE=/data/counter.json PYTHONUNBUFFERED=1
USER app
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
CMD ["python", "server.py"]
