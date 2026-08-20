/**
 * Minimal token registry — resolves a symbol/name query to on-chain token hits.
 *
 * Backed by the curated X Layer token set (src/lib/tokens.ts). This is the
 * fallback resolver the recipe engine uses AFTER a direct curated-symbol match
 * misses; it lets a buyer's ticker map to an on-chain contract on chain 196.
 * A miss returns an empty array — the caller treats it as unavailable and never fabricates.
 */
import { CURATED_TOKENS } from './tokens.js';

export interface TokenHit {
  symbol: string;
  name: string;
  address: string;
}

/** X Layer mainnet — the only chain the curated set covers. */
const X_LAYER_CHAIN_ID = 196;

/**
 * Search the curated token set for tokens matching `query` (by exact symbol,
 * symbol substring, or name substring), case-insensitive. `chainId` gates the
 * lookup: only X Layer (196) is covered, so any other chain returns no hits
 * rather than a wrong-chain guess.
 */
export async function searchTokens(query: string, chainId: number): Promise<TokenHit[]> {
  if (chainId !== X_LAYER_CHAIN_ID) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CURATED_TOKENS.filter((t) => {
    const sym = t.symbol.toLowerCase();
    return sym === q || sym.includes(q) || t.name.toLowerCase().includes(q);
  }).map((t) => ({ symbol: t.symbol, name: t.name, address: t.address }));
}
