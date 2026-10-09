#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COVERAGE_FILE="$SERVICE_DIR/coverage.out"
BASELINE_FILE="$SERVICE_DIR/.coverage-baseline.json"
TOLERANCE="0.5"

get_coverage() {
    go tool cover -func="$COVERAGE_FILE" | awk '/^total:/ { gsub(/%/, "", $3); print $3 }'
}

if [ ! -f "$COVERAGE_FILE" ]; then
    echo "Coverage file not found. Run 'make test' first." >&2
    exit 1
fi

CURRENT=$(get_coverage)

if [ "${1:-}" = "--update" ]; then
    printf '{"statements": %s}\n' "$CURRENT" > "$BASELINE_FILE"
    echo "Baseline updated: ${CURRENT}%"
    exit 0
fi

if [ ! -f "$BASELINE_FILE" ]; then
    printf '{"statements": %s}\n' "$CURRENT" > "$BASELINE_FILE"
    echo "Baseline created at ${CURRENT}%"
    exit 0
fi

BASELINE=$(python3 -c "import json; print(json.load(open('$BASELINE_FILE'))['statements'])")
PASSED=$(python3 -c "print('PASS' if $CURRENT - $BASELINE >= -$TOLERANCE else 'FAIL')")

echo "statements: ${BASELINE}% -> ${CURRENT}% $PASSED"
[ "$PASSED" = "PASS" ] || exit 1
