import { ethers } from 'ethers';
import { getBlockchainStatus, simulateTransaction } from './ethereum';
import { apiRequest } from './queryClient';
import { ArbitrageOpportunity } from './arbitrage';

// ABIs for common DEX interactions
const UNISWAP_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// Token addresses for commonly used assets
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';

// DEX Addresses
const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const SUSHISWAP_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F';

// Profit tracking
interface ProfitReport {
  totalProfitETH: number;
  totalProfitGBP: number;
  transactions: number;
  successRate: number;
  startTime: Date;
  lastExecutionTime?: Date;
}

// Main MEV executor class
export class MevExecutor {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private ethToGbpRate: number = 2650; // Default rate, will be updated
  private profitReport: ProfitReport;
  private isRunning: boolean = false;
  private targetProfitGBP: number = 20; // £20 target

  constructor(privateKey: string, infuraApiKey: string) {
    // Initialize the provider with Infura
    const infuraUrl = `https://mainnet.infura.io/v3/${infuraApiKey}`;
    this.provider = new ethers.JsonRpcProvider(infuraUrl);
    
    // Create a wallet with the private key
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Initialize profit report
    this.profitReport = {
      totalProfitETH: 0,
      totalProfitGBP: 0,
      transactions: 0,
      successRate: 0,
      startTime: new Date()
    };
    
    console.log('MEV Executor initialized with wallet address:', this.wallet.address);
  }

