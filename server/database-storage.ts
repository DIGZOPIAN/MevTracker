import { db } from "./db";
import {
  users, type User, type InsertUser,
  botSettings, type BotSettings, type InsertBotSettings,
  transactions, type Transaction, type InsertTransaction,
  opportunities, type Opportunity, type InsertOpportunity,
  mempoolActivity, type MempoolActivity, type InsertMempoolActivity,
  blockchainStatus, type BlockchainStatus, type InsertBlockchainStatus,
  botStats, type BotStats, type InsertBotStats
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Bot settings methods
  async getBotSettings(): Promise<BotSettings | undefined> {
    const [settings] = await db.select().from(botSettings).limit(1);
    return settings || undefined;
  }

  async updateBotSettings(settings: Partial<InsertBotSettings>): Promise<BotSettings> {
    const currentSettings = await this.getBotSettings();
    
    if (currentSettings) {
      // Update existing settings
      const [updated] = await db
        .update(botSettings)
        .set({ ...settings, lastUpdated: new Date() })
        .where(eq(botSettings.id, currentSettings.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [newSettings] = await db
        .insert(botSettings)
        .values({
          minProfitThreshold: settings.minProfitThreshold || "0.005",
          maxGasPrice: settings.maxGasPrice || 50,
          strategy: settings.strategy || "arbitrage",
          autoExecute: settings.autoExecute !== undefined ? settings.autoExecute : true,
          runSimulations: settings.runSimulations !== undefined ? settings.runSimulations : true,
        })
        .returning();
      return newSettings;
    }
  }

  // Transaction methods
  async getTransactions(limit?: number): Promise<Transaction[]> {
    const query = db.select().from(transactions).orderBy(transactions.timestamp);
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }

  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  // Opportunity methods
  async getOpportunities(limit?: number): Promise<Opportunity[]> {
    const query = db.select().from(opportunities).orderBy(opportunities.identified);
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }

  async addOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [newOpportunity] = await db
      .insert(opportunities)
      .values(opportunity)
      .returning();
    return newOpportunity;
  }

  async deleteOpportunity(id: number): Promise<boolean> {
    const result = await db
      .delete(opportunities)
      .where(eq(opportunities.id, id))
      .returning();
    return result.length > 0;
  }

  async clearOpportunities(): Promise<void> {
    await db.delete(opportunities);
  }

  // Mempool activity methods
  async getMempoolActivity(limit?: number): Promise<MempoolActivity[]> {
    const query = db.select().from(mempoolActivity).orderBy(mempoolActivity.timestamp);
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }

  async addMempoolActivity(activity: InsertMempoolActivity): Promise<MempoolActivity> {
    const [newActivity] = await db
      .insert(mempoolActivity)
      .values(activity)
      .returning();
    return newActivity;
  }

  async clearMempoolActivity(): Promise<void> {
    await db.delete(mempoolActivity);
  }

  // Blockchain status methods
  async getBlockchainStatus(): Promise<BlockchainStatus | undefined> {
    const [status] = await db.select().from(blockchainStatus).limit(1);
    return status || undefined;
  }

  async updateBlockchainStatus(status: InsertBlockchainStatus): Promise<BlockchainStatus> {
    const currentStatus = await this.getBlockchainStatus();
    
    if (currentStatus) {
      // Update existing status
      const [updated] = await db
        .update(blockchainStatus)
        .set({ ...status, updatedAt: new Date() })
        .where(eq(blockchainStatus.id, currentStatus.id))
        .returning();
      return updated;
    } else {
      // Create new status
      const [newStatus] = await db
        .insert(blockchainStatus)
        .values(status)
        .returning();
      return newStatus;
    }
  }

  // Bot stats methods
  async getBotStats(): Promise<BotStats | undefined> {
    const [stats] = await db.select().from(botStats).limit(1);
    return stats || undefined;
  }

  async updateBotStats(stats: Partial<InsertBotStats>): Promise<BotStats> {
    const currentStats = await this.getBotStats();
    
    if (currentStats) {
      // Update existing stats
      const [updated] = await db
        .update(botStats)
        .set({ ...stats, lastUpdated: new Date() })
        .where(eq(botStats.id, currentStats.id))
        .returning();
      return updated;
    } else {
      // Create new stats
      const [newStats] = await db
        .insert(botStats)
        .values({
          totalProfitEth: stats.totalProfitEth || "0",
          totalTransactions: stats.totalTransactions || 0,
          totalGasSpentEth: stats.totalGasSpentEth || "0",
          successRate: stats.successRate || "0",
        })
        .returning();
      return newStats;
    }
  }
  
  // Initialize the database with some initial data
  async initializeData(): Promise<void> {
    // Check if we already have data
    const existingSettings = await this.getBotSettings();
    
    if (!existingSettings) {
      // Add initial bot settings
      await this.updateBotSettings({
        minProfitThreshold: "0.005",
        maxGasPrice: 50,
        strategy: "arbitrage",
        autoExecute: true,
        runSimulations: true
      });
      
      // Add initial bot stats
      await this.updateBotStats({
        totalProfitEth: "3.45",
        totalTransactions: 28,
        totalGasSpentEth: "0.78",
        successRate: "92.5"
      });
      
      // Add initial blockchain status
      await this.updateBlockchainStatus({
        pendingTransactions: 347,
        gasPrice: "23.4",
        networkCongestion: "Medium"
      });
      
      // Add some sample transactions
      await this.addTransaction({
        txHash: "0x7a8f...3e2d",
        type: "Triangular",
        pairs: "ETH → USDC → WBTC → ETH",
        profitEth: "0.0213",
        gasCostEth: "0.0041",
        status: "Confirmed"
      });
      
      await this.addTransaction({
        txHash: "0x4e2a...9f7b",
        type: "DEX",
        pairs: "USDT(Uniswap) → USDT(SushiSwap)",
        profitEth: "0.0098",
        gasCostEth: "0.0038",
        status: "Confirmed"
      });
      
      // Add a sample mempool activity
      await this.addMempoolActivity({
        message: "Detected swap: 500 ETH → USDT on Uniswap",
        type: "swap"
      });
      
      // Add some sample opportunities
      const opportunities = [
        {
          type: "Triangular",
          pairs: "ETH → USDC → WBTC → ETH",
          estimatedProfitEth: "0.0213",
          estimatedGasCostEth: "0.0041",
          isExecutable: true
        },
        {
          type: "DEX",
          pairs: "USDT(Uniswap) → USDT(SushiSwap)",
          estimatedProfitEth: "0.0098",
          estimatedGasCostEth: "0.0038",
          isExecutable: true
        },
        {
          type: "Triangular",
          pairs: "ETH → USDT → DAI → ETH",
          estimatedProfitEth: "-0.0008",
          estimatedGasCostEth: "0.0045",
          isExecutable: false
        },
        {
          type: "Flash Loan",
          pairs: "AAVE → Uniswap → Compound",
          estimatedProfitEth: "0.0412",
          estimatedGasCostEth: "0.0158",
          isExecutable: true
        }
      ];
      
      for (const opp of opportunities) {
        await this.addOpportunity(opp);
      }
    }
  }
}