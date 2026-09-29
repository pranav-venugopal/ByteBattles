"""System telemetry and health diagnostics for the ByteBattles backend."""
import time

from redis import Redis
from sqlalchemy import text

from config import REDIS_JOB_LIST, WORKER_PREFIX, WARM_QUEUE_PREFIX


def get_system_telemetry(redis_client: Redis, db_session=None) -> dict:
    """Collects system health metrics, database connection status, and worker queue depths."""
    report = {}

    # Redis connectivity and ping latency
    try:
        t0 = time.perf_counter()
        redis_ok = bool(redis_client.ping())
        report["redis_latency_ms"] = round((time.perf_counter() - t0) * 1000, 2)
    except Exception:
        redis_ok = False
        report["redis_latency_ms"] = None

    # Postgres database health check
    db_ok = None
    if db_session is not None:
        try:
            db_session.execute(text("SELECT 1"))
            db_ok = True
        except Exception:
            db_ok = False

    # Queue depth, worker heartbeats, and warm sandbox pool counts
    queue_depth = active_workers = None
    if redis_ok:
        try:
            queue_depth = redis_client.llen(REDIS_JOB_LIST)
            now = time.time()
            active_workers = 0
            for key in redis_client.scan_iter(f"{WORKER_PREFIX}:*:heartbeat"):
                beat = redis_client.get(key)
                if beat and now - float(beat) < 10:
                    active_workers += 1

            # Warm sandbox pool depth per language
            warm_pool = {}
            for lang in ("C", "CPP", "PY", "JS"):
                warm_pool[lang] = redis_client.llen(f"{WARM_QUEUE_PREFIX}:{lang}")
            report["warm_sandboxes"] = warm_pool
        except Exception:
            pass

    is_healthy = redis_ok and db_ok is not False
    report.update({
        "status": "healthy" if is_healthy else "unhealthy",
        "redis": "up" if redis_ok else "down",
        "postgres": {None: "unchecked", True: "up", False: "down"}[db_ok],
        "judge_queue_depth": queue_depth,
        "active_judge_workers": active_workers,
    })
    return report
