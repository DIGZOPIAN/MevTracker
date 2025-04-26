import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, StopCircle, RefreshCw, BanknoteIcon, Clock } from "lucide-react";

interface MevAutomationProps {
  targetProfit?: number;
}

export function MevAutomation({ targetProfit = 20 }: MevAutomationProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>({
    isRunning: false,
    profit: 0,
    transactions: 0,
    startTime: null,
    targetProfit: targetProfit,
    percentComplete: 0
  });
  
  // Fetch status when component mounts
  useEffect(() => {
    fetchStatus();
    // Set up polling if already running
    if (status.isRunning) {
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [status.isRunning]);
  
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/mev/status', { 
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch MEV status:', error);
    }
  };
  
  const startExecution = async () => {
    setIsLoading(true);
    try {
      const result = await apiRequest('POST', '/api/mev/start', { targetProfit });
      if (result && result.success) {
        toast({
          title: "Automated Execution Started",
          description: result.message,
        });
        setStatus({
          ...status,
          isRunning: true,
          startTime: result.startTime,
          targetProfit
        });
        
        // Schedule immediate status update
        setTimeout(fetchStatus, 1000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start automated execution",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const stopExecution = async () => {
    setIsLoading(true);
    try {
      const result = await apiRequest('POST', '/api/mev/stop', null);
      if (result && result.success) {
        toast({
          title: "Automated Execution Stopped",
          description: result.message,
        });
        setStatus({
          ...status,
          isRunning: false
        });
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
        queryClient.invalidateQueries({ queryKey: ['/api/mempool-activity'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bot-stats'] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop automated execution",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format elapsed time
  const formatElapsedTime = (startTime: string) => {
    if (!startTime) return "0:00";
    
    const start = new Date(startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000); // in seconds
    
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center justify-between">
          MEV Automation
          <Badge 
            variant={status.isRunning ? "default" : "outline"}
            className={status.isRunning ? "bg-green-500 hover:bg-green-600" : ""}>
            {status.isRunning ? "Running" : "Idle"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Automated MEV arbitrage execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1 text-neutral-dark dark:text-slate-400">
              Target Profit
            </div>
            <div className="text-2xl font-bold flex items-center">
              <BanknoteIcon className="mr-2 h-5 w-5 text-accent dark:text-green-400" />
              £{status.targetProfit.toFixed(2)}
            </div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1 text-neutral-dark dark:text-slate-400">
              Current Profit
            </div>
            <div className="text-2xl font-bold flex items-center">
              <BanknoteIcon className="mr-2 h-5 w-5 text-accent dark:text-green-400" />
              £{status.profit.toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{status.percentComplete.toFixed(1)}%</span>
          </div>
          <Progress value={status.percentComplete} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1 text-neutral-dark dark:text-slate-400">
              Transactions
            </div>
            <div className="text-xl font-bold">
              {status.transactions}
            </div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-1 text-neutral-dark dark:text-slate-400">
              Elapsed Time
            </div>
            <div className="text-xl font-bold flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              {status.startTime ? formatElapsedTime(status.startTime) : "0:00"}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex space-x-2 w-full">
          {status.isRunning ? (
            <Button 
              variant="destructive" 
              onClick={stopExecution} 
              disabled={isLoading}
              className="flex-1"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Stop Execution
            </Button>
          ) : (
            <Button 
              variant="default" 
              onClick={startExecution} 
              disabled={isLoading}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Execution
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={fetchStatus} 
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default MevAutomation;