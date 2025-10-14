import { config, validateConfig } from '../src/config';
import { web3Provider } from '../src/utils/web3Provider';
import { logger } from '../src/utils/logger';
import { ethers } from 'ethers';

async function testConnection() {
  console.log('🔍 Testing BNB Chain Connection...\n');

  try {
    // Validate config
    validateConfig();
    console.log('✅ Configuration validated\n');

    // Test HTTP RPC
    console.log('Testing HTTP RPC...');
    const blockNumber = await web3Provider.getCurrentBlock();
    console.log(`✅ Current block: ${blockNumber}\n`);

    // Test WebSocket
    console.log('Testing WebSocket connection...');
    if (web3Provider.wsProvider) {
      console.log('✅ WebSocket connected\n');
    } else {
      console.log('❌ WebSocket not available\n');
    }

    // Test wallet
    console.log('Testing wallet...');
    const balance = await web3Provider.getBalance();
    console.log(`✅ Wallet: ${config.walletAddress}`);
    console.log(`✅ Balance: ${balance} BNB\n`);

    // Test gas price
    const gasPrice = await web3Provider.getGasPrice();
    console.log(`✅ Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} GWEI\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('✅ All connection tests passed!');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

testConnection();

