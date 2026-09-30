import time
import logging

def setup_logger(name: str, log_file: str) -> logging.Logger:
    """Configure and return a standard file and stream logger."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        '%(asctime)s | %(process)d | %(levelname)s | %(message)s'
    )

    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(formatter)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    return logger

def check_system_health(redis_client=None) -> dict:
    """Standard health check utility to verify Redis connection and latency."""
    health_data = {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {}
    }

    if redis_client is not None:
        try:
            start_time = time.perf_counter()
            is_alive = bool(redis_client.ping())
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            health_data["services"]["redis"] = {
                "online": is_alive,
                "latency_ms": latency_ms
            }
        except Exception as exc:
            health_data["status"] = "degraded"
            health_data["services"]["redis"] = {
                "online": False,
                "error": str(exc)
            }

    return health_data
