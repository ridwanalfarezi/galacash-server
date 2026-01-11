# GalaCash API Smoke Tests

Comprehensive endpoint testing suite for the GalaCash API backend.

## Overview

The `endpoint_smoke.py` script provides thorough smoke testing coverage for all API endpoints, including:

- Authentication flows
- User dashboard and profile
- Transactions with various filters
- Fund applications with all statuses
- Cash bills management
- Bendahara (treasurer) operations
- Labels and helper endpoints
- Payment accounts
- Export functionality (Excel/CSV)

## Features

✅ **Comprehensive Coverage**

- 100+ test requests covering all GET endpoints
- Tests pagination, sorting, and filtering
- Validates date ranges and multiple filter combinations
- Tests individual resource fetches by ID

✅ **Smart Testing**

- Extracts IDs from list responses for further testing
- Tests multiple transaction types and categories
- Validates exports for both income and expense
- Tests various date ranges (7, 30, 90, 180, 365 days)

✅ **Detailed Statistics**

- Tracks total requests, success/failure rates
- Measures response times (total and average)
- Groups statistics by category
- Provides comprehensive summary report

✅ **Zero Dependencies**

- Uses only Python standard library (`urllib`, `json`, `time`)
- No pip install required
- Works with Python 3.6+

## Usage

### Basic Run

**⚠️ IMPORTANT: Start the API server first!**

```bash
# Terminal 1: Start the API server
pnpm dev

# Terminal 2: Run smoke tests
python scripts/endpoint_smoke.py
```

Or use the package script:

```bash
# Make sure server is running in another terminal
pnpm test:smoke
```

### With Custom Configuration

```bash
# Set base URL
export BASE_URL=http://localhost:3000/api
python scripts/endpoint_smoke.py
```

```powershell
# Windows PowerShell
$env:BASE_URL="http://localhost:3000/api"
python scripts/endpoint_smoke.py
```

### With Verbose Output

```bash
export VERBOSE=1
python scripts/endpoint_smoke.py
```

### Save Exports

```bash
export SAVE_DIR=./tmp/exports
python scripts/endpoint_smoke.py
```

## Configuration

Environment variables:

| Variable             | Default                     | Description                    |
| -------------------- | --------------------------- | ------------------------------ |
| `BASE_URL`           | `http://localhost:3000/api` | API base URL                   |
| `USER_NIM`           | `1313600001`                | Student NIM for testing        |
| `USER_PASSWORD`      | `password123`               | Student password               |
| `BENDAHARA_NIM`      | `1313699999`                | Bendahara NIM for testing      |
| `BENDAHARA_PASSWORD` | `password123`               | Bendahara password             |
| `SAVE_DIR`           | (empty)                     | Directory to save export files |
| `VERBOSE`            | `0`                         | Set to `1` for detailed output |

## Test Coverage

### User Flow Tests

- **Auth & Profile**: Login, refresh, /auth/me
- **Dashboard**: Summary, pending bills, pending applications
- **Labels**: All label endpoints (bill statuses, fund categories, transaction types/categories, payment methods)
- **Payment Accounts**: Active accounts listing
- **Transactions**:
  - List with pagination (page 1, 2, different limits)
  - Filter by type (income/expense)
  - Filter by category (first 2 categories)
  - Filter by date range (7, 30, 90 days)
  - Sorting (by date, amount, type)
  - Chart data for both types
  - Breakdown for both types
  - Individual transaction fetches
- **Exports**:
  - Excel and CSV formats
  - Both income and expense types
  - With category filters
  - With date ranges
- **Fund Applications**:
  - List all with pagination
  - List user's applications
  - Filter by status (pending/approved/rejected)
  - Filter by category (education/health)
  - Sorting by date/amount/status
  - Individual application fetches
- **Cash Bills**:
  - List with pagination
  - Filter by status (unpaid/pending/paid)
  - Filter by month and year
  - Sorting by due date/month/status
  - Individual bill fetches

### Bendahara Flow Tests

- **Dashboard**: With multiple date ranges (7, 30, 90, 180 days)
- **Fund Applications**:
  - List with pagination
  - Filter by status (all 3)
  - Filter by category (all 4)
  - Filter by amount range
  - Sorting by date/amount/status
  - Multiple pages
- **Cash Bills**:
  - List with pagination
  - Filter by status (all 3)
  - Filter by month and year
  - Sorting by dueDate/month/status
  - Multiple pages
- **Students**: List with pagination
- **Rekap Kas**:
  - Various date ranges (7, 30, 90, 365 days)
  - All groupings (day/week/month/year)

## Output

### Summary Mode (Default)

```
============================================================
GALACASH API - COMPREHENSIVE SMOKE TEST
============================================================
BASE_URL: http://localhost:3000/api
VERBOSE:  False
============================================================

[AUTHENTICATION]
Logging in user 1313600001...
Logging in bendahara 1313699999...
Testing token refresh...

============================================================
USER FLOW - Comprehensive Endpoint Coverage
============================================================

[AUTH & PROFILE]
  ... 10 requests completed
[DASHBOARD]
[LABELS]
  ... 20 requests completed
...

✓ User flow completed

============================================================
BENDAHARA FLOW - Comprehensive Endpoint Coverage
============================================================
...
✓ Bendahara flow completed

============================================================
TEST SUMMARY
============================================================

📊 Overall Statistics:
  Total Requests:     127
  ✓ Successful:       127 (100.0%)
  ✗ Failed:           0
  ⏱  Total Time:       12450 ms
  ⏱  Average Time:     98 ms/request

📂 By Category:
  transactions          32 requests   3200 ms total    100 ms avg
  bendahara            28 requests   2800 ms total    100 ms avg
  exports               4 requests    800 ms total    200 ms avg
  ...

✅ All tests passed!
```

### Verbose Mode

With `VERBOSE=1`, shows detailed output for each request:

```
[TRANSACTIONS]
  ✓ [200] GET /transactions (95 ms) -> {'success': True, 'data': {...}, ...}
  ✓ [200] GET /transactions (102 ms) -> {'success': True, 'data': {...}, ...}
  ✓ [200] GET /transactions/abc123 (78 ms) -> {'success': True, 'data': {...}, ...}
  ...
```

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed or exception occurred

## Notes

- **Read-Only**: This smoke test only performs GET requests and authentication
- **No Mutations**: POST/PUT/DELETE operations (payment, approval, etc.) are intentionally skipped
- **Seeded Data**: Assumes database is seeded with test data (users, transactions, bills, etc.)
- **Active Sessions**: If users already have active sessions (409 conflict), the script handles gracefully

## Extending

To add more test cases:

1. Add to `user_flow()` or `bendahara_flow()` functions
2. Use `request()` helper with appropriate category for statistics
3. Use `extract_ids()` to get resource IDs for individual fetches
4. Use `get_date_range()` for ISO date ranges

Example:

```python
# Test new endpoint with filters
resp = request("GET", "/new-endpoint", token=access_token,
              params={"page": 1, "limit": 10, "filter": "value"},
              category="new-category")

# Extract IDs and fetch individually
ids = extract_ids(resp, max_count=3)
for id in ids:
    request("GET", f"/new-endpoint/{id}", token=access_token,
            category="new-category")
```

## Troubleshooting

**409 Conflict on login**: Users already have active sessions. This is handled gracefully.

**Connection refused**: Ensure the API server is running at the configured `BASE_URL`.

**Slow responses**: Check if Redis is running for cache, or if database needs indexing.

**Failed exports**: Ensure ExcelJS is installed and export routes are properly configured.
