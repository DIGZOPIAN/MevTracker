import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Filter } from "lucide-react";

interface Opportunity {
  id: number;
  type: string;
  pairs: string;
  estimatedProfitEth: number;
  estimatedGasCostEth: number;
  isExecutable: boolean;
}

interface LiveOpportunitiesProps {
  opportunities: Opportunity[];
  autoExecute: boolean;
  setAutoExecute: (value: boolean) => void;
  isLoading: boolean;
  refetch: () => void;
}

export function LiveOpportunities({ 
  opportunities, 
  autoExecute,
  setAutoExecute,
  isLoading,
  refetch
}: LiveOpportunitiesProps) {
  const { toast } = useToast();
  
  const executeMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      const response = await apiRequest('POST', `/api/execute-opportunity/${opportunityId}`, undefined);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction Executed",
        description: `Successfully executed transaction: ${data.transaction.txHash}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bot-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: error.toString(),
        variant: "destructive",
      });
    }
  });

  const handleExecute = (id: number) => {
    executeMutation.mutate(id);
  };

  const toggleAutoExecute = () => {
    setAutoExecute(!autoExecute);
  };

  // Get badge color based on opportunity type
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Triangular':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'DEX':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Flash Loan':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Live Opportunities</h3>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={autoExecute ? "default" : "outline"}
            className="text-xs px-3 py-1"
            onClick={toggleAutoExecute}
          >
            Auto Execute
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs px-2 py-1"
            onClick={() => refetch()}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : opportunities.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-light dark:border-slate-700">
                <th className="text-left font-medium py-2 pl-2">Type</th>
                <th className="text-left font-medium py-2">Pairs</th>
                <th className="text-left font-medium py-2">Estimated Profit</th>
                <th className="text-right font-medium py-2">Gas Cost</th>
                <th className="text-right font-medium py-2 pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="border-b border-neutral-light dark:border-slate-700 hover:bg-neutral-lightest dark:hover:bg-slate-800/50">
                  <td className="py-3 pl-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getBadgeColor(opportunity.type)}`}>
                      {opportunity.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center">
                      <span className="font-mono text-xs">{opportunity.pairs}</span>
                    </div>
                  </td>
                  <td className={`py-3 ${parseFloat(opportunity.estimatedProfitEth.toString()) > 0 ? 'text-accent dark:text-green-400' : 'text-error dark:text-red-400'}`}>
                    {parseFloat(opportunity.estimatedProfitEth.toString()) > 0 ? '+' : ''}{parseFloat(opportunity.estimatedProfitEth.toString()).toFixed(4)} ETH
                  </td>
                  <td className="py-3 text-right text-neutral-dark dark:text-slate-400">
                    ~{parseFloat(opportunity.estimatedGasCostEth.toString()).toFixed(4)} ETH
                  </td>
                  <td className="py-3 pr-2 text-right">
                    {opportunity.isExecutable ? (
                      <Button
                        size="sm"
                        className="text-xs px-3 py-1 bg-accent hover:bg-green-700"
                        onClick={() => handleExecute(opportunity.id)}
                        disabled={executeMutation.isPending}
                      >
                        Execute
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="text-xs px-3 py-1"
                        variant="ghost"
                        disabled
                      >
                        Unprofitable
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-neutral-dark dark:text-slate-400">
            No arbitrage opportunities currently available.
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveOpportunities;
