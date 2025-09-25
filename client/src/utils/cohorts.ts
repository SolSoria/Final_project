import { type CohortType } from "@shared/schema";
import adultThresholds from "../config/thresholds.adult.json";
import geriatricThresholds from "../config/thresholds.geriatric.json";
import pedsThresholds from "../config/thresholds.peds.json";

export type ThresholdConfig = {
  encephalopathy: { normalMax: number; mildMax: number; severeMin: number };
  deltaPct: { normalMax: number; borderlineMax: number };
  adr: { normalMin: number; borderlineMin: number };
  sef95: { normalMin: number; borderlineMin: number };
  asymmetryIdxAlert: number;
  artifact: { okMax: number; warnMax: number };
};

export const getThresholds = (cohort: CohortType): ThresholdConfig => {
  switch (cohort) {
    case "ADULT":
      return adultThresholds;
    case "GERIATRIC":
      return geriatricThresholds;
    case "PEDS":
      return pedsThresholds;
    default:
      return adultThresholds;
  }
};

export const getSeverityLevel = (
  value: number,
  metric: keyof ThresholdConfig,
  cohort: CohortType
): 'normal' | 'borderline' | 'abnormal' => {
  const thresholds = getThresholds(cohort);
  
  switch (metric) {
    case 'encephalopathy':
      if (value <= thresholds.encephalopathy.normalMax) return 'normal';
      if (value <= thresholds.encephalopathy.mildMax) return 'borderline';
      return 'abnormal';
      
    case 'deltaPct':
      if (value <= thresholds.deltaPct.normalMax) return 'normal';
      if (value <= thresholds.deltaPct.borderlineMax) return 'borderline';
      return 'abnormal';
      
    case 'adr':
      if (value >= thresholds.adr.normalMin) return 'normal';
      if (value >= thresholds.adr.borderlineMin) return 'borderline';
      return 'abnormal';
      
    case 'sef95':
      if (value >= thresholds.sef95.normalMin) return 'normal';
      if (value >= thresholds.sef95.borderlineMin) return 'borderline';
      return 'abnormal';
      
    default:
      return 'normal';
  }
};

export const getSeverityColor = (level: 'normal' | 'borderline' | 'abnormal') => {
  switch (level) {
    case 'normal':
      return 'text-emerald-600 bg-emerald-100';
    case 'borderline':
      return 'text-amber-600 bg-amber-100';
    case 'abnormal':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getSeverityLabel = (level: 'normal' | 'borderline' | 'abnormal') => {
  switch (level) {
    case 'normal':
      return 'Normal';
    case 'borderline':
      return 'Borderline';
    case 'abnormal':
      return 'Abnormal';
    default:
      return 'Unknown';
  }
};
