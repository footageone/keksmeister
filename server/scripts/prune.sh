#!/usr/bin/env sh
#
# Prune consent log files older than RETENTION_DAYS.
#
# Why 3 years (1095 days) by default:
#   The German limitation period for general civil claims is three years
#   (§§ 195, 199 BGB), so consent proof must remain available at least that
#   long. The DSGVO does not name a fixed retention; the DSK only requires
#   that you retain proof "as long as necessary". Three years is the common
#   conservative reading. Adjust via RETENTION_DAYS if your DPO requires a
#   different window.
#
# Usage:
#   DATA_DIR=./data RETENTION_DAYS=1095 sh scripts/prune.sh        # delete
#   DATA_DIR=./data RETENTION_DAYS=1095 DRY_RUN=1 sh scripts/prune.sh
#
set -eu

DATA_DIR="${DATA_DIR:-./data}"
RETENTION_DAYS="${RETENTION_DAYS:-1095}"
DRY_RUN="${DRY_RUN:-0}"

if [ ! -d "$DATA_DIR" ]; then
  echo "error: data directory '$DATA_DIR' does not exist" >&2
  exit 1
fi

# Resolve to an absolute path so the root-guard below cannot be tricked by a
# relative `./` or `..`. cd inside a subshell to keep $PWD untouched.
DATA_DIR_ABS=$(cd "$DATA_DIR" && pwd)
if [ "$DATA_DIR_ABS" = "/" ]; then
  echo "error: refusing to prune from filesystem root '/'" >&2
  exit 1
fi

case "$RETENTION_DAYS" in
  ''|*[!0-9]*)
    echo "error: RETENTION_DAYS must be a positive integer, got '$RETENTION_DAYS'" >&2
    exit 1
    ;;
esac

if [ "$RETENTION_DAYS" -eq 0 ]; then
  echo "error: RETENTION_DAYS=0 would delete every record; pass a positive integer" >&2
  exit 1
fi

# Pre-flight count so the operator sees what will (or did) happen. We let find
# errors propagate (no 2>/dev/null) — permission/IO problems should fail loud,
# not be misreported as "nothing to prune".
COUNT=$(find "$DATA_DIR_ABS" -type f -name '*.json' -mtime "+${RETENTION_DAYS}" | wc -l)
COUNT=$(echo "$COUNT" | tr -d '[:space:]')

if [ "$COUNT" -eq 0 ]; then
  echo "nothing to prune in $DATA_DIR older than ${RETENTION_DAYS} days"
  exit 0
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "DRY RUN — would delete $COUNT file(s) older than ${RETENTION_DAYS} days:"
  find "$DATA_DIR_ABS" -type f -name '*.json' -mtime "+${RETENTION_DAYS}" -print
  exit 0
fi

find "$DATA_DIR_ABS" -type f -name '*.json' -mtime "+${RETENTION_DAYS}" -delete
# Remove now-empty time-bucket directories so the tree stays tidy.
find "$DATA_DIR_ABS" -mindepth 1 -type d -empty -delete 2>/dev/null || true

echo "pruned $COUNT consent record(s) older than ${RETENTION_DAYS} days from $DATA_DIR_ABS"
