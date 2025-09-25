import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EnvironmentPicker } from "@/pages/EnvironmentPicker";
import { PatientSelect } from "@/pages/PatientSelect";
import { Layout } from "@/pages/Layout";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={EnvironmentPicker} />
      <Route path="/patient-select" component={PatientSelect} />
      <Route path="/dashboard" component={Layout} />
      <Route path="/patient/:id" component={Layout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
