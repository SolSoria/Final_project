import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { type Session } from "@shared/schema";
import { formatDate } from "@/utils/formatting";

interface TrendChartProps {
  sessions: Session[];
  metric: 'encephalopathyScore' | 'deltaPct' | 'adr' | 'sef95';
  title: string;
  showMLOverlay?: boolean;
}

export function TrendChart({ sessions, metric, title, showMLOverlay = false }: TrendChartProps) {
  const data = sessions.map(session => ({
    date: formatDate(session.date),
    value: session[metric],
    fullDate: session.date
  }));

  const getThresholdLines = () => {
    switch (metric) {
      case 'encephalopathyScore':
        return [
          { value: 2, label: 'Normal/Mild', stroke: '#10B981' },
          { value: 6, label: 'Mild/Severe', stroke: '#EF4444' }
        ];
      case 'deltaPct':
        return [
          { value: 20, label: 'Normal/Borderline', stroke: '#F59E0B' },
          { value: 35, label: 'Borderline/Abnormal', stroke: '#EF4444' }
        ];
      case 'adr':
        return [
          { value: 0.8, label: 'Borderline/Normal', stroke: '#10B981' },
          { value: 0.6, label: 'Abnormal/Borderline', stroke: '#F59E0B' }
        ];
      case 'sef95':
        return [
          { value: 11, label: 'Borderline/Normal', stroke: '#10B981' },
          { value: 7.5, label: 'Abnormal/Borderline', stroke: '#F59E0B' }
        ];
      default:
        return [];
    }
  };

  const thresholdLines = getThresholdLines();

  return (
    <div className="rounded-xl border border-border bg-card p-6" data-testid={`trend-chart-${metric}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {showMLOverlay && (
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-4 bg-primary"></div>
              <span>Rule-based</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-4 border-2 border-dashed border-chart-2"></div>
              <span>ML (RF)</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            
            {/* Threshold lines */}
            {thresholdLines.map((threshold, index) => (
              <ReferenceLine 
                key={index}
                y={threshold.value} 
                stroke={threshold.stroke}
                strokeDasharray="5 5"
                strokeOpacity={0.7}
              />
            ))}
            
            {/* Main trend line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />
            
            {/* ML overlay line (if enabled) */}
            {showMLOverlay && (
              <Line
                type="monotone"
                dataKey="value" // In real implementation, this would be ML prediction data
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
