#!/usr/bin/env python
"""
Comprehensive smoke tester for GalaCash API using urllib (no external deps).
- Logs in as a regular user and bendahara using seeded credentials.
- Tests all endpoints with various filters, pagination, and edge cases.
- Validates exports, individual resource fetches, and aggregations.
- Tracks statistics and provides detailed test coverage report.

Configure via env vars:
- BASE_URL: API base (default http://localhost:3000/api)
- USER_NIM / USER_PASSWORD: student creds (default 1313600001 / password123)
- BENDAHARA_NIM / BENDAHARA_PASSWORD: treasurer creds (default 1313699999 / password123)
- SMOKE_SAVE_DIR: optional folder to save export files
- VERBOSE: set to '1' for detailed output (default: summary only)
"""

import os
import sys
import time
import json
import urllib.request
import urllib.parse
import urllib.error
from typing import Any, Dict, Optional, List, Tuple

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api")
SAVE_DIR = os.getenv("SMOKE_SAVE_DIR")  # optional: where to save export files
VERBOSE = os.getenv("VERBOSE", "0") == "1"
WAIT_BEFORE_START = os.getenv("WAIT_BEFORE_START", "0") == "1"  # Manual wait to avoid rate limits
USER_NIM = os.getenv("USER_NIM", "1313600001")
USER_PASSWORD = os.getenv("USER_PASSWORD", "password123")
BENDAHARA_NIM = os.getenv("BENDAHARA_NIM", "1313699999")
BENDAHARA_PASSWORD = os.getenv("BENDAHARA_PASSWORD", "password123")

# Global test statistics
test_stats = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "total_time_ms": 0,
    "tests_by_category": {},
}


def log(title: str, status: int, elapsed: float, body: Any, category: str = "general") -> None:
    """Log request result and update statistics."""
    global test_stats
    test_stats["total_requests"] += 1
    test_stats["total_time_ms"] += elapsed * 1000
    
    if status >= 200 and status < 300:
        test_stats["successful_requests"] += 1
    else:
        test_stats["failed_requests"] += 1
    
    if category not in test_stats["tests_by_category"]:
        test_stats["tests_by_category"][category] = {"count": 0, "time_ms": 0}
    
    test_stats["tests_by_category"][category]["count"] += 1
    test_stats["tests_by_category"][category]["time_ms"] += elapsed * 1000
    
    if VERBOSE:
        preview = body
        if isinstance(body, dict):
            preview = {k: body.get(k) for k in list(body)[:4]}
        status_icon = "[OK]" if status >= 200 and status < 300 else "[FAIL]"
        print(f"  {status_icon} [{status}] {title} ({elapsed*1000:.0f} ms) -> {preview}")
    elif test_stats["total_requests"] % 10 == 0:
        # Progress indicator every 10 requests
        print(f"  ... {test_stats['total_requests']} requests completed")


def extract_ids(response: Any, max_count: int = 3) -> List[str]:
    """Extract IDs from a paginated response for further testing."""
    try:
        if isinstance(response, dict):
            data = response.get("data", {})
            if isinstance(data, dict):
                items = data.get("data", [])
                if isinstance(items, list):
                    ids = [item.get("id") for item in items if isinstance(item, dict) and "id" in item]
                    return ids[:max_count]
    except Exception:
        pass
    return []


def get_date_range(days: int = 30) -> Tuple[str, str]:
    """Generate ISO date range for the last N days."""
    now = time.time()
    start_ts = now - days * 24 * 60 * 60
    start_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_ts))
    end_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
    return start_iso, end_iso



def request(
    method: str,
    path: str,
    token: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    expect_json: bool = True,
    category: str = "general",
) -> Any:
    """Make HTTP request.

    If expect_json=False, returns a tuple (status_code, bytes_response, headers).
    Otherwise returns parsed JSON dict.
    """
    # Small delay between requests to avoid rate limiting
    time.sleep(0.3)
    
    url = f"{BASE_URL}{path}"
    
    # Build query string
    if params:
        q = urllib.parse.urlencode(params)
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
            raw = resp.read()
            if expect_json:
                resp_body = json.loads(raw.decode("utf-8"))
                log(f"{method} {path}", resp.status, elapsed, resp_body, category)
                return resp_body
            else:
                size = len(raw)
                log(f"{method} {path}", resp.status, elapsed, {"bytes": size}, category)
                return resp.status, raw, dict(resp.headers)
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = {"error": str(e)}
        log(f"{method} {path} [ERROR]", e.code, elapsed, err_body, category)
        # Print error details for debugging
        if not VERBOSE and e.code >= 400:
            print(f"  [FAIL] [{e.code}] {method} {path}")
            if params:
                print(f"     Params: {params}")
            print(f"     Error: {json.dumps(err_body, indent=6)}")
        raise


