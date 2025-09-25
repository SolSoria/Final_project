import { z } from "zod";

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

const conditionSchema = z.object({
  name: z.string(),
  status: z.enum(["active", "resolving", "historical"]).default("active"),
  startedAt: z.date()
});

const medicationSchema = z.object({
  drug: z.string(),
  dose: z.string(),
  route: z.string(),
  start: z.date(),
  end: z.date().optional()
});

const clinicalEventSchema = z.object({
  ts: z.date(),
  kind: z.string(),
  note: z.string()
});

export const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  sex: z.enum(["M", "F", "X"]),
  cohort: z.enum(Cohort),
  setting: z.enum(Setting),
  bed: z.string(),
  conditions: z.array(conditionSchema),
  medications: z.array(medicationSchema),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const sessionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  date: z.date(),
  encephalopathyScore: z.number(),
  deltaPct: z.number(),
  adr: z.number(),
  sef95: z.number(),
  contContinuous: z.number(),
  contDiscontinuous: z.number(),
  contBurst: z.number(),
  contSuppressed: z.number(),
  reactivityLight: z.enum(Reactivity),
  reactivitySound: z.enum(Reactivity),
  reactivityTactile: z.enum(Reactivity),
  seizureBurdenMinPerHour: z.number(),
  seizureEvents: z.number(),
  acnsRatePerHour: z.number().optional(),
  acnsPattern: z.enum(ACNS).optional(),
  acnsSide: z.enum(Side).optional(),
  asymmetryIdx: z.number(),
  asymmetrySide: z.enum(Side).optional(),
  artifactPct: z.number(),
  minutesValid: z.number(),
  clinicalEvents: z.array(clinicalEventSchema),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const realtimeSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  ts: z.date(),
  artifactPct: z.number(),
  minutesValid: z.number(),
  reactivity: z.enum(Reactivity),
  pdrHz: z.number(),
  continuity: z.enum(Continuity),
  asymmetryIdx: z.number(),
  asymmetrySide: z.enum(Side).optional(),
  deltaPct: z.number(),
  adr: z.number(),
  sef95: z.number(),
  acnsPattern: z.enum(ACNS).optional(),
  acnsSide: z.enum(Side).optional(),
  seizureBurdenMinPerHour: z.number(),
  seizureEvents: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const insertPatientSchema = patientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSessionSchema = sessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRealtimeSchema = realtimeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type Patient = z.infer<typeof patientSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type RealtimeSample = z.infer<typeof realtimeSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertRealtimeSample = z.infer<typeof insertRealtimeSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type ClinicalEvent = z.infer<typeof clinicalEventSchema>;
