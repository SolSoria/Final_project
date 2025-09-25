import { type Patient, type Session, type RealtimeSample, type MlPrediction, type InsertPatient, type InsertSession, type InsertRealtimeSample, type InsertMlPrediction, patients, sessions, realtimeSamples, mlPredictions } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatients(): Promise<Patient[]>;
  
  // Sessions
  getSessions(patientId: string): Promise<Session[]>;
  getSession(sessionId: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  getLatestSession(patientId: string): Promise<Session | undefined>;
  
  // Realtime
  getRealtimeSample(patientId: string): Promise<RealtimeSample | undefined>;
  createRealtimeSample(sample: InsertRealtimeSample): Promise<RealtimeSample>;
  getRealtimeSamples(patientId: string, limit?: number): Promise<RealtimeSample[]>;
  
  // ML Predictions
  getMlPredictions(patientId: string): Promise<MlPrediction[]>;
  createMlPrediction(prediction: InsertMlPrediction): Promise<MlPrediction>;
  getMlPredictionForSession(sessionId: string): Promise<MlPrediction | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Helper functions for JSON field serialization/deserialization
  private serializeConditions(conditions: any[]): any[] {
    return conditions.map(c => ({
      ...c,
      startedAt: c.startedAt instanceof Date ? c.startedAt.toISOString() : c.startedAt
    }));
  }

  private serializeMedications(medications: any[]): any[] {
    return medications.map(m => ({
      ...m,
      start: m.start instanceof Date ? m.start.toISOString() : m.start,
      end: m.end && m.end instanceof Date ? m.end.toISOString() : m.end
    }));
  }

  private serializeClinicalEvents(events: any[]): any[] {
    return events.map(e => ({
      ...e,
      ts: e.ts instanceof Date ? e.ts.toISOString() : e.ts
    }));
  }
  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patientData = {
      ...insertPatient,
      id,
      conditions: this.serializeConditions(insertPatient.conditions || []),
      medications: this.serializeMedications(insertPatient.medications || [])
    };
    const [patient] = await db
      .insert(patients)
      .values(patientData)
      .returning();
    return patient;
  }

  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async getSessions(patientId: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.patientId, patientId))
      .orderBy(sessions.date);
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const sessionData = {
      ...insertSession,
      id,
      clinicalEvents: this.serializeClinicalEvents(insertSession.clinicalEvents || [])
    };
    const [session] = await db
      .insert(sessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getLatestSession(patientId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.patientId, patientId))
      .orderBy(desc(sessions.date))
      .limit(1);
    return session || undefined;
  }

  async getRealtimeSample(patientId: string): Promise<RealtimeSample | undefined> {
    const [sample] = await db
      .select()
      .from(realtimeSamples)
      .where(eq(realtimeSamples.patientId, patientId))
      .orderBy(desc(realtimeSamples.ts))
      .limit(1);
    return sample || undefined;
  }

  async createRealtimeSample(insertSample: InsertRealtimeSample): Promise<RealtimeSample> {
    const id = randomUUID();
    const [sample] = await db
      .insert(realtimeSamples)
      .values({ ...insertSample, id })
      .returning();
    return sample;
  }

  async getRealtimeSamples(patientId: string, limit = 10): Promise<RealtimeSample[]> {
    return await db
      .select()
      .from(realtimeSamples)
      .where(eq(realtimeSamples.patientId, patientId))
      .orderBy(desc(realtimeSamples.ts))
      .limit(limit);
  }

  async getMlPredictions(patientId: string): Promise<MlPrediction[]> {
    return await db
      .select()
      .from(mlPredictions)
      .where(eq(mlPredictions.patientId, patientId))
      .orderBy(desc(mlPredictions.createdAt));
  }

  async createMlPrediction(insertPrediction: InsertMlPrediction): Promise<MlPrediction> {
    const id = randomUUID();
    const [prediction] = await db
      .insert(mlPredictions)
      .values({ ...insertPrediction, id })
      .returning();
    return prediction;
  }

  async getMlPredictionForSession(sessionId: string): Promise<MlPrediction | undefined> {
    const [prediction] = await db
      .select()
      .from(mlPredictions)
      .where(eq(mlPredictions.sessionId, sessionId))
      .limit(1);
    return prediction || undefined;
  }
}

export const storage = new DatabaseStorage();
