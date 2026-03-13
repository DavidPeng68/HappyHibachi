# Backend API Audit Report

**Project:** HappyHibachi  
**Audit Date:** March 6, 2025  
**Scope:** Cloudflare Pages Functions (`functions/api/`) and Cloudflare Workers (`workers/`)

---

## 1. API Response Format Consistency

### Summary
Response structures vary across endpoints. Most use `{ success: boolean, ... }` but data keys and error handling differ.

### Inconsistencies Found

| Endpoint | Success Response Shape | Issue |
|----------|------------------------|-------|
| `GET /api/settings` | `{ success, settings }` | On error, returns **200** with `{ success: true, settings: DEFAULT_SETTINGS }` (lines 171-175) |
| `GET /api/instagram` | `{ success, settings }` | Same bug: on error returns 200 with defaults (lines 63-65) |
| `DELETE /api/admin/bookings` | `{ success }` | No `data`/entity in success — OK for delete |
| `DELETE /api/reviews` | `{ success }` | Same pattern |
| `DELETE /api/coupons` | `{ success }` | Same pattern |
| `GET /api/coupons?code=X` | `{ success, coupon: {...} }` | Different shape than admin list `{ success, coupons: [...] }` |

### Critical: Error Responses Return 200

**`functions/api/settings.ts` (lines 170-176):**
```typescript
} catch (error) {
    console.error('Get settings error:', error);
    return new Response(
        JSON.stringify({ success: true, settings: DEFAULT_SETTINGS }),
        { headers: corsHeaders }
    );
}
```
**Problem:** KV failure returns HTTP 200 with fallback data. Client cannot distinguish error from success.

**`functions/api/instagram.ts` (lines 62-66):** Same pattern.

### Recommendation
- Use consistent structure: `{ success: boolean, data?: T, error?: string }` for all endpoints
- On error: return HTTP 4xx/5xx and `{ success: false, error: string }`
- Never return `success: true` when an error occurred

---

## 2. Error Handling

### Missing try-catch or improper error handling

| File | Line | Issue |
|------|------|-------|
| `functions/api/settings.ts` | 170-176 | Catch returns 200 + `success: true` instead of 500 |
| `functions/api/instagram.ts` | 62-66 | Same as above |
| `functions/api/admin/login.ts` | 22 | `ADMIN_PASSWORD || '123456'` — fallback to weak default in prod |

### HTTP status codes

- **Correct usage:** Most endpoints use 400/401/404/500 appropriately
- **Exceptions:** Settings GET and Instagram GET return 200 on exception

### Uninformative errors

- Most endpoints return generic messages like `"Failed to update settings"` — acceptable for security (avoid leaking internals)
- `functions/api/admin/login.ts` line 34: `"Invalid password"` — OK for auth

### Admin login default password

**`functions/api/admin/login.ts` (line 22):**
```typescript
const adminPassword = context.env.ADMIN_PASSWORD || '123456';
```
**Problem:** If `ADMIN_PASSWORD` is not set in production, anyone can log in with `123456`.

---

## 3. Input Validation

### POST/PUT/PATCH validation gaps

#### `functions/api/booking.ts` (POST)

| Field | Required | Validated? | Gap |
|-------|----------|------------|-----|
| name, email, phone, date, guestCount, region | ✅ | Yes (presence) | No format/length checks |
| guestCount | ✅ | No range | Could accept 0, -1, or 999999 |
| date | ✅ | No format | Not validated as YYYY-MM-DD |
| email | ✅ | No format | Invalid emails accepted |
| time | No | — | Optional |
| couponCode | No | — | Accepted as-is |

**Recommendation:** Add `guestCount` min/max from settings, validate `date` format, validate `email` format.

#### `functions/api/admin/bookings.ts` (PATCH)

**Lines 95-96:**
```typescript
const { id, status } = await context.request.json() as { id: string; status: Booking['status'] };
```
**Problem:** `status` is not validated. Client could send `status: "hacked"` and it would be stored.

**Recommendation:**
```typescript
const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid status' }), { status: 400, headers: corsHeaders });
}
```

#### `functions/api/calendar.ts` (POST)

- Validates `date` presence
- No check for `YYYY-MM-DD` format
- `reason` and `region` accepted without sanitization

#### `functions/api/coupons.ts` (PATCH) — **CRITICAL**

**Lines 194-212:**
```typescript
// 使用优惠码（公开接口）
if (body.action === 'use' && body.code) {
    const index = coupons.findIndex(...);
    // ... increments usedCount without any authentication
    coupons[index].usedCount += 1;
    await context.env.BOOKINGS.put('coupons_list', JSON.stringify(coupons));
    return new Response(JSON.stringify({ success: true }), ...);
}
```
**Problem:** Anyone can call `PATCH /api/coupons` with `{ action: 'use', code: 'HAPPY10' }` to increment `usedCount` without a real booking. No auth, no proof of use.

#### `functions/api/settings.ts` (POST)

**Lines 197-208:**
```typescript
const updates = await context.request.json() as Partial<Settings>;
const newSettings: Settings = {
    ...currentSettings,
    ...updates,
};
```
**Problem:** Accepts arbitrary partial updates. Malformed or malicious data could corrupt settings (e.g. `timeSlots: "invalid"`).

#### `functions/api/lookup.ts` (POST)

- Validates `email` or `phone` presence
- No format validation; empty strings could pass if both provided as `""`

### SQL/KV injection

- **KV:** Cloudflare KV is key-value. Keys are fixed (`app_settings`, `bookings_list`, etc.). User input is stored in JSON values, not in keys. No KV injection risk.
- **No SQL:** No SQL in use.

### Type checking

- All endpoints use `as` casts (e.g. `as Partial<Booking>`). Runtime type validation is not performed.
- Recommendation: Add a lightweight schema validator (e.g. Zod) for request bodies.

---

## 4. Admin Auth Middleware Consistency

### Token validation

`validateToken()` is duplicated in 6 files with identical logic:

- `functions/api/settings.ts` (lines 134-145)
- `functions/api/admin/bookings.ts` (lines 31-42)
- `functions/api/calendar.ts` (lines 27-38)
- `functions/api/instagram.ts` (lines 31-42)
- `functions/api/reviews.ts` (lines 24-35)
- `functions/api/coupons.ts` (lines 28-38)

Logic: `Bearer <token>`, `atob(token)`, check `startsWith('admin:')`.

### Token expiration

**`functions/api/admin/login.ts` (line 26):**
```typescript
const token = btoa(`admin:${Date.now()}`);
```
**Problem:** Token is validated only by format (`admin:*`). It never expires. A stolen token remains valid indefinitely.

### Endpoints missing auth

| Endpoint | Should require auth? | Current behavior |
|----------|----------------------|-------------------|
| `GET /api/cron/reminders` | Yes (admin) | **No auth** — returns `pendingReminders`, `alreadyReminded` |
| `PATCH /api/coupons` with `action: 'use'` | N/A (public use) | **No auth** — but should verify use via booking, not raw API call |

### Cron POST auth confusion

**`functions/api/cron/reminders.ts` (lines 168-182):**
```typescript
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isCronTrigger = context.request.headers.get('CF-Worker') === 'true';
    if (!isCronTrigger) {
        return new Response(..., { status: 401 });
    }
}
```

- If `CRON_SECRET` is set: requires `Authorization: Bearer <CRON_SECRET>` or `CF-Worker: true`
- Admin dashboard sends `Authorization: Bearer <admin_token>` — this will fail when `CRON_SECRET` is set
- `CF-Worker` is not a standard Cloudflare header; worker in `workers/reminder-cron/index.js` sends it manually, but Cloudflare cron triggers may not

---

## 5. Data Model Consistency

### Frontend vs backend type mismatches

#### Review ID type

| Location | Type | Value |
|----------|------|-------|
| `src/types/index.ts` | `id: number` | — |
| `functions/api/reviews.ts` | `id: string` | `crypto.randomUUID()` |
| `src/pages/AdminDashboard.tsx` | `id: string` | Matches backend |

Frontend `Review` in `src/types/index.ts` uses `id: number`; backend uses string UUIDs. Other code uses `id: string` correctly.

