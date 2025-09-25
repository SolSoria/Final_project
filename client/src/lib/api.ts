import { type Patient, type Session, type RealtimeSample } from "@shared/schema";

const BASE_URL = '/api';

export const api = {
  // Patients
  getPatients: async (params?: { search?: string; cohort?: string; setting?: string }): Promise<Patient[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.cohort) searchParams.append('cohort', params.cohort);
    if (params?.setting) searchParams.append('setting', params.setting);
    
    const url = `${BASE_URL}/patients${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch patients');
    return response.json();
  },

  getPatient: async (id: string): Promise<Patient> => {
    const response = await fetch(`${BASE_URL}/patient/${id}`);
    if (!response.ok) throw new Error('Failed to fetch patient');
    return response.json();
  },

  // Sessions  
  getSessions: async (patientId: string): Promise<Session[]> => {
    const response = await fetch(`${BASE_URL}/sessions/${patientId}`);
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  // Realtime
  getRealtimeSample: async (patientId: string): Promise<RealtimeSample | null> => {
    const response = await fetch(`${BASE_URL}/realtime/${patientId}`);
    if (!response.ok) throw new Error('Failed to fetch realtime data');
    return response.json();
  },

  getRealtimeHistory: async (patientId: string, limit = 10): Promise<RealtimeSample[]> => {
    const response = await fetch(`${BASE_URL}/realtime/${patientId}/history?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch realtime history');
    return response.json();
  },

  // Timeline events
  getTimelineEvents: async (patientId: string, limit = 20): Promise<any[]> => {
    const response = await fetch(`${BASE_URL}/timeline/${patientId}?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch timeline events');
    return response.json();
  }
};
