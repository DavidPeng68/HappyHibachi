/**
 * Audit Log Helper
 *
 * Provides structured logging for admin actions.
 * Entries are stored in KV under the key `audit_log` and capped at 500.
 */

export interface AuditLogEntry {
	id: string;
	action: string;
	entity: string;
	entityId?: string;
	details: string;
	performedBy: string;
	createdAt: string;
}

const MAX_LOG_ENTRIES = 500;

export async function logAction(
	kv: KVNamespace,
	entry: Omit<AuditLogEntry, 'id' | 'createdAt'>,
): Promise<void> {
	try {
		const data = await kv.get('audit_log', 'json');
		const entries: AuditLogEntry[] = (data as AuditLogEntry[]) || [];

		const newEntry: AuditLogEntry = {
			...entry,
			id: crypto.randomUUID(),
			createdAt: new Date().toISOString(),
		};

		entries.unshift(newEntry);

		// Cap at MAX_LOG_ENTRIES
		if (entries.length > MAX_LOG_ENTRIES) {
			entries.length = MAX_LOG_ENTRIES;
		}

		await kv.put('audit_log', JSON.stringify(entries));
	} catch (error) {
		// Audit logging should never break the main operation
		console.error('Failed to write audit log:', error);
	}
}
