/**
 * Test Helpers for Visa Sandbox
 */

/**
 * Visa Test PANs for Sandbox
 * Reference: https://developer.visa.com/capabilities/visa_direct/docs-test-data
 */
export const TEST_PANS = {
  VISA_BASIC: '4111111111111111',
  VISA_DECLINED: '4000111111111115',
  VISA_EXPIRED: '4000111111111123',
  VISA_INTERNATIONAL: '4005520000000129',
};

/**
 * Generate test card details
 */
export function generateTestCard(last4: string = '1111') {
  return {
    pan: TEST_PANS.VISA_BASIC,
    masked: `4111********${last4}`,
    expiry: '2025-12',
    last4,
  };
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Mask PAN for display
 */
export function maskPAN(pan: string): string {
  if (pan.length < 8) return pan;
  const first4 = pan.slice(0, 4);
  const last4 = pan.slice(-4);
  return `${first4}********${last4}`;
}


