import { useTheme } from "@/components/theme-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MoonStar, Sun, ChevronDown, User } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  network: string;
  setNetwork: (network: string) => void;
}

export function Header({ network, setNetwork }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-neutral-light dark:border-slate-800 flex items-center justify-between px-6">
      {/* Left Side: Title */}
      <div>
        <h2 className="text-lg font-medium">Arbitrage Bot Dashboard</h2>
        <p className="text-xs text-neutral-dark dark:text-slate-400">Monitoring {network}</p>
      </div>
      
      {/* Right Side: Actions */}
      <div className="flex items-center space-x-6">
        {/* Network Selector */}
        <div className="hidden md:block">
          <Select
            value={network}
            onValueChange={setNetwork}
          >
            <SelectTrigger className="w-[180px] bg-neutral-lightest dark:bg-slate-800 border border-neutral-light dark:border-slate-700">
              <SelectValue placeholder="Select Network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ethereum Mainnet">Ethereum Mainnet</SelectItem>
              <SelectItem value="Ethereum Goerli">Ethereum Goerli</SelectItem>
              <SelectItem value="Arbitrum">Arbitrum</SelectItem>
              <SelectItem value="Optimism">Optimism</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Dark Mode Toggle */}
        <div className="flex items-center space-x-2">
          {theme === "dark" ? <MoonStar className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <ChevronDown className="ml-1 h-4 w-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Bot Settings</DropdownMenuItem>
            <DropdownMenuItem>API Keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
