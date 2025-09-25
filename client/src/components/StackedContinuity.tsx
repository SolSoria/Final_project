import { type Session } from "@shared/schema";
import { formatDate } from "@/utils/formatting";

interface StackedContinuityProps {
  sessions: Session[];
}

export function StackedContinuity({ sessions }: StackedContinuityProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6" data-testid="stacked-continuity">
      <h3 className="text-lg font-semibold mb-4">Background Continuity</h3>
      <div className="space-y-3">
        {sessions.map((session, index) => {
          const total = session.contContinuous + session.contDiscontinuous + session.contBurst + session.contSuppressed;
          const continuousPct = (session.contContinuous / total) * 100;
          const discontinuousPct = (session.contDiscontinuous / total) * 100;
          const burstPct = (session.contBurst / total) * 100;
          const suppressedPct = (session.contSuppressed / total) * 100;
          
          return (
            <div key={session.id} className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground w-16">
                {formatDate(session.date)}
              </span>
              <div className="flex-1 h-6 rounded overflow-hidden">
                <div className="h-full flex">
                  {continuousPct > 0 && (
                    <div 
                      className="bg-emerald-500" 
                      style={{ width: `${continuousPct}%` }}
                      title={`Continuous: ${Math.round(continuousPct)}%`}
                    />
                  )}
                  {discontinuousPct > 0 && (
                    <div 
                      className="bg-amber-500" 
                      style={{ width: `${discontinuousPct}%` }}
                      title={`Discontinuous: ${Math.round(discontinuousPct)}%`}
                    />
                  )}
                  {burstPct > 0 && (
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${burstPct}%` }}
                      title={`Burst Suppression: ${Math.round(burstPct)}%`}
                    />
                  )}
                  {suppressedPct > 0 && (
                    <div 
                      className="bg-gray-700" 
                      style={{ width: `${suppressedPct}%` }}
                      title={`Suppressed: ${Math.round(suppressedPct)}%`}
                    />
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-12">
                {Math.round(continuousPct)}%
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="h-2 w-3 bg-emerald-500"></div>
          <span>Continuous</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-3 bg-amber-500"></div>
          <span>Discontinuous</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-3 bg-red-500"></div>
          <span>Burst Suppression</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-3 bg-gray-700"></div>
          <span>Suppressed</span>
        </div>
      </div>
    </div>
  );
}
