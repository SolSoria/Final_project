import { useUIStore } from "@/store/ui-store";
import { useEffect, useState } from "react";
import { Database, Wifi, WifiOff, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModeBadgeProps {
  patientId?: string;
  className?: string;
}

export function ModeBadge({ patientId, className }: ModeBadgeProps) {
  const [isConnected, setIsConnected] = useState(false);
  const { environment } = useUIStore();

  // Poll LSL Gateway status in hardware mode
  useEffect(() => {
    if (environment !== 'hardware' || !patientId) return;
    
    const checkConnection = async () => {
      try {
        const lslUrl = import.meta.env.VITE_LSL_GATEWAY_URL || "http://localhost:7070/rt";
        const response = await fetch(`${lslUrl}?patientId=${patientId}`, {
          signal: AbortSignal.timeout(1500)
        });
        setIsConnected(response.ok);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [environment, patientId]);

  if (!environment) {
    return null;
  }

  const isSimulation = environment === "simulation";
  const isHardware = environment === "hardware";

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="mode-badge">
      {/* Environment Badge */}
      <Badge 
        variant={isSimulation ? "secondary" : "default"}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium",
          isSimulation && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          isHardware && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        )}
        data-testid={`badge-environment-${environment}`}
      >
        {isSimulation && <Database className="h-3.5 w-3.5" />}
        {isHardware && <Zap className="h-3.5 w-3.5" />}
        {isSimulation ? "Simulation Mode" : "Hardware Mode"}
      </Badge>

      {/* LSL Connection Status (only for Hardware mode) */}
      {isHardware && (
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium",
            isConnected && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
            !isConnected && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          )}
          data-testid={`badge-lsl-${isConnected ? 'connected' : 'disconnected'}`}
        >
          {isConnected ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          LSL {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      )}
    </div>
  );
}
