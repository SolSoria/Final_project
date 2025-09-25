export const formatMetricValue = (value: number, unit?: string): string => {
  const formatted = typeof value === 'number' ? value.toFixed(1) : '—';
  return unit ? `${formatted} ${unit}` : formatted;
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const dateObj = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const formatDate = (date: Date | string): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

export const formatDateTime = (date: Date | string): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const formatPatientName = (name: string, age: number, sex: string): string => {
  return `${name}, ${sex}, ${age}`;
};
