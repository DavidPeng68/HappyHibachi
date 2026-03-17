/**
 * KV Sharding Helpers
 *
 * Provides monthly sharding for KV storage to avoid the 25MB per-key limit.
 * Pattern: `prefix:YYYY-MM` for data, `prefix:index` for month list.
 */

/** Get the month string from a date: '2026-03-15' → '2026-03' */
export function getShardMonth(date: string): string {
	return date.slice(0, 7);
}

/** Get the full shard key: getShardKey('bookings', '2026-03') → 'bookings:2026-03' */
export function getShardKey(prefix: string, month: string): string {
	return `${prefix}:${month}`;
}

/** Read a single shard */
export async function readShard<T>(
	kv: KVNamespace,
	prefix: string,
	month: string
): Promise<T[]> {
	try {
		const raw = await kv.get(getShardKey(prefix, month));
		if (!raw) return [];
		return JSON.parse(raw) as T[];
	} catch {
		return [];
	}
}

/** Write a single shard */
export async function writeShard<T>(
	kv: KVNamespace,
	prefix: string,
	month: string,
	data: T[]
): Promise<void> {
	await kv.put(getShardKey(prefix, month), JSON.stringify(data));
}

/** Read the index (list of months that have data) */
export async function readIndex(
	kv: KVNamespace,
	prefix: string
): Promise<string[]> {
	try {
		const raw = await kv.get(`${prefix}:index`);
		if (!raw) return [];
		return JSON.parse(raw) as string[];
	} catch {
		return [];
	}
}

/** Write the index */
export async function writeIndex(
	kv: KVNamespace,
	prefix: string,
	months: string[]
): Promise<void> {
	await kv.put(`${prefix}:index`, JSON.stringify(months));
}

/** Ensure a month is in the index (add if missing) */
export async function ensureMonthInIndex(
	kv: KVNamespace,
	prefix: string,
	month: string
): Promise<void> {
	const months = await readIndex(kv, prefix);
	if (!months.includes(month)) {
		months.push(month);
		months.sort();
		await writeIndex(kv, prefix, months);
	}
}

/** Read all shards (returns merged array) */
export async function readAllShards<T>(
	kv: KVNamespace,
	prefix: string
): Promise<T[]> {
	const months = await readIndex(kv, prefix);
	if (months.length === 0) return [];

	const shards = await Promise.all(
		months.map((month) => readShard<T>(kv, prefix, month))
	);
	return shards.flat();
}

/** Read shards within a date range (fromMonth to toMonth inclusive) */
export async function readShardRange<T>(
	kv: KVNamespace,
	prefix: string,
	fromMonth: string,
	toMonth: string
): Promise<T[]> {
	const months = await readIndex(kv, prefix);
	const filtered = months.filter((m) => m >= fromMonth && m <= toMonth);
	if (filtered.length === 0) return [];

	const shards = await Promise.all(
		filtered.map((month) => readShard<T>(kv, prefix, month))
	);
	return shards.flat();
}

/** Parse common pagination query params from a URL */
export function parsePaginationParams(url: URL, defaults?: { pageSize?: number; sort?: string }): {
	page: number;
	pageSize: number;
	search: string;
	sort: string;
	dir: 'asc' | 'desc';
} {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || String(defaults?.pageSize ?? 20), 10)));
	const search = (url.searchParams.get('search') || '').trim().toLowerCase();
	const sort = url.searchParams.get('sort') || defaults?.sort || 'createdAt';
	const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
	return { page, pageSize, search, sort, dir };
}

// ---------------------------------------------------------------------------
// Individual-key helpers (race-condition-free writes)
// ---------------------------------------------------------------------------

/** Write a single entity to its own KV key: `prefix:{id}` */
export async function writeEntity<T>(
	kv: KVNamespace,
	prefix: string,
	id: string,
	data: T
): Promise<void> {
	await kv.put(`${prefix}:${id}`, JSON.stringify(data));
}

