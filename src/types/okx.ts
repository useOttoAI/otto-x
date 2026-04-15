/** Standard OKX API response envelope */
export interface OkxResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

/** DEX quote response */
export interface DexQuote {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromTokenAmount: string;
  toTokenAmount: string;
  tradeFee: string;
  estimateGasFee: string;
  dexRouterList: DexRoute[];
}

export interface TokenInfo {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimal: string;
  tokenUnitPrice: string;
}

export interface DexRoute {
  router: string;
  routerPercent: string;
  subRouterList: SubRoute[];
}

export interface SubRoute {
  dexProtocol: Array<{
    dexName: string;
    percent: string;
  }>;
  fromToken: TokenInfo;
  toToken: TokenInfo;
}

/** DEX approve-transaction response */
export interface DexApproval {
  data: string;
  dexContractAddress: string;
  gasLimit: string;
  gasPrice: string;
}

/** DEX swap response */
export interface DexSwap {
  routerResult: {
    fromTokenAmount: string;
    toTokenAmount: string;
    tradeFee: string;
    estimateGasFee: string;
    fromToken: TokenInfo;
    toToken: TokenInfo;
  };
  tx: {
    from: string;
    to: string;
    value: string;
    data: string;
    gas: string;
    gasPrice: string;
    maxPriorityFeePerGas?: string;
  };
}

/** Token list item from all-tokens endpoint */
export interface DexToken {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimal: string;
  tokenLogoUrl: string;
}
