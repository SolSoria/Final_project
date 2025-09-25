import { storage } from "../server/storage.js";

const d = (s: string) => new Date(s);
const jitter = (m: number, s: number) => Math.max(0, m + (Math.random() * 2 - 1) * s);

async function rtBurst(patientId: string, n = 12, base: any = {}) {
  for (let i = 0; i < n; i++) {
    await storage.createRealtimeSample({
      patientId,
      ts: new Date(Date.now() - (n - i) * 5000),
      artifactPct: jitter(base.artifactPct ?? 12, 6),
      minutesValid: 20,
      reactivity: base.reactivity ?? "present",
      pdrHz: base.pdrHz ?? jitter(10, 0.8),
      continuity: base.continuity ?? "continuous",
      asymmetryIdx: jitter(base.asymmetryIdx ?? 0.08, 0.04),
      asymmetrySide: base.asymmetrySide,
      deltaPct: jitter(base.deltaPct ?? 12, 5),
      adr: jitter(base.adr ?? 1.3, 0.3),
      sef95: jitter(base.sef95 ?? 13.5, 1.0),
      acnsPattern: base.acnsPattern,
      acnsSide: base.acnsSide,
      seizureBurdenMinPerHour: base.seizureBurden ?? 0,
      seizureEvents: base.seizureEvents ?? 0
    });
  }
}