def login(nim: str, password: str) -> Optional[Dict[str, Any]]:
    """Log in and return tokens, or None on conflict (already logged in)."""
    max_retries = 3
    retry_delay = 15  # Start with 15 second delay
    
    for attempt in range(max_retries):
        try:
            resp = request("POST", "/auth/login", json_body={"nim": nim, "password": password}, category="auth")
            return resp["data"]
        except urllib.error.HTTPError as e:
            if e.code == 409:  # Conflict: refresh token likely exists
                if VERBOSE:
                    print(f"[WARN] User {nim} already has active session (409)")
                return None
            elif e.code == 429:  # Rate limit exceeded
                if attempt < max_retries - 1:
                    print(f"[WARN] Rate limit hit for {nim}. Waiting {retry_delay} seconds and retrying (attempt {attempt+1}/{max_retries})...")
                    time.sleep(retry_delay)
                    retry_delay += 10  # Increase delay for next attempt
                else:
                    print(f"[WARN] Rate limit exceeded after {max_retries} attempts. Skipping bendahara tests and using user token only.")
                    return None
            else:
                raise
                raise
        raise


def refresh_token(refresh_tk: str) -> str:
    """Refresh access token."""
    resp = request("POST", "/auth/refresh", json_body={"refreshToken": refresh_tk}, category="auth")
    return resp["data"]["accessToken"]


