import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type MlPrediction, type Session } from "@shared/schema";

interface GenerateMlPredictionParams {
  sessionId: string;
}

// Fetch ML predictions for a patient
export function useMlPredictions(patientId: string) {
  return useQuery<MlPrediction[]>({
    queryKey: ['/api/ml-predictions', patientId],
    queryFn: async () => {
      const response = await fetch(`/api/ml-predictions/${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ML predictions');
      }
      return response.json();
    },
  });
}

// Generate ML prediction for a specific session
export function useGenerateMlPrediction() {
  const queryClient = useQueryClient();
  
  return useMutation<MlPrediction, Error, GenerateMlPredictionParams>({
    mutationFn: async ({ sessionId }) => {
      const response = await fetch(`/api/ml-predictions/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate ML prediction');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch ML predictions for the patient
      queryClient.invalidateQueries({ 
        queryKey: ['/api/ml-predictions', data.patientId] 
      });
    },
  });
}

// Helper function to get ML prediction data for sessions
export function getMlDataForSessions(sessions: Session[], mlPredictions: MlPrediction[]) {
  return sessions.map(session => {
    const mlPrediction = mlPredictions.find(ml => ml.sessionId === session.id);
    return {
      ...session,
      mlPrediction
    };
  });
}