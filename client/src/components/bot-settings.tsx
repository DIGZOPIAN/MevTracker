import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface BotSettingsProps {
  settings: {
    minProfitThreshold: number;
    maxGasPrice: number;
    strategy: string;
    autoExecute: boolean;
    runSimulations: boolean;
  };
  isLoading: boolean;
}

export function BotSettings({ settings, isLoading }: BotSettingsProps) {
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    minProfitThreshold: settings.minProfitThreshold,
    maxGasPrice: settings.maxGasPrice,
    strategy: settings.strategy,
    autoExecute: settings.autoExecute,
    runSimulations: settings.runSimulations
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: typeof formState) => {
      const response = await apiRequest('POST', '/api/bot-settings', settingsData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Bot settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bot-settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update bot settings: " + error.toString(),
        variant: "destructive",
      });
    }
  });
  
  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmit = () => {
    updateSettingsMutation.mutate(formState);
  };
  
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6">
        <div className="flex justify-center py-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Bot Settings</h3>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="minProfitThreshold">Minimum Profit Threshold</Label>
          <div className="flex items-center">
            <Input
              id="minProfitThreshold"
              type="number"
              step="0.001"
              value={formState.minProfitThreshold}
              onChange={(e) => handleInputChange('minProfitThreshold', parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="ml-2 text-sm">ETH</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="maxGasPrice">Max Gas Price</Label>
          <div className="flex items-center">
            <Input
              id="maxGasPrice"
              type="number"
              value={formState.maxGasPrice}
              onChange={(e) => handleInputChange('maxGasPrice', parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="ml-2 text-sm">Gwei</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="strategy">Strategy</Label>
          <Select 
            value={formState.strategy} 
            onValueChange={(value) => handleInputChange('strategy', value)}
          >
            <SelectTrigger id="strategy" className="w-full">
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arbitrage">Arbitrage Only</SelectItem>
              <SelectItem value="flashloan">Flash Loan Arbitrage</SelectItem>
              <SelectItem value="sandwich">Sandwich Attacks</SelectItem>
              <SelectItem value="all">All Strategies</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="pt-2 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="autoExecute" 
              checked={formState.autoExecute} 
              onCheckedChange={(checked) => handleInputChange('autoExecute', !!checked)}
            />
            <Label htmlFor="autoExecute" className="cursor-pointer">
              Auto-Execute Profitable Transactions
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="runSimulations" 
              checked={formState.runSimulations} 
              onCheckedChange={(checked) => handleInputChange('runSimulations', !!checked)}
            />
            <Label htmlFor="runSimulations" className="cursor-pointer">
              Run Transaction Simulations
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BotSettings;
