import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  Tally4, 
  BarChart4, 
  ShoppingCart,
  Wallet,
  Settings,
  LayoutDashboard
} from "lucide-react";

interface SidebarProps {
  isRunning: boolean;
}

export function Sidebar({ isRunning }: SidebarProps) {
  const [location] = useLocation();
  
  return (
    <aside className="w-16 md:w-64 bg-white dark:bg-slate-900 border-r border-neutral-light dark:border-slate-800 shadow-sm flex flex-col h-screen">
      {/* Logo */}
      <div className="flex items-center justify-center md:justify-start h-16 border-b border-neutral-light dark:border-slate-800 px-4">
        <div className="bg-primary text-white rounded p-1 mr-2">
          <Tally4 className="h-5 w-5" />
        </div>
        <h1 className="hidden md:block text-xl font-semibold">MEV Bot</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul>
          <SidebarItem 
            href="/" 
            icon={<LayoutDashboard className="h-5 w-5" />} 
            label="Dashboard" 
            isActive={location === '/'}
          />
          <SidebarItem 
            href="#"
            icon={<ShoppingCart className="h-5 w-5" />} 
            label="Transactions" 
            isActive={false}
          />
          <SidebarItem 
            href="#" 
            icon={<BarChart4 className="h-5 w-5" />} 
            label="Analytics" 
            isActive={false}
          />
          <SidebarItem 
            href="#" 
            icon={<Wallet className="h-5 w-5" />} 
            label="Wallet" 
            isActive={false}
          />
          <SidebarItem 
            href="#" 
            icon={<Settings className="h-5 w-5" />} 
            label="Settings" 
            isActive={false}
          />
        </ul>
      </nav>
      
      {/* Bot Status */}
      <div className="p-4 border-t border-neutral-light dark:border-slate-800">
        <div className="flex items-center justify-center md:justify-between">
          <span className="hidden md:block text-sm">Bot Status</span>
          <div className="flex items-center">
            <span className={cn(
              "inline-block w-2 h-2 rounded-full mr-2",
              isRunning ? "bg-accent" : "bg-red-500"
            )}></span>
            <span className="text-xs md:text-sm">{isRunning ? "Running" : "Stopped"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function SidebarItem({ href, icon, label, isActive }: SidebarItemProps) {
  return (
    <li className="mb-1">
      <Link href={href}>
        <a className={cn(
          "flex items-center justify-center md:justify-start px-4 py-3 rounded-r-lg",
          isActive 
            ? "bg-primary bg-opacity-10 text-primary border-l-4 border-primary" 
            : "hover:bg-neutral-lightest dark:hover:bg-slate-800"
        )}>
          <div className="w-5 text-center md:mr-3">
            {icon}
          </div>
          <span className="hidden md:inline">{label}</span>
        </a>
      </Link>
    </li>
  );
}

export default Sidebar;