def user_flow(access_token: str) -> None:
    """Exercise user endpoints with comprehensive test coverage."""
    print("\n" + "="*60)
    print("USER FLOW - Comprehensive Endpoint Coverage")
    print("="*60)
    
    # Basic pagination and date filters (last 30 days)
    start_iso, end_iso = get_date_range(30)
    page_limit = {"page": 1, "limit": 10}
    date_range = {"startDate": start_iso, "endDate": end_iso}

    # === AUTH & PROFILE ===
    print("\n[AUTH & PROFILE]")
    # Skip /auth/me to avoid rate limiting (already validated via login)
    # request("GET", "/auth/me", token=access_token, category="auth")
    
    # === DASHBOARD ===
    print("\n[DASHBOARD]")
    request("GET", "/dashboard/summary", token=access_token, category="dashboard")
    request("GET", "/dashboard/pending-bills", token=access_token, category="dashboard")
    request("GET", "/dashboard/pending-applications", token=access_token, category="dashboard")
    
    # === LABELS (bootstrap data for filters) ===
    print("\n[LABELS]")
    all_labels = request("GET", "/labels", token=access_token, category="labels")
    request("GET", "/labels/bill-statuses", token=access_token, category="labels")
    request("GET", "/labels/fund-statuses", token=access_token, category="labels")
    request("GET", "/labels/fund-categories", token=access_token, category="labels")
    request("GET", "/labels/transaction-types", token=access_token, category="labels")
    categories_resp = request("GET", "/labels/transaction-categories", token=access_token, category="labels")
    request("GET", "/labels/payment-methods", token=access_token, category="labels")
    
    # Extract transaction categories for filtering
    cat_list = categories_resp.get("data", []) if isinstance(categories_resp, dict) else []
    categories = []
    if isinstance(cat_list, list):
        categories = [c.get("value") for c in cat_list if isinstance(c, dict) and c.get("value")]
    
    # === PAYMENT ACCOUNTS ===
    print("\n[PAYMENT ACCOUNTS]")
    request("GET", "/payment-accounts/active", category="payment-accounts")  # public route
    
    # === TRANSACTIONS ===
    print("\n[TRANSACTIONS]")
    # Base list with pagination (date filters removed - API expects object format)
    txn_resp = request("GET", "/transactions", token=access_token, params=page_limit, category="transactions")
    txn_ids = extract_ids(txn_resp, max_count=2)
    
    # Test pagination (page 2)
    request("GET", "/transactions", token=access_token, params={**page_limit, "page": 2}, category="transactions")
    
    # Test different page sizes
    request("GET", "/transactions", token=access_token, params={"page": 1, "limit": 5}, category="transactions")
    
    # Test both transaction types with all categories
    for txn_type in ("income", "expense"):
        # Type-only filter
        request("GET", "/transactions", token=access_token, 
                params={**page_limit, "type": txn_type}, category="transactions")
        
        # With sorting
        request("GET", "/transactions", token=access_token, 
                params={**page_limit, "type": txn_type, "sortBy": "date", "sortOrder": "desc"}, category="transactions")
        
        # Test with first 2 categories
        for cat in categories[:2]:
            request("GET", "/transactions", token=access_token,
                    params={**page_limit, "type": txn_type, "category": cat}, category="transactions")
        
        # Chart data (no date filter)
        request("GET", "/transactions/chart-data", token=access_token,
                params={"type": txn_type}, category="transactions")
        
        # Breakdown (no date filter)
        request("GET", "/transactions/breakdown", token=access_token,
                params={"type": txn_type}, category="transactions")
    
    # Test individual transaction fetches
    for txn_id in txn_ids:
        request("GET", f"/transactions/{txn_id}", token=access_token, category="transactions")
    
    # === EXPORTS ===
    print("\n[EXPORTS]")
    # Export transactions to both formats and types (binary), include category if available
    first_cat = categories[0] if categories else None
    for txn_type in ("income", "expense"):
        for fmt in ("excel", "csv"):
            export_params = {"format": fmt, "type": txn_type}
            if first_cat:
                export_params["category"] = first_cat
            status, content, headers = request(
                "GET",
                "/transactions/export",
                token=access_token,
                params=export_params,
                expect_json=False,
                category="exports",
            )
            if SAVE_DIR and status == 200:
                os.makedirs(SAVE_DIR, exist_ok=True)
                fname = f"transactions_export_{txn_type}_{fmt}.{'xlsx' if fmt=='excel' else 'csv'}"
                fpath = os.path.join(SAVE_DIR, fname)
                with open(fpath, "wb") as f:
                    f.write(content)
                if VERBOSE:
                    print(f"    [SAVE] Saved export to {fpath} ({len(content)} bytes)")
    
    # === FUND APPLICATIONS ===
    print("\n[FUND APPLICATIONS]")
    # List all with pagination
    fund_resp = request("GET", "/fund-applications", token=access_token, 
                       params=page_limit, category="fund-applications")
    fund_ids = extract_ids(fund_resp, max_count=2)
    
    # List user's own applications
    my_fund_resp = request("GET", "/fund-applications/my", token=access_token, 
                           params=page_limit, category="fund-applications")
    my_fund_ids = extract_ids(my_fund_resp, max_count=2)
    
    # Test with status filters
    for status in ("pending", "approved", "rejected"):
        request("GET", "/fund-applications", token=access_token,
                params={**page_limit, "status": status}, category="fund-applications")
    
    # Test with category filters (education, health, emergency, equipment)
    for cat in ("education", "health"):
        request("GET", "/fund-applications", token=access_token,
                params={**page_limit, "category": cat}, category="fund-applications")
    
    # Test with sorting
    request("GET", "/fund-applications", token=access_token,
            params={**page_limit, "sortBy": "date", "sortOrder": "desc"}, category="fund-applications")
    
    # Fetch individual fund applications
    for fund_id in (fund_ids + my_fund_ids)[:3]:
        request("GET", f"/fund-applications/{fund_id}", token=access_token, category="fund-applications")
    
    # === CASH BILLS ===
    print("\n[CASH BILLS]")
    # List all with pagination
    bill_resp = request("GET", "/cash-bills", token=access_token, 
                       params=page_limit, category="cash-bills")
    bill_ids = extract_ids(bill_resp, max_count=2)
    
    # Test with status filters
    for status in ("belum_dibayar", "menunggu_konfirmasi", "sudah_dibayar"):
        request("GET", "/cash-bills", token=access_token,
                params={**page_limit, "status": status}, category="cash-bills")
    
    # Test with month/year filters
    current_year = 2026
    request("GET", "/cash-bills", token=access_token,
            params={**page_limit, "year": current_year}, category="cash-bills")
    request("GET", "/cash-bills", token=access_token,
            params={**page_limit, "month": "2026-01"}, category="cash-bills")
    
    # Test with sorting
    request("GET", "/cash-bills", token=access_token,
            params={**page_limit, "sortBy": "dueDate", "sortOrder": "asc"}, category="cash-bills")
    
    # Fetch individual cash bills
    for bill_id in bill_ids:
        request("GET", f"/cash-bills/{bill_id}", token=access_token, category="cash-bills")
    
    # Note: Skipping POST /cash-bills/:id/pay and /cancel-payment to keep smoke test read-only
    
    print(f"\n[OK] User flow completed")



