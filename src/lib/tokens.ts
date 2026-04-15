/** Curated X Layer token registry */
export interface CuratedToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  category: 'stable' | 'native' | 'defi' | 'wrapped' | 'meme';
}

export const CURATED_TOKENS: CuratedToken[] = [
  // --- Native ---
  {
    symbol: 'OKB',
    name: 'OKB (Native Gas Token)',
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    decimals: 18,
    category: 'native',
  },

  // --- Stablecoins ---
  {
    symbol: 'USDT',
    name: 'Tether USD (USDT0)',
    address: '0x779ded0c9e1022225f8e0630b35a9b54be713736',
    decimals: 6,
    category: 'stable',
  },
  {
    symbol: 'USDG',
    name: 'Global Dollar',
    address: '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8',
    decimals: 18,
    category: 'stable',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
    decimals: 6,
    category: 'stable',
  },
  {
    symbol: 'USDe',
    name: 'Ethena USDe',
    address: '0x4169df1b7820702f566cc10938da51f6f597d264',
    decimals: 18,
    category: 'stable',
  },
  {
    symbol: 'frxUSD',
    name: 'Frax USD',
    address: '0x80eede496655fb9047dd39d9f418d5483ed600df',
    decimals: 18,
    category: 'stable',
  },

  // --- Wrapped / Bridged ---
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x5a77f1443d16ee5761d310e38b7308afe7580dcd',
    decimals: 18,
    category: 'wrapped',
  },
  {
    symbol: 'WOKB',
    name: 'Wrapped OKB',
    address: '0xe538905cf8410324e03a5a23c1c177a474d59b2b',
    decimals: 18,
    category: 'wrapped',
  },
  {
    symbol: 'XBTC',
    name: 'OKX Wrapped BTC',
    address: '0xb7c00000bcdeef966b20b3d884b98e64d2b06b4f',
    decimals: 8,
    category: 'wrapped',
  },
  {
    symbol: 'XETH',
    name: 'OKX Wrapped ETH',
    address: '0xe7b000003a45145decf8a28fc755ad5ec5ea025a',
    decimals: 18,
    category: 'wrapped',
  },
  {
    symbol: 'XSOL',
    name: 'OKX Wrapped SOL',
    address: '0x505000008de8748dbd4422ff4687a4fc9beba15b',
    decimals: 9,
    category: 'wrapped',
  },
  {
    symbol: 'XOKSOL',
    name: 'OKX Wrapped Staked SOL',
    address: '0x14a686103854dab7b8801e31979caa595835b25d',
    decimals: 9,
    category: 'wrapped',
  },
  {
    symbol: 'sUSDe',
    name: 'Ethena Staked USDe',
    address: '0x1ab1ff9c9c5d7eb38113c35e4e2c72c4bfdcc779',
    decimals: 18,
    category: 'defi',
  },
  {
    symbol: 'rsETH',
    name: 'Kelp DAO Restaked ETH',
    address: '0xb227132b70ccc40e7b0efa862b1dc477e6aaaf43',
    decimals: 18,
    category: 'defi',
  },

  // --- DeFi ---
  {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0x8c22d3a1a0f7fbe43b923a8dff2e4f8591ba45b2',
    decimals: 18,
    category: 'defi',
  },

  // --- Meme ---
  {
    symbol: 'XDOG',
    name: 'XDOG',
    address: '0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e',
    decimals: 18,
    category: 'meme',
  },
];

/** Allowed source tokens for V1 (what the user pays with) */
export const ALLOWED_FROM_TOKENS = new Set([
  '0x779ded0c9e1022225f8e0630b35a9b54be713736', // USDT
  '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8', // USDG
]);

/** Lookup curated token by address (case-insensitive) */
export function findCuratedToken(address: string): CuratedToken | undefined {
  return CURATED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase(),
  );
}
