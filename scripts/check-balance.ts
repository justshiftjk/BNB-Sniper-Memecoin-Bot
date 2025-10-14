import { web3Provider } from '../src/utils/web3Provider';
import { config } from '../src/config';
import { ethers } from 'ethers';

async function checkBalance() {
  console.log('💰 Checking Wallet Balance...\n');

  try {
    const balance = await web3Provider.wallet.getBalance();
    const balanceBNB = ethers.utils.formatEther(balance);

    console.log(`Wallet Address: ${config.walletAddress}`);
    console.log(`Balance: ${balanceBNB} BNB`);
    console.log(`Balance (Wei): ${balance.toString()}`);

    // Calculate how many trades possible
    const buyAmount = parseFloat(config.buyAmount);
    const maxTrades = Math.floor(parseFloat(balanceBNB) / buyAmount);

    console.log(`\nWith buy amount of ${config.buyAmount} BNB:`);
    console.log(`Maximum possible trades: ${maxTrades}`);

    if (parseFloat(balanceBNB) < buyAmount) {
      console.log('\n⚠️  WARNING: Insufficient balance for even one trade!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBalance();

