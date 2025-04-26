import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Bot settings
export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  minProfitThreshold: decimal("min_profit_threshold").notNull().default("0.005"),
  maxGasPrice: integer("max_gas_price").notNull().default(50),
  strategy: text("strategy").notNull().default("arbitrage"),
  autoExecute: boolean("auto_execute").notNull().default(true),
  runSimulations: boolean("run_simulations").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({
  id: true,
  lastUpdated: true,
});

export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettings.$inferSelect;

// Transaction data
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  txHash: text("tx_hash").notNull(),
  type: text("type").notNull(),
  pairs: text("pairs").notNull(),
  profitEth: decimal("profit_eth").notNull(),
  gasCostEth: decimal("gas_cost_eth").notNull(),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  timestamp: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Arbitrage opportunities
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  pairs: text("pairs").notNull(),
  estimatedProfitEth: decimal("estimated_profit_eth").notNull(),
  estimatedGasCostEth: decimal("estimated_gas_cost_eth").notNull(),
  isExecutable: boolean("is_executable").notNull(),
  identified: timestamp("identified").notNull().defaultNow(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  identified: true,
});

export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunities.$inferSelect;

// Mempool activity
export const mempoolActivity = pgTable("mempool_activity", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMempoolActivitySchema = createInsertSchema(mempoolActivity).omit({
  id: true,
  timestamp: true,
});

export type InsertMempoolActivity = z.infer<typeof insertMempoolActivitySchema>;
export type MempoolActivity = typeof mempoolActivity.$inferSelect;

// Blockchain status
export const blockchainStatus = pgTable("blockchain_status", {
  id: serial("id").primaryKey(),
  pendingTransactions: integer("pending_transactions").notNull(),
  gasPrice: decimal("gas_price").notNull(),
  networkCongestion: text("network_congestion").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBlockchainStatusSchema = createInsertSchema(blockchainStatus).omit({
  id: true,
  updatedAt: true,
});

export type InsertBlockchainStatus = z.infer<typeof insertBlockchainStatusSchema>;
export type BlockchainStatus = typeof blockchainStatus.$inferSelect;

// Bot stats
export const botStats = pgTable("bot_stats", {
  id: serial("id").primaryKey(),
  totalProfitEth: decimal("total_profit_eth").notNull().default("0"),
  totalTransactions: integer("total_transactions").notNull().default(0),
  totalGasSpentEth: decimal("total_gas_spent_eth").notNull().default("0"),
  successRate: decimal("success_rate").notNull().default("0"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertBotStatsSchema = createInsertSchema(botStats).omit({
  id: true,
  lastUpdated: true,
});

export type InsertBotStats = z.infer<typeof insertBotStatsSchema>;
export type BotStats = typeof botStats.$inferSelect;