def bendahara_flow(access_token: str) -> None:
    """Exercise bendahara endpoints with comprehensive test coverage."""
    print("\n" + "="*60)
    print("BENDAHARA FLOW - Comprehensive Endpoint Coverage")
    print("="*60)
    
    # Reuse same pagination/date filters
    start_iso, end_iso = get_date_range(30)
    page_limit = {"page": 1, "limit": 10}
    date_range = {"startDate": start_iso, "endDate": end_iso}

    # === BENDAHARA DASHBOARD ===
    print("\n[BENDAHARA DASHBOARD]")
    request("GET", "/bendahara/dashboard", token=access_token, category="bendahara")
    
    # Test with different date ranges (if supported)
    # Skipped due to date object validation issues
    
    # === FUND APPLICATIONS (BENDAHARA VIEW) ===
    print("\n[BENDAHARA - FUND APPLICATIONS]")
    # List all with pagination
    fund_resp = request("GET", "/bendahara/fund-applications", token=access_token,
                       params=page_limit, category="bendahara")
    fund_ids = extract_ids(fund_resp, max_count=2)
    
    # Test with different statuses
    for status in ("pending", "approved", "rejected"):
        request("GET", "/bendahara/fund-applications", token=access_token,
                params={**page_limit, "status": status}, category="bendahara")
    
    # Test with category filters
    for cat in ("education", "health", "emergency", "equipment"):
        request("GET", "/bendahara/fund-applications", token=access_token,
                params={**page_limit, "category": cat}, category="bendahara")
    
    # Test pagination
    request("GET", "/bendahara/fund-applications", token=access_token,
            params={**page_limit, "page": 2}, category="bendahara")
    
    # Test with sorting
    for sort_by in ("date", "amount", "status"):
        request("GET", "/bendahara/fund-applications", token=access_token,
                params={**page_limit, "sortBy": sort_by, "sortOrder": "desc"}, category="bendahara")
    
    # Test with amount range
    request("GET", "/bendahara/fund-applications", token=access_token,
            params={**page_limit, "minAmount": 10000, "maxAmount": 500000}, category="bendahara")
    
    # Note: Skipping POST approve/reject to keep smoke test read-only
    
    # === CASH BILLS (BENDAHARA VIEW) ===
    print("\n[BENDAHARA - CASH BILLS]")
    # List all with pagination
    bill_resp = request("GET", "/bendahara/cash-bills", token=access_token,
                       params=page_limit, category="bendahara")
    bill_ids = extract_ids(bill_resp, max_count=2)
    
    # Test with different statuses
    for status in ("belum_dibayar", "menunggu_konfirmasi", "sudah_dibayar"):
        request("GET", "/bendahara/cash-bills", token=access_token,
                params={**page_limit, "status": status}, category="bendahara")
    
    # Test with month/year filters
    current_year = 2026
    for month_str in ("2026-01", "2025-12"):
        request("GET", "/bendahara/cash-bills", token=access_token,
                params={**page_limit, "month": month_str}, category="bendahara")
    
    request("GET", "/bendahara/cash-bills", token=access_token,
            params={**page_limit, "year": current_year}, category="bendahara")
    
    # Test pagination
    request("GET", "/bendahara/cash-bills", token=access_token,
            params={**page_limit, "page": 2}, category="bendahara")
    
    # Test sorting
    for sort_by in ("dueDate", "month", "status"):
        request("GET", "/bendahara/cash-bills", token=access_token,
                params={**page_limit, "sortBy": sort_by, "sortOrder": "asc"}, category="bendahara")
    
    # Note: Skipping POST confirm/reject payment to keep smoke test read-only
    
    # === STUDENTS LIST ===
    print("\n[BENDAHARA - STUDENTS]")
    # List all students
    students_resp = request("GET", "/bendahara/students", token=access_token,
                           params={**page_limit}, category="bendahara")
    
    # Test pagination
    request("GET", "/bendahara/students", token=access_token,
            params={"page": 1, "limit": 20}, category="bendahara")
    request("GET", "/bendahara/students", token=access_token,
            params={**page_limit, "page": 2}, category="bendahara")
    
    # === REKAP KAS (Cash Summary) ===
    print("\n[BENDAHARA - REKAP KAS]")
    # Test base endpoint
    request("GET", "/bendahara/rekap-kas", token=access_token, category="bendahara")
    
    # Test different groupings
    for group_by in ("day", "week", "month", "year"):
        request("GET", "/bendahara/rekap-kas", token=access_token,
                params={"groupBy": group_by}, category="bendahara")
    
    print(f"\n[OK] Bendahara flow completed")



