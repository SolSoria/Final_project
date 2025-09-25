import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useUIStore } from "@/store/ui-store";
import { PatientBadge } from "@/components/PatientBadge";
import { ModeBadge } from "@/components/ModeBadge";
import { ConditionChips } from "@/components/ConditionChips";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";
import { CurrentStatus } from "./CurrentStatus";
import { Evolution } from "./Evolution";
import copy from "../config/copy.en.json";

export function Layout() {
  const { selectedPatientId, setProfileDrawerOpen } = useUIStore();
  
  // For demo, we'll use the first patient if none selected
  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: () => api.getPatients(),
  });

  const patientId = selectedPatientId || (patients?.[0]?.id);
  
  const { data: patient } = useQuery({
    queryKey: ['/api/patient', patientId],
    queryFn: () => patientId ? api.getPatient(patientId) : Promise.resolve(null),
    enabled: !!patientId
  });

  const { data: realtimeSample } = useQuery({
    queryKey: ['/api/realtime', patientId],
    queryFn: () => patientId ? api.getRealtimeSample(patientId) : Promise.resolve(null),
    enabled: !!patientId,
    refetchInterval: 2000 // Poll every 2 seconds
  });

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">No Patient Selected</h2>
          <p className="text-muted-foreground">Please select a patient to view their EEG data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Patient Badge & Mode */}
            <div className="flex items-center space-x-4">
              <PatientBadge patient={patient} />
              <ModeBadge patientId={patient.id} />
              <ConditionChips patient={patient} />
            </div>
            
            {/* Right: Quality Summary & Profile */}
            <div className="flex items-center space-x-4">
              {realtimeSample && (
                <ConfidenceBar 
                  artifactPct={realtimeSample.artifactPct}
                  minutesValid={realtimeSample.minutesValid}
                />
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setProfileDrawerOpen(true)}
                data-testid="open-profile-drawer"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="current" className="w-full">
          <div className="border-b border-border">
            <TabsList className="h-auto p-0 bg-transparent pt-6">
              <TabsTrigger 
                value="current" 
                className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 py-2"
                data-testid="tab-current-status"
              >
                {copy.tabs.current}
              </TabsTrigger>
              <TabsTrigger 
                value="evolution" 
                className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 py-2 ml-8"
                data-testid="tab-evolution"
              >
                {copy.tabs.evolution}
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="current" className="py-6">
            <CurrentStatus patient={patient} realtimeSample={realtimeSample || null} />
          </TabsContent>
          
          <TabsContent value="evolution" className="py-6">
            <Evolution patient={patient} />
          </TabsContent>
        </Tabs>
      </div>

      <ProfileDrawer patient={patient} />
    </div>
  );
}
