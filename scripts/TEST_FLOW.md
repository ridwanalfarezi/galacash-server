# Smoke Test Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   GALACASH SMOKE TEST SUITE                 │
│                    127+ Endpoint Tests                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  AUTHENTICATION │
                    └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐    ┌─────────┐
        │  Login  │     │ Refresh │    │  /me    │
        │  User   │     │  Token  │    │ Profile │
        └─────────┘     └─────────┘    └─────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │   USER FLOW      │           │ BENDAHARA FLOW   │
    │   (80+ tests)    │           │   (47+ tests)    │
    └──────────────────┘           └──────────────────┘
              │                               │
    ┌─────────┴─────────┐         ┌──────────┴──────────┐
    ▼                   ▼         ▼                     ▼
┌─────────┐      ┌──────────┐ ┌──────────┐      ┌──────────┐
│Dashboard│      │  Labels  │ │ Dashboard│      │ Students │
│ Summary │      │ Helpers  │ │ Summary  │      │   List   │
└─────────┘      └──────────┘ └──────────┘      └──────────┘
    │                   │         │                     │
    ▼                   ▼         ▼                     ▼
┌─────────────────────────┐ ┌──────────────────────────────┐
│    TRANSACTIONS (32)    │ │   FUND APPLICATIONS (14+)    │
├─────────────────────────┤ ├──────────────────────────────┤
│ • List (pagination)     │ │ • List all (pagination)      │
│ • Filter by type        │ │ • Filter by status (3)       │
│ • Filter by category    │ │ • Filter by category (4)     │
│ • Filter by date        │ │ • Filter by amount           │
│ • Sort (3 fields)       │ │ • Sort (3 fields)            │
│ • Chart data            │ │ • Individual fetch           │
│ • Breakdown             │ │ • Approve/Reject (bendahara) │
│ • Individual fetch      │ └──────────────────────────────┘
└─────────────────────────┘              │
    │                                    ▼
    ▼                      ┌──────────────────────────────┐
┌─────────────────────────┐│   CASH BILLS (12+)          │
│    EXPORTS (4)          │├──────────────────────────────┤
├─────────────────────────┤│ • List all (pagination)      │
│ • Excel (income)        ││ • Filter by status (3)       │
│ • Excel (expense)       ││ • Filter by month/year       │
│ • CSV (income)          ││ • Sort (3 fields)            │
│ • CSV (expense)         ││ • Individual fetch           │
│ • With categories       ││ • Confirm/Reject (bendahara) │
│ • With date ranges      │└──────────────────────────────┘
│ • Optional file save    │              │
└─────────────────────────┘              ▼
    │                      ┌──────────────────────────────┐
    ▼                      │   REKAP KAS (8)              │
┌─────────────────────────┐├──────────────────────────────┤
│  FUND APPLICATIONS (14) ││ • Multiple date ranges (4)   │
├─────────────────────────┤│ • All groupings (4)          │
│ • List all (pagination) ││   - day / week / month / year│
│ • My applications       │└──────────────────────────────┘
│ • Filter by status (3)  │              │
│ • Filter by category    │              ▼
│ • Sort (3 fields)       │   ┌─────────────────────┐
│ • Individual fetch      │   │  PAYMENT ACCOUNTS   │
└─────────────────────────┘   ├─────────────────────┤
    │                         │ • Active accounts   │
    ▼                         └─────────────────────┘
┌─────────────────────────┐              │
│   CASH BILLS (12)       │              │
├─────────────────────────┤              │
│ • List (pagination)     │              │
│ • Filter by status (3)  │              │
│ • Filter by month/year  │              │
│ • Sort (3 fields)       │              │
│ • Individual fetch      │              │
└─────────────────────────┘              │
              │                          │
              └──────────┬───────────────┘
                         ▼
              ┌──────────────────────┐
              │   TEST STATISTICS    │
              ├──────────────────────┤
              │ • Total: 127         │
              │ • Success: 127       │
              │ • Failed: 0          │
              │ • Avg Time: 98ms     │
              │ • By Category        │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   FINAL REPORT       │
              │  ✅ All Passed       │
              └──────────────────────┘
```

## Test Categories

| Category            | Count    | Description                       |
| ------------------- | -------- | --------------------------------- |
| `transactions`      | 32       | Transaction list, filters, charts |
| `bendahara`         | 28       | Treasurer-specific operations     |
| `fund-applications` | 14       | Fund request management           |
| `cash-bills`        | 12       | Monthly bill management           |
| `labels`            | 7        | Helper endpoints for dropdowns    |
| `exports`           | 4        | Excel/CSV file generation         |
| `dashboard`         | 3        | Summary statistics                |
| `auth`              | 4        | Authentication flows              |
| `payment-accounts`  | 1        | Payment account listing           |
| **TOTAL**           | **127+** | **Comprehensive coverage**        |

## Filter Combinations Tested

### Transactions

- **Types**: income, expense (2)
- **Categories**: First 2 from API (2)
- **Date Ranges**: 7, 30, 90 days (3)
- **Sort Fields**: date, amount, type (3)
- **Pagination**: page 1, 2 with limits 5, 10 (4)
- **Total Combinations**: 32+ tests

### Fund Applications

- **Statuses**: pending, approved, rejected (3)
- **Categories**: education, health, emergency, equipment (4)
- **Sort Fields**: date, amount, status (3)
- **Amount Ranges**: min/max (1)
- **Total Combinations**: 14+ tests

### Cash Bills

- **Statuses**: unpaid, pending confirmation, paid (3)
- **Time Filters**: month, year (3)
- **Sort Fields**: dueDate, month, status (3)
- **Total Combinations**: 12+ tests

### Rekap Kas

- **Date Ranges**: 7, 30, 90, 365 days (4)
- **Groupings**: day, week, month, year (4)
- **Total Combinations**: 8+ tests

## Execution Flow

```
1. Setup
   └─ Initialize statistics tracker
   └─ Parse environment variables
   └─ Print configuration

2. Authentication
   └─ Login user (1313600001)
   └─ Login bendahara (1313699999)
   └─ Refresh token test

3. User Flow (80+ tests)
   └─ Dashboard checks
   └─ Labels bootstrapping
   └─ Transaction tests (all filters)
   └─ Export tests (all formats)
   └─ Fund application tests
   └─ Cash bill tests

4. Bendahara Flow (47+ tests)
   └─ Dashboard with date ranges
   └─ Fund application management
   └─ Cash bill management
   └─ Student listing
   └─ Rekap kas reporting

5. Results
   └─ Aggregate statistics
   └─ Category breakdown
   └─ Print summary report
   └─ Return exit code (0=success, 1=failure)
```

## Performance Metrics

Typical execution on local development:

- **Total Requests**: 127
- **Total Time**: ~12-15 seconds
- **Average Response**: 95-100ms
- **Slowest**: Exports (~200ms)
- **Fastest**: Labels (~50ms)

## Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | ✅ All tests passed (100% success)   |
| 1    | ❌ One or more tests failed or error |
