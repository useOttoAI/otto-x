/** Convert human-readable amount to smallest unit (e.g. 1.5 USDT → 1500000) */
export function toSmallestUnit(amount: string, decimals: number): string {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const raw = whole + paddedFraction;
  // Strip leading zeros but keep at least "0"
  return raw.replace(/^0+/, '') || '0';
}

/** Convert smallest unit to human-readable (e.g. 1500000 → 1.5 with 6 decimals) */
export function toHumanReadable(amount: string, decimals: number): string {
  const padded = amount.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals);
  const trimmedFraction = fraction.replace(/0+$/, '');
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

/** Known X Layer token decimals */
export const TOKEN_DECIMALS: Record<string, number> = {
  '0x779ded0c9e1022225f8e0630b35a9b54be713736': 6, // USDT
  '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8': 18, // USDG
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 18, // OKB (native)
  '0x5a77f1443d16ee5761d310e38b7308afe7580dcd': 18, // WETH
};

/** Get decimals for a known token, default to 18 */
export function getDecimals(tokenAddress: string): number {
  return TOKEN_DECIMALS[tokenAddress.toLowerCase()] ?? 18;
}
