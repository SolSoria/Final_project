import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getMode, getLSLGatewayUrl } from "@/lib/mongodb";
import { useEffect, useState } from "react";
import copy from "../config/copy.en.json";

interface ModeBadgeProps {
  patientId: string;
}

export function ModeBadge({ patientId }: ModeBadgeProps) {
  const [isConnected, setIsConnected] = useState(false);
  const mode = getMode();

  // Poll LSL Gateway status in live mode
  useEffect(() => {
    if (mode !== 'live') return;
    
    const checkConnection = async () => {
      try {
        const response = await fetch(`${getLSLGatewayUrl()}?patientId=${patientId}`, {
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
  }, [mode, patientId]);

  const getStatusLabel = () => {
    if (mode === 'simulation') {
      return copy.labels.modeSimulation;
    }
    return isConnected 
      ? copy.labels.modeLiveConnected 
      : copy.labels.modeLiveDisconnected;
  };

  const getStatusColor = () => {
    if (mode === 'simulation') return 'bg-secondary';
    return isConnected ? 'bg-emerald-500' : 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-2" data-testid="mode-badge">
      <div className="flex items-center space-x-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
        <div className={`h-2 w-2 rounded-full ${getStatusColor()}`}></div>
        <span data-testid="mode-status">{getStatusLabel()}</span>
      </div>
    </div>
  );
}
