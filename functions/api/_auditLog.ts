/**
 * Audit Log Helper
 *
 * Provides structured logging for admin actions.
 * Entries are stored in monthly KV shards under `audit_log:YYYY-MM`.
 * A legacy `audit_log` key is also maintained (capped at 500) for backward compat.
 */

import {
	getShardMonth,
	readShard,
	writeShard,
	ensureMonthInIndex,
	readShardRange,
	readAllShards,
	paginateArray,
} from './_kvHelpers';

export interface AuditLogEntry {
	id: string;
	action: string;
	entity: string;
	entityId?: string;
	details: string;
	performedBy: string;
	createdAt: string;
}

const LEGACY_MAX = 500;

export async function logAction(
	kv: KVNamespace,
	entry: Omit<AuditLogEntry, 'id' | 'createdAt'>,
): Promise<void> {
	try {
		const newEntry: AuditLogEntry = {
			...entry,
			id: crypto.randomUUID(),
			createdAt: new Date().toISOString(),
		};

		// Write to monthly shard
		const month = getShardMonth(newEntry.createdAt.slice(0, 10));
		const shard = await readShard<AuditLogEntry>(kv, 'audit_log', month);
		shard.unshift(newEntry);
		await writeShard(kv, 'audit_log', month, shard);
		await ensureMonthInIndex(kv, 'audit_log', month);

		// Legacy write (capped, for backward compat)
		const legacyData = await kv.get('audit_log', 'json');
		const legacyEntries: AuditLogEntry[] = (legacyData as AuditLogEntry[]) || [];
		legacyEntries.unshift(newEntry);
		if (legacyEntries.length > LEGACY_MAX) {
			legacyEntries.length = LEGACY_MAX;
		}
		await kv.put('audit_log', JSON.stringify(legacyEntries));
	} catch (error) {
		// Audit logging should never break the main operation
		console.error('Failed to write audit log:', error);
	}
}

export async function readAuditLogs(
	kv: KVNamespace,
	params: {
		entity?: string;
		dateFrom?: string;
		dateTo?: string;
		page?: number;
		pageSize?: number;
	},
): Promise<{ data: AuditLogEntry[]; total: number; page: number; pageSize: number }> {
	const page = params.page ?? 1;
	const pageSize = params.pageSize ?? 50;

	let entries: AuditLogEntry[];

	// Read from shards based on date range
	if (params.dateFrom && params.dateTo) {
		const fromMonth = getShardMonth(params.dateFrom);
		const toMonth = getShardMonth(params.dateTo);
		entries = await readShardRange<AuditLogEntry>(kv, 'audit_log', fromMonth, toMonth);
	} else {
		// Try shards first
		entries = await readAllShards<AuditLogEntry>(kv, 'audit_log');

		// Fall back to legacy key if shards are empty
		if (entries.length === 0) {
			const legacyData = await kv.get('audit_log', 'json');
			entries = (legacyData as AuditLogEntry[]) || [];
		}
	}

	// Filter by entity
	if (params.entity) {
		entries = entries.filter((e) => e.entity === params.entity);
	}

	// Filter by date range
	if (params.dateFrom) {
		entries = entries.filter((e) => e.createdAt >= params.dateFrom!);
	}
	if (params.dateTo) {
		// dateTo is inclusive of the full day
		entries = entries.filter((e) => e.createdAt <= params.dateTo! + 'T23:59:59.999Z');
	}

	// Sort by createdAt descending
	entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	// Paginate
	return paginateArray(entries, page, pageSize);
}
