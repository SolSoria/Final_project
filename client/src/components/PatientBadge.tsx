import { User } from "lucide-react";
import { type Patient } from "@shared/schema";
import { formatPatientName } from "@/utils/formatting";

interface PatientBadgeProps {
  patient: Patient;
}

export function PatientBadge({ patient }: PatientBadgeProps) {
  return (
    <div className="flex items-center space-x-3" data-testid="patient-badge">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <User className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-sm" data-testid="patient-name">
          {formatPatientName(patient.name, patient.age, patient.sex)}
        </span>
        <span className="text-xs text-muted-foreground" data-testid="patient-id">
          ID: {patient.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}
