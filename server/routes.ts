import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertSessionSchema, insertRealtimeSchema } from "@shared/schema";
import { z } from "zod";

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

  // Get all patients
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getPatients();
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
  return httpServer;
}
