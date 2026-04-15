import { okxGet } from './http.js';
import type {
  OkxResponse,
  DexQuote,
  DexApproval,
  DexSwap,
  DexToken,
} from '../types/okx.js';

const CHAIN_INDEX = '196'; // X Layer
const DEX_PATH = '/api/v6/dex/aggregator';

/** Get a swap quote (no execution, read-only) */
export async function getQuote(
  fromToken: string,
  toToken: string,
  amount: string,
): Promise<DexQuote> {
  const result = await okxGet<OkxResponse<DexQuote>>(`${DEX_PATH}/quote`, {
    chainIndex: CHAIN_INDEX,
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    amount,
  });

  if (result.code !== '0' || !result.data?.length) {
    throw new Error(`DEX quote failed: ${result.msg || 'no data'}`);
  }
  return result.data[0];
}

/** Get ERC-20 approval calldata for DEX router */
export async function getApproveTransaction(
  tokenAddress: string,
  approveAmount: string,
): Promise<DexApproval> {
  const result = await okxGet<OkxResponse<DexApproval>>(
    `${DEX_PATH}/approve-transaction`,
    {
      chainIndex: CHAIN_INDEX,
      tokenContractAddress: tokenAddress,
      approveAmount,
    },
  );

  if (result.code !== '0' || !result.data?.length) {
    throw new Error(`DEX approve failed: ${result.msg || 'no data'}`);
  }
  return result.data[0];
}

/** Get full swap transaction calldata */
export async function getSwapTransaction(
  fromToken: string,
  toToken: string,
  amount: string,
  userWalletAddress: string,
  slippagePercent: string = '1',
): Promise<DexSwap> {
  const result = await okxGet<OkxResponse<DexSwap>>(`${DEX_PATH}/swap`, {
    chainIndex: CHAIN_INDEX,
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    amount,
    slippagePercent,
    userWalletAddress,
  });

  if (result.code !== '0' || !result.data?.length) {
    throw new Error(`DEX swap failed: ${result.msg || 'no data'}`);
  }
  return result.data[0];
}

/** Get all supported tokens on X Layer */
export async function getAllTokens(): Promise<DexToken[]> {
  const result = await okxGet<OkxResponse<DexToken[]>>(
    `${DEX_PATH}/all-tokens`,
    { chainIndex: CHAIN_INDEX },
  );

  if (result.code !== '0' || !result.data?.length) {
    throw new Error(`Token list failed: ${result.msg || 'no data'}`);
  }
  // all-tokens returns nested: data[0] is the token array
  return result.data[0] as unknown as DexToken[];
}
