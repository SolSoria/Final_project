import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { Monitor, Database } from "lucide-react";
import { useLocation } from "wouter";

export function EnvironmentPicker() {
  const { setEnvironment } = useUIStore();
  const [, setLocation] = useLocation();

  const handleEnvironmentSelect = (env: 'simulation' | 'hardware') => {
    setEnvironment(env);
    setLocation('/patient-select');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">NeuroScopeQ</h1>
          <p className="text-lg text-muted-foreground">Choose your monitoring environment</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Simulation Environment */}
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Simulation (TUH-like)</CardTitle>
              <CardDescription className="text-center">
                Replay synthetic cases for UI validation and training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Pre-loaded TUH-derived clinical cases</p>
                <p>• Complete patient histories and metrics</p>
                <p>• Safe environment for training and testing</p>
                <p>• No hardware required</p>
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleEnvironmentSelect('simulation')}
                data-testid="select-simulation"
              >
                <Database className="h-4 w-4 mr-2" />
                Enter Simulation Mode
              </Button>
            </CardContent>
          </Card>

          {/* Hardware Environment */}
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Monitor className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">Hardware (LSL Live)</CardTitle>
              <CardDescription className="text-center">
                Connect to an EEG device and stream real-time metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Live EEG streaming via LSL protocol</p>
                <p>• Real-time patient monitoring</p>
                <p>• 20-minute recording sessions</p>
                <p>• Hardware setup required</p>
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleEnvironmentSelect('hardware')}
                data-testid="select-hardware"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Enter Hardware Mode
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            You can switch environments at any time from the main dashboard
          </p>
        </div>
      </div>
    </div>
  );
}