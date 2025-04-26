import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: LucideIcon;
  isPositive?: boolean;
}

export function StatusCard({ title, value, change, icon: Icon, isPositive = true }: StatusCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 transition-all hover:shadow-md hover:-translate-y-1 duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-dark dark:text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-semibold">{value}</h3>
          <p className={cn(
            "text-xs flex items-center mt-2",
            isPositive ? "text-accent dark:text-green-400" : "text-error dark:text-red-400"
          )}>
            <span className="mr-1">
              {isPositive ? '↑' : '↓'}
            </span>
            <span>{change}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default StatusCard;
