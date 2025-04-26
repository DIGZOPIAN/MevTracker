import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface MempoolMonitorProps {
  pendingTx: number;
  gasPrice: number;
  networkCongestion: string;
  mempoolLogs: Array<{
    id: number;
    message: string;
    type: string;
    timestamp: Date;
  }>;
  isLoading: boolean;
}

export function MempoolMonitor({ 
  pendingTx, 
  gasPrice, 
  networkCongestion, 
  mempoolLogs,
  isLoading 
}: MempoolMonitorProps) {
  const { toast } = useToast();
  
  // Mutation for simulating mempool events (for demo)
  const simulateMempoolMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/simulate/mempool-events', undefined);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mempool-activity'] });
      toast({
        title: "Mempool Updated",
        description: "New mempool activity detected",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update mempool data",
        variant: "destructive",
      });
    }
  });
  
  // Calculate progress values
  const pendingTxProgress = Math.min(Math.max((pendingTx / 1000) * 100, 10), 100);
  const gasPriceProgress = Math.min(Math.max((gasPrice / 100) * 100, 10), 100);
  
  let networkCongestionProgress = 0;
  let networkCongestionColor = "bg-primary";
  
  switch (networkCongestion) {
    case 'Low':
      networkCongestionProgress = 25;
      networkCongestionColor = "bg-green-500";
      break;
    case 'Medium':
      networkCongestionProgress = 55;
      networkCongestionColor = "bg-amber-500";
      break;
    case 'High':
      networkCongestionProgress = 80;
      networkCongestionColor = "bg-orange-500";
      break;
    case 'Very High':
      networkCongestionProgress = 95;
      networkCongestionColor = "bg-red-500";
      break;
  }
  
  // Get text color for log entry based on type
  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'swap':
        return 'text-primary dark:text-blue-400';
      case 'opportunity':
        return 'text-accent dark:text-green-400';
      case 'error':
        return 'text-error dark:text-red-400';
      case 'execution':
        return 'text-purple-500 dark:text-purple-400';
      default:
        return 'text-neutral-dark dark:text-slate-400';
    }
  };
  
  const handleMockMempool = () => {
    simulateMempoolMutation.mutate();
  };
  
  // Format timestamp for logs
  const formatLogTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Mempool Monitor</CardTitle>
        <button 
          className="text-xs px-2 py-1 rounded-full bg-primary bg-opacity-10 text-primary dark:bg-opacity-20"
          onClick={handleMockMempool}
        >
          Live <span className="inline-block w-2 h-2 rounded-full bg-accent ml-1"></span>
        </button>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Pending Transactions</span>
                  <span className="font-medium">{pendingTx}</span>
                </div>
                <Progress value={pendingTxProgress} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Gas Price (Gwei)</span>
                  <span className="font-medium">{gasPrice}</span>
                </div>
                <Progress value={gasPriceProgress} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Network Congestion</span>
                  <span className={cn(
                    "font-medium",
                    networkCongestion === 'Low' && "text-green-500",
                    networkCongestion === 'Medium' && "text-amber-500",
                    networkCongestion === 'High' && "text-orange-500",
                    networkCongestion === 'Very High' && "text-red-500"
                  )}>
                    {networkCongestion}
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-light dark:bg-slate-700 rounded overflow-hidden">
                  <div className={`${networkCongestionColor} h-full`} style={{ width: `${networkCongestionProgress}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-neutral-light dark:border-slate-700">
              <h4 className="text-sm font-medium mb-3">Latest Mempool Activity</h4>
              <div className="bg-neutral-lightest dark:bg-slate-800 rounded p-3 text-xs font-mono h-32 overflow-y-auto">
                {mempoolLogs.length > 0 ? (
                  mempoolLogs.map((log) => (
                    <div key={log.id} className="mb-2">
                      <span className="text-neutral-dark dark:text-slate-400">[{formatLogTime(log.timestamp)}]</span>
                      <span className={getLogTypeColor(log.type)}> {log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-neutral-dark dark:text-slate-400">
                    No activity recorded yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default MempoolMonitor;
