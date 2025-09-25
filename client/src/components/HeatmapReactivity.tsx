import { Eye, VolumeX, Hand } from "lucide-react";
import { type Session } from "@shared/schema";
import { formatDate } from "@/utils/formatting";

interface HeatmapReactivityProps {
  sessions: Session[];
}

export function HeatmapReactivity({ sessions }: HeatmapReactivityProps) {
  const getReactivityIcon = (reactivity: string) => {
    switch (reactivity) {
      case 'present':
        return <Eye className="h-3 w-3 text-white" />;
      case 'uncertain':
        return <span className="text-white text-xs">?</span>;
      case 'absent':
        return <VolumeX className="h-3 w-3 text-white" />;
      default:
        return null;
    }
  };

  const getReactivityColor = (reactivity: string) => {
    switch (reactivity) {
      case 'present':
        return 'bg-emerald-500';
      case 'uncertain':
        return 'bg-amber-500';
      case 'absent':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6" data-testid="heatmap-reactivity">
      <h3 className="text-lg font-semibold mb-4">Reactivity Matrix</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-6 gap-1 text-xs">
          <div></div>
          {sessions.slice(0, 5).map((session) => (
            <div key={session.id} className="text-center text-muted-foreground">
              {formatDate(session.date)}
            </div>
          ))}
        </div>
        
        {/* Light reactivity row */}
        <div className="grid grid-cols-6 gap-1 items-center">
          <div className="text-xs text-muted-foreground">Light</div>
          {sessions.slice(0, 5).map((session) => (
            <div 
              key={`light-${session.id}`} 
              className={`h-6 rounded flex items-center justify-center ${getReactivityColor(session.reactivityLight)}`}
              title={`Light: ${session.reactivityLight}`}
            >
              {getReactivityIcon(session.reactivityLight)}
            </div>
          ))}
        </div>
        
        {/* Sound reactivity row */}
        <div className="grid grid-cols-6 gap-1 items-center">
          <div className="text-xs text-muted-foreground">Sound</div>
          {sessions.slice(0, 5).map((session) => (
            <div 
              key={`sound-${session.id}`} 
              className={`h-6 rounded flex items-center justify-center ${getReactivityColor(session.reactivitySound)}`}
              title={`Sound: ${session.reactivitySound}`}
            >
              {getReactivityIcon(session.reactivitySound)}
            </div>
          ))}
        </div>
        
        {/* Tactile reactivity row */}
        <div className="grid grid-cols-6 gap-1 items-center">
          <div className="text-xs text-muted-foreground">Tactile</div>
          {sessions.slice(0, 5).map((session) => (
            <div 
              key={`tactile-${session.id}`} 
              className={`h-6 rounded flex items-center justify-center ${getReactivityColor(session.reactivityTactile)}`}
              title={`Tactile: ${session.reactivityTactile}`}
            >
              {getReactivityIcon(session.reactivityTactile)}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="h-2 w-3 bg-emerald-500"></div>
          <span>Present</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-3 bg-amber-500"></div>
          <span>Uncertain</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-3 bg-red-500"></div>
          <span>Absent</span>
        </div>
      </div>
    </div>
  );
}