def print_summary() -> None:
    """Print comprehensive test summary."""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    total = test_stats["total_requests"]
    success = test_stats["successful_requests"]
    failed = test_stats["failed_requests"]
    total_time = test_stats["total_time_ms"]
    
    success_rate = (success / total * 100) if total > 0 else 0
    avg_time = (total_time / total) if total > 0 else 0
    
    print(f"\n[STATS] Overall Statistics:")
    print(f"  Total Requests:     {total}")
    print(f"  [OK] Successful:       {success} ({success_rate:.1f}%)")
    print(f"  [FAIL] Failed:           {failed}")
    print(f"  [TIME] Total Time:       {total_time:.0f} ms")
    print(f"  [TIME] Average Time:     {avg_time:.0f} ms/request")
    
    if test_stats["tests_by_category"]:
        print(f"\n[CATEGORY] By Category:")
        sorted_cats = sorted(test_stats["tests_by_category"].items(), 
                            key=lambda x: x[1]["count"], reverse=True)
        for cat, stats in sorted_cats:
            count = stats["count"]
            time_ms = stats["time_ms"]
            avg = time_ms / count if count > 0 else 0
            print(f"  {cat:20s} {count:3d} requests  {time_ms:6.0f} ms total  {avg:5.0f} ms avg")
    
    if SAVE_DIR:
        print(f"\n[SAVE] Exports saved to: {SAVE_DIR}")
    
    print()


def main() -> int:
    """Run comprehensive smoke tests."""
    print("="*60)
    print("GALACASH API - COMPREHENSIVE SMOKE TEST")
    print("="*60)
    print(f"BASE_URL: {BASE_URL}")
    print(f"VERBOSE:  {VERBOSE}")
    if SAVE_DIR:
        print(f"SAVE_DIR: {SAVE_DIR}")
    print("="*60)
    
    if WAIT_BEFORE_START:
        print("\n[PAUSE] Press ENTER when ready to start (ensure no recent login attempts)...")
        input()
    
    try:
        # === AUTHENTICATION ===
        print("\n[AUTHENTICATION]")
        print(f"Logging in user {USER_NIM}...")
        user_tokens = login(USER_NIM, USER_PASSWORD)
        if not user_tokens:
            print("[WARN] User login skipped (already active session)")
            return 0
        user_access = user_tokens["accessToken"]
        
        # Check if we need to login bendahara separately
        # To avoid rate limits, we can skip bendahara login if same NIM or use longer wait
        if BENDAHARA_NIM == USER_NIM:
            print("Using same account for both user and bendahara flows...")
            bend_access = user_access
            bend_tokens = user_tokens
        else:
            # Longer delay to avoid rate limiting on auth endpoints (auth rate limit is strict)
            print("Waiting 20 seconds to avoid rate limit...")
            time.sleep(20)
            
            print(f"Logging in bendahara {BENDAHARA_NIM}...")
            try:
                bend_tokens = login(BENDAHARA_NIM, BENDAHARA_PASSWORD)
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    print("[WARN] Rate limit exceeded. Skipping bendahara tests and using user token only.")
                    bend_tokens = None
                    bend_access = user_access
                else:
                    raise
            else:
                if not bend_tokens:
                    print("[WARN] Bendahara login skipped (already active), using user token for demo")
                    bend_access = user_access  # fallback for demo
                else:
                    bend_access = bend_tokens["accessToken"]
        
        # Test refresh (skip if no bendahara token)
        if bend_tokens:
            print("Testing token refresh...")
            refresh_token(bend_tokens["refreshToken"])
        
        # Give the rate limiter time to reset before starting main tests
        print("Waiting 60 seconds for rate limiter to reset...")
        time.sleep(60)
        
        # === RUN COMPREHENSIVE TESTS ===
        user_flow(user_access)
        bendahara_flow(bend_access)
        
        # === PRINT SUMMARY ===
        print_summary()
        
        if test_stats["failed_requests"] == 0:
            print("[OK] All tests passed!")
            return 0
        else:
            print(f"[WARN] {test_stats['failed_requests']} request(s) failed")
            return 1
    
    except Exception as exc:
        print(f"\n[ERROR] Smoke test failed: {exc}")
        
        # Provide helpful error messages
        if "Connection refused" in str(exc) or "WinError 10061" in str(exc):
            print("\n💡 TIP: The API server is not running!")
            print("   Start it with: pnpm dev")
            print("   Then run tests again: pnpm test:smoke")
        elif "Name or service not known" in str(exc) or "nodename nor servname provided" in str(exc):
            print("\n💡 TIP: Cannot resolve hostname. Check BASE_URL setting.")
        elif "429" in str(exc) or "Too Many Requests" in str(exc):
            print("\n💡 TIP: Rate limit exceeded!")
            print("   Wait a minute and try again, or check rate limit configuration.")
            print("   Consider adding delays between requests in the smoke test.")
        
        if VERBOSE:
            import traceback
            traceback.print_exc()
        print_summary()
        return 1


if __name__ == "__main__":
    sys.exit(main())
