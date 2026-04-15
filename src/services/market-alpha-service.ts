import { getQuote } from '../okx/dex-client.js';
import { CURATED_TOKENS } from '../lib/tokens.js';
import { logger } from '../lib/logger.js';
import type { MarketAlphaResponse, TokenAlpha } from '../types/swap.js';

const USDT_ADDRESS = '0x779ded0c9e1022225f8e0630b35a9b54be713736';

/**
 * Get curated X Layer token market intelligence.
 * Uses DEX quotes to derive live pricing for non-stable tokens.
 */
export async function getMarketAlpha(): Promise<MarketAlphaResponse> {
  try {
    const tokens: TokenAlpha[] = [];

    // Get live prices for non-stable curated tokens via DEX quotes
    const priceable = CURATED_TOKENS.filter((t) => t.category !== 'stable');

    const quotePromises = priceable.map(async (token) => {
      try {
        // Quote 1 USDT → token to derive token's USD price
        const quote = await getQuote(
          USDT_ADDRESS,
          token.address,
          '1000000', // 1 USDT
        );
        const toDecimals = parseInt(quote.toToken.decimal, 10);
        // How many tokens you get for 1 USDT = token price is 1/that
        const tokensPerUsdt = Number(quote.toTokenAmount) / Math.pow(10, toDecimals);
        const priceUsd = tokensPerUsdt > 0 ? (1 / tokensPerUsdt).toFixed(6) : '0';

        return {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          priceUsd,
        };
      } catch (err: unknown) {
        logger.warn(`Quote failed for ${token.symbol}`, {
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          priceUsd: 'unavailable',
        };
      }
    });

    const results = await Promise.allSettled(quotePromises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        tokens.push(result.value);
      }
    }

    // Add stable tokens with fixed price
    for (const stable of CURATED_TOKENS.filter((t) => t.category === 'stable')) {
      tokens.push({
        symbol: stable.symbol,
        name: stable.name,
        address: stable.address,
        priceUsd: stable.symbol === 'USDT' ? '1.00' : '1.00',
      });
    }

    return {
      status: 'success',
      data: {
        tokens,
        chain: 'X Layer (Chain ID: 196)',
        lastUpdated: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Market alpha failed', { error: msg });
    return { status: 'error', data: `Market intelligence failed: ${msg}` };
  }
}
