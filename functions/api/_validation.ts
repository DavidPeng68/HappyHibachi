/**
 * Shared input validation helpers for API functions.
 */

export function validateStringLength(
	value: unknown,
	fieldName: string,
	maxLength: number,
	minLength = 0
): string | null {
	if (typeof value !== 'string') return `${fieldName} must be a string`;
	if (value.length < minLength) return `${fieldName} must be at least ${minLength} characters`;
	if (value.length > maxLength) return `${fieldName} must not exceed ${maxLength} characters`;
	return null;
}

export function validateArrayLength(
	value: unknown,
	fieldName: string,
	maxItems: number,
	maxItemLength?: number
): string | null {
	if (!Array.isArray(value)) return `${fieldName} must be an array`;
	if (value.length > maxItems) return `${fieldName} must not exceed ${maxItems} items`;
	if (maxItemLength !== undefined) {
		for (const item of value) {
			if (typeof item !== 'string') return `${fieldName} items must be strings`;
			if (item.length > maxItemLength) return `${fieldName} items must not exceed ${maxItemLength} characters`;
		}
	}
	return null;
}

export function validatePasswordComplexity(password: string): string | null {
	if (password.length < 8) return 'Password must be at least 8 characters';
	if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
	if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
	if (!/[0-9]/.test(password)) return 'Password must contain a number';
	return null;
}

export function validateDateRange(from: string, until: string): string | null {
	const fromDate = new Date(from);
	const untilDate = new Date(until);
	if (isNaN(fromDate.getTime())) return 'Invalid start date';
	if (isNaN(untilDate.getTime())) return 'Invalid end date';
	if (fromDate > untilDate) return 'Start date must be before end date';
	return null;
}
