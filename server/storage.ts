import {
  users, type User, type InsertUser,
  botSettings, type BotSettings, type InsertBotSettings,
  transactions, type Transaction, type InsertTransaction,
  opportunities, type Opportunity, type InsertOpportunity,
  mempoolActivity, type MempoolActivity, type InsertMempoolActivity,
  blockchainStatus, type BlockchainStatus, type InsertBlockchainStatus,
  botStats, type BotStats, type InsertBotStats
} from "@shared/schema";

// Storage interface with all CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Bot settings methods
  getBotSettings(): Promise<BotSettings | undefined>;
  updateBotSettings(settings: Partial<InsertBotSettings>): Promise<BotSettings>;
  
  // Transaction methods
  getTransactions(limit?: number): Promise<Transaction[]>;
  addTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Opportunity methods
  getOpportunities(limit?: number): Promise<Opportunity[]>;
  addOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  deleteOpportunity(id: number): Promise<boolean>;
  clearOpportunities(): Promise<void>;
  
  // Mempool activity methods
  getMempoolActivity(limit?: number): Promise<MempoolActivity[]>;
  addMempoolActivity(activity: InsertMempoolActivity): Promise<MempoolActivity>;
  clearMempoolActivity(): Promise<void>;
  
  // Blockchain status methods
  getBlockchainStatus(): Promise<BlockchainStatus | undefined>;
  updateBlockchainStatus(status: InsertBlockchainStatus): Promise<BlockchainStatus>;
  
  // Bot stats methods
  getBotStats(): Promise<BotStats | undefined>;
  updateBotStats(stats: Partial<InsertBotStats>): Promise<BotStats>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private botSettingsData: BotSettings | undefined;
  private transactionsData: Transaction[];
  private opportunitiesData: Opportunity[];
  private mempoolActivityData: MempoolActivity[];
  private blockchainStatusData: BlockchainStatus | undefined;
  private botStatsData: BotStats | undefined;
  
  private currentUserId: number;
  private currentTransactionId: number;
  private currentOpportunityId: number;
  private currentMempoolActivityId: number;
  private currentBlockchainStatusId: number;
  private currentBotStatsId: number;

  constructor() {
    this.users = new Map();
    this.transactionsData = [];
    this.opportunitiesData = [];
    this.mempoolActivityData = [];
    
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.currentOpportunityId = 1;
    this.currentMempoolActivityId = 1;
    this.currentBlockchainStatusId = 1;
    this.currentBotStatsId = 1;
    
    // Initialize default bot settings
    this.botSettingsData = {
      id: this.currentBlockchainStatusId++,
      minProfitThreshold: 0.005,
      maxGasPrice: 50,
      strategy: "arbitrage",
      autoExecute: true,
      runSimulations: true,
      lastUpdated: new Date(),
    };
    
    // Initialize default blockchain status
    this.blockchainStatusData = {
      id: this.currentBlockchainStatusId++,
      pendingTransactions: 347,
      gasPrice: 23.4,
      networkCongestion: "Medium",
      updatedAt: new Date(),
    };
    
    // Initialize default bot stats
    this.botStatsData = {
      id: this.currentBotStatsId++,
      totalProfitEth: 3.45,
      totalTransactions: 247,
      totalGasSpentEth: 0.87,
      successRate: 93.2,
      lastUpdated: new Date(),
    };
    
    // Add some initial demo data
    this.addInitialData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Bot settings methods
  async getBotSettings(): Promise<BotSettings | undefined> {
    return this.botSettingsData;
  }
  
  async updateBotSettings(settings: Partial<InsertBotSettings>): Promise<BotSettings> {
    if (!this.botSettingsData) {
      this.botSettingsData = {
        id: this.currentBlockchainStatusId++,
        minProfitThreshold: settings.minProfitThreshold || 0.005,
        maxGasPrice: settings.maxGasPrice || 50,
        strategy: settings.strategy || "arbitrage",
        autoExecute: settings.autoExecute !== undefined ? settings.autoExecute : true,
        runSimulations: settings.runSimulations !== undefined ? settings.runSimulations : true,
        lastUpdated: new Date(),
      };
    } else {
      this.botSettingsData = {
        ...this.botSettingsData,
        ...(settings.minProfitThreshold !== undefined && { minProfitThreshold: settings.minProfitThreshold }),
        ...(settings.maxGasPrice !== undefined && { maxGasPrice: settings.maxGasPrice }),
        ...(settings.strategy !== undefined && { strategy: settings.strategy }),
        ...(settings.autoExecute !== undefined && { autoExecute: settings.autoExecute }),
        ...(settings.runSimulations !== undefined && { runSimulations: settings.runSimulations }),
        lastUpdated: new Date(),
      };
    }
    return this.botSettingsData;
  }
  
  // Transaction methods
  async getTransactions(limit?: number): Promise<Transaction[]> {
    if (limit) {
      return this.transactionsData.slice(0, limit);
    }
    return this.transactionsData;
  }
  
  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const newTransaction: Transaction = {
      ...transaction,
      id: this.currentTransactionId++,
      timestamp: new Date(),
    };
    this.transactionsData.unshift(newTransaction); // Add to the beginning of the array
    return newTransaction;
  }
  
  // Opportunity methods
  async getOpportunities(limit?: number): Promise<Opportunity[]> {
    if (limit) {
      return this.opportunitiesData.slice(0, limit);
    }
    return this.opportunitiesData;
  }
  
  async addOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const newOpportunity: Opportunity = {
      ...opportunity,
      id: this.currentOpportunityId++,
      identified: new Date(),
    };
    this.opportunitiesData.push(newOpportunity);
    return newOpportunity;
  }
  
  async deleteOpportunity(id: number): Promise<boolean> {
    const initialLength = this.opportunitiesData.length;
    this.opportunitiesData = this.opportunitiesData.filter(opportunity => opportunity.id !== id);
    return initialLength > this.opportunitiesData.length;
  }
  
  async clearOpportunities(): Promise<void> {
    this.opportunitiesData = [];
  }
  
  // Mempool activity methods
  async getMempoolActivity(limit?: number): Promise<MempoolActivity[]> {
    if (limit) {
      return this.mempoolActivityData.slice(0, limit);
    }
    return this.mempoolActivityData;
  }
  
  async addMempoolActivity(activity: InsertMempoolActivity): Promise<MempoolActivity> {
    const newActivity: MempoolActivity = {
      ...activity,
      id: this.currentMempoolActivityId++,
      timestamp: new Date(),
    };
    this.mempoolActivityData.unshift(newActivity); // Add to the beginning of the array
    return newActivity;
  }
  
  async clearMempoolActivity(): Promise<void> {
    this.mempoolActivityData = [];
  }
  
  // Blockchain status methods
  async getBlockchainStatus(): Promise<BlockchainStatus | undefined> {
    return this.blockchainStatusData;
  }
  
  async updateBlockchainStatus(status: InsertBlockchainStatus): Promise<BlockchainStatus> {
    if (!this.blockchainStatusData) {
      this.blockchainStatusData = {
        id: this.currentBlockchainStatusId++,
        ...status,
        updatedAt: new Date(),
      };
    } else {
      this.blockchainStatusData = {
        ...this.blockchainStatusData,
        ...status,
        updatedAt: new Date(),
      };
    }
    return this.blockchainStatusData;
  }
  
  // Bot stats methods
  async getBotStats(): Promise<BotStats | undefined> {
    return this.botStatsData;
  }
  
  async updateBotStats(stats: Partial<InsertBotStats>): Promise<BotStats> {
    if (!this.botStatsData) {
      this.botStatsData = {
        id: this.currentBotStatsId++,
        totalProfitEth: stats.totalProfitEth !== undefined ? stats.totalProfitEth : 0,
        totalTransactions: stats.totalTransactions !== undefined ? stats.totalTransactions : 0,
        totalGasSpentEth: stats.totalGasSpentEth !== undefined ? stats.totalGasSpentEth : 0,
        successRate: stats.successRate !== undefined ? stats.successRate : 0,
        lastUpdated: new Date(),
      };
    } else {
      this.botStatsData = {
        ...this.botStatsData,
        ...(stats.totalProfitEth !== undefined && { totalProfitEth: stats.totalProfitEth }),
        ...(stats.totalTransactions !== undefined && { totalTransactions: stats.totalTransactions }),
        ...(stats.totalGasSpentEth !== undefined && { totalGasSpentEth: stats.totalGasSpentEth }),
        ...(stats.successRate !== undefined && { successRate: stats.successRate }),
        lastUpdated: new Date(),
      };
    }
    return this.botStatsData;
  }
  
  // Helper to add initial demo data
  private addInitialData() {
    // Add some sample transactions
    this.transactionsData = [
      {
        id: this.currentTransactionId++,
        txHash: "0x7a8f...3e2d",
        type: "Triangular",
        pairs: "ETH → USDC → WBTC → ETH",
        profitEth: 0.0214,
        gasCostEth: 0.0041,
        status: "Confirmed",
        timestamp: new Date(Date.now() - 60000), // 1 min ago
      },
      {
        id: this.currentTransactionId++,
        txHash: "0x3c2e...9f71",
        type: "DEX",
        pairs: "USDT(Uniswap) → USDT(SushiSwap)",
        profitEth: 0.0087,
        gasCostEth: 0.0038,
        status: "Confirmed",
        timestamp: new Date(Date.now() - 300000), // 5 mins ago
      },
      {
        id: this.currentTransactionId++,
        txHash: "0x9e5f...1a2b",
        type: "Flash Loan",
        pairs: "AAVE → Uniswap → Compound",
        profitEth: -0.0031,
        gasCostEth: 0.0158,
        status: "Price Changed",
        timestamp: new Date(Date.now() - 1080000), // 18 mins ago
      },
      {
        id: this.currentTransactionId++,
        txHash: "0x1d7b...8c3a",
        type: "Triangular",
        pairs: "ETH → USDT → DAI → ETH",
        profitEth: 0.0324,
        gasCostEth: 0.0045,
        status: "Confirmed",
        timestamp: new Date(Date.now() - 2040000), // 34 mins ago
      }
    ];
    
    // Add sample opportunities
    this.opportunitiesData = [
      {
        id: this.currentOpportunityId++,
        type: "Triangular",
        pairs: "ETH → USDC → WBTC → ETH",
        estimatedProfitEth: 0.0213,
        estimatedGasCostEth: 0.0041,
        isExecutable: true,
        identified: new Date(),
      },
      {
        id: this.currentOpportunityId++,
        type: "DEX",
        pairs: "USDT(Uniswap) → USDT(SushiSwap)",
        estimatedProfitEth: 0.0098,
        estimatedGasCostEth: 0.0038,
        isExecutable: true,
        identified: new Date(),
      },
      {
        id: this.currentOpportunityId++,
        type: "Triangular",
        pairs: "ETH → USDT → DAI → ETH",
        estimatedProfitEth: -0.0008,
        estimatedGasCostEth: 0.0045,
        isExecutable: false,
        identified: new Date(),
      },
      {
        id: this.currentOpportunityId++,
        type: "Flash Loan",
        pairs: "AAVE → Uniswap → Compound",
        estimatedProfitEth: 0.0412,
        estimatedGasCostEth: 0.0158,
        isExecutable: true,
        identified: new Date(),
      }
    ];
    
    // Add sample mempool activity
    this.mempoolActivityData = [
      {
        id: this.currentMempoolActivityId++,
        message: "Detected swap: 500 ETH → USDT on Uniswap",
        type: "swap",
        timestamp: new Date(Date.now() - 5000), // 5 seconds ago
      },
      {
        id: this.currentMempoolActivityId++,
        message: "Opportunity found: ETH→USDC→WBTC (+0.0213 ETH)",
        type: "opportunity",
        timestamp: new Date(Date.now() - 9000), // 9 seconds ago
      },
      {
        id: this.currentMempoolActivityId++,
        message: "Scanning blocks: 15243782 to 15243785",
        type: "scan",
        timestamp: new Date(Date.now() - 22000), // 22 seconds ago
      },
      {
        id: this.currentMempoolActivityId++,
        message: "Price impact too high: Skipping DAI→WETH swap",
        type: "error",
        timestamp: new Date(Date.now() - 34000), // 34 seconds ago
      },
      {
        id: this.currentMempoolActivityId++,
        message: "Detected swap: 1200 USDC → ETH on SushiSwap",
        type: "swap",
        timestamp: new Date(Date.now() - 40000), // 40 seconds ago
      }
    ];
  }
}

import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();