#### BrandInfo

| Field | `src/types/index.ts` | `functions/api/settings.ts` | `src/hooks/useSettings.tsx` |
|-------|----------------------|-----------------------------|------------------------------|
| logoImage | ✅ (optional) | ❌ missing | ✅ `logoImage: ''` |
| heroImage | ✅ (optional) | ❌ missing | ✅ `heroImage: ''` |
| logoUrl | ✅ | ✅ | ✅ |

Backend `BrandInfo` has no `logoImage`/`heroImage`. Frontend expects them and sends them. Backend merge accepts them, but they are not in the backend type.

#### ContactInfo

| Field | Frontend | Backend |
|-------|----------|---------|
| responseTime | ✅ optional | ❌ not in backend |

#### BlockedDate

| Field | AdminDashboard | `functions/api/calendar.ts` |
|-------|----------------|-----------------------------|
| region | ❌ | ✅ optional |

Admin blocked dates UI does not handle `region`; backend supports region-scoped blocking.

#### Settings structure

- Backend `Settings` has `businessHours?: { open, close }` — not present in frontend `AppSettings`
- Frontend `AppSettings` has `BusinessHours` with `afternoon`, `evening`, `night` — different structure

### Backend-only fields

- `Booking.reminded` in cron/reminders — not in frontend `Booking`
- `Booking.formType` — present in both

---

## 6. KV Storage Patterns

### Keys used

| Key | Used in | Purpose |
|-----|---------|---------|
| `app_settings` | settings.ts | App configuration |
| `bookings_list` | booking.ts, admin/bookings.ts, calendar.ts, cron/reminders.ts, lookup.ts | All bookings |
| `coupons_list` | booking.ts, coupons.ts | Coupons |
| `blocked_dates` | calendar.ts | Blocked dates |
| `instagram_settings` | instagram.ts | Instagram posts/handle |
| `reviews_list` | reviews.ts | Reviews |

### Consistency

- Naming: `*_list` for arrays, `*_settings` for config — consistent
- No user-controlled keys
- No apparent key collisions

### Potential issue

`bookings_list` and `coupons_list` are single keys storing full JSON arrays. High traffic could cause write contention. Consider per-booking keys or batching for scaling.

---

## Summary of Critical/High Priority Issues

| Priority | Issue | Location |
|----------|-------|----------|
| **Critical** | Coupons PATCH `action: 'use'` has no auth; anyone can increment `usedCount` | `functions/api/coupons.ts` |
| **Critical** | Admin password fallback to `123456` when `ADMIN_PASSWORD` unset | `functions/api/admin/login.ts` |
| **High** | Settings GET returns 200 on error | `functions/api/settings.ts` |
| **High** | Instagram GET returns 200 on error | `functions/api/instagram.ts` |
| **High** | Admin token never expires | `functions/api/admin/login.ts` |
| **High** | Admin bookings PATCH does not validate `status` | `functions/api/admin/bookings.ts` |
| **Medium** | GET /api/cron/reminders unauthenticated | `functions/api/cron/reminders.ts` |
| **Medium** | Booking `guestCount` not range-validated | `functions/api/booking.ts` |
| **Medium** | Duplicated `validateToken` in 6 files | Multiple files |
| **Medium** | Frontend `Review.id` typed as `number` vs backend `string` | `src/types/index.ts` |

---

## Recommendations

1. **Extract shared auth:** Create `functions/api/_auth.ts` with `validateToken()` and use it everywhere.
2. **Add token expiration:** Store issue time in token and enforce expiry (e.g. 24h).
3. **Remove coupon “use” API:** Handle coupon use only inside the booking flow; remove or tightly restrict `action: 'use'`.
4. **Fix error responses:** Settings and Instagram GET should return 500 and `{ success: false, error }` on failure.
5. **Require `ADMIN_PASSWORD`:** Fail startup if not set in production.
6. **Validate enums:** Validate `status` and similar fields against allowed values.
7. **Protect cron GET:** Require admin auth for `/api/cron/reminders` GET.
8. **Align types:** Share TypeScript types between frontend and backend (e.g. via a shared package or generated types).
