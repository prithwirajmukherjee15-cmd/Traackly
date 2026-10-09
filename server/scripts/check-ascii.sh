#!/usr/bin/env bash
# Fails if any Go source or config file contains non-ASCII bytes.
# User-facing typography (em dashes, arrows) must be written as \uXXXX escapes.
set -euo pipefail

cd "$(dirname "$0")/.."

FILES=$(git ls-files --cached --others --exclude-standard -- '*.go' '*.yml' '*.yaml' 'Makefile' '*.sh' 'go.mod' 2>/dev/null || true)
if [ -z "$FILES" ]; then
    FILES=$(find . -type f \( -name '*.go' -o -name '*.yml' -o -name '*.sh' -o -name 'Makefile' \) -not -path './vendor/*')
fi

# shellcheck disable=SC2086
if HITS=$(LC_ALL=C grep -nP '[^\x00-\x7F]' $FILES); then
    echo "Non-ASCII characters found (use \\uXXXX escapes in string literals):"
    echo "$HITS"
    exit 1
fi
echo "ASCII check passed"
