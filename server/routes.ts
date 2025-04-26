import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertBotSettingsSchema,
  insertBlockchainStatusSchema,
  insertBotStatsSchema,
  insertOpportunitySchema,
  insertTransactionSchema,
  insertMempoolActivitySchema
} from "@shared/schema";
// import { WebSocketServer, WebSocket } from 'ws';

// Helper to validate request body
function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

// Class to manage MEV execution state
class MevExecutionManager {
  private isRunning: boolean = false;
  private profit: number = 0;
  private transactions: number = 0;
  private startTime?: Date;
  private targetProfit: number = 20; // £20 default
  
  startExecution(targetProfit?: number) {
    if (this.isRunning) return { success: false, message: "Execution already running" };
    
    this.isRunning = true;
    this.profit = 0;
    this.transactions = 0;
    this.startTime = new Date();
    
    if (targetProfit) this.targetProfit = targetProfit;
    
    return { 
      success: true, 
      message: `Started MEV execution with target profit of £${this.targetProfit}`,
      startTime: this.startTime
    };
  }
  
  stopExecution() {
    if (!this.isRunning) return { success: false, message: "No execution currently running" };
    
    this.isRunning = false;
    
    return { 
      success: true, 
      message: "Stopped MEV execution",
      stats: this.getStats()
    };
  }
  
  recordProfit(amount: number) {
    this.profit += amount;
    this.transactions++;
    
    const targetReached = this.profit >= this.targetProfit;
    if (targetReached) {
      this.isRunning = false;
    }
    
    return { 
      success: true,
      targetReached,
      currentProfit: this.profit,
      transactions: this.transactions
    };
  }
  
  getStats() {
    return {
      isRunning: this.isRunning,
      profit: this.profit,
      transactions: this.transactions,
      startTime: this.startTime,
      targetProfit: this.targetProfit,
      percentComplete: this.targetProfit > 0 ? (this.profit / this.targetProfit) * 100 : 0
    };
  }
}

// Create a singleton instance
const mevManager = new MevExecutionManager();

