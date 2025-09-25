import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeSample } from '@shared/schema';

interface WebSocketMessage {
  type: 'connection' | 'realtime_update' | 'realtime_data' | 'error';
  patientId?: string;
  data?: RealtimeSample;
  status?: string;
  message?: string;
  timestamp: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (patientId: string) => void;
  unsubscribe: (patientId: string) => void;
  latestData: RealtimeSample | null;
  error: string | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [latestData, setLatestData] = useState<RealtimeSample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subscribedPatients = useRef<Set<string>>(new Set());
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/realtime`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected for real-time EEG streaming');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttempts.current = 0;

        // Re-subscribe to any previously subscribed patients
        subscribedPatients.current.forEach(patientId => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'subscribe',
              patientId
            }));
          }
        });
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connection':
              console.log('WebSocket connection acknowledged');
              break;
              
            case 'realtime_update':
            case 'realtime_data':
              // Only process messages for patients we're currently subscribed to
              if (message.data && message.patientId && subscribedPatients.current.has(message.patientId)) {
                setLatestData(message.data);
                console.log(`Received real-time data for patient ${message.patientId}`);
              } else if (message.patientId && !subscribedPatients.current.has(message.patientId)) {
                console.log(`Ignored real-time data for unsubscribed patient ${message.patientId}`);
              }
              break;
              
            case 'error':
              console.error('WebSocket error:', message.message);
              setError(message.message || 'Unknown WebSocket error');
              break;
              
            default:
              console.warn('Unknown WebSocket message type:', message.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          setError('Failed to parse server message');
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionStatus('error');
          setError('Failed to reconnect to real-time data stream');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setConnectionStatus('error');
      setError('Failed to establish connection');
    }
  }, []);

  const subscribe = useCallback((patientId: string) => {
    subscribedPatients.current.add(patientId);
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'subscribe',
        patientId
      }));
      console.log(`Subscribed to real-time data for patient ${patientId}`);
    } else {
      // Connect if not already connected
      connect();
    }
  }, [connect]);

  const unsubscribe = useCallback((patientId: string) => {
    subscribedPatients.current.delete(patientId);
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'unsubscribe',
        patientId
      }));
      console.log(`Unsubscribed from real-time data for patient ${patientId}`);
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        // Close with code 1000 (normal closure) to prevent reconnection
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  return {
    isConnected,
    connectionStatus,
    subscribe,
    unsubscribe,
    latestData,
    error
  };
}