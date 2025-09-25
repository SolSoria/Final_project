import { create } from 'zustand';

interface UIState {
  activeTab: 'current' | 'evolution';
  profileDrawerOpen: boolean;
  selectedPatientId: string | null;
  mlMode: boolean;
  sessionRange: 'last5' | 'last10' | 'custom';
  selectedMetrics: string[];
  environment: 'simulation' | 'hardware' | null;
  isRecording: boolean;
  recordingStartTime: Date | null;
  
  setActiveTab: (tab: 'current' | 'evolution') => void;
  setProfileDrawerOpen: (open: boolean) => void;
  setSelectedPatientId: (id: string | null) => void;
  setMLMode: (enabled: boolean) => void;
  setSessionRange: (range: 'last5' | 'last10' | 'custom') => void;
  toggleMetric: (metric: string) => void;
  setEnvironment: (env: 'simulation' | 'hardware') => void;
  startRecording: () => void;
  stopRecording: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'current',
  profileDrawerOpen: false,
  selectedPatientId: null,
  mlMode: false,
  sessionRange: 'last5',
  selectedMetrics: ['encephalopathy', 'deltaPct', 'adr', 'sef95'],
  environment: null,
  isRecording: false,
  recordingStartTime: null,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setProfileDrawerOpen: (open) => set({ profileDrawerOpen: open }),
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  setMLMode: (enabled) => set({ mlMode: enabled }),
  setSessionRange: (range) => set({ sessionRange: range }),
  toggleMetric: (metric) => set((state) => ({
    selectedMetrics: state.selectedMetrics.includes(metric)
      ? state.selectedMetrics.filter(m => m !== metric)
      : [...state.selectedMetrics, metric]
  })),
  setEnvironment: (env) => set({ environment: env, selectedPatientId: null }),
  startRecording: () => set({ isRecording: true, recordingStartTime: new Date() }),
  stopRecording: () => set({ isRecording: false, recordingStartTime: null })
}));
