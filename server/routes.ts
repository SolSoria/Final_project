import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertPatientSchema, insertSessionSchema, insertRealtimeSchema, insertMlPredictionSchema, Cohort, Setting } from "@shared/schema";
import { randomForestModel } from "./ml/randomForest";
import { ClinicalReportService } from "./pdf/clinical-report";
import { z } from "zod";

// Schema for patient search/filter query parameters
const patientFiltersSchema = z.object({
  search: z.string().optional(),
  cohort: z.enum(Cohort).optional(),
  setting: z.enum(Setting).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get patient by ID
  app.get("/api/patient/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  // Get all patients with optional search and filtering
  app.get("/api/patients", async (req, res) => {
    try {
      // Validate query parameters using schema
      const parseResult = patientFiltersSchema.safeParse(req.query);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: parseResult.error.errors 
        });
      }
      
      const filters = parseResult.data;
      
      // Only pass non-empty filters to storage
      const cleanFilters = Object.keys(filters).length > 0 ? filters : undefined;
      const patients = await storage.getPatients(cleanFilters);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  // Create patient
  app.post("/api/patients", async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid patient data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create patient" });
      }
    }
  });

  // Get sessions for patient
  app.get("/api/sessions/:patientId", async (req, res) => {
    try {
      const sessions = await storage.getSessions(req.params.patientId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Create session
  app.post("/api/sessions", async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create session" });
      }
    }
  });

  // Get ML predictions for patient
  app.get("/api/ml-predictions/:patientId", async (req, res) => {
    try {
      const predictions = await storage.getMlPredictions(req.params.patientId);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ML predictions" });
    }
  });

  // Generate ML prediction for session
  app.post("/api/ml-predictions/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      // Check if prediction already exists
      const existingPrediction = await storage.getMlPredictionForSession(sessionId);
      if (existingPrediction) {
        return res.json(existingPrediction);
      }

      // Get the session to make prediction for
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Generate ML prediction using Random Forest model
      const mlPrediction = randomForestModel.predict(session);
      
      // Save prediction to database
      const predictionData = {
        sessionId: session.id,
        patientId: session.patientId,
        modelVersion: randomForestModel.getModelVersion(),
        encephalopathyScore: mlPrediction.encephalopathyScore,
        deltaPct: mlPrediction.deltaPct,
        adr: mlPrediction.adr,
        sef95: mlPrediction.sef95,
        confidence: mlPrediction.confidence,
        features: mlPrediction.features
      };

      const validatedData = insertMlPredictionSchema.parse(predictionData);
      const savedPrediction = await storage.createMlPrediction(validatedData);
      
      res.status(201).json(savedPrediction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid prediction data", details: error.errors });
      } else {
        console.error("ML prediction error:", error);
        res.status(500).json({ error: "Failed to generate ML prediction" });
      }
    }
  });

  // Get realtime data for patient
  app.get("/api/realtime/:patientId", async (req, res) => {
    try {
      // In live mode, we would try to fetch from LSL Gateway first
      const mode = process.env.MODE || "simulation";
      
      if (mode === "live") {
        try {
          const lslUrl = process.env.LSL_GATEWAY_URL || "http://localhost:7070/rt";
          const response = await fetch(`${lslUrl}?patientId=${req.params.patientId}`, {
            signal: AbortSignal.timeout(1500)
          });
          if (response.ok) {
            const data = await response.json();
            return res.json(data);
          }
        } catch {
          // Fall through to database query
        }
      }

      // Fallback to latest realtime sample from storage
      const sample = await storage.getRealtimeSample(req.params.patientId);
      res.json(sample || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch realtime data" });
    }
  });

  // Create realtime sample
  app.post("/api/realtime", async (req, res) => {
    try {
      const validatedData = insertRealtimeSchema.parse(req.body);
      const sample = await storage.createRealtimeSample(validatedData);
      res.status(201).json(sample);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid realtime data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create realtime sample" });
      }
    }
  });

  // Get realtime history for patient
  app.get("/api/realtime/:patientId/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const samples = await storage.getRealtimeSamples(req.params.patientId, limit);
      res.json(samples);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch realtime history" });
    }
  });

  // Get timeline events for patient  
  app.get("/api/timeline/:patientId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      
      // Get recent sessions with clinical events
      const sessions = await storage.getSessions(req.params.patientId);
      const recentSessions = sessions.slice(-5); // Last 5 sessions
      
      // Get recent realtime samples
      const realtimeSamples = await storage.getRealtimeSamples(req.params.patientId, 10);
      
      // Extract timeline events from clinical events and recent samples
      const timelineEvents = [];
      
      // Add clinical events from sessions
      for (const session of recentSessions) {
        if (session.clinicalEvents && session.clinicalEvents.length > 0) {
          for (const event of session.clinicalEvents) {
            timelineEvents.push({
              id: `session-${session.id}-event-${event.ts}`,
              type: event.kind,
              title: event.kind,
              description: event.note,
              timestamp: event.ts
            });
          }
        }
      }
      
      // Add sample-based events (e.g., seizure detection, ACNS patterns)
      for (let i = 0; i < realtimeSamples.length - 1; i++) {
        const current = realtimeSamples[i];
        const previous = realtimeSamples[i + 1];
        
        // Detect seizure events
        if (current.seizureEvents > previous.seizureEvents) {
          timelineEvents.push({
            id: `seizure-${current.id}`,
            type: 'seizure',
            title: 'Seizure activity detected',
            description: `${current.seizureEvents - previous.seizureEvents} new seizure event(s) detected`,
            timestamp: current.ts
          });
        }
        
        // Detect ACNS pattern changes
        if (current.acnsPattern && current.acnsPattern !== previous.acnsPattern) {
          timelineEvents.push({
            id: `acns-${current.id}`,
            type: 'pattern',
            title: `${current.acnsPattern} pattern detected`,
            description: `New ${current.acnsPattern} pattern identified${current.acnsSide ? ` (${current.acnsSide} side)` : ''}`,
            timestamp: current.ts
          });
        }
      }
      
      // Sort by timestamp (most recent first) and limit
      timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(timelineEvents.slice(0, limit));
    } catch (error) {
      console.error("Timeline error:", error);
      res.status(500).json({ error: "Failed to fetch timeline events" });
    }
  });

  // PDF Export Routes
  const reportService = new ClinicalReportService();

  // Generate PDF report for patient
  app.get("/api/export/pdf/:patientId", async (req, res) => {
    try {
      const patientId = req.params.patientId;
      const includeML = req.query.includeML === 'true';
      const daysBack = parseInt(req.query.daysBack as string) || 30;

      // Get patient data
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get sessions for the specified time range
      const sessions = await storage.getSessions(patientId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      
      const filteredSessions = sessions.filter(session => 
        new Date(session.date) >= cutoffDate
      );

      if (filteredSessions.length === 0) {
        return res.status(404).json({ error: "No sessions found in the specified date range" });
      }

      // Get ML predictions if requested
      let mlPredictions: any[] = [];
      if (includeML) {
        mlPredictions = await storage.getMlPredictions(patientId);
      }

      // Generate the report
      const reportBuffer = await reportService.generateReport({
        patient,
        sessions: filteredSessions,
        mlPredictions,
        dateRange: {
          start: cutoffDate,
          end: new Date()
        },
        includeML
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="clinical-report-${patient.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`);
      
      res.send(reportBuffer);
    } catch (error) {
      console.error("PDF export error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Generate quick report for latest session
  app.get("/api/export/session/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const includeML = req.query.includeML === 'true';

      // Get session data
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Get patient data
      const patient = await storage.getPatient(session.patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Get ML prediction if requested
      let mlPredictions: any[] = [];
      if (includeML) {
        const mlPrediction = await storage.getMlPredictionForSession(sessionId);
        if (mlPrediction) {
          mlPredictions = [mlPrediction];
        }
      }

      // Generate the report for single session
      const reportBuffer = await reportService.generateReport({
        patient,
        sessions: [session],
        mlPredictions,
        dateRange: {
          start: new Date(session.date),
          end: new Date(session.date)
        },
        includeML
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="session-report-${patient.name.replace(/\s+/g, '-')}-${new Date(session.date).toISOString().split('T')[0]}.pdf"`);
      
      res.send(reportBuffer);
    } catch (error) {
      console.error("Session export error:", error);
      res.status(500).json({ error: "Failed to generate session report" });
    }
  });

  // Seed endpoint for development
  app.post("/api/seed", async (req, res) => {
    try {
      const { seedData } = await import("../scripts/seed");
      await seedData();
      res.json({ message: "Seed data created successfully" });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed data" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time EEG streaming
  // Use a specific path to avoid conflicts with Vite's HMR WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/realtime'
  });
  
  // LSL Gateway integration for live EEG data
  interface LSLGatewayClient {
    patientId: string;
    connected: boolean;
    lastUpdate: Date;
    intervalId?: NodeJS.Timeout;
    subscriberCount: number; // Track how many WebSocket clients are subscribed
  }
  
  interface WebSocketClient {
    ws: any;
    subscribedPatients: Set<string>;
  }
  
  const lslClients = new Map<string, LSLGatewayClient>();
  const wsClients = new Map<any, WebSocketClient>();
  
  // Function to generate simulated EEG data with realistic variations
  function generateSimulatedEEGData(patientId: string, previousSample?: any) {
    const jitter = (base: number, variance: number) => Math.max(0, base + (Math.random() * 2 - 1) * variance);
    
    // Use previous sample as baseline or default values
    const baseline = previousSample || {
      artifactPct: 12,
      pdrHz: 10,
      deltaPct: 12,
      adr: 1.3,
      sef95: 13.5,
      asymmetryIdx: 0.08
    };
    
    return {
      patientId,
      ts: new Date(),
      artifactPct: jitter(baseline.artifactPct, 3),
      minutesValid: 20,
      reactivity: Math.random() > 0.95 ? (Math.random() > 0.5 ? 'uncertain' : 'absent') : 'present',
      pdrHz: jitter(baseline.pdrHz, 0.5),
      continuity: Math.random() > 0.98 ? 'discontinuous' : 'continuous',
      asymmetryIdx: jitter(baseline.asymmetryIdx, 0.02),
      asymmetrySide: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'left' : 'right') : null,
      deltaPct: jitter(baseline.deltaPct, 2),
      adr: jitter(baseline.adr, 0.2),
      sef95: jitter(baseline.sef95, 1),
      acnsPattern: Math.random() > 0.95 ? 'LPDs' : null,
      acnsSide: Math.random() > 0.95 ? (Math.random() > 0.5 ? 'left' : 'right') : null,
      seizureBurdenMinPerHour: Math.random() > 0.98 ? Math.floor(Math.random() * 3) : 0,
      seizureEvents: Math.random() > 0.99 ? Math.floor(Math.random() * 2) : 0
    };
  }

  // Function to fetch data from LSL Gateway
  async function fetchFromLSLGateway(patientId: string) {
    try {
      const lslUrl = process.env.LSL_GATEWAY_URL || "http://localhost:7070/realtime";
      const response = await fetch(`${lslUrl}?patientId=${patientId}`, {
        signal: AbortSignal.timeout(2000),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NeuroScopeQ/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Validate the data structure
        if (data && typeof data === 'object') {
          const realtimeData = {
            patientId,
            ts: new Date(),
            artifactPct: data.artifact_pct || 12,
            minutesValid: data.minutes_valid || 20,
            reactivity: data.reactivity || "present",
            pdrHz: data.pdr_hz || 10,
            continuity: data.continuity || "continuous",
            asymmetryIdx: data.asymmetry_idx || 0.08,
            asymmetrySide: data.asymmetry_side || null,
            deltaPct: data.delta_pct || 12,
            adr: data.adr || 1.3,
            sef95: data.sef95 || 13.5,
            acnsPattern: data.acns_pattern || null,
            acnsSide: data.acns_side || null,
            seizureBurdenMinPerHour: data.seizure_burden || 0,
            seizureEvents: data.seizure_events || 0
          };
          
          // Store in database
          await storage.createRealtimeSample(realtimeData);
          
          // Broadcast to connected WebSocket clients
          broadcastRealtimeUpdate(patientId, realtimeData);
          
          return realtimeData;
        }
      }
    } catch (error) {
      console.warn(`LSL Gateway fetch failed for patient ${patientId}:`, error.message);
    }
    
    // LSL Gateway failed, generate simulated data
    try {
      const previousSample = await storage.getRealtimeSample(patientId);
      const simulatedData = generateSimulatedEEGData(patientId, previousSample);
      
      // Store simulated data in database
      await storage.createRealtimeSample(simulatedData);
      
      // Broadcast to connected WebSocket clients
      broadcastRealtimeUpdate(patientId, simulatedData);
      
      console.log(`Generated simulated EEG data for patient ${patientId}`);
      return simulatedData;
    } catch (error) {
      console.error(`Failed to generate simulated data for patient ${patientId}:`, error.message);
      return null;
    }
  }
  
  // Function to broadcast real-time updates to specific patient subscribers
  function broadcastRealtimeUpdate(patientId: string, data: any) {
    const message = JSON.stringify({
      type: 'realtime_update',
      patientId,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Only send to clients subscribed to this specific patient
    wsClients.forEach((clientInfo, ws) => {
      if (ws.readyState === 1 && clientInfo.subscribedPatients.has(patientId)) { // WebSocket.OPEN
        try {
          ws.send(message);
        } catch (error) {
          console.warn('Failed to send WebSocket message:', error.message);
        }
      }
    });
  }
  
  // WebSocket connection handler
  wss.on('connection', (ws, req) => {
    console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
    
    // Initialize client tracking
    wsClients.set(ws, {
      ws,
      subscribedPatients: new Set()
    });
    
    // Send connection acknowledgment
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
    
    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribe' && message.patientId) {
          const patientId = message.patientId;
          const clientInfo = wsClients.get(ws);
          
          if (clientInfo) {
            // Add patient to this client's subscription list
            clientInfo.subscribedPatients.add(patientId);
            
            // Start or increment LSL Gateway monitoring for this patient
            let lslClient = lslClients.get(patientId);
            if (!lslClient) {
              lslClient = {
                patientId,
                connected: true,
                lastUpdate: new Date(),
                subscriberCount: 0
              };
              
              // Fetch initial data immediately
              await fetchFromLSLGateway(patientId);
              
              // Set up periodic fetching every 2 seconds for live data
              lslClient.intervalId = setInterval(async () => {
                const data = await fetchFromLSLGateway(patientId);
                if (data) {
                  lslClient!.lastUpdate = new Date();
                }
              }, 2000);
              
              lslClients.set(patientId, lslClient);
              console.log(`Started LSL monitoring for patient ${patientId}`);
            }
            
            // Increment subscriber count
            lslClient.subscriberCount++;
            console.log(`Client subscribed to patient ${patientId} (${lslClient.subscriberCount} total subscribers)`);
            
            // Send current realtime data to the client
            const currentData = await storage.getRealtimeSample(patientId);
            if (currentData) {
              ws.send(JSON.stringify({
                type: 'realtime_data',
                patientId,
                data: currentData,
                timestamp: new Date().toISOString()
              }));
            }
          }
        }
        
        if (message.type === 'unsubscribe' && message.patientId) {
          const patientId = message.patientId;
          const clientInfo = wsClients.get(ws);
          
          if (clientInfo) {
            // Remove patient from this client's subscription list
            clientInfo.subscribedPatients.delete(patientId);
            
            // Decrement subscriber count and stop monitoring if no more subscribers
            const lslClient = lslClients.get(patientId);
            if (lslClient) {
              lslClient.subscriberCount--;
              console.log(`Client unsubscribed from patient ${patientId} (${lslClient.subscriberCount} remaining subscribers)`);
              
              // Only stop monitoring if no more subscribers
              if (lslClient.subscriberCount <= 0 && lslClient.intervalId) {
                clearInterval(lslClient.intervalId);
                lslClients.delete(patientId);
                console.log(`Stopped LSL monitoring for patient ${patientId} (no more subscribers)`);
              }
            }
          }
        }
        
      } catch (error) {
        console.error('WebSocket message error:', error.message);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Clean up client subscriptions
      const clientInfo = wsClients.get(ws);
      if (clientInfo) {
        // Unsubscribe from all patients this client was subscribed to
        clientInfo.subscribedPatients.forEach(patientId => {
          const lslClient = lslClients.get(patientId);
          if (lslClient) {
            lslClient.subscriberCount--;
            console.log(`Auto-unsubscribed disconnected client from patient ${patientId} (${lslClient.subscriberCount} remaining subscribers)`);
            
            // Stop monitoring if no more subscribers
            if (lslClient.subscriberCount <= 0 && lslClient.intervalId) {
              clearInterval(lslClient.intervalId);
              lslClients.delete(patientId);
              console.log(`Stopped LSL monitoring for patient ${patientId} (no more subscribers)`);
            }
          }
        });
        
        // Remove client from tracking
        wsClients.delete(ws);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });
  });
  
  // Cleanup LSL clients on server shutdown
  process.on('SIGTERM', () => {
    lslClients.forEach(client => {
      if (client.intervalId) {
        clearInterval(client.intervalId);
      }
    });
    lslClients.clear();
  });
  
  return httpServer;
}
