# Smoke Test Examples

## Quick Start

```bash
# Default run (summary mode)
python scripts/endpoint_smoke.py
```

## Detailed Output

```bash
# See every request and response
export VERBOSE=1
python scripts/endpoint_smoke.py
```

Or Windows:
```cmd
set VERBOSE=1
python scripts\endpoint_smoke.py
```

## Save Exports

```bash
# Save all export files to local directory
export SAVE_DIR=./tmp/smoke-exports
python scripts/endpoint_smoke.py
```

## Different Environment

```bash
# Test against staging server
export BASE_URL=https://staging-api.galacash.com/api
export USER_NIM=1313600001
export USER_PASSWORD=staging-password
python scripts/endpoint_smoke.py
```

## Using Shell Scripts

### Linux/Mac

```bash
# Make executable (first time only)
chmod +x scripts/run-smoke-test.sh

# Run with defaults
./scripts/run-smoke-test.sh

# With custom config
BASE_URL=http://localhost:3000/api VERBOSE=1 ./scripts/run-smoke-test.sh

# Save exports
SAVE_DIR=./exports ./scripts/run-smoke-test.sh
```

### Windows

```cmd
REM Run with defaults
scripts\run-smoke-test.bat

REM With custom config
set BASE_URL=http://localhost:3000/api
set VERBOSE=1
scripts\run-smoke-test.bat

REM Save exports
set SAVE_DIR=.\exports
scripts\run-smoke-test.bat
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run API Smoke Tests
  run: |
    export BASE_URL=${{ secrets.API_URL }}
    python scripts/endpoint_smoke.py
  env:
    USER_NIM: ${{ secrets.TEST_USER_NIM }}
    USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

### Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  smoke-test:
    image: python:3.11-slim
    volumes:
      - ./scripts:/app/scripts
    environment:
      - BASE_URL=http://api:3000/api
      - VERBOSE=0
    command: python /app/scripts/endpoint_smoke.py
    depends_on:
      - api
```

Run with:
```bash
docker-compose run --rm smoke-test
```

## Performance Testing

```bash
# Measure baseline performance
time python scripts/endpoint_smoke.py

# With exports and timing details
export SAVE_DIR=./perf-test
export VERBOSE=1
time python scripts/endpoint_smoke.py
```

## Custom Credentials

```bash
# Test with different user accounts
export USER_NIM=1313600002
export USER_PASSWORD=custom-password
export BENDAHARA_NIM=1313699998
export BENDAHARA_PASSWORD=admin-password
python scripts/endpoint_smoke.py
```

## Debugging Failed Tests

```bash
# Run with verbose to see exact failure point
export VERBOSE=1
python scripts/endpoint_smoke.py 2>&1 | tee smoke-test.log

# Check the log
cat smoke-test.log | grep ERROR
```

## Combined Example

Full configuration with all options:

```bash
export BASE_URL=http://localhost:3000/api
export USER_NIM=1313600001
export USER_PASSWORD=password123
export BENDAHARA_NIM=1313699999
export BENDAHARA_PASSWORD=password123
export SAVE_DIR=./tmp/exports
export VERBOSE=1

python scripts/endpoint_smoke.py
```

## Expected Output (Summary Mode)

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
  ... 10 requests completed

============================================================
USER FLOW - Comprehensive Endpoint Coverage
============================================================

[AUTH & PROFILE]
[DASHBOARD]
[LABELS]
  ... 20 requests completed
[PAYMENT ACCOUNTS]
[TRANSACTIONS]
  ... 30 requests completed
  ... 40 requests completed
  ... 50 requests completed
[EXPORTS]
  ... 60 requests completed
[FUND APPLICATIONS]
  ... 70 requests completed
[CASH BILLS]
  ... 80 requests completed

✓ User flow completed

============================================================
BENDAHARA FLOW - Comprehensive Endpoint Coverage
============================================================

[BENDAHARA DASHBOARD]
  ... 90 requests completed
[BENDAHARA - FUND APPLICATIONS]
  ... 100 requests completed
[BENDAHARA - CASH BILLS]
  ... 110 requests completed
[BENDAHARA - STUDENTS]
[BENDAHARA - REKAP KAS]
  ... 120 requests completed

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
  fund-applications    14 requests   1400 ms total    100 ms avg
  cash-bills           12 requests   1200 ms total    100 ms avg
  labels                7 requests    700 ms total    100 ms avg
  exports               4 requests    800 ms total    200 ms avg
  dashboard             3 requests    300 ms total    100 ms avg
  auth                  4 requests    400 ms total    100 ms avg
  payment-accounts      1 requests    100 ms total    100 ms avg
  general              22 requests   2550 ms total    116 ms avg

✅ All tests passed!
```

## Interpreting Results

### Success (Exit Code 0)
```
✅ All tests passed!
```
All endpoints returned 2xx status codes.

### Partial Failure (Exit Code 1)
```
⚠️  5 request(s) failed
```
Some endpoints returned 4xx/5xx errors. Check verbose output or logs.

### Complete Failure (Exit Code 1)
```
❌ Smoke test failed: Connection refused
```
Server is not accessible or crashed during testing.

## Tips

1. **Run after migrations**: Ensure database is seeded with test data
2. **Check server logs**: Monitor backend logs while tests run
3. **Use verbose mode**: For debugging specific endpoint failures
4. **Save exports**: Validate Excel/CSV file generation
5. **Measure performance**: Use for baseline performance tracking
6. **Automate**: Integrate into CI/CD pipeline
