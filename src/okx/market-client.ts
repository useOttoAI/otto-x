import { okxGet } from './http.js';
import type { OkxResponse } from '../types/okx.js';

const CHAIN_INDEX = '196';

export interface MarketPrice {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  price: string;
  priceChange24H: string;
  volume24H: string;
  marketCap: string;
}

/**
 * Get token price from OKX Market API.
 * Falls back to DEX quote-based pricing if market API doesn't cover the token.
 */
export async function getTokenPrice(
  tokenAddress: string,
): Promise<MarketPrice | null> {
  try {
    const result = await okxGet<OkxResponse<MarketPrice>>(
      '/api/v6/dex/aggregator/quote',
      {
        chainIndex: CHAIN_INDEX,
        fromTokenAddress: tokenAddress,
        toTokenAddress: '0x779ded0c9e1022225f8e0630b35a9b54be713736', // USDT
        amount: '1000000000000000000', // 1 token (18 decimals default)
      },
    );

    if (result.code === '0' && result.data?.length) {
      const quote = result.data[0] as unknown as {
        fromToken: { tokenSymbol: string; tokenName: string; tokenUnitPrice: string };
        toTokenAmount: string;
      };
      return {
        tokenContractAddress: tokenAddress,
        tokenSymbol: quote.fromToken.tokenSymbol,
        tokenName: quote.fromToken.tokenName,
        price: quote.fromToken.tokenUnitPrice || '0',
        priceChange24H: '',
        volume24H: '',
        marketCap: '',
      };
    }
    return null;
  } catch {
    return null;
  }
}