export async function registerRoutes(app: Express): Promise<Server> {
  // MEV auto-execution endpoints
  app.post('/api/mev/start', async (req, res) => {
    try {
      const targetProfit = req.body?.targetProfit;
      const result = mevManager.startExecution(targetProfit);
      res.json(result);
      
      // If we had actual execution, we'd start it here
      // For demo purposes, we'll simulate it with automated opportunity execution
      if (result.success) {
        // Start execution in background
        executeOpportunitiesUntilTarget(mevManager).catch(console.error);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start MEV execution" });
    }
  });
  
  // Execute a specific opportunity
  app.post('/api/execute-opportunity/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const opportunities = await storage.getOpportunities();
      const opportunity = opportunities.find(opp => opp.id === id);
      
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      // Execute the opportunity (in a real system this would use the wallet)
      const txHash = `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;
      
      // Record the transaction
      const transaction = await storage.addTransaction({
        txHash,
        type: opportunity.type,
        pairs: opportunity.pairs,
        profitEth: opportunity.estimatedProfitEth as string,
        gasCostEth: opportunity.estimatedGasCostEth as string,
        status: "Confirmed"
      });
      
      // Remove the executed opportunity
      await storage.deleteOpportunity(id);
      
      // Add mempool activity
      await storage.addMempoolActivity({
        message: `Executed ${opportunity.type} arbitrage: ${opportunity.pairs} - Profit: ${opportunity.estimatedProfitEth} ETH`,
        type: "execution"
      });
      
      // Return the result
      res.json({
        success: true,
        transaction,
        message: `Successfully executed ${opportunity.type} arbitrage opportunity`
      });
    } catch (error) {
      console.error("Error executing opportunity:", error);
      res.status(500).json({ error: "Failed to execute opportunity" });
    }
  });
  
  app.post('/api/mev/stop', async (req, res) => {
    try {
      const result = mevManager.stopExecution();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to stop MEV execution" });
    }
  });
  
  app.get('/api/mev/status', async (req, res) => {
    try {
      const stats = mevManager.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get MEV execution status" });
    }
  });
  
  // Helper function to execute opportunities until target is reached
  async function executeOpportunitiesUntilTarget(manager: MevExecutionManager) {
    const stats = manager.getStats();
    if (!stats.isRunning) return;
    
    try {
      // Get current opportunities
      const opportunities = await storage.getOpportunities();
      const executableOpps = opportunities.filter(o => o.isExecutable);
      
      if (executableOpps.length > 0) {
        // Execute the most profitable opportunity
        const bestOpp = executableOpps.sort((a, b) => {
          const profitA = parseFloat(a.estimatedProfitEth as string) - parseFloat(a.estimatedGasCostEth as string);
          const profitB = parseFloat(b.estimatedProfitEth as string) - parseFloat(b.estimatedGasCostEth as string);
          return profitB - profitA;
        })[0];
        
        // Execute it
        const transaction = await storage.addTransaction({
          txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
          type: bestOpp.type,
          pairs: bestOpp.pairs,
          profitEth: bestOpp.estimatedProfitEth as string,
          gasCostEth: bestOpp.estimatedGasCostEth as string,
          status: "Confirmed"
        });
        
        // Convert profit to GBP (using approximate exchange rate)
        const ethToGbpRate = 2650; // £2,650 per ETH (example rate)
        const profitGbp = parseFloat(transaction.profitEth) * ethToGbpRate;
        
        // Record profit and check if target reached
        const result = manager.recordProfit(profitGbp);
        
        // Remove the executed opportunity
        await storage.deleteOpportunity(bestOpp.id);
        
        // Add mempool activity
        await storage.addMempoolActivity({
          message: `Executed ${bestOpp.type} arbitrage: ${bestOpp.pairs} - Profit: £${profitGbp.toFixed(2)}`,
          type: "execution"
        });
        
        console.log(`Executed opportunity with profit: £${profitGbp.toFixed(2)}`);
        console.log(`Progress: £${result.currentProfit.toFixed(2)} / £${stats.targetProfit} (${(result.currentProfit / stats.targetProfit * 100).toFixed(2)}%)`);
        
        // If target not reached, wait and continue
        if (!result.targetReached) {
          // Generate a new opportunity to replace the one we just executed
          await generateRandomOpportunity();
          
          // Wait between executions
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Continue execution
          executeOpportunitiesUntilTarget(manager);
        } else {
          console.log(`Target profit of £${stats.targetProfit} reached! Execution complete.`);
          
          // Update bot stats
          const currentStats = await storage.getBotStats();
          if (currentStats) {
            const totalProfit = parseFloat(currentStats.totalProfitEth) + 
              result.currentProfit / ethToGbpRate; // Convert GBP back to ETH
            
            await storage.updateBotStats({
              totalProfitEth: totalProfit.toString(),
              totalTransactions: currentStats.totalTransactions + result.transactions,
              successRate: "100" // All successful for this run
            });
          }
        }
      } else {
        // No opportunities, generate some and try again
        await generateRandomOpportunity();
        await new Promise(resolve => setTimeout(resolve, 3000));
        executeOpportunitiesUntilTarget(manager);
      }
    } catch (error) {
      console.error('Error in MEV execution:', error);
      
      // Wait and try again if still running
      if (manager.getStats().isRunning) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        executeOpportunitiesUntilTarget(manager);
      }
    }
  }
  
  // Helper to generate random opportunities for testing
  async function generateRandomOpportunity() {
    const types = ['Triangular', 'DEX', 'Flash Loan'];
    const pairs = [
      'ETH → USDC → WBTC → ETH',
      'ETH → DAI → USDT → ETH',
      'USDT(Uniswap) → USDT(SushiSwap)',
      'WBTC(Uniswap) → WBTC(Balancer)',
      'AAVE → Uniswap → Compound',
      'Maker → Curve → Aave → Maker'
    ];
    
    // Generate a profit between 0.008 and 0.045 ETH
    const profit = (Math.random() * 0.037 + 0.008).toFixed(4);
    // Gas cost between 0.003 and 0.016 ETH
    const gasCost = (Math.random() * 0.013 + 0.003).toFixed(4);
    
    const opportunity = {
      type: types[Math.floor(Math.random() * types.length)],
      pairs: pairs[Math.floor(Math.random() * pairs.length)],
      estimatedProfitEth: profit,
      estimatedGasCostEth: gasCost,
      isExecutable: true
    };
    
    await storage.addOpportunity(opportunity);
    return opportunity;
  }
  // GET bot settings
  app.get('/api/bot-settings', async (req, res) => {
    try {
      const settings = await storage.getBotSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bot settings" });
    }
  });

  // UPDATE bot settings
  app.post('/api/bot-settings', async (req, res) => {
    try {
      const updateData = validateBody(
        insertBotSettingsSchema.partial(),
        req.body
      );
      const updatedSettings = await storage.updateBotSettings(updateData);
      res.json(updatedSettings);
    } catch (error) {
      res.status(400).json({ error: "Invalid settings data" });
    }
  });

  // GET transactions
  app.get('/api/transactions', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // ADD transaction
  app.post('/api/transactions', async (req, res) => {
    try {
      const transactionData = validateBody(insertTransactionSchema, req.body);
      const transaction = await storage.addTransaction(transactionData);
      
      // Update bot stats
      const currentStats = await storage.getBotStats();
      if (currentStats) {
        const totalTransactions = currentStats.totalTransactions + 1;
        const totalProfitEth = String(Number(currentStats.totalProfitEth) + Number(transaction.profitEth));
        const totalGasSpentEth = String(Number(currentStats.totalGasSpentEth) + Number(transaction.gasCostEth));
        
        // Calculate success rate
        const successfulTxs = transaction.status === "Confirmed" ? 1 : 0;
        const newSuccessRate = String(((Number(currentStats.successRate) * (totalTransactions - 1)) + (successfulTxs * 100)) / totalTransactions);
        
        await storage.updateBotStats({
          totalTransactions,
          totalProfitEth,
          totalGasSpentEth,
          successRate: newSuccessRate
        });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  // GET opportunities
  app.get('/api/opportunities', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const opportunities = await storage.getOpportunities(limit);
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  // ADD opportunity
  app.post('/api/opportunities', async (req, res) => {
    try {
      const opportunityData = validateBody(insertOpportunitySchema, req.body);
      const opportunity = await storage.addOpportunity(opportunityData);
      res.json(opportunity);
    } catch (error) {
      res.status(400).json({ error: "Invalid opportunity data" });
    }
  });

  // DELETE opportunity
  app.delete('/api/opportunities/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteOpportunity(id);
      if (result) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Opportunity not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete opportunity" });
    }
  });

  // GET mempool activity
  app.get('/api/mempool-activity', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activity = await storage.getMempoolActivity(limit);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mempool activity" });
    }
  });

  // ADD mempool activity
  app.post('/api/mempool-activity', async (req, res) => {
    try {
      const activityData = validateBody(insertMempoolActivitySchema, req.body);
      const activity = await storage.addMempoolActivity(activityData);
      res.json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid mempool activity data" });
    }
  });
  
  // Generate new opportunities for testing and simulation
  app.post('/api/simulate/generate-opportunities', async (req, res) => {
    try {
      // Clear existing opportunities
      await storage.clearOpportunities();
      
      // Generate 4-8 new opportunities
      const count = Math.floor(Math.random() * 5) + 4;
      const createdOpportunities = [];
      
      for (let i = 0; i < count; i++) {
        const types = ['Triangular', 'DEX', 'Flash Loan'];
        const pairs = [
          'ETH → USDC → WBTC → ETH',
          'ETH → DAI → USDT → ETH',
          'USDT(Uniswap) → USDT(SushiSwap)',
          'WBTC(Uniswap) → WBTC(Balancer)',
          'AAVE → Uniswap → Compound',
          'Maker → Curve → Aave → Maker'
        ];
        
        // Generate a profit between 0.008 and 0.045 ETH
        const profit = (Math.random() * 0.037 + 0.008).toFixed(4);
        // Gas cost between 0.003 and 0.016 ETH
        const gasCost = (Math.random() * 0.013 + 0.003).toFixed(4);
        
        const opp = {
          type: types[Math.floor(Math.random() * types.length)],
          pairs: pairs[Math.floor(Math.random() * pairs.length)],
          estimatedProfitEth: profit,
          estimatedGasCostEth: gasCost,
          isExecutable: Math.random() > 0.3 // 70% executable
        };
        
        createdOpportunities.push(await storage.addOpportunity(opp));
      }
      
      res.json({ 
        success: true, 
        count: createdOpportunities.length,
        opportunities: createdOpportunities 
      });
    } catch (error) {
      console.error("Error generating opportunities:", error);
      res.status(500).json({ error: "Failed to generate opportunities" });
    }
  });

  // GET blockchain status
  app.get('/api/blockchain-status', async (req, res) => {
    try {
      const status = await storage.getBlockchainStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blockchain status" });
    }
  });

  // UPDATE blockchain status
  app.post('/api/blockchain-status', async (req, res) => {
    try {
      const statusData = validateBody(insertBlockchainStatusSchema, req.body);
      const status = await storage.updateBlockchainStatus(statusData);
      res.json(status);
    } catch (error) {
      res.status(400).json({ error: "Invalid blockchain status data" });
    }
  });

  // GET bot stats
  app.get('/api/bot-stats', async (req, res) => {
    try {
      const stats = await storage.getBotStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bot stats" });
    }
  });

  // UPDATE bot stats
  app.post('/api/bot-stats', async (req, res) => {
    try {
      const statsData = validateBody(insertBotStatsSchema.partial(), req.body);
      const stats = await storage.updateBotStats(statsData);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ error: "Invalid bot stats data" });
    }
  });

  // EXECUTE opportunity
  app.post('/api/execute-opportunity/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const opportunities = await storage.getOpportunities();
      const opportunity = opportunities.find(o => o.id === id);
      
      if (!opportunity) {
        return res.status(404).json({ error: "Opportunity not found" });
      }
      
      if (!opportunity.isExecutable) {
        return res.status(400).json({ error: "Opportunity is not executable" });
      }
      
      // Success case - add a transaction
      const transaction = await storage.addTransaction({
        txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
        type: opportunity.type,
        pairs: opportunity.pairs,
        profitEth: opportunity.estimatedProfitEth,
        gasCostEth: opportunity.estimatedGasCostEth,
        status: "Confirmed"
      });
      
      // Remove the opportunity
      await storage.deleteOpportunity(id);
      
      // Add mempool activity
      await storage.addMempoolActivity({
        message: `Executed ${opportunity.type} arbitrage: ${opportunity.pairs}`,
        type: "execution"
      });
      
      res.json({ 
        success: true, 
        transaction
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to execute opportunity" });
    }
  });

  // SIMULATE opportunity generation (for demo)
  app.post('/api/simulate/generate-opportunities', async (req, res) => {
    try {
      // Clear existing opportunities first
      await storage.clearOpportunities();
      
      // Generate new opportunities
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
      
      const createdOpportunities = [];
      for (const opp of opportunities) {
        createdOpportunities.push(await storage.addOpportunity(opp));
      }
      
      res.json({ 
        success: true, 
        opportunities: createdOpportunities 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate opportunities" });
    }
  });

  // SIMULATE mempool events (for demo)
  app.post('/api/simulate/mempool-events', async (req, res) => {
    try {
      // Add new mempool activity
      const activity = await storage.addMempoolActivity({
        message: `Detected swap: ${Math.floor(Math.random() * 1000)} ETH → USDT on Uniswap`,
        type: "swap"
      });
      
      res.json({ 
        success: true, 
        activity 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to simulate mempool events" });
    }
  });

  // Create server
  const httpServer = createServer(app);
  
  // For now, let's disable WebSockets to avoid conflicts with Vite's WebSocket server
  // We'll implement proper WebSocket functionality later if needed
  console.log("WebSocket functionality is currently disabled to avoid conflicts with Vite");

  return httpServer;
}
