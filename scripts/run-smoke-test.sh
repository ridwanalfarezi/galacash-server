#!/bin/bash
# Quick test runner for GalaCash API smoke tests

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  GalaCash API - Smoke Test Runner"
echo "========================================="
echo ""

# Check if server is running
echo "Checking API server..."
if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL:-http://localhost:3000/api}/auth/me" | grep -q "401"; then
    echo -e "${GREEN}✓${NC} API server is running"
else
    echo -e "${YELLOW}⚠${NC}  Warning: API server may not be running at ${BASE_URL:-http://localhost:3000/api}"
    echo "    Start the server with: npm run dev"
    echo ""
fi

# Set defaults if not provided
export BASE_URL="${BASE_URL:-http://localhost:3000/api}"
export USER_NIM="${USER_NIM:-1313600001}"
export USER_PASSWORD="${USER_PASSWORD:-password123}"
export BENDAHARA_NIM="${BENDAHARA_NIM:-1313699999}"
export BENDAHARA_PASSWORD="${BENDAHARA_PASSWORD:-password123}"
export VERBOSE="${VERBOSE:-0}"

echo "Configuration:"
echo "  BASE_URL: $BASE_URL"
echo "  VERBOSE:  $VERBOSE"
if [ -n "$SAVE_DIR" ]; then
    echo "  SAVE_DIR: $SAVE_DIR"
fi
echo ""

# Run the tests
echo "Running comprehensive smoke tests..."
echo ""
python scripts/endpoint_smoke.py

# Exit with same code as test
exit $?
