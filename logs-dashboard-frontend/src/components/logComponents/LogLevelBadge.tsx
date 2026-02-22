interface LogLevelBadgeProps {
  level: string;
}

export default function LogLevelBadge({ level }: LogLevelBadgeProps) {
  const levelLower = level.toLowerCase();
  
  const getColorClasses = () => {
    switch (levelLower) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warn':
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'debug':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColorClasses()}`}
    >
      {level.toUpperCase()}
    </span>
  );
}

