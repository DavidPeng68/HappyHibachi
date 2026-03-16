#!/usr/bin/env bash
#
# migrate-bookings.sh — Migrate bookings_list to monthly shards
#
# Prerequisites:
#   - wrangler CLI installed and authenticated
#   - jq installed
#
# Usage:
#   ./scripts/migrate-bookings.sh [--namespace-id <KV_NAMESPACE_ID>]
#
# What this script does:
#   1. Reads `bookings_list` from KV
#   2. Backs it up to `bookings_list_backup`
#   3. Groups bookings by month (YYYY-MM from booking.date)
#   4. Writes each group to `bookings:YYYY-MM`
#   5. Writes `bookings:index` with sorted month list
#
set -euo pipefail

# ---------- Config ----------
NAMESPACE_ID="${1:---namespace-id}"
if [[ "$NAMESPACE_ID" == "--namespace-id" ]]; then
	if [[ -n "${2:-}" ]]; then
		NAMESPACE_ID="$2"
	else
		echo "Usage: $0 --namespace-id <KV_NAMESPACE_ID>"
		echo ""
		echo "Find your namespace ID with: npx wrangler kv:namespace list"
		exit 1
	fi
fi

NS_FLAG="--namespace-id $NAMESPACE_ID"

echo "==> Step 1: Reading bookings_list from KV..."
BOOKINGS_JSON=$(npx wrangler kv:key get "bookings_list" $NS_FLAG 2>/dev/null)

if [[ -z "$BOOKINGS_JSON" || "$BOOKINGS_JSON" == "null" ]]; then
	echo "No bookings_list found in KV. Nothing to migrate."
	exit 0
fi

TOTAL=$(echo "$BOOKINGS_JSON" | jq 'length')
echo "    Found $TOTAL bookings."

echo "==> Step 2: Backing up to bookings_list_backup..."
echo "$BOOKINGS_JSON" | npx wrangler kv:key put "bookings_list_backup" --path /dev/stdin $NS_FLAG
echo "    Backup complete."

echo "==> Step 3: Grouping bookings by month..."
# Extract unique months
MONTHS=$(echo "$BOOKINGS_JSON" | jq -r '.[].date' | cut -c1-7 | sort -u)

echo "    Months found: $(echo "$MONTHS" | tr '\n' ' ')"

INDEX_JSON="["
FIRST=true

for MONTH in $MONTHS; do
	echo "    Writing shard bookings:$MONTH ..."

	# Filter bookings for this month
	SHARD_JSON=$(echo "$BOOKINGS_JSON" | jq --arg m "$MONTH" '[.[] | select(.date | startswith($m))]')
	SHARD_COUNT=$(echo "$SHARD_JSON" | jq 'length')

	echo "$SHARD_JSON" | npx wrangler kv:key put "bookings:$MONTH" --path /dev/stdin $NS_FLAG
	echo "      -> $SHARD_COUNT bookings"

	if [[ "$FIRST" == "true" ]]; then
		INDEX_JSON="${INDEX_JSON}\"$MONTH\""
		FIRST=false
	else
		INDEX_JSON="${INDEX_JSON},\"$MONTH\""
	fi
done

INDEX_JSON="${INDEX_JSON}]"

echo "==> Step 4: Writing bookings:index ..."
echo "$INDEX_JSON" | npx wrangler kv:key put "bookings:index" --path /dev/stdin $NS_FLAG
echo "    Index: $INDEX_JSON"

echo ""
echo "==> Migration complete!"
echo "    Total bookings: $TOTAL"
echo "    Shards created: $(echo "$MONTHS" | wc -l | tr -d ' ')"
echo "    Backup key: bookings_list_backup"
echo ""
echo "    The original bookings_list key has NOT been deleted."
echo "    Both bookings_list and shards will be written to during the migration period."
