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
