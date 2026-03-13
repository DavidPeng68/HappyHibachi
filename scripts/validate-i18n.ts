/**
 * i18n Locale Validation Script
 *
 * Checks that all locale files have the same keys as en.ts (source of truth).
 * Reports missing keys, extra keys, and type mismatches.
 *
 * Usage: npx tsx scripts/validate-i18n.ts
 */

import en from '../src/i18n/locales/en';
import zh from '../src/i18n/locales/zh';
import es from '../src/i18n/locales/es';
import ko from '../src/i18n/locales/ko';
import vi from '../src/i18n/locales/vi';
import ja from '../src/i18n/locales/ja';
import tl from '../src/i18n/locales/tl';
import hi from '../src/i18n/locales/hi';

type NestedRecord = Record<string, unknown>;

const LOCALES: Record<string, NestedRecord> = { zh, es, ko, vi, ja, tl, hi };

function flattenKeys(obj: NestedRecord, prefix = ''): Map<string, string> {
	const keys = new Map<string, string>();
	for (const [k, v] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${k}` : k;
		if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
			for (const [subKey, subType] of flattenKeys(v as NestedRecord, path)) {
				keys.set(subKey, subType);
			}
		} else {
			keys.set(path, typeof v);
		}
	}
	return keys;
}

const enKeys = flattenKeys(en as unknown as NestedRecord);
let hasErrors = false;
let totalMissing = 0;
let totalExtra = 0;

console.log(`\n📋 i18n Validation — Source: en.ts (${enKeys.size} keys)\n`);

for (const [lang, locale] of Object.entries(LOCALES)) {
	const langKeys = flattenKeys(locale);
	const missing: string[] = [];
	const extra: string[] = [];
	const typeMismatch: string[] = [];

	for (const [key, type] of enKeys) {
		if (!langKeys.has(key)) {
			missing.push(key);
		} else if (langKeys.get(key) !== type) {
			typeMismatch.push(`${key} (en: ${type}, ${lang}: ${langKeys.get(key)})`);
		}
	}

	for (const key of langKeys.keys()) {
		if (!enKeys.has(key)) {
			extra.push(key);
		}
	}

	const status = missing.length === 0 && typeMismatch.length === 0 ? '✅' : '❌';
	console.log(`${status} ${lang}.ts — ${langKeys.size} keys`);

	if (missing.length > 0) {
		hasErrors = true;
		totalMissing += missing.length;
		console.log(`   Missing (${missing.length}):`);
		for (const key of missing.slice(0, 10)) {
			console.log(`     - ${key}`);
		}
		if (missing.length > 10) {
			console.log(`     ... and ${missing.length - 10} more`);
		}
	}

	if (typeMismatch.length > 0) {
		hasErrors = true;
		console.log(`   Type mismatches (${typeMismatch.length}):`);
		for (const msg of typeMismatch) {
			console.log(`     - ${msg}`);
		}
	}

	if (extra.length > 0) {
		totalExtra += extra.length;
		console.log(`   Extra keys (${extra.length}):`);
		for (const key of extra.slice(0, 5)) {
			console.log(`     - ${key}`);
		}
		if (extra.length > 5) {
			console.log(`     ... and ${extra.length - 5} more`);
		}
	}
}

console.log('');
if (hasErrors) {
	console.log(`❌ Validation FAILED — ${totalMissing} missing key(s) across locales`);
	process.exit(1);
} else if (totalExtra > 0) {
	console.log(`⚠️  Validation PASSED with warnings — ${totalExtra} extra key(s) found`);
} else {
	console.log('✅ All locales are in sync with en.ts');
}