/** Read a single entity from its own KV key: `prefix:{id}` */
export async function readEntity<T>(
	kv: KVNamespace,
	prefix: string,
	id: string
): Promise<T | null> {
	try {
		const raw = await kv.get(`${prefix}:${id}`);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

/** Add an ID to the month index. Small race window but only affects discoverability, not data. */
export async function addToMonthIndex(
	kv: KVNamespace,
	prefix: string,
	month: string,
	id: string
): Promise<void> {
	const indexKey = `${prefix}:index:${month}`;
	const raw = await kv.get(indexKey);
	const ids: string[] = raw ? JSON.parse(raw) : [];
	if (!ids.includes(id)) {
		ids.push(id);
		await kv.put(indexKey, JSON.stringify(ids));
	}
}

/** Read all IDs from a month index */
export async function readMonthIndex(
	kv: KVNamespace,
	prefix: string,
	month: string
): Promise<string[]> {
	try {
		const raw = await kv.get(`${prefix}:index:${month}`);
		if (!raw) return [];
		return JSON.parse(raw) as string[];
	} catch {
		return [];
	}
}

/** Read entities by fetching month index → individual keys. Falls back to shard if no individual keys found. */
export async function readEntitiesByMonth<T extends { id: string }>(
	kv: KVNamespace,
	prefix: string,
	month: string
): Promise<T[]> {
	// Try new individual-key approach first
	const ids = await readMonthIndex(kv, prefix, month);
	if (ids.length > 0) {
		const entities = await Promise.all(
			ids.map(id => readEntity<T>(kv, prefix, id))
		);
		return entities.filter((e): e is T => e !== null);
	}
	// Fallback to legacy shard
	return readShard<T>(kv, prefix, month);
}

/** Read all entities across all months using individual keys with shard fallback.
 *  `shardPrefix` is the prefix used in the global month index (e.g. 'bookings' for `bookings:index`).
 *  `prefix` is the prefix for individual keys and month indices (e.g. 'booking' for `booking:{id}`). */
export async function readAllEntities<T extends { id: string }>(
	kv: KVNamespace,
	prefix: string,
	shardPrefix?: string
): Promise<T[]> {
	// Use shardPrefix for global month index if provided, else try prefix
	const months = await readIndex(kv, shardPrefix || prefix);
	if (months.length === 0) {
		return [];
	}
	const shards = await Promise.all(
		months.map(month => readEntitiesByMonth<T>(kv, prefix, month))
	);
	return shards.flat();
}

/** Read entities within a date range using individual keys with shard fallback.
 *  `shardPrefix` is the prefix used in the global month index (e.g. 'bookings'). */
export async function readEntitiesInRange<T extends { id: string }>(
	kv: KVNamespace,
	prefix: string,
	fromMonth: string,
	toMonth: string,
	shardPrefix?: string
): Promise<T[]> {
	const months = await readIndex(kv, shardPrefix || prefix);
	const filtered = months.filter(m => m >= fromMonth && m <= toMonth);
	if (filtered.length === 0) return [];
	const shards = await Promise.all(
		filtered.map(month => readEntitiesByMonth<T>(kv, prefix, month))
	);
	return shards.flat();
}

/** Paginate an in-memory array */
export function paginateArray<T>(
	items: T[],
	page: number,
	pageSize: number
): { data: T[]; total: number; page: number; pageSize: number } {
	const clampedPageSize = Math.max(1, Math.min(100, pageSize));
	const totalPages = Math.max(1, Math.ceil(items.length / clampedPageSize));
	const clampedPage = Math.max(1, Math.min(page, totalPages));

	const start = (clampedPage - 1) * clampedPageSize;
	const data = items.slice(start, start + clampedPageSize);

	return {
		data,
		total: items.length,
		page: clampedPage,
		pageSize: clampedPageSize,
	};
}
