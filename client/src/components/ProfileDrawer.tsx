import { X, User } from "lucide-react";
import { type Patient } from "@shared/schema";
import { useUIStore } from "@/store/ui-store";
import { formatDateTime } from "@/utils/formatting";

interface ProfileDrawerProps {
  patient: Patient | null;
}

export function ProfileDrawer({ patient }: ProfileDrawerProps) {
  const { profileDrawerOpen, setProfileDrawerOpen } = useUIStore();

  if (!patient || !profileDrawerOpen) return null;

  const activeConditions = patient.conditions.filter(c => c.status === 'active');
  const activeMedications = patient.medications.filter(m => !m.end);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setProfileDrawerOpen(false)}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-96 bg-card border-l border-border shadow-xl" data-testid="profile-drawer">
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-semibold">Patient Profile</h2>
            <button 
              className="rounded-md p-1 hover:bg-accent" 
              onClick={() => setProfileDrawerOpen(false)}
              data-testid="close-profile-drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Demographics */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Patient Name</label>
                <p className="text-sm" data-testid="profile-patient-name">{patient.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Age</label>
                  <p className="text-sm" data-testid="profile-patient-age">{patient.age}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sex</label>
                  <p className="text-sm" data-testid="profile-patient-sex">{patient.sex}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cohort</label>
                  <p className="text-sm" data-testid="profile-patient-cohort">{patient.cohort}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Setting</label>
                  <p className="text-sm" data-testid="profile-patient-setting">{patient.setting}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bed/Location</label>
                <p className="text-sm" data-testid="profile-patient-bed">{patient.bed}</p>
              </div>
              
              {/* Current Conditions */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Active Conditions</h3>
                <div className="space-y-2" data-testid="active-conditions">
                  {activeConditions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active conditions</p>
                  ) : (
                    activeConditions.map((condition, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md border border-border p-2">
                        <div>
                          <span className="text-sm font-medium">{condition.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {condition.startedAt && formatDateTime(condition.startedAt)}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs ${
                          condition.status === 'active' ? 'bg-red-100 text-red-800' :
                          condition.status === 'resolving' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {condition.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Current Medications */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Current Medications</h3>
                <div className="space-y-2" data-testid="active-medications">
                  {activeMedications.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active medications</p>
                  ) : (
                    activeMedications.map((medication, index) => (
                      <div key={index} className="rounded-md border border-border p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{medication.drug}</span>
                          <span className="text-xs text-muted-foreground">{medication.route}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{medication.dose}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
