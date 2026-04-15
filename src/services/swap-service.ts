import { getQuote, getSwapTransaction } from '../okx/dex-client.js';
import { toSmallestUnit, toHumanReadable, getDecimals } from '../lib/amounts.js';
import { ALLOWED_FROM_TOKENS, findCuratedToken } from '../lib/tokens.js';
import { logger } from '../lib/logger.js';
import type { SwapRequest, SwapResponse } from '../types/swap.js';

/**
 * Get a DEX quote + swap calldata on X Layer via OKX DEX Aggregator.
 *
 * V1: Returns quote + calldata (NOT broadcast on-chain — Gate 3b pending).
 * The x402 payment ($0.01) is a service fee for the quote+calldata package.
 *
 * V2 (post Gate 3b): Will execute on-chain via Agentic Wallet with dynamic
 * pricing matching the swap principal.
 */
export async function executeSwap(req: SwapRequest): Promise<SwapResponse> {
  // --- Coerce & validate (prevents crashes from non-string inputs) ---
  if (!req || typeof req !== 'object') {
    return { status: 'error', data: 'Invalid request body' };
  }

  const fromToken = typeof req.fromToken === 'string' ? req.fromToken : '';
  const toToken = typeof req.toToken === 'string' ? req.toToken : '';
  const amount = typeof req.amount === 'string' ? req.amount : '';
  const userWalletAddress = typeof req.userWalletAddress === 'string' ? req.userWalletAddress : '';
  const slippage = typeof req.slippage === 'string' ? req.slippage : '1';

  if (!fromToken || !toToken || !amount || !userWalletAddress) {
    return {
      status: 'error',
      data: 'Missing required fields: fromToken, toToken, amount, userWalletAddress',
    };
  }

  const fromLower = fromToken.toLowerCase();
  const toLower = toToken.toLowerCase();

  if (!ALLOWED_FROM_TOKENS.has(fromLower)) {
    return {
      status: 'error',
      data: `V1 only supports USDT or USDG as source token. Got: ${fromToken}`,
    };
  }

  if (fromLower === toLower) {
    return { status: 'error', data: 'fromToken and toToken cannot be the same' };
  }

  if (!userWalletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { status: 'error', data: 'Invalid EVM wallet address' };
  }

  // Strict decimal validation — reject scientific notation, letters, multiple dots
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    return { status: 'error', data: 'Amount must be a plain decimal number (e.g. "1.5")' };
  }

  const amountNum = parseFloat(amount);
  if (amountNum <= 0) {
    return { status: 'error', data: 'Amount must be a positive number' };
  }

  // Validate slippage bounds (0.1% – 50%)
  const slippageNum = parseFloat(slippage);
  if (isNaN(slippageNum) || slippageNum < 0.1 || slippageNum > 50) {
    return { status: 'error', data: 'Slippage must be between 0.1 and 50 (percent)' };
  }

  // --- Convert to smallest units ---
  const fromDecimals = getDecimals(fromLower);
  const amountSmallest = toSmallestUnit(amount, fromDecimals);

  logger.info('Swap requested', {
    fromToken: fromLower,
    toToken: toLower,
    amount,
    amountSmallest,
    userWalletAddress,
  });

  try {
    // --- Get quote first for display ---
    const quote = await getQuote(fromLower, toLower, amountSmallest);
    const toDecimals = parseInt(quote.toToken.decimal, 10);
    const estimatedOutput = toHumanReadable(quote.toTokenAmount, toDecimals);

    logger.info('Quote received', {
      fromAmount: amount,
      toAmount: estimatedOutput,
      toSymbol: quote.toToken.tokenSymbol,
      gasFee: quote.estimateGasFee,
    });

    // V1: Build swap calldata for the user's wallet. Calldata is returned
    // but NOT broadcast on-chain (Gate 3b not yet proven).
    // TODO(V2): When Gate 3b lands, swap to Otto agent wallet as spender
    // and broadcast on-chain. Requires dynamic x402 pricing = swap principal.
    const swap = await getSwapTransaction(
      fromLower,
      toLower,
      amountSmallest,
      userWalletAddress,
      slippage,
    );

    const fromToken_ = findCuratedToken(fromLower);
    const toSymbol = quote.toToken.tokenSymbol;

    logger.info('Swap calldata ready', {
      router: swap.tx.to,
      gas: swap.tx.gas,
      dataLength: swap.tx.data.length,
    });

    return {
      status: 'success',
      data: {
        fromToken: fromToken_?.symbol || fromLower,
        toToken: toSymbol,
        fromAmount: amount,
        toAmount: estimatedOutput,
        executionStatus: 'not_broadcast',
        tx: {
          to: swap.tx.to,
          data: swap.tx.data,
          value: swap.tx.value,
          gas: swap.tx.gas,
        },
        explorerUrl: 'https://www.okx.com/web3/explorer/xlayer',
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Swap failed', { error: msg, fromToken: fromLower, toToken: toLower });
    return { status: 'error', data: `Swap failed: ${msg}` };
  }
}
