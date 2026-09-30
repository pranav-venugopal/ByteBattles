"""Shared leaderboard helpers — importable from both the API and the judge."""

import logging
from functools import cache
from redis import Redis

from config import REDIS_HOST, REDIS_PORT, REDIS_DB

logger = logging.getLogger(__name__)

# ── Redis singleton (same pattern as the API's get_redis_client) ──────────────

@cache
def _get_redis_client() -> Redis:
    return Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True,
    )


# ── Lua script: atomically check if user already solved this problem ──────────
_LEADERBOARD_LUA = """
local marker_key   = KEYS[1]
local leaderboard  = KEYS[2]
local user_id      = ARGV[1]

local created = redis.call("SET", marker_key, "1", "NX")
if created then
    redis.call("ZINCRBY", leaderboard, 1, user_id)
    return 1
end
return 0
"""

_leaderboard_script = None  # lazy-loaded


def update_leaderboard(user_id: int, problem_id: str) -> bool:
    """
    Record a first-time AC for *user_id* on *problem_id*.

    Returns True if the leaderboard was updated (first AC), False otherwise.
    """
    global _leaderboard_script
    r = _get_redis_client()

    if _leaderboard_script is None:
        _leaderboard_script = r.register_script(_LEADERBOARD_LUA)

    marker_key = f"leaderboard:solved:{user_id}:{problem_id}"
    leaderboard_key = "leaderboard:global"

    result = _leaderboard_script(
        keys=[marker_key, leaderboard_key],
        args=[str(user_id)],
    )
    return bool(result)
