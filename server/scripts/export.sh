#!/usr/bin/env sh
#
# Bundle all consent log files into a single ZIP for a regulator export.
# Usage: DATA_DIR=./data sh scripts/export.sh [output.zip]
#
set -eu

DATA_DIR="${DATA_DIR:-./data}"

if [ ! -d "$DATA_DIR" ]; then
  echo "error: data directory '$DATA_DIR' does not exist" >&2
  exit 1
fi

OUT="${1:-consent-export-$(date -u +%Y%m%dT%H%M%SZ).zip}"

# Resolve OUT to an absolute path so the `cd` below does not affect it.
case "$OUT" in
  /*) OUT_ABS="$OUT" ;;
  *)  OUT_ABS="$(pwd)/$OUT" ;;
esac

( cd "$DATA_DIR" && zip -r -q "$OUT_ABS" . )

echo "Wrote $OUT_ABS"
