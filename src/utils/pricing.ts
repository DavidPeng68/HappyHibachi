/**
 * Pure pricing calculation — extracted from OrderContext for testability.
 * This is the single source of truth for order total calculation.
 */

import type { MenuData, OrderState } from '../types/menu';

export function calculateOrderTotal(order: OrderState, menu: MenuData | null): number {
  if (!menu) return 0;
  const pkg = menu.packages.find((p) => p.id === order.packageId);
  if (!pkg) return 0;

  let total = 0;

  // Package base price
  if (pkg.flatPrice != null) {
    total = pkg.flatPrice;
  } else {
    total += pkg.pricePerPerson * order.guestCount;
    const kidsRate = pkg.kidsPrice ?? menu.pricing.kidsPrice;
    total += kidsRate * order.kidsCount;
  }

  // Protein upgrade fees (adults only)
  for (const proteinId of order.proteinSelections) {
    const item = menu.items.find((i) => i.id === proteinId);
    if (item && item.priceType === 'upgrade') {
      total += item.price * order.guestCount;
    }
  }

  // Add-ons
  for (const addon of order.addons) {
    const item = menu.items.find((i) => i.id === addon.menuItemId);
    if (!item) continue;
    if (item.priceType === 'per_person') {
      total += item.price * (order.guestCount + order.kidsCount) * addon.quantity;
    } else {
      total += item.price * addon.quantity;
    }
  }

  // Minimum order floor (only for per-person packages)
  if (pkg.flatPrice == null) {
    total = Math.max(total, menu.pricing.minimumOrder);
  }

  return total;
}
