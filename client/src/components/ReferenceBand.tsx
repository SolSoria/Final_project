import { type CohortType } from "@shared/schema";
import { getThresholds } from "@/utils/cohorts";

interface ReferenceBandProps {
  metricType: 'encephalopathy' | 'deltaPct' | 'adr' | 'sef95';
  cohort: CohortType;
  currentValue: number;
}

export function ReferenceBand({ metricType, cohort, currentValue }: ReferenceBandProps) {
  const thresholds = getThresholds(cohort);
  
  const getBandLabels = () => {
    switch (metricType) {
      case 'encephalopathy':
        return ['Normal', 'Mild', 'Severe'];
      case 'deltaPct':
        return [`≤${thresholds.deltaPct.normalMax}%`, `${thresholds.deltaPct.normalMax + 1}-${thresholds.deltaPct.borderlineMax}%`, `>${thresholds.deltaPct.borderlineMax}%`];
      case 'adr':
        return [`≥${thresholds.adr.normalMin}`, `${thresholds.adr.borderlineMin}-${thresholds.adr.normalMin - 0.1}`, `<${thresholds.adr.borderlineMin}`];
      case 'sef95':
        return [`≥${thresholds.sef95.normalMin}`, `${thresholds.sef95.borderlineMin}-${thresholds.sef95.normalMin - 0.1}`, `<${thresholds.sef95.borderlineMin}`];
      default:
        return ['Normal', 'Borderline', 'Abnormal'];
    }
  };

  const labels = getBandLabels();

  return (
    <div data-testid="reference-band">
      <div className="reference-band mb-1"></div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {labels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
}
