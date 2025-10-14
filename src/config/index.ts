import dotenv from 'dotenv';
import { BotConfig } from '../types';

dotenv.config();

export const config: BotConfig = {
  bscRpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
  bscWssUrl: process.env.BSC_WSS_URL || 'wss://bsc-dataseed.binance.org/',
  chainId: parseInt(process.env.CHAIN_ID || '56'),
  privateKey: process.env.PRIVATE_KEY || '',
  walletAddress: process.env.WALLET_ADDRESS || '',
  buyAmount: process.env.BUY_AMOUNT || '0.1',
  gasLimit: parseInt(process.env.GAS_LIMIT || '500000'),
  gasPriceMultiplier: parseFloat(process.env.GAS_PRICE_MULTIPLIER || '1.2'),
  maxGasPrice: process.env.MAX_GAS_PRICE || '10',
  slippageBps: parseInt(process.env.SLIPPAGE_BPS || '100'),
  fourMemeFactoryAddress: process.env.FOUR_MEME_FACTORY_ADDRESS || '',
  fourMemeRouterAddress: process.env.FOUR_MEME_ROUTER_ADDRESS || '',
  pancakeRouterAddress: process.env.PANCAKE_ROUTER_ADDRESS || '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  pancakeFactoryAddress: process.env.PANCAKE_FACTORY_ADDRESS || '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
  wbnbAddress: process.env.WBNB_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  enableFrontrun: process.env.ENABLE_FRONTRUN === 'true',
  enableBackrun: process.env.ENABLE_BACKRUN === 'true',
  mevSharePercentage: parseInt(process.env.MEV_SHARE_PERCENTAGE || '80'),
  logLevel: process.env.LOG_LEVEL || 'info',
};

export function validateConfig(): void {
  const required = [
    'privateKey',
    'walletAddress',
    'bscRpcUrl',
  ];

  for (const key of required) {
    if (!config[key as keyof BotConfig]) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }

  if (!config.privateKey.startsWith('0x')) {
    throw new Error('Private key must start with 0x');
  }

  if (config.privateKey.length !== 66) {
    throw new Error('Invalid private key length');
  }
}

