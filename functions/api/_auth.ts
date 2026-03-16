/**
 * Shared auth, CORS, and security utilities for API functions
 */

interface AuthEnv {
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

export interface AuthResult {
	valid: boolean;
	role?: 'super_admin' | 'order_manager';
	userId?: string;
}

const TOKEN_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

async function hmacSign(message: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(message: string, signature: string, secret: string): Promise<boolean> {
	const expected = await hmacSign(message, secret);
	if (expected.length !== signature.length) return false;
	let mismatch = 0;
	for (let i = 0; i < expected.length; i++) {
		mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	}
	return mismatch === 0;
}

export async function createToken(
	adminPassword: string,
	role: string = 'super_admin',
	userId: string = '__env__'
): Promise<string> {
	const exp = Date.now() + TOKEN_EXPIRY_MS;
	const payload = `${role}:${userId}:${exp}`;
	const sig = await hmacSign(payload, adminPassword);
	return btoa(`${payload}:${sig}`);
}

export async function validateToken(authHeader: string | null, env: AuthEnv): Promise<AuthResult> {
	const invalid: AuthResult = { valid: false };
	if (!authHeader || !authHeader.startsWith('Bearer ')) return invalid;
	const secret = env.ADMIN_PASSWORD;
	if (!secret) return invalid;

	try {
		const decoded = atob(authHeader.slice(7));
		const parts = decoded.split(':');

		// Legacy token format: admin:{exp}:{sig} (3 parts)
		if (parts.length === 3 && parts[0] === 'admin') {
			const exp = parseInt(parts[1], 10);
			if (isNaN(exp) || Date.now() > exp) return invalid;
			const payload = `${parts[0]}:${parts[1]}`;
			const sig = parts[2];
			if (await hmacVerify(payload, sig, secret)) {
				return { valid: true, role: 'super_admin', userId: '__env__' };
			}
			return invalid;
		}

		// New token format: {role}:{userId}:{exp}:{sig} (4 parts)
		if (parts.length === 4) {
			const [role, userId, expStr, sig] = parts;
			if (role !== 'super_admin' && role !== 'order_manager') return invalid;
			const exp = parseInt(expStr, 10);
			if (isNaN(exp) || Date.now() > exp) return invalid;
			const payload = `${role}:${userId}:${expStr}`;
			if (await hmacVerify(payload, sig, secret)) {
				return { valid: true, role: role as AuthResult['role'], userId };
			}
			return invalid;
		}

		return invalid;
	} catch {
		return invalid;
	}
}

export function requireSuperAdmin(auth: AuthResult, corsHeaders: Record<string, string>): Response | null {
	if (!auth.valid) {
		return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
	}
	if (auth.role !== 'super_admin') {
		return new Response(JSON.stringify({ success: false, error: 'Access denied' }), { status: 403, headers: corsHeaders });
	}
	return null;
}

export async function hashPassword(password: string, username: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password + ':' + username);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * PBKDF2 password hashing (upgrade from SHA-256)
 * Format: base64(salt):base64(derivedKey)
 */
export async function hashPasswordPBKDF2(password: string, username: string): Promise<string> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password + ':' + username),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
		keyMaterial,
		256
	);
	const saltB64 = btoa(String.fromCharCode(...salt));
	const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derived)));
	return `${saltB64}:${hashB64}`;
}

export async function verifyPasswordPBKDF2(password: string, username: string, stored: string): Promise<boolean> {
	const [saltB64, hashB64] = stored.split(':');
	if (!saltB64 || !hashB64) return false;
	const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password + ':' + username),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
		keyMaterial,
		256
	);
	const computedB64 = btoa(String.fromCharCode(...new Uint8Array(derived)));
	return computedB64 === hashB64;
}

/** Check if a stored hash is the legacy SHA-256 format (no colon separator). */
export function isLegacyHash(stored: string): boolean {
	return !stored.includes(':');
}

export function getCorsHeaders(request?: Request, env?: AuthEnv): Record<string, string> {
	const allowedRaw = env?.ALLOWED_ORIGINS || 'https://familyfriendshibachi.com';
	const allowed = allowedRaw.split(',').map(o => o.trim());
	const requestOrigin = request?.headers.get('Origin') || '';
	const matchedOrigin = allowed.includes(requestOrigin) ? requestOrigin : allowed[0];

	return {
		'Access-Control-Allow-Origin': matchedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Content-Type': 'application/json',
	};
}

const HTML_ESCAPE_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

export function escapeHtml(str: string): string {
	return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------

export type AuditAction =
	| 'login_success'
	| 'login_failure'
	| 'login_rate_limited'
	| 'user_created'
	| 'user_updated'
	| 'user_deleted'
	| 'booking_deleted'
	| 'settings_changed'
	| 'bulk_operation';

export interface AuditEntry {
	action: AuditAction;
	performedBy: string;
	ip?: string;
	details?: Record<string, unknown>;
	timestamp: string;
}

export function logAuditEvent(
	action: AuditAction,
	performedBy: string,
	request?: Request,
	details?: Record<string, unknown>
): void {
	const entry: AuditEntry = {
		action,
		performedBy,
		ip: request?.headers.get('CF-Connecting-IP') || request?.headers.get('X-Forwarded-For') || 'unknown',
		details,
		timestamp: new Date().toISOString(),
	};
	console.log(`[AUDIT] ${JSON.stringify(entry)}`);
}
