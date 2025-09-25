import { type LucideIcon } from "lucide-react";
import { type CohortType } from "@shared/schema";
import { getSeverityLevel, getSeverityColor, getSeverityLabel } from "@/utils/cohorts";
import { formatMetricValue, formatPercentage } from "@/utils/formatting";
import { ReferenceBand } from "./ReferenceBand";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  cohort: CohortType;
  metricType: 'encephalopathy' | 'deltaPct' | 'adr' | 'sef95' | 'other';
  artifactPct?: number;
  minutesValid?: number;
  totalMinutes?: number;
  note?: string;
  isHighArtifact?: boolean;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  cohort,
  metricType,
  artifactPct,
  minutesValid = 20,
  totalMinutes = 20,
  note,
  isHighArtifact = false,
  children
}: MetricCardProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const severityLevel = metricType !== 'other' ? getSeverityLevel(numericValue, metricType, cohort) : 'normal';
  const severityColor = getSeverityColor(severityLevel);
  const severityLabel = getSeverityLabel(severityLevel);

  const isInterpretationLimited = isHighArtifact && metricType !== 'other';

  return (
    <div 
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity",
        isInterpretationLimited && "opacity-50"
      )}
      data-testid={`metric-card-${metricType}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-card-foreground">{title}</h4>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {children || (
        <>
          <div className="flex items-center space-x-2 mb-2">
            <span className={cn("text-2xl font-bold metric-value", severityColor.split(' ')[0])}>
              {typeof value === 'number' ? formatMetricValue(value, unit) : value}
            </span>
            {metricType !== 'other' && (
              <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium", severityColor)}>
                {severityLabel}
              </span>
            )}
          </div>

          {metricType !== 'other' && (
            <div className="mb-3">
              <ReferenceBand metricType={metricType} cohort={cohort} currentValue={numericValue} />
            </div>
          )}

          {(artifactPct !== undefined || minutesValid !== undefined) && (
            <div className="text-xs text-muted-foreground mb-2">
              <span data-testid="coverage">
                {minutesValid}/{totalMinutes} min valid
                {artifactPct !== undefined && ` • ${formatPercentage(artifactPct)} artifact`}
              </span>
            </div>
          )}

          {note && (
            <div className="text-xs text-muted-foreground">
              {note}
            </div>
          )}
        </>
      )}

      {isInterpretationLimited && (
        <div className="mt-2 text-xs text-amber-600 font-medium">
          Interpretation limited by artifacts
        </div>
      )}
    </div>
  );
}
