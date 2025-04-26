import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import StatusCard from "@/components/status-card";
import LiveOpportunities from "@/components/live-opportunities";
import TransactionHistory from "@/components/transaction-history";
import MempoolMonitor from "@/components/mempool-monitor";
import BotSettings from "@/components/bot-settings";
import { MevAutomation } from "@/components/mev-automation";
import { getBlockchainStatus } from "@/lib/ethereum";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins, Ticket, Fuel, PieChart } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { toast } = useToast();
  const [network, setNetwork] = useState("Ethereum Mainnet");
  const [isRunning] = useState(true);
  
  // Query bot settings
  const settingsQuery = useQuery({
    queryKey: ['/api/bot-settings'],
    queryFn: async () => {
      const response = await fetch('/api/bot-settings', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    }
  });
  
  // Query bot stats
  const statsQuery = useQuery({
    queryKey: ['/api/bot-stats'],
    queryFn: async () => {
      const response = await fetch('/api/bot-stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });
  
  // Query opportunities
  const opportunitiesQuery = useQuery({
    queryKey: ['/api/opportunities'],
    queryFn: async () => {
      const response = await fetch('/api/opportunities', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  // Query transactions
  const transactionsQuery = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const response = await fetch('/api/transactions', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  // Query blockchain status
  const blockchainStatusQuery = useQuery({
    queryKey: ['/api/blockchain-status'],
    queryFn: async () => {
      const response = await fetch('/api/blockchain-status', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch blockchain status');
      return response.json();
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });
  
  // Query mempool activity
  const mempoolActivityQuery = useQuery({
    queryKey: ['/api/mempool-activity'],
    queryFn: async () => {
      const response = await fetch('/api/mempool-activity?limit=10', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch mempool activity');
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
  
  // Function to update blockchain status
  const updateBlockchainStatus = async () => {
    try {
      const status = await getBlockchainStatus();
      // Convert numbers to strings for the API
      const formattedStatus = {
        pendingTransactions: status.pendingTransactions,
        gasPrice: status.gasPrice.toString(),
        networkCongestion: status.networkCongestion
      };
      await apiRequest('POST', '/api/blockchain-status', formattedStatus);
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain-status'] });
    } catch (error) {
      console.error('Failed to update blockchain status:', error);
    }
  };
  
  // Update blockchain status periodically
  useEffect(() => {
    // Initial update
    updateBlockchainStatus();
    
    // Set up interval to update blockchain status
    const interval = setInterval(() => {
      updateBlockchainStatus();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Generate new opportunities for demo
  const generateOpportunities = async () => {
    try {
      await apiRequest('POST', '/api/simulate/generate-opportunities', undefined);
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      toast({
        title: "Opportunities Generated",
        description: "New arbitrage opportunities have been found."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate opportunities",
        variant: "destructive"
      });
    }
  };
  
  // Generate initial opportunities on load
  useEffect(() => {
    if (opportunitiesQuery.data && opportunitiesQuery.data.length === 0) {
      generateOpportunities();
    }
  }, [opportunitiesQuery.data]);
  
  const updateAutoExecute = async (value: boolean) => {
    if (settingsQuery.data) {
      await apiRequest('POST', '/api/bot-settings', { autoExecute: value });
      queryClient.invalidateQueries({ queryKey: ['/api/bot-settings'] });
      toast({
        title: value ? "Auto Execute Enabled" : "Auto Execute Disabled",
        description: value ? "Bot will automatically execute profitable trades." : "Bot requires manual confirmation for trades."
      });
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isRunning={isRunning} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header network={network} setNetwork={setNetwork} />
        
        <main className="flex-1 overflow-y-auto p-6 bg-neutral-lightest dark:bg-slate-950">
          {/* Status Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatusCard
              title="Total Profit"
              value={statsQuery.data ? `${statsQuery.data.totalProfitEth} ETH` : "--"}
              change="+0.12 ETH (24h)"
              icon={Coins}
              isPositive={true}
            />
            
            <StatusCard
              title="Transactions"
              value={statsQuery.data ? statsQuery.data.totalTransactions : "--"}
              change="+18 (24h)"
              icon={Ticket}
              isPositive={true}
            />
            
            <StatusCard
              title="Gas Spent"
              value={statsQuery.data ? `${statsQuery.data.totalGasSpentEth} ETH` : "--"}
              change="+0.05 ETH (24h)"
              icon={Fuel}
              isPositive={false}
            />
            
            <StatusCard
              title="Success Rate"
              value={statsQuery.data ? `${parseFloat(statsQuery.data.successRate).toFixed(1)}%` : "--"}
              change="+1.4% (24h)"
              icon={PieChart}
              isPositive={true}
            />
          </div>
          
          {/* Main Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2">
              <LiveOpportunities
                opportunities={opportunitiesQuery.data || []}
                autoExecute={settingsQuery.data?.autoExecute || false}
                setAutoExecute={updateAutoExecute}
                isLoading={opportunitiesQuery.isLoading}
                refetch={generateOpportunities}
              />
              
              <TransactionHistory
                transactions={transactionsQuery.data || []}
                isLoading={transactionsQuery.isLoading}
              />
            </div>
            
            {/* Right Column */}
            <div>
              <MevAutomation targetProfit={20} />
              
              <MempoolMonitor
                pendingTx={blockchainStatusQuery.data?.pendingTransactions || 0}
                gasPrice={blockchainStatusQuery.data?.gasPrice || 0}
                networkCongestion={blockchainStatusQuery.data?.networkCongestion || "Medium"}
                mempoolLogs={mempoolActivityQuery.data || []}
                isLoading={blockchainStatusQuery.isLoading || mempoolActivityQuery.isLoading}
              />
              
              <BotSettings
                settings={settingsQuery.data || {
                  minProfitThreshold: 0.005,
                  maxGasPrice: 50,
                  strategy: "arbitrage",
                  autoExecute: true,
                  runSimulations: true
                }}
                isLoading={settingsQuery.isLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
