import { ethers } from 'ethers';
import WebSocket from 'ws';
import { config } from '../config';
import { logger } from './logger';

export class Web3Provider {
  public httpProvider: ethers.providers.JsonRpcProvider;
  public wsProvider: ethers.providers.WebSocketProvider | null = null;
  public wallet: ethers.Wallet;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.httpProvider = new ethers.providers.JsonRpcProvider(config.bscRpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.httpProvider);
    
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    try {
      this.wsProvider = new ethers.providers.WebSocketProvider(config.bscWssUrl);
      
      this.wsProvider._websocket.on('open', () => {
        logger.info('WebSocket connection established');
        this.reconnectAttempts = 0;
      });

      this.wsProvider._websocket.on('error', (error: Error) => {
        logger.error('WebSocket error:', error);
      });

      this.wsProvider._websocket.on('close', () => {
        logger.warn('WebSocket connection closed');
        this.handleReconnect();
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.initializeWebSocket();
      }, 5000 * this.reconnectAttempts);
    } else {
      logger.error('Max WebSocket reconnection attempts reached');
    }
  }

  public async getCurrentBlock(): Promise<number> {
    return await this.httpProvider.getBlockNumber();
  }

  public async getGasPrice(): Promise<ethers.BigNumber> {
    const gasPrice = await this.httpProvider.getGasPrice();
    // gasPriceMultiplier is a float multiplier (e.g., 1.2)
    const scaled = Math.floor(config.gasPriceMultiplier * 1000); // avoid float math
    return gasPrice.mul(scaled).div(1000);
  }

  public async getNonce(): Promise<number> {
    return await this.wallet.getTransactionCount('pending');
  }

  public async getBalance(): Promise<string> {
    const balance = await this.wallet.getBalance();
    return ethers.utils.formatEther(balance);
  }

  public destroy(): void {
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      this.wsProvider.destroy();
    }
  }
}

export const web3Provider = new Web3Provider();

