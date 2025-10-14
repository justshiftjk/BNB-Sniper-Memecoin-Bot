export interface BotConfig {
  bscRpcUrl: string;
  bscWssUrl: string;
  chainId: number;
  privateKey: string;
  walletAddress: string;
  buyAmount: string;
  gasLimit: number;
  gasPriceMultiplier: number;
  maxGasPrice: string;
  slippageBps: number;
  fourMemeFactoryAddress: string;
  fourMemeRouterAddress: string;
  pancakeRouterAddress: string;
  pancakeFactoryAddress: string;
  wbnbAddress: string;
  enableFrontrun: boolean;
  enableBackrun: boolean;
  mevSharePercentage: number;
  logLevel: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  creator: string;
  blockNumber: number;
  timestamp: number;
  txHash: string;
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  tokensBought?: string;
  price?: string;
}

export interface PendingTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  data: string;
  nonce: number;
}

export interface MEVBundle {
  transactions: string[];
  blockNumber: number;
  minTimestamp?: number;
  maxTimestamp?: number;
}

