# Smoke Test Quick Reference

## ⚡ Quick Commands

**⚠️ Start the API server first:** `pnpm dev`

```bash
# Run tests (default: summary mode)
pnpm test:smoke

# Run with verbose output
VERBOSE=1 pnpm test:smoke

# Save export files
SAVE_DIR=./tmp/exports pnpm test:smoke

# Custom API URL
BASE_URL=http://staging-api.com/api pnpm test:smoke
```

## 📊 What Gets Tested

### ✅ Authentication (4 tests)
- Login user, login bendahara, refresh token, get profile

### ✅ Dashboard (3 tests)
- Summary, pending bills, pending applications

### ✅ Labels (7 tests)
- All labels combined, bill statuses, fund statuses, fund categories, transaction types, transaction categories, payment methods

### ✅ Transactions (32 tests)
- List (pagination, filters), chart data, breakdown, individual fetch, exports

### ✅ Fund Applications (14 tests)
- List (filters by status/category), my applications, individual fetch

### ✅ Cash Bills (12 tests)
- List (filters by status/month/year), individual fetch

### ✅ Bendahara Operations (47+ tests)
- Dashboard, fund apps management, bill management, students, rekap kas

### ✅ Exports (4 tests)
- Excel & CSV for income & expense

### ✅ Payment Accounts (1 test)
- Active accounts listing

**Total: 127+ endpoint tests**

## 🎯 Coverage Highlights

| Feature | Tests | Filters Tested |
|---------|-------|----------------|
| Transactions | 32 | type (2), category (2), date (3), sort (3), pagination |
| Fund Apps | 14 | status (3), category (4), amount, sort (3), pagination |
| Cash Bills | 12 | status (3), month, year, sort (3), pagination |
| Rekap Kas | 8 | date ranges (4), grouping (4) |
| Exports | 4 | type (2), format (2), category, date |

## 🔧 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `http://localhost:3000/api` | API endpoint |
| `VERBOSE` | `0` | Set to `1` for detailed output |
| `SAVE_DIR` | (none) | Save export files here |
| `USER_NIM` | `1313600001` | Test user account |
| `USER_PASSWORD` | `password123` | Test user password |
| `BENDAHARA_NIM` | `1313699999` | Test bendahara account |
| `BENDAHARA_PASSWORD` | `password123` | Test bendahara password |

## 📈 Expected Results

### Success
```
✅ All tests passed!
Total: 127, Success: 127 (100%), Failed: 0
```

### Failure
```
⚠️ 5 request(s) failed
Total: 127, Success: 122 (96%), Failed: 5
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Connection refused | **Start API server first:** `pnpm dev` |
| 409 on login | User already logged in (handled gracefully) |
| 401 errors | Check credentials or seed data |
| Slow responses | Check Redis/DB connections |

## 📁 Output Files

When `SAVE_DIR` is set, exports are saved as:
- `transactions_export_income_excel.xlsx`
- `transactions_export_income_csv.csv`
- `transactions_export_expense_excel.xlsx`
- `transactions_export_expense_csv.csv`

## ⏱️ Performance

Typical execution time: **12-15 seconds**
- Average response: 95-100ms
- Exports: ~200ms
- Labels: ~50ms

## 📚 Documentation

- **Full Guide**: `scripts/README.md`
- **Examples**: `scripts/EXAMPLES.md`
- **Flow Diagram**: `scripts/TEST_FLOW.md`
- **Summary**: `SMOKE_TESTS_SUMMARY.md`

## 🎨 Sample Output

```
============================================================
GALACASH API - COMPREHENSIVE SMOKE TEST
============================================================
BASE_URL: http://localhost:3000/api
============================================================

[AUTHENTICATION]
Logging in user 1313600001...
  ... 10 requests completed

============================================================
USER FLOW - Comprehensive Endpoint Coverage
============================================================
[TRANSACTIONS]
  ... 50 requests completed

✓ User flow completed

============================================================
BENDAHARA FLOW - Comprehensive Endpoint Coverage
============================================================
  ... 127 requests completed

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
  transactions          32 requests
  bendahara            28 requests
  fund-applications    14 requests
  cash-bills           12 requests
  ...

✅ All tests passed!
```

## 🔗 Integration

### NPM Script
```json
{
  "scripts": {
    "test:smoke": "python scripts/endpoint_smoke.py"
  }
}
```

### CI/CD
```yaml
- name: Smoke Test
  run: pnpm test:smoke
```

### Docker
```bash
docker-compose run --rm smoke-test
```

## 💡 Pro Tips

1. **Use verbose mode** for debugging specific failures
2. **Save exports** to validate file generation
3. **Run after migrations** to ensure schema compatibility
4. **Monitor server logs** while tests run
5. **Track performance** over time for regression detection
6. **Customize credentials** for different environments

## 🎓 Next Steps

1. Start your API server: `pnpm dev`
2. Run the smoke tests: `pnpm test:smoke`
3. Check the summary for success rate
4. Use verbose mode if any tests fail
5. Review server logs for backend errors

---

**Ready to test?** Run `pnpm test:smoke` now! 🚀