async function main() {
  console.log("Seeding NeuroScopeQ database...");

  // A — Normal adult ambulatory
  const A = await storage.createPatient({
    name: "Case A — Normal adult (ambulatory)",
    age: 34,
    sex: "F",
    cohort: "ADULT",
    setting: "AMBULATORY",
    bed: "AMB-01",
    conditions: [{ name: "Migraine", status: "historical", startedAt: d("2025-05-15") }],
    medications: []
  });

  const A_sessions = [
    { date: "2025-06-01", ence: 1.0, delta: 10, adr: 1.35, sef: 13.4, cont: [98, 2, 0, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: null, acnsRate: null, asym: 0.06, asymSide: null, art: 7, min: 20 },
    { date: "2025-06-15", ence: 1.2, delta: 9, adr: 1.42, sef: 14.2, cont: [99, 1, 0, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: null, acnsRate: null, asym: 0.05, asymSide: null, art: 6, min: 20 },
    { date: "2025-07-01", ence: 0.9, delta: 8, adr: 1.52, sef: 14.8, cont: [100, 0, 0, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: null, acnsRate: null, asym: 0.07, asymSide: null, art: 5, min: 20 },
    { date: "2025-07-20", ence: 1.1, delta: 11, adr: 1.28, sef: 12.9, cont: [96, 4, 0, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: null, acnsRate: null, asym: 0.08, asymSide: null, art: 9, min: 20 },
    { date: "2025-08-10", ence: 1.0, delta: 10, adr: 1.4, sef: 13.7, cont: [97, 3, 0, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: null, acnsRate: null, asym: 0.06, asymSide: null, art: 7, min: 20 }
  ];

  for (const s of A_sessions) {
    await storage.createSession({
      patientId: A.id,
      date: d(s.date),
      encephalopathyScore: s.ence,
      deltaPct: s.delta,
      adr: s.adr,
      sef95: s.sef,
      contContinuous: s.cont[0],
      contDiscontinuous: s.cont[1],
      contBurst: s.cont[2],
      contSuppressed: s.cont[3],
      reactivityLight: s.rL as any,
      reactivitySound: s.rS as any,
      reactivityTactile: s.rT as any,
      seizureBurdenMinPerHour: s.sz,
      seizureEvents: s.ev,
      acnsRatePerHour: s.acnsRate || undefined,
      acnsPattern: s.acns as any,
      acnsSide: s.asymSide as any,
      asymmetryIdx: s.asym,
      asymmetrySide: s.asymSide as any,
      artifactPct: s.art,
      minutesValid: s.min,
      clinicalEvents: []
    });
  }
  await rtBurst(A.id);

  // B — Diffuse encephalopathy geriatric ICU (improving)
  const B = await storage.createPatient({
    name: "Case B — Diffuse encephalopathy (GERIATRIC, ICU)",
    age: 72,
    sex: "F",
    cohort: "GERIATRIC",
    setting: "ICU",
    bed: "ICU-12A",
    conditions: [
      { name: "Hepatic encephalopathy", status: "active", startedAt: d("2025-06-01") },
      { name: "Stroke (Left MCA)", status: "resolving", startedAt: d("2025-05-25") }
    ],
    medications: [
      { drug: "Propofol", dose: "20–10 mcg/kg/min", route: "IV", start: d("2025-06-01") },
      { drug: "Levetiracetam", dose: "1000 mg BID", route: "IV", start: d("2025-06-02") }
    ]
  });

  const B_sessions = [
    { date: "2025-06-01", ence: 6.8, delta: 38, adr: 0.35, sef: 7.4, cont: [40, 38, 15, 7], rL: "absent", rS: "absent", rT: "absent", sz: 9, ev: 3, acns: "GRDA", acnsRate: 4.2, asym: 0.10, asymSide: null, art: 18, min: 20 },
    { date: "2025-06-05", ence: 6.0, delta: 36, adr: 0.42, sef: 7.8, cont: [55, 32, 10, 3], rL: "uncertain", rS: "uncertain", rT: "absent", sz: 4, ev: 2, acns: "GRDA", acnsRate: 3.1, asym: 0.09, asymSide: null, art: 16, min: 20 },
    { date: "2025-06-10", ence: 3.8, delta: 33, adr: 0.55, sef: 8.6, cont: [72, 24, 3, 1], rL: "present", rS: "uncertain", rT: "uncertain", sz: 1, ev: 1, acns: null, acnsRate: null, asym: 0.08, asymSide: null, art: 14, min: 20 },
    { date: "2025-06-16", ence: 3.0, delta: 31, adr: 0.62, sef: 9.1, cont: [81, 17, 2, 0], rL: "present", rS: "present", rT: "uncertain", sz: 0, ev: 0, acns: null, acnsRate: null, asym: 0.08, asymSide: null, art: 12, min: 20 },
    { date: "2025-06-22", ence: 2.4, delta: 28, adr: 0.74, sef: 9.8, cont: [88, 11, 1, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: null, acnsRate: null, asym: 0.07, asymSide: null, art: 10, min: 20 }
  ];

  for (const s of B_sessions) {
    await storage.createSession({
      patientId: B.id,
      date: d(s.date),
      encephalopathyScore: s.ence,
      deltaPct: s.delta,
      adr: s.adr,
      sef95: s.sef,
      contContinuous: s.cont[0],
      contDiscontinuous: s.cont[1],
      contBurst: s.cont[2],
      contSuppressed: s.cont[3],
      reactivityLight: s.rL as any,
      reactivitySound: s.rS as any,
      reactivityTactile: s.rT as any,
      seizureBurdenMinPerHour: s.sz,
      seizureEvents: s.ev,
      acnsPattern: s.acns as any,
      acnsRatePerHour: s.acnsRate || undefined,
      acnsSide: s.asymSide as any,
      asymmetryIdx: s.asym,
      asymmetrySide: s.asymSide as any,
      artifactPct: s.art,
      minutesValid: s.min,
      clinicalEvents: []
    });
  }
  await rtBurst(B.id, 12, { deltaPct: 28, adr: 0.74, sef95: 9.8, reactivity: "present", artifactPct: 8 });

  // C — Left temporal LPD focus with seizures
  const C = await storage.createPatient({
    name: "Case C — Left temporal LPD focus",
    age: 46,
    sex: "M",
    cohort: "ADULT",
    setting: "WARD",
    bed: "WARD-15B",
    conditions: [{ name: "Focal epilepsy", status: "active", startedAt: d("2025-06-01") }],
    medications: [{ drug: "Levetiracetam", dose: "1g/12h", route: "PO", start: d("2025-06-03") }]
  });

  const C_sessions = [
    { date: "2025-06-03", ence: 2.2, delta: 22, adr: 0.9, sef: 11.5, cont: [90, 9, 1, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: "LPD", acnsRate: 3.0, asym: 0.10, asymSide: "L", art: 12, min: 20 },
    { date: "2025-06-07", ence: 4.8, delta: 28, adr: 0.7, sef: 9.6, cont: [75, 20, 5, 0], rL: "uncertain", rS: "uncertain", rT: "present", sz: 6, ev: 2, acns: "LPD", acnsRate: 6.5, asym: 0.24, asymSide: "L", art: 14, min: 20 },
    { date: "2025-06-10", ence: 5.6, delta: 35, adr: 0.48, sef: 8.1, cont: [60, 30, 10, 0], rL: "absent", rS: "absent", rT: "uncertain", sz: 12, ev: 5, acns: "LPD", acnsRate: 7.8, asym: 0.31, asymSide: "L", art: 15, min: 20 },
    { date: "2025-06-14", ence: 3.9, delta: 26, adr: 0.8, sef: 10.4, cont: [82, 16, 2, 0], rL: "present", rS: "present", rT: "uncertain", sz: 3, ev: 1, acns: "LPD", acnsRate: 2.2, asym: 0.18, asymSide: "L", art: 11, min: 20 },
    { date: "2025-06-19", ence: 2.7, delta: 18, adr: 1.1, sef: 12.2, cont: [93, 7, 0, 0], rL: "present", rS: "present", rT: "present", sz: 0, ev: 0, acns: null, acnsRate: 0.3, asym: 0.08, asymSide: "L", art: 9, min: 20 }
  ];

  for (const s of C_sessions) {
    await storage.createSession({
      patientId: C.id,
      date: d(s.date),
      encephalopathyScore: s.ence,
      deltaPct: s.delta,
      adr: s.adr,
      sef95: s.sef,
      contContinuous: s.cont[0],
      contDiscontinuous: s.cont[1],
      contBurst: s.cont[2],
      contSuppressed: s.cont[3],
      reactivityLight: s.rL as any,
      reactivitySound: s.rS as any,
      reactivityTactile: s.rT as any,
      seizureBurdenMinPerHour: s.sz,
      seizureEvents: s.ev,
      acnsPattern: s.acns as any,
      acnsRatePerHour: s.acnsRate || undefined,
      acnsSide: s.asymSide as any,
      asymmetryIdx: s.asym,
      asymmetrySide: s.asymSide as any,
      artifactPct: s.art,
      minutesValid: s.min,
      clinicalEvents: []
    });
  }
  await rtBurst(C.id, 12, { seizureBurden: 0, deltaPct: 18, adr: 1.1, sef95: 12, acnsPattern: "LPD", acnsSide: "L" });

  console.log("Seed complete: 3 TUH-like cases created.");
}

// Only run if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}

export { main as seedData };
