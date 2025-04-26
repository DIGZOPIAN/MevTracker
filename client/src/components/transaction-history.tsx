import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  id: number;
  txHash: string;
  type: string;
  timestamp: Date;
  profitEth: number;
  status: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function TransactionHistory({ transactions, isLoading }: TransactionHistoryProps) {
  // Format transaction time as relative
  const formatTimestamp = (timestamp: Date): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };
  
  // Get badge color based on transaction type
  const getTypeBadgeColor = (type: string) => {
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
  
  // Get badge color based on transaction status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Price Changed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Recent Transactions</h3>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
        >
          View All
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : transactions.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-light dark:border-slate-700">
                <th className="text-left font-medium py-2 pl-2">Tx Hash</th>
                <th className="text-left font-medium py-2">Type</th>
                <th className="text-left font-medium py-2">Time</th>
                <th className="text-right font-medium py-2">Profit/Loss</th>
                <th className="text-right font-medium py-2 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-neutral-light dark:border-slate-700 hover:bg-neutral-lightest dark:hover:bg-slate-800/50">
                  <td className="py-3 pl-2">
                    <a 
                      href={`https://etherscan.io/tx/${tx.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline font-mono text-xs"
                    >
                      {tx.txHash}
                    </a>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getTypeBadgeColor(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 text-neutral-dark dark:text-slate-400">
                    {formatTimestamp(tx.timestamp)}
                  </td>
                  <td className={`py-3 text-right ${parseFloat(tx.profitEth.toString()) >= 0 ? 'text-accent dark:text-green-400' : 'text-error dark:text-red-400'}`}>
                    {parseFloat(tx.profitEth.toString()) >= 0 ? '+' : ''}{parseFloat(tx.profitEth.toString()).toFixed(4)} ETH
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-neutral-dark dark:text-slate-400">
            No transactions recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionHistory;
