/** Swap request body */
export interface SwapRequest {
  /** Token contract address to swap FROM (USDT or USDG) */
  fromToken: string;
  /** Token contract address to swap TO */
  toToken: string;
  /** Amount in human-readable units (e.g. "10" for 10 USDT) */
  amount: string;
  /** User's wallet address to receive swapped tokens */
  userWalletAddress: string;
  /** Slippage tolerance in percent (default: 1) */
  slippage?: string;
}

/** Swap response */
export interface SwapResponse {
  status: 'success' | 'error';
  data: {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    /** V1: 'not_broadcast' — calldata returned but not executed on-chain */
    executionStatus: 'not_broadcast' | 'broadcast' | 'confirmed';
    /** Raw transaction calldata the user can sign and broadcast themselves */
    tx: {
      to: string;
      data: string;
      value: string;
      gas: string;
    };
    explorerUrl: string;
  } | string;
}

/** Market alpha response */
export interface MarketAlphaResponse {
  status: 'success' | 'error';
  data: {
    tokens: TokenAlpha[];
    chain: string;
    lastUpdated: string;
  } | string;
}

export interface TokenAlpha {
  symbol: string;
  name: string;
  address: string;
  priceUsd: string;
  change24h?: string;
  volume24h?: string;
  liquidity?: string;
}
