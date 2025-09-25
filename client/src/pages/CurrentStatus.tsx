import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type Patient, type RealtimeSample } from "@shared/schema";
import { MetricCard } from "@/components/MetricCard";
import { EventTimeline } from "@/components/EventTimeline";
import { getThresholds } from "@/utils/cohorts";
import { 
  Eye, 
  Activity, 
  BarChart3, 
  TrendingDown, 
  Scale, 
  Signal, 
  AlertTriangle, 
  Zap,
  ChartBar
} from "lucide-react";
import copy from "../config/copy.en.json";

interface CurrentStatusProps {
  patient: Patient;
  realtimeSample: RealtimeSample | null;
}

export function CurrentStatus({ patient, realtimeSample }: CurrentStatusProps) {
  const thresholds = getThresholds(patient.cohort);
  
  // Get recent changes for the banner
  const { data: realtimeHistory } = useQuery({
    queryKey: ['/api/realtime', patient.id, 'history'],
    queryFn: () => api.getRealtimeHistory(patient.id, 10),
  });

  // Get timeline events from database
  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['/api/timeline', patient.id],
    queryFn: () => api.getTimelineEvents(patient.id, 10),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isHighArtifact = realtimeSample ? realtimeSample.artifactPct > thresholds.artifact.warnMax : false;

  // Calculate recent changes by comparing current vs previous samples
  const recentChanges = React.useMemo(() => {
    if (!realtimeSample || !realtimeHistory || realtimeHistory.length < 2) {
      return [];
    }

    const current = realtimeSample;
    // realtimeHistory is ordered newest first (desc) from database
    // Compare current sample with the previous one (second in the array)
    const previous = realtimeHistory[1]; // Previous sample (second newest)
    const changes = [];

    // Compare delta percentage
    const deltaDiff = current.deltaPct - previous.deltaPct;
    if (Math.abs(deltaDiff) > 2) {
      changes.push({
        type: deltaDiff > 0 ? 'increase' : 'decrease',
        metric: 'Delta',
        value: `${deltaDiff > 0 ? '+' : ''}${deltaDiff.toFixed(1)}%`,
        severity: Math.abs(deltaDiff) > 5 ? 'warning' : 'info'
      });
    }

    // Compare SEF95
    const sef95Diff = current.sef95 - previous.sef95;
    if (Math.abs(sef95Diff) > 1) {
      changes.push({
        type: sef95Diff > 0 ? 'increase' : 'decrease',
        metric: 'SEF95',
        value: `${sef95Diff > 0 ? '+' : ''}${sef95Diff.toFixed(1)} Hz`,
        severity: Math.abs(sef95Diff) > 2 ? 'warning' : 'info'
      });
    }

    // Compare reactivity
    if (current.reactivity !== previous.reactivity) {
      changes.push({
        type: 'change',
        metric: 'Reactivity',
        value: `${previous.reactivity} → ${current.reactivity}`,
        severity: current.reactivity === 'absent' ? 'error' : 'info'
      });
    }

    return changes.slice(0, 3); // Show max 3 changes
  }, [realtimeSample, realtimeHistory]);

  if (!realtimeSample) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">No Real-time Data</h3>
        <p className="text-muted-foreground">Waiting for EEG data from monitoring system...</p>
      </div>
    );
  }

  return (
    <div data-testid="current-status-tab">
      {/* Quality Banner */}
      {isHighArtifact && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-800">{copy.guards.artifactHigh}</span>
          </div>
        </div>
      )}

      {/* Recent Changes Panel */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Changes (Last 10 min)</h3>
        <div className="flex flex-wrap gap-2">
          {recentChanges.map((change, index) => (
            <span
              key={index}
              className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                change.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                change.severity === 'info' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}
              data-testid={`recent-change-${index}`}
            >
              {change.type === 'increase' && <TrendingDown className="h-3 w-3 rotate-180" />}
              {change.type === 'decrease' && <TrendingDown className="h-3 w-3" />}
              <span>{change.metric} {change.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        {/* Reactivity Card */}
        <MetricCard
          title={copy.metrics.reactivity}
          value=""
          icon={Eye}
          cohort={patient.cohort}
          metricType="other"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note="Response to stimuli indicates consciousness level"
          isHighArtifact={isHighArtifact}
        >
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Light</span>
              <span className={`text-sm font-medium ${
                realtimeSample.reactivity === 'present' ? 'text-emerald-600' :
                realtimeSample.reactivity === 'uncertain' ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {realtimeSample.reactivity === 'present' ? 'Present' : 
                 realtimeSample.reactivity === 'uncertain' ? 'Uncertain' : 'Absent'}
              </span>
            </div>
          </div>
        </MetricCard>

        {/* PDR Card */}
        <MetricCard
          title={copy.metrics.pdr}
          value={realtimeSample.pdrHz}
          unit="Hz"
          icon={Activity}
          cohort={patient.cohort}
          metricType="other"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note={realtimeSample.pdrHz < 9 ? "Posterior dominant rhythm present but slow for age" : "Normal posterior dominant rhythm"}
          isHighArtifact={isHighArtifact}
        />

        {/* Continuity Card */}
        <MetricCard
          title={copy.metrics.continuity}
          value={realtimeSample.continuity === 'continuous' ? 'Continuous' : 
                realtimeSample.continuity === 'discontinuous' ? 'Discontinuous' :
                realtimeSample.continuity === 'burst_suppression' ? 'Burst Suppression' : 'Suppressed'}
          icon={BarChart3}
          cohort={patient.cohort}
          metricType="other"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note={realtimeSample.continuity !== 'continuous' ? "Increased discontinuity suggests metabolic dysfunction" : "Normal background continuity"}
          isHighArtifact={isHighArtifact}
        />

        {/* Delta % Card */}
        <MetricCard
          title={copy.metrics.deltaPct}
          value={realtimeSample.deltaPct}
          unit="%"
          icon={TrendingDown}
          cohort={patient.cohort}
          metricType="deltaPct"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note="Elevated delta activity for geriatric cohort"
          isHighArtifact={isHighArtifact}
        />

        {/* ADR Card */}
        <MetricCard
          title={copy.metrics.adr}
          value={realtimeSample.adr}
          icon={Scale}
          cohort={patient.cohort}
          metricType="adr"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note="Lower ratio suggests diffuse slowing"
          isHighArtifact={isHighArtifact}
        />

        {/* SEF95 Card */}
        <MetricCard
          title={copy.metrics.sef95}
          value={realtimeSample.sef95}
          unit="Hz"
          icon={Signal}
          cohort={patient.cohort}
          metricType="sef95"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note="95% spectral edge frequency indicates global slowing"
          isHighArtifact={isHighArtifact}
        />

        {/* Asymmetry Card */}
        <MetricCard
          title={copy.metrics.asymmetry}
          value={realtimeSample.asymmetryIdx}
          icon={AlertTriangle}
          cohort={patient.cohort}
          metricType="other"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note="Minimal hemispheric asymmetry"
          isHighArtifact={isHighArtifact}
        >
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl font-bold metric-value text-emerald-600">
              {realtimeSample.asymmetryIdx.toFixed(2)}
            </span>
            {realtimeSample.asymmetrySide && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800">
                {realtimeSample.asymmetrySide}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
              Normal
            </span>
          </div>
        </MetricCard>

        {/* ACNS Card */}
        <MetricCard
          title={copy.metrics.acns}
          value=""
          icon={Zap}
          cohort={patient.cohort}
          metricType="other"
          artifactPct={realtimeSample.artifactPct}
          minutesValid={realtimeSample.minutesValid}
          note={realtimeSample.acnsPattern ? "Lateralized periodic discharges detected" : "No epileptiform activity detected"}
          isHighArtifact={isHighArtifact}
        >
          <div className="space-y-2 mb-3">
            {realtimeSample.acnsPattern ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-red-600">
                    {realtimeSample.acnsPattern}s
                  </span>
                  {realtimeSample.acnsSide && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800">
                      {realtimeSample.acnsSide}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm metric-value text-red-600">2.3</span>
                  <span className="text-xs text-muted-foreground">events/hour</span>
                </div>
              </>
            ) : (
              <span className="text-lg font-semibold text-emerald-600">None</span>
            )}
          </div>
        </MetricCard>

        {/* Signal Quality Card */}
        <MetricCard
          title={copy.labels.quality}
          value=""
          icon={ChartBar}
          cohort={patient.cohort}
          metricType="other"
          note="Low artifact levels, interpretation reliable"
        >
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{copy.labels.artifact}</span>
              <span className="text-sm font-medium metric-value text-emerald-600">
                {Math.round(realtimeSample.artifactPct)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{copy.labels.minutesValid}</span>
              <span className="text-sm font-medium metric-value">
                {realtimeSample.minutesValid}/20
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                {realtimeSample.artifactPct <= 10 ? 'Good' : realtimeSample.artifactPct <= 30 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>
        </MetricCard>
      </div>

      {/* Event Timeline */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Event Timeline</h3>
          <div className="flex space-x-2">
            <button className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              All
            </button>
            <button className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent">
              Medication
            </button>
            <button className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent">
              Pattern
            </button>
            <button className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent">
              Notes
            </button>
          </div>
        </div>
        
        <EventTimeline events={timelineEvents} />
      </div>
    </div>
  );
}
