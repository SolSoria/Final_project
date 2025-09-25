import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Eye, User, ArrowLeft } from "lucide-react";
import { Patient } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export function PatientSelect() {
  const { environment, setSelectedPatientId, setProfileDrawerOpen } = useUIStore();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [settingFilter, setSettingFilter] = useState<string>("all");

  // Redirect to environment picker if no environment is selected
  useEffect(() => {
    if (!environment) {
      setLocation('/');
    }
  }, [environment, setLocation]);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['/api/patients', { search, cohort: cohortFilter, setting: settingFilter, environment }],
    queryFn: () => {
      const params: { search?: string; cohort?: string; setting?: string } = {};
      
      if (search) params.search = search;
      if (cohortFilter !== "all") params.cohort = cohortFilter;
      if (settingFilter !== "all") params.setting = settingFilter;
      
      return api.getPatients(params);
    },
    refetchInterval: 5000, // Refresh every 5 seconds for live environment
    enabled: !!environment // Only run query if environment is selected
  });

  const handleOpenPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setLocation('/dashboard');
  };

  const handleProfileView = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setProfileDrawerOpen(true);
  };

  const handleNewPatient = () => {
    if (environment === 'hardware') {
      setLocation('/patient-profile/new');
    }
  };

  const handleBackToEnvironment = () => {
    setLocation('/');
  };

  const getCohortBadgeColor = (cohort: string) => {
    switch (cohort) {
      case 'PEDS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ADULT': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'GERIATRIC': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getSettingBadgeColor = (setting: string) => {
    switch (setting) {
      case 'ICU': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'WARD': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'AMBULATORY': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEnvironment}
                data-testid="back-to-environment"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-semibold">Patient Selection</h1>
              <Badge variant="outline" className="capitalize">
                {environment} Mode
              </Badge>
            </div>
            
            {environment === 'hardware' && (
              <Button onClick={handleNewPatient} data-testid="new-patient">
                <UserPlus className="h-4 w-4 mr-2" />
                New Patient
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Search & Filter Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="search-patients"
                />
              </div>
              <div>
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger data-testid="filter-cohort">
                    <SelectValue placeholder="All Cohorts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cohorts</SelectItem>
                    <SelectItem value="PEDS">Pediatric</SelectItem>
                    <SelectItem value="ADULT">Adult</SelectItem>
                    <SelectItem value="GERIATRIC">Geriatric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={settingFilter} onValueChange={setSettingFilter}>
                  <SelectTrigger data-testid="filter-setting">
                    <SelectValue placeholder="All Settings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Settings</SelectItem>
                    <SelectItem value="AMBULATORY">Ambulatory</SelectItem>
                    <SelectItem value="WARD">Ward</SelectItem>
                    <SelectItem value="ICU">ICU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Patients ({patients.length})</span>
              {environment === 'simulation' && (
                <Badge variant="secondary">TUH-like Cases</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading patients...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No patients found matching your criteria</p>
                {environment === 'hardware' && (
                  <Button 
                    onClick={handleNewPatient} 
                    className="mt-4"
                    data-testid="no-patients-new-patient"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create First Patient
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Age/Sex</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Setting</TableHead>
                    <TableHead>Last Session</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id} data-testid={`patient-row-${patient.id}`}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell className="font-mono text-sm">{patient.id.slice(0, 8)}...</TableCell>
                      <TableCell>{patient.age}/{patient.sex}</TableCell>
                      <TableCell>
                        <Badge className={getCohortBadgeColor(patient.cohort)}>
                          {patient.cohort}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSettingBadgeColor(patient.setting)}>
                          {patient.setting}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {patient.updatedAt ? formatDistanceToNow(new Date(patient.updatedAt), { addSuffix: true }) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenPatient(patient)}
                            data-testid={`open-patient-${patient.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProfileView(patient)}
                            data-testid={`profile-patient-${patient.id}`}
                          >
                            <User className="h-4 w-4 mr-1" />
                            Profile
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}