import { BarChart3 } from "lucide-react";
import { formatPercentage } from "@/utils/formatting";
import copy from "../config/copy.en.json";

interface ConfidenceBarProps {
  artifactPct: number;
  minutesValid: number;
  totalMinutes?: number;
}

export function ConfidenceBar({ artifactPct, minutesValid, totalMinutes = 20 }: ConfidenceBarProps) {
  const qualityStatus = artifactPct <= 10 ? 'Good' : artifactPct <= 30 ? 'Fair' : 'Poor';
  const qualityColor = artifactPct <= 10 ? 'text-emerald-600' : artifactPct <= 30 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="flex items-center space-x-2 text-sm" data-testid="confidence-bar">
      <BarChart3 className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{copy.labels.quality}:</span>
      <span className={`font-medium ${qualityColor}`} data-testid="quality-status">
        {qualityStatus}
      </span>
      <span className="text-muted-foreground">|</span>
      <span className="metric-value" data-testid="artifact-percentage">
        {formatPercentage(artifactPct)}
      </span>
      <span className="text-muted-foreground">{copy.labels.artifact}</span>
      <span className="text-muted-foreground">|</span>
      <span className="metric-value" data-testid="minutes-valid">
        {minutesValid}/{totalMinutes} min valid
      </span>
    </div>
  );
}
