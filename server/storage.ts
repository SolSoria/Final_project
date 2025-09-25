import { type Patient, type Session, type RealtimeSample, type InsertPatient, type InsertSession, type InsertRealtimeSample } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatients(): Promise<Patient[]>;
  
  // Sessions
  getSessions(patientId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  getLatestSession(patientId: string): Promise<Session | undefined>;
  
  // Realtime
  getRealtimeSample(patientId: string): Promise<RealtimeSample | undefined>;
  createRealtimeSample(sample: InsertRealtimeSample): Promise<RealtimeSample>;
  getRealtimeSamples(patientId: string, limit?: number): Promise<RealtimeSample[]>;
}

export class MemStorage implements IStorage {
  private patients: Map<string, Patient> = new Map();
  private sessions: Map<string, Session> = new Map();
  private realtimeSamples: Map<string, RealtimeSample> = new Map();

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const now = new Date();
    const patient: Patient = { 
      ...insertPatient, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.patients.set(id, patient);
    return patient;
  }

  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getSessions(patientId: string): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.patientId === patientId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const now = new Date();
    const session: Session = { 
      ...insertSession, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.sessions.set(id, session);
    return session;
  }

  async getLatestSession(patientId: string): Promise<Session | undefined> {
    const sessions = await this.getSessions(patientId);
    return sessions[sessions.length - 1];
  }

  async getRealtimeSample(patientId: string): Promise<RealtimeSample | undefined> {
    return Array.from(this.realtimeSamples.values())
      .filter(sample => sample.patientId === patientId)
      .sort((a, b) => b.ts.getTime() - a.ts.getTime())[0];
  }

  async createRealtimeSample(insertSample: InsertRealtimeSample): Promise<RealtimeSample> {
    const id = randomUUID();
    const now = new Date();
    const sample: RealtimeSample = { 
      ...insertSample, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.realtimeSamples.set(id, sample);
    return sample;
  }

  async getRealtimeSamples(patientId: string, limit = 10): Promise<RealtimeSample[]> {
    return Array.from(this.realtimeSamples.values())
      .filter(sample => sample.patientId === patientId)
      .sort((a, b) => b.ts.getTime() - a.ts.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
