import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, StopCircle, RefreshCw, BanknoteIcon, Clock, Wallet, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MevAutomationProps {
  targetProfit?: number;
}

export function MevAutomation({ targetProfit = 1000 }: MevAutomationProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userTargetProfit, setUserTargetProfit] = useState(targetProfit);
  const [autoWithdraw, setAutoWithdraw] = useState(true);
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [status, setStatus] = useState<any>({
    isRunning: false,
    profit: 0,
    transactions: 0,
    startTime: null,
    targetProfit: targetProfit,
    percentComplete: 0,
    autoWithdraw: true,
    withdrawalAddress: ''
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
      const result = await apiRequest('POST', '/api/mev/start', { 
        targetProfit: userTargetProfit,
        autoWithdraw,
        withdrawalAddress: withdrawalAddress || undefined
      });
      
      if (result && result.success) {
        toast({
          title: "Automated Execution Started",
          description: result.message,
        });
        setStatus({
          ...status,
          isRunning: true,
          startTime: result.startTime,
          targetProfit: userTargetProfit,
          autoWithdraw,
          withdrawalAddress
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
  
  const withdrawProfits = async () => {
    if (status.profit <= 0) return;
    
    setIsLoading(true);
    try {
      const result = await apiRequest('POST', '/api/withdraw', {
        amount: status.profit,
        address: withdrawalAddress || undefined
      });
      
      if (result && result.success) {
        toast({
          title: "Withdrawal Completed",
          description: result.message,
        });
        
        // Refresh activity data
        queryClient.invalidateQueries({ queryKey: ['/api/mempool-activity'] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to withdraw profits",
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
          <div className="flex items-center">
            MEV Automation
            <Badge 
              variant={status.isRunning ? "default" : "outline"}
              className={`ml-2 ${status.isRunning ? "bg-green-500 hover:bg-green-600" : ""}`}>
              {status.isRunning ? "Running" : "Idle"}
            </Badge>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Automation Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure your MEV bot execution parameters
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="target-profit" className="text-right">
                      Target Profit (£)
                    </Label>
                    <Input
                      id="target-profit"
                      type="number"
                      className="col-span-2 h-8"
                      value={userTargetProfit}
                      onChange={(e) => setUserTargetProfit(Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="auto-withdraw" className="text-right">
                      Auto-withdraw
                    </Label>
                    <div className="col-span-2 flex items-center space-x-2">
                      <Switch
                        id="auto-withdraw"
                        checked={autoWithdraw}
                        onCheckedChange={setAutoWithdraw}
                      />
                      <Label htmlFor="auto-withdraw" className="text-sm">
                        {autoWithdraw ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="withdrawal-address" className="text-right">
                      Wallet Address
                    </Label>
                    <Input
                      id="withdrawal-address"
                      className="col-span-2 h-8"
                      placeholder="0x..."
                      value={withdrawalAddress}
                      onChange={(e) => setWithdrawalAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </CardTitle>
        <CardDescription>
          Automated MEV arbitrage execution with profit targeting and auto-withdrawal
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
      <CardFooter className="flex flex-col space-y-2">
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
        
        <Button 
          variant="secondary" 
          onClick={withdrawProfits} 
          disabled={isLoading || status.profit <= 0}
          className="w-full"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Withdraw Profits (£{status.profit.toFixed(2)})
        </Button>
        
        <div className="flex justify-between text-xs text-muted-foreground w-full px-1">
          <div className="flex items-center">
            <span className="mr-1">Auto-withdraw:</span>
            <span className={autoWithdraw ? "text-green-500 font-medium" : "text-slate-400"}>
              {autoWithdraw ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div>
            <span className="mr-1">Target: £{userTargetProfit}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export default MevAutomation;