/**
 * API Service - handles all backend API calls with timeout and error handling
 */

import type { BookingFormData, EstimateFormData } from '../types';
import i18n from '../i18n';

const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 15_000;

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  confirmationSent?: boolean;
}

async function apiRequest(url: string, options: RequestInit = {}): Promise<ApiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      try {
        const body = await response.json();
        if (body.error) {
          return { success: false, error: body.error };
        }
      } catch {
        // No JSON body, fall through to status-based error
      }
      if (response.status >= 400 && response.status < 500) {
        return { success: false, error: i18n.t('errors.badRequest') };
      }
      return { success: false, error: i18n.t('errors.serverError') };
    }

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: i18n.t('errors.timeout') };
    }
    console.error('API request error:', error);
    return { success: false, error: i18n.t('errors.network') };
  } finally {
    clearTimeout(timeout);
  }
}

function generateIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function submitBooking(data: BookingFormData): Promise<ApiResponse> {
  return apiRequest(`${API_BASE}/booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': generateIdempotencyKey('booking'),
    },
    body: JSON.stringify({ ...data, formType: 'booking' }),
  });
}

export async function submitEstimate(data: EstimateFormData): Promise<ApiResponse> {
  return apiRequest(`${API_BASE}/booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': generateIdempotencyKey('estimate'),
    },
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.preferredDate,
      time: '',
      guestCount: data.guestCount,
      region: data.region,
      message: `Event Type: ${data.eventType}\n${data.additionalInfo || ''}`,
      eventType: data.eventType,
      formType: 'estimate',
    }),
  });
}

export async function submitNewsletter(email: string): Promise<ApiResponse> {
  return apiRequest(`${API_BASE}/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function submitReferral(email: string): Promise<ApiResponse & { code?: string }> {
  return apiRequest(`${API_BASE}/referral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }) as Promise<ApiResponse & { code?: string }>;
}

export async function submitPhotos(formData: FormData): Promise<ApiResponse> {
  return apiRequest(`${API_BASE}/photos`, {
    method: 'POST',
    body: formData,
  });
}