  // Start the automated trading
  public async start() {
    if (this.isRunning) {
      console.log('Executor is already running');
      return;
    }
    
    this.isRunning = true;
    console.log('Starting automated MEV trading...');
    
    // Update ETH to GBP rate
    await this.updateEthToGbpRate();
    
    // Main execution loop
    while (this.isRunning && this.profitReport.totalProfitGBP < this.targetProfitGBP) {
      try {
        // 1. Scan for opportunities
        const opportunities = await this.scanForOpportunities();
        
        // 2. Filter and select the best opportunity
        const bestOpportunity = this.selectBestOpportunity(opportunities);
        
        if (bestOpportunity) {
          // 3. Execute the opportunity
          const result = await this.executeOpportunity(bestOpportunity);
          
          if (result.success) {
            // Update profit tracking
            this.profitReport.totalProfitETH += result.profitEth;
            this.profitReport.totalProfitGBP = this.profitReport.totalProfitETH * this.ethToGbpRate;
            this.profitReport.transactions++;
            this.profitReport.successRate = 
              (this.profitReport.successRate * (this.profitReport.transactions - 1) + 100) / 
              this.profitReport.transactions;
            this.profitReport.lastExecutionTime = new Date();
            
            console.log(`Executed trade with profit: ${result.profitEth.toFixed(4)} ETH (£${(result.profitEth * this.ethToGbpRate).toFixed(2)})`);
            console.log(`Total profit so far: £${this.profitReport.totalProfitGBP.toFixed(2)}`);
            
            // Record transaction in database
            await this.recordTransaction(bestOpportunity, result);
            
            // If we've reached our target, stop the execution
            if (this.profitReport.totalProfitGBP >= this.targetProfitGBP) {
              console.log(`Target profit of £${this.targetProfitGBP} reached! Stopping execution.`);
              this.stop();
              return this.profitReport;
            }
          }
        }
        
        // Wait before next scan
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error('Error in MEV execution loop:', error);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    return this.profitReport;
  }
  
  // Stop the automated trading
  public stop() {
    this.isRunning = false;
    console.log('Stopping automated MEV trading...');
    return this.profitReport;
  }
  
  // Get current profit report
  public getProfitReport(): ProfitReport {
    return this.profitReport;
  }
  
  // Update ETH to GBP exchange rate
  private async updateEthToGbpRate() {
    try {
      // In a real implementation, this would call a price API
      // For now, we'll use a hard-coded recent price
      this.ethToGbpRate = 2650; // £2,650 per ETH (example value)
      return this.ethToGbpRate;
    } catch (error) {
      console.error('Error updating ETH to GBP rate:', error);
      return this.ethToGbpRate; // Return existing rate on error
    }
  }
  
  // Scan for MEV opportunities
  private async scanForOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      // In a real implementation, this would analyze on-chain data
      // For our demo, we'll use the opportunities from our database
      const response = await fetch('/api/opportunities', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      const opportunities = await response.json();
      
      // Filter for only executable opportunities
      return opportunities.filter((opp: ArbitrageOpportunity) => opp.isExecutable);
    } catch (error) {
      console.error('Error scanning for opportunities:', error);
      return [];
    }
  }
  
  // Select the best opportunity based on expected profit
  private selectBestOpportunity(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity | null {
    if (!opportunities || opportunities.length === 0) return null;
    
    // Sort by highest profit after gas costs
    const sorted = [...opportunities].sort((a, b) => {
      const profitA = parseFloat(a.estimatedProfitEth.toString()) - parseFloat(a.estimatedGasCostEth.toString());
      const profitB = parseFloat(b.estimatedProfitEth.toString()) - parseFloat(b.estimatedGasCostEth.toString());
      return profitB - profitA;
    });
    
    // Get current gas prices and network conditions
    return sorted[0]; // Return the most profitable opportunity
  }
  
  // Execute a specific arbitrage opportunity
  private async executeOpportunity(opportunity: ArbitrageOpportunity) {
    console.log(`Executing ${opportunity.type} opportunity: ${opportunity.pairs}`);
    
    try {
      // For real execution, we would:
      // 1. Create the transaction based on opportunity type
      // 2. Simulate it using a flash-loan simulator
      // 3. Execute with proper slippage protection
      
      // For demo purposes, we'll use our existing API
      const response = await apiRequest('POST', `/api/execute-opportunity/${opportunity.id}`, null);
      
      return {
        success: true,
        txHash: response.transaction.txHash,
        profitEth: parseFloat(response.transaction.profitEth),
        gasCostEth: parseFloat(response.transaction.gasCostEth)
      };
    } catch (error) {
      console.error('Error executing opportunity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Record transaction in the database
  private async recordTransaction(opportunity: ArbitrageOpportunity, result: any) {
    try {
      // Add to bot stats
      await apiRequest('POST', '/api/bot-stats', {
        totalProfitEth: this.profitReport.totalProfitETH.toString(),
        totalTransactions: this.profitReport.transactions,
        successRate: this.profitReport.successRate.toString()
      });
      
      // Transaction is already recorded by the execute-opportunity endpoint
      return true;
    } catch (error) {
      console.error('Error recording transaction:', error);
      return false;
    }
  }
  
  // Calculate wallet balance
  public async getWalletBalance() {
    try {
      const balanceWei = await this.provider.getBalance(this.wallet.address);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei));
      const balanceGbp = balanceEth * this.ethToGbpRate;
      
      return {
        address: this.wallet.address,
        balanceEth,
        balanceGbp,
        ethToGbpRate: this.ethToGbpRate
      };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return {
        address: this.wallet.address,
        balanceEth: 0,
        balanceGbp: 0,
        ethToGbpRate: this.ethToGbpRate,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Create and export a singleton instance
let mevExecutorInstance: MevExecutor | null = null;

export function initMevExecutor() {
  const privateKey = process.env.ETHEREUM_PRIVATE_KEY || '';
  const infuraApiKey = process.env.INFURA_API_KEY || '';
  
  if (!privateKey || !infuraApiKey) {
    console.error('Cannot initialize MevExecutor: missing private key or Infura API key');
    return null;
  }
  
  console.log('Initializing MEV Executor with valid private key and Infura API credentials');
  
  if (!mevExecutorInstance) {
    mevExecutorInstance = new MevExecutor(privateKey, infuraApiKey);
  }
  
  return mevExecutorInstance;
}

export function getMevExecutor() {
  return mevExecutorInstance;
}