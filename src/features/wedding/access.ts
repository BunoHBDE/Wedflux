import type { Subscription } from './useWedding';

/** Espelha private.has_active_subscription: status ≠ expired e acesso ainda vigente. O banco é quem decide de fato. */
export function hasActiveSubscription(sub: Subscription | null, now: Date = new Date()): boolean {
  return !!sub && sub.status !== 'expired' && !!sub.entitlement_expires_at && new Date(sub.entitlement_expires_at) > now;
}
