import type { CreatePurchaseIntentFn } from '@/types/payment';

/**
 * Placeholder provider: no real payment. Returns PENDING with a message.
 * Use until Stripe (or another provider) is integrated. Wallet is never credited
 * by this provider unless fulfillOrder is called manually (e.g. dev/test).
 */
export const createMockPurchaseIntent: CreatePurchaseIntentFn = async (params) => ({
  orderId: params.orderId,
  status: 'PENDING',
  message: 'Payment integration coming soon. Coins will be credited when payment is enabled.',
});
