FROM node:20-slim

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    time \
    coreutils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN userdel -r node 2>/dev/null || true \
    && useradd -m -u 1000 run \
    && mkdir -p /workspace \
    && chown -R run:run /workspace

WORKDIR /workspace
USER run

CMD ["sleep", "infinity"]
