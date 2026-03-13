/**
 * Shared auth, CORS, and security utilities for API functions
 */

interface AuthEnv {
	ADMIN_PASSWORD?: string;
	ALLOWED_ORIGINS?: string;
}

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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

export async function createToken(adminPassword: string): Promise<string> {
	const exp = Date.now() + TOKEN_EXPIRY_MS;
	const payload = `admin:${exp}`;
	const sig = await hmacSign(payload, adminPassword);
	return btoa(`${payload}:${sig}`);
}

export async function validateToken(authHeader: string | null, env: AuthEnv): Promise<boolean> {
	if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
	const secret = env.ADMIN_PASSWORD;
	if (!secret) return false;

	try {
		const decoded = atob(authHeader.slice(7));
		const parts = decoded.split(':');
		if (parts.length !== 3 || parts[0] !== 'admin') return false;

		const exp = parseInt(parts[1], 10);
		if (isNaN(exp) || Date.now() > exp) return false;

		const payload = `${parts[0]}:${parts[1]}`;
		const sig = parts[2];
		return await hmacVerify(payload, sig, secret);
	} catch {
		return false;
	}
}

export function getCorsHeaders(request?: Request, env?: AuthEnv): Record<string, string> {
	const allowedRaw = env?.ALLOWED_ORIGINS || 'https://familyfriendshibachi.com';
	const allowed = allowedRaw.split(',').map(o => o.trim());
	const requestOrigin = request?.headers.get('Origin') || '';
	const matchedOrigin = allowed.includes(requestOrigin) ? requestOrigin : allowed[0];

	return {
		'Access-Control-Allow-Origin': matchedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
