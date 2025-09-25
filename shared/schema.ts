import { z } from "zod";
import { pgTable, text, integer, timestamp, real, jsonb, serial, varchar } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const Cohort = ["PEDS", "ADULT", "GERIATRIC"] as const;
export const Setting = ["AMBULATORY", "WARD", "ICU"] as const;
export const Reactivity = ["present", "uncertain", "absent"] as const;
export const Continuity = ["continuous", "discontinuous", "burst_suppression", "suppressed"] as const;
export const ACNS = ["LPD", "GPD", "LRDA", "GRDA"] as const;
export const Side = ["L", "R"] as const;

export type CohortType = typeof Cohort[number];
export type SettingType = typeof Setting[number];
export type ReactivityType = typeof Reactivity[number];
export type ContinuityType = typeof Continuity[number];
export type ACNSType = typeof ACNS[number];
export type SideType = typeof Side[number];

// Drizzle ORM Table Definitions
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  sex: text("sex").notNull().$type<"M" | "F" | "X">(),
  cohort: text("cohort").notNull().$type<CohortType>(),
  setting: text("setting").notNull().$type<SettingType>(),
  bed: text("bed").notNull(),
  conditions: jsonb("conditions").$type<Condition[]>().notNull().default([]),
  medications: jsonb("medications").$type<Medication[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").notNull(),
  date: timestamp("date").notNull(),
  encephalopathyScore: real("encephalopathy_score").notNull(),
  deltaPct: real("delta_pct").notNull(),
  adr: real("adr").notNull(),
  sef95: real("sef95").notNull(),
  contContinuous: real("cont_continuous").notNull(),
  contDiscontinuous: real("cont_discontinuous").notNull(),
  contBurst: real("cont_burst").notNull(),
  contSuppressed: real("cont_suppressed").notNull(),
  reactivityLight: text("reactivity_light").notNull().$type<ReactivityType>(),
  reactivitySound: text("reactivity_sound").notNull().$type<ReactivityType>(),
  reactivityTactile: text("reactivity_tactile").notNull().$type<ReactivityType>(),
  seizureBurdenMinPerHour: real("seizure_burden_min_per_hour").notNull(),
  seizureEvents: integer("seizure_events").notNull(),
  acnsRatePerHour: real("acns_rate_per_hour"),
  acnsPattern: text("acns_pattern").$type<ACNSType>(),
  acnsSide: text("acns_side").$type<SideType>(),
  asymmetryIdx: real("asymmetry_idx").notNull(),
  asymmetrySide: text("asymmetry_side").$type<SideType>(),
  artifactPct: real("artifact_pct").notNull(),
  minutesValid: real("minutes_valid").notNull(),
  clinicalEvents: jsonb("clinical_events").$type<ClinicalEvent[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const realtimeSamples = pgTable("realtime_samples", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").notNull(),
  ts: timestamp("ts").notNull(),
  artifactPct: real("artifact_pct").notNull(),
  minutesValid: real("minutes_valid").notNull(),
  reactivity: text("reactivity").notNull().$type<ReactivityType>(),
  pdrHz: real("pdr_hz").notNull(),
  continuity: text("continuity").notNull().$type<ContinuityType>(),
  asymmetryIdx: real("asymmetry_idx").notNull(),
  asymmetrySide: text("asymmetry_side").$type<SideType>(),
  deltaPct: real("delta_pct").notNull(),
  adr: real("adr").notNull(),
  sef95: real("sef95").notNull(),
  acnsPattern: text("acns_pattern").$type<ACNSType>(),
  acnsSide: text("acns_side").$type<SideType>(),
  seizureBurdenMinPerHour: real("seizure_burden_min_per_hour").notNull(),
  seizureEvents: integer("seizure_events").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations
export const patientsRelations = relations(patients, ({ many }) => ({
  sessions: many(sessions),
  realtimeSamples: many(realtimeSamples)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  patient: one(patients, {
    fields: [sessions.patientId],
    references: [patients.id]
  })
}));

export const realtimeSamplesRelations = relations(realtimeSamples, ({ one }) => ({
  patient: one(patients, {
    fields: [realtimeSamples.patientId],
    references: [patients.id]
  })
}));

// Zod schemas for nested data structures - updated for JSON serialization
const conditionSchema = z.object({
  name: z.string(),
  status: z.enum(["active", "resolving", "historical"]).default("active"),
  startedAt: z.string().transform(val => new Date(val))
});

const medicationSchema = z.object({
  drug: z.string(),
  dose: z.string(),
  route: z.string(),
  start: z.string().transform(val => new Date(val)),
  end: z.string().transform(val => new Date(val)).optional()
});

const clinicalEventSchema = z.object({
  ts: z.string().transform(val => new Date(val)),
  kind: z.string(),
  note: z.string()
});

// Generated schemas from Drizzle tables
export const patientSchema = createSelectSchema(patients);
export const sessionSchema = createSelectSchema(sessions);
export const realtimeSchema = createSelectSchema(realtimeSamples);

export const insertPatientSchema = createInsertSchema(patients);
export const insertSessionSchema = createInsertSchema(sessions);
export const insertRealtimeSchema = createInsertSchema(realtimeSamples);

// Types inferred from tables
export type Patient = typeof patients.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type RealtimeSample = typeof realtimeSamples.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;
export type InsertSession = typeof sessions.$inferInsert;
export type InsertRealtimeSample = typeof realtimeSamples.$inferInsert;
export type Condition = z.infer<typeof conditionSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type ClinicalEvent = z.infer<typeof clinicalEventSchema>;
