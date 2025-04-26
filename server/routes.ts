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

export async function registerRoutes(app: Express): Promise<Server> {
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
