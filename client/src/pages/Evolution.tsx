import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type Patient } from "@shared/schema";
import { useUIStore } from "@/store/ui-store";
import { TrendChart } from "@/components/TrendChart";
import { StackedContinuity } from "@/components/StackedContinuity";
import { HeatmapReactivity } from "@/components/HeatmapReactivity";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowUp, ArrowDown, CheckCircle } from "lucide-react";

interface EvolutionProps {
  patient: Patient;
}

export function Evolution({ patient }: EvolutionProps) {
  const { mlMode, setMLMode, sessionRange, setSessionRange, selectedMetrics, toggleMetric } = useUIStore();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['/api/sessions', patient.id],
    queryFn: () => api.getSessions(patient.id),
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">Loading Sessions...</h3>
        <p className="text-muted-foreground">Retrieving historical EEG data...</p>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">No Session Data</h3>
        <p className="text-muted-foreground">No historical EEG sessions found for this patient.</p>
      </div>
    );
  }

  const limitedSessions = sessionRange === 'last5' ? sessions.slice(-5) : 
                         sessionRange === 'last10' ? sessions.slice(-10) : 
                         sessions;

  const latestSession = sessions[sessions.length - 1];
  const previousSession = sessions[sessions.length - 2];

  return (
    <div data-testid="evolution-tab">
      {/* Controls Row */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Session Range */}
          <div className="flex space-x-2">
            <Button
              variant={sessionRange === 'last5' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSessionRange('last5')}
              data-testid="session-range-last5"
            >
              Last 5
            </Button>
            <Button
              variant={sessionRange === 'last10' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSessionRange('last10')}
              data-testid="session-range-last10"
            >
              Last 10
            </Button>
            <Button
              variant={sessionRange === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSessionRange('custom')}
              data-testid="session-range-custom"
            >
              Custom
            </Button>
          </div>
          
          {/* Metric Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'encephalopathy', label: 'Encephalopathy' },
              { key: 'deltaPct', label: 'Delta%' },
              { key: 'adr', label: 'ADR' },
              { key: 'sef95', label: 'SEF95' },
              { key: 'continuity', label: 'Continuity' }
            ].map(metric => (
              <Button
                key={metric.key}
                variant={selectedMetrics.includes(metric.key) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleMetric(metric.key)}
                data-testid={`metric-toggle-${metric.key}`}
              >
                {metric.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* ML Toggle */}
        <div className="flex items-center space-x-2" data-testid="ml-toggle-container">
          <Switch
            checked={mlMode}
            onCheckedChange={setMLMode}
            data-testid="ml-toggle"
          />
          <label className="text-sm font-medium">Use ML model (TUH-trained)</label>
        </div>
      </div>
      
      {/* Trend Chart Area */}
      {selectedMetrics.includes('encephalopathy') && (
        <div className="mb-8">
          <TrendChart
            sessions={limitedSessions}
            metric="encephalopathyScore"
            title="Encephalopathy Score Trend"
            showMLOverlay={mlMode}
          />
        </div>
      )}

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <StackedContinuity sessions={limitedSessions} />
        <HeatmapReactivity sessions={limitedSessions} />
      </div>

      {/* Additional Trend Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {selectedMetrics.includes('deltaPct') && (
          <TrendChart
            sessions={limitedSessions}
            metric="deltaPct"
            title="Delta % Trend"
            showMLOverlay={mlMode}
          />
        )}
        
        {selectedMetrics.includes('sef95') && (
          <TrendChart
            sessions={limitedSessions}
            metric="sef95"
            title="SEF95 Trend"
            showMLOverlay={mlMode}
          />
        )}
        
        {selectedMetrics.includes('adr') && (
          <TrendChart
            sessions={limitedSessions}
            metric="adr"
            title="Alpha/Delta Ratio Trend"
            showMLOverlay={mlMode}
          />
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4" data-testid="summary-encephalopathy">
          <h4 className="font-medium text-sm mb-2">Current Encephalopathy</h4>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold metric-value text-amber-600">
              {latestSession.encephalopathyScore.toFixed(1)}
            </span>
            {previousSession && (
              <>
                <span className="text-sm text-muted-foreground">
                  vs {previousSession.encephalopathyScore.toFixed(1)} prior
                </span>
                {latestSession.encephalopathyScore > previousSession.encephalopathyScore ? (
                  <ArrowUp className="h-4 w-4 text-red-500" />
                ) : latestSession.encephalopathyScore < previousSession.encephalopathyScore ? (
                  <ArrowDown className="h-4 w-4 text-emerald-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                )}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {latestSession.encephalopathyScore <= 2 ? 'Normal' : 
             latestSession.encephalopathyScore <= 5 ? 'Mild encephalopathy, trending worse since sedation reduction' :
             'Severe encephalopathy, immediate intervention needed'}
          </p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4" data-testid="summary-delta">
          <h4 className="font-medium text-sm mb-2">Delta Burden Trend</h4>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold metric-value text-amber-600">
              {Math.round(latestSession.deltaPct)}%
            </span>
            {previousSession && (
              <>
                <span className="text-sm text-muted-foreground">
                  vs {Math.round(previousSession.deltaPct)}% prior
                </span>
                {latestSession.deltaPct > previousSession.deltaPct ? (
                  <ArrowUp className="h-4 w-4 text-red-500" />
                ) : latestSession.deltaPct < previousSession.deltaPct ? (
                  <ArrowDown className="h-4 w-4 text-emerald-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                )}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {latestSession.deltaPct > previousSession?.deltaPct ? 
             'Increasing slow-wave activity concerning for metabolic dysfunction' :
             'Stable delta burden within expected range'}
          </p>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-4" data-testid="summary-quality">
          <h4 className="font-medium text-sm mb-2">Quality Status</h4>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold metric-value text-emerald-600">
              {Math.round(latestSession.artifactPct)}%
            </span>
            <span className="text-sm text-muted-foreground">artifact</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Excellent signal quality enables reliable interpretation
          </p>
        </div>
      </div>
    </div>
  );
}
