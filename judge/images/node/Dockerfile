FROM node:20-slim

# Install orbital telemetry tools: GNU time & coreutils
RUN apt-get update && apt-get install -y --no-install-recommends \
    time \
    coreutils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Evacuate default astronaut to free up orbital slot (UID 1000)
# Deploy dedicated flight runner 'run' (UID 1000) for strict sandbox isolation
RUN (userdel -r node 2>/dev/null || true) \
    && (groupdel node 2>/dev/null || true) \
    && useradd -m -u 1000 -s /bin/bash run \
    && mkdir -p /workspace \
    && chown -R run:run /workspace

WORKDIR /workspace
USER run

# Keep pod idling in orbit awaiting execution payloads
CMD ["sleep", "infinity"]
