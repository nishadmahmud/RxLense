"""Simple in-memory IP rate limit + optional demo token middleware."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from . import config


class AbuseShieldMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, max_per_minute: int | None = None):
        super().__init__(app)
        self.max_per_minute = max_per_minute or config.RATE_LIMIT_PER_MINUTE
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if path.startswith("/api/") and path != "/api/health":
            token = request.headers.get("x-demo-token") or request.query_params.get("demoToken")
            if config.DEMO_TOKEN and token != config.DEMO_TOKEN:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or missing X-Demo-Token"},
                )

            if self.max_per_minute > 0:
                client = request.client.host if request.client else "unknown"
                now = time.time()
                q = self._hits[client]
                while q and now - q[0] > 60:
                    q.popleft()
                if len(q) >= self.max_per_minute:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded  -  try again in a minute"},
                    )
                q.append(now)

        return await call_next(request)
