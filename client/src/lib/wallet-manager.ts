import { ethers } from 'ethers';
import { apiRequest } from './queryClient';

// Wallet management functionality
export class WalletManager {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  
  constructor(infuraApiKey: string) {
    // Initialize the provider with Infura
    const infuraUrl = `https://mainnet.infura.io/v3/${infuraApiKey}`;
    this.provider = new ethers.JsonRpcProvider(infuraUrl);
  }
  
  // Initialize wallet with private key
  public async initializeWallet(privateKey: string) {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log('Wallet initialized with address:', this.wallet.address);
      return this.getWalletInfo();
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      throw error;
    }
  }
  
  // Get wallet information
  public async getWalletInfo() {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    
    try {
      const balanceWei = await this.provider.getBalance(this.wallet.address);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei));
      
      // Get current ETH price (using approximate value)
      const ethPriceGBP = 2650; // Example price in GBP
      
      return {
        address: this.wallet.address,
        balanceEth,
        balanceGBP: balanceEth * ethPriceGBP,
        connected: true
      };
    } catch (error) {
      console.error('Failed to get wallet info:', error);
      throw error;
    }
  }
  
  // Withdraw profits to an address
  public async withdrawProfits(amountEth: number, toAddress?: string) {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    
    try {
      const targetAddress = toAddress || this.wallet.address;
      const amountWei = ethers.parseEther(amountEth.toString());
      
      // First check if we have enough balance
      const balance = await this.provider.getBalance(this.wallet.address);
      if (balance < amountWei) {
        throw new Error(`Insufficient balance. Have: ${ethers.formatEther(balance)} ETH, Need: ${amountEth} ETH`);
      }
      
      // Calculate gas price and gas limit
      const gasPrice = await this.provider.getFeeData();
      const gasLimit = BigInt(21000); // Standard ETH transfer gas limit
      
      // Create transaction
      const transaction = {
        to: targetAddress,
        value: amountWei,
        gasLimit,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
        nonce: await this.provider.getTransactionCount(this.wallet.address)
      };
      
      // Sign and send transaction
      const txResponse = await this.wallet.sendTransaction(transaction);
      console.log('Withdrawal transaction sent:', txResponse.hash);
      
      // Wait for confirmation (1 block)
      const receipt = await txResponse.wait(1);
      
      // Record the withdrawal transaction in our system
      await this.recordWithdrawal(amountEth, txResponse.hash, targetAddress);
      
      return {
        success: true,
        txHash: txResponse.hash,
        amount: amountEth,
        to: targetAddress,
        receipt
      };
    } catch (error) {
      console.error('Failed to withdraw profits:', error);
      throw error;
    }
  }
  
  // Record withdrawal in our database
  private async recordWithdrawal(amountEth: number, txHash: string, toAddress: string) {
    try {
      await apiRequest('POST', '/api/withdrawals', {
        txHash,
        amount: amountEth.toString(),
        toAddress,
        status: 'Completed'
      });
    } catch (error) {
      console.error('Failed to record withdrawal:', error);
      // Don't throw here, as the withdrawal was successful even if recording failed
    }
  }
}

// Singleton instance
let walletManagerInstance: WalletManager | null = null;

export function initWalletManager() {
  const infuraApiKey = process.env.INFURA_API_KEY || '';
  const privateKey = process.env.ETHEREUM_PRIVATE_KEY || '';
  
  if (!infuraApiKey) {
    console.error('Cannot initialize WalletManager: missing Infura API key');
    return null;
  }
  
  console.log('Initializing Wallet Manager with Infura API credentials');
  
  if (!walletManagerInstance) {
    walletManagerInstance = new WalletManager(infuraApiKey);
    
    // Initialize the wallet with the private key if available
    if (privateKey) {
      walletManagerInstance.initializeWallet(privateKey)
        .then(walletInfo => {
          console.log('Wallet initialized successfully with address:', walletInfo.address);
        })
        .catch(error => {
          console.error('Failed to initialize wallet with provided private key:', error);
        });
    }
  }
  
  return walletManagerInstance;
}

export function getWalletManager() {
  return walletManagerInstance;
}