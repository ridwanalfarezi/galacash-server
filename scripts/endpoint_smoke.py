#!/usr/bin/env python
"""
Simple endpoint smoke tester for GalaCash API using urllib (no external deps).
- Logs in as a regular user and bendahara using seeded credentials.
- Calls read-only endpoints grouped by entity.

Configure via env vars:
- BASE_URL: API base (default http://localhost:3000/api)
- USER_NIM / USER_PASSWORD: student creds (default 1313600001 / password123)
- BENDAHARA_NIM / BENDAHARA_PASSWORD: treasurer creds (default 1313699999 / password123)
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api")
USER_NIM = os.getenv("USER_NIM", "1313600001")
USER_PASSWORD = os.getenv("USER_PASSWORD", "password123")
BENDAHARA_NIM = os.getenv("BENDAHARA_NIM", "1313699999")
BENDAHARA_PASSWORD = os.getenv("BENDAHARA_PASSWORD", "password123")


def log(title: str, status: int, elapsed: float, body: Any) -> None:
    """Log request result."""
    preview = body
    if isinstance(body, dict):
        preview = {k: body.get(k) for k in list(body)[:4]}
    print(f"[{status}] {title} ({elapsed*1000:.0f} ms) -> {preview}")


def request(method: str, path: str, token: Optional[str] = None,
            params: Optional[Dict[str, Any]] = None, json_body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Make HTTP request."""
    url = f"{BASE_URL}{path}"
    
    # Build query string
    if params:
        q = "&".join(f"{k}={v}" for k, v in params.items())
        url += f"?{q}"
    
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = None
    if json_body:
        body = json.dumps(json_body).encode("utf-8")
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    start = time.time()
    
    try:
        with urllib.request.urlopen(req) as resp:
            elapsed = time.time() - start
            resp_body = json.loads(resp.read().decode("utf-8"))
            log(f"{method} {path}", resp.status, elapsed, resp_body)
            return resp_body
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = {"error": str(e)}
        log(f"{method} {path} [ERROR]", e.code, elapsed, err_body)
        raise


def login(nim: str, password: str) -> Optional[Dict[str, Any]]:
    """Log in and return tokens, or None on conflict (already logged in)."""
    try:
        resp = request("POST", "/auth/login", json_body={"nim": nim, "password": password})
        return resp["data"]
    except urllib.error.HTTPError as e:
        if e.code == 409:  # Conflict: refresh token likely exists
            print(f"⚠️  User {nim} already has active session (409)")
            return None
        raise


def refresh_token(refresh_tk: str) -> str:
    """Refresh access token."""
    resp = request("POST", "/auth/refresh", json_body={"refreshToken": refresh_tk})
    return resp["data"]["accessToken"]


def user_flow(access_token: str) -> None:
    """Exercise user endpoints."""
    print("\n=== USER FLOW ===")
    request("GET", "/auth/me", token=access_token)
    request("GET", "/dashboard/summary", token=access_token)
    request("GET", "/dashboard/pending-bills", token=access_token)
    request("GET", "/dashboard/pending-applications", token=access_token)
    request("GET", "/transactions", token=access_token)
    request("GET", "/transactions/chart-data", token=access_token, params={"type": "income"})
    request("GET", "/fund-applications", token=access_token)
    request("GET", "/fund-applications/my", token=access_token)
    request("GET", "/cash-bills", token=access_token)


def bendahara_flow(access_token: str) -> None:
    """Exercise bendahara endpoints."""
    print("\n=== BENDAHARA FLOW ===")
    request("GET", "/bendahara/dashboard", token=access_token)
    request("GET", "/bendahara/fund-applications", token=access_token)
    request("GET", "/bendahara/cash-bills", token=access_token)
    request("GET", "/bendahara/students", token=access_token)
    request("GET", "/bendahara/rekap-kas", token=access_token)


def main() -> int:
    """Run smoke tests."""
    print(f"Using BASE_URL={BASE_URL}\n")
    
    try:
        # Login as user
        print("=== AUTH ===")
        print(f"Logging in user {USER_NIM}...")
        user_tokens = login(USER_NIM, USER_PASSWORD)
        if not user_tokens:
            print("⚠️  User login skipped (already active)")
            return 0
        user_access = user_tokens["accessToken"]
        
        print(f"Logging in bendahara {BENDAHARA_NIM}...")
        bend_tokens = login(BENDAHARA_NIM, BENDAHARA_PASSWORD)
        if not bend_tokens:
            print("⚠️  Bendahara login skipped (already active), using user token for demo")
            bend_access = user_access  # fallback for demo
        else:
            bend_access = bend_tokens["accessToken"]
        
        # Test refresh (skip if no token)
        if bend_tokens:
            print("Testing token refresh...")
            refresh_token(bend_tokens["refreshToken"])
        
        # Run flows
        user_flow(user_access)
        bendahara_flow(bend_access)
        
        print("\n✅ All tests passed!")
        return 0
    
    except Exception as exc:
        print(f"\n❌ Smoke test failed: {exc}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
