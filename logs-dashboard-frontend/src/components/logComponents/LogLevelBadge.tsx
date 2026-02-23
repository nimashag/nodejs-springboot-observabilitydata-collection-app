import { AlertCircle, AlertTriangle, Info, Bug } from "lucide-react";

interface LogLevelBadgeProps {
  level: string;
  size?: "sm" | "md" | "lg";
}

export default function LogLevelBadge({
  level,
  size = "md",
}: LogLevelBadgeProps) {
  const levelLower = level.toLowerCase();

  const getConfig = () => {
    switch (levelLower) {
      case "error":
        return {
          icon: AlertCircle,
          classes:
            "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-300 dark:from-red-950 dark:to-red-900/50 dark:text-red-300 dark:border-red-700 shadow-sm shadow-red-100 dark:shadow-red-900/20",
        };
      case "warn":
      case "warning":
        return {
          icon: AlertTriangle,
          classes:
            "bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-700 border-amber-300 dark:from-amber-950 dark:to-amber-900/50 dark:text-amber-300 dark:border-amber-700 shadow-sm shadow-amber-100 dark:shadow-amber-900/20",
        };
      case "info":
        return {
          icon: Info,
          classes:
            "bg-gradient-to-r from-blue-50 to-cyan-100 text-blue-700 border-blue-300 dark:from-blue-950 dark:to-blue-900/50 dark:text-blue-300 dark:border-blue-700 shadow-sm shadow-blue-100 dark:shadow-blue-900/20",
        };
      case "debug":
        return {
          icon: Bug,
          classes:
            "bg-gradient-to-r from-slate-50 to-gray-100 text-slate-700 border-slate-300 dark:from-slate-900 dark:to-slate-800/50 dark:text-slate-300 dark:border-slate-600 shadow-sm shadow-slate-100 dark:shadow-slate-900/20",
        };
      default:
        return {
          icon: Info,
          classes:
            "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-300 dark:from-gray-900 dark:to-gray-800/50 dark:text-gray-300 dark:border-gray-600 shadow-sm",
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold border ${config.classes} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      <span>{level.toUpperCase()}</span>
    </span>
  );
}
