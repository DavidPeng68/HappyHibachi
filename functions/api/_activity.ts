export async function trackActivity(
	kv: KVNamespace,
	userId: string,
	action?: string
): Promise<void> {
	const now = new Date().toISOString();
	await kv.put(
		`user_activity:${userId}`,
		JSON.stringify({ lastSeenAt: now, lastAction: action || 'api_call' }),
		{ expirationTtl: 86400 }
	);
}
