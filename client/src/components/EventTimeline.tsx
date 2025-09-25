import { Zap, Pill, TrendingUp } from "lucide-react";
import { formatTimeAgo } from "@/utils/formatting";

interface TimelineEvent {
  id: string;
  type: 'pattern' | 'medication' | 'metric';
  title: string;
  description: string;
  timestamp: Date;
}

interface EventTimelineProps {
  events: TimelineEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <Zap className="h-4 w-4 text-red-600" />;
      case 'medication':
        return <Pill className="h-4 w-4 text-blue-600" />;
      case 'metric':
        return <TrendingUp className="h-4 w-4 text-amber-600" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventBgColor = (type: string) => {
    switch (type) {
      case 'pattern':
        return 'bg-red-100';
      case 'medication':
        return 'bg-blue-100';
      case 'metric':
        return 'bg-amber-100';
      default:
        return 'bg-gray-100';
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8" data-testid="timeline-empty">
        No recent events
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="event-timeline">
      {events.map((event) => (
        <div key={event.id} className="flex items-start space-x-3 rounded-lg border border-border bg-card p-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getEventBgColor(event.type)}`}>
            {getEventIcon(event.type)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm" data-testid={`event-title-${event.id}`}>
                {event.title}
              </span>
              <span className="text-xs text-muted-foreground" data-testid={`event-timestamp-${event.id}`}>
                {formatTimeAgo(event.timestamp)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1" data-testid={`event-description-${event.id}`}>
              {event.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
