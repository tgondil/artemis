/**
 * X-Pay-Token (HMAC-SHA256) Generator
 * Reference: https://developer.visa.com/pages/working-with-visa-apis/x-pay-token
 */

import crypto from 'crypto';

export interface XPayTokenParams {
  resourcePath: string;
  queryString?: string;
  requestBody?: string;
  sharedSecret: string;
}

/**
 * Generates X-Pay-Token header value for Visa API requests
 * Format: xv2:{timestamp}:{hmac}
 */
export function generateXPayToken(params: XPayTokenParams): string {
  const { resourcePath, queryString = '', requestBody = '', sharedSecret } = params;
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // Pre-hash string: timestamp + resourcePath + queryString + requestBody
  const preHashString = timestamp + resourcePath + queryString + requestBody;
  
  // Generate HMAC-SHA256
  const hmac = crypto
    .createHmac('sha256', sharedSecret)
    .update(preHashString, 'utf8')
    .digest('hex');
  
  return `xv2:${timestamp}:${hmac}`;
}

/**
 * Generates query string with API key
 */
export function buildQueryString(apiKey: string): string {
  return `apikey=${apiKey}`;
}


