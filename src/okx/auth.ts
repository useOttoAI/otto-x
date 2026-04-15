import crypto from 'crypto';

/**
 * OKX HMAC-SHA256 request signing.
 * Signature = Base64(HMAC-SHA256(timestamp + method + path + body, secretKey))
 */
export function createSignature(
  secretKey: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = '',
): string {
  const preHash = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', secretKey).update(preHash).digest('base64');
}

/** ISO 8601 timestamp for OKX headers (must be within 30s of server time) */
export function getTimestamp(): string {
  return new Date().toISOString();
}
