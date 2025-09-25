import { type Patient } from "@shared/schema";

interface ConditionChipsProps {
  patient: Patient;
}

export function ConditionChips({ patient }: ConditionChipsProps) {
  return (
    <div className="flex space-x-1" data-testid="condition-chips">
      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
        {patient.cohort}
      </span>
      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800">
        {patient.setting}
      </span>
    </div>
  );
}
