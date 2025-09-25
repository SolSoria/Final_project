import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Download, 
  FileText, 
  Calendar,
  Loader2,
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Patient } from "@shared/schema";

interface ExportButtonProps {
  patient: Patient;
  includeML?: boolean;
  sessionId?: string; // For single session export
  className?: string;
}

export function ExportButton({ 
  patient, 
  includeML = false, 
  sessionId,
  className 
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (daysBack?: number) => {
    setIsExporting(true);
    
    try {
      let url: string;
      let filename: string;
      
      if (sessionId) {
        // Single session export
        url = `/api/export/session/${sessionId}?includeML=${includeML}`;
        filename = `session-report-${patient.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      } else {
        // Full patient report
        url = `/api/export/pdf/${patient.id}?includeML=${includeML}&daysBack=${daysBack || 30}`;
        filename = `clinical-report-${patient.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }
      
      // Get the PDF content
      const pdfContent = await response.arrayBuffer();
      
      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Export Successful",
        description: `Clinical report has been downloaded as ${filename}`,
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (sessionId) {
    // Simple button for single session export
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport()}
        disabled={isExporting}
        className={className}
        data-testid="export-session-button"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {isExporting ? "Exporting..." : "Export Session"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isExporting}
          className={className}
          data-testid="export-dropdown-trigger"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? "Exporting..." : "Export Report"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={() => handleExport(7)}
          data-testid="export-7-days"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Last 7 Days
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport(14)}
          data-testid="export-14-days"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Last 14 Days
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport(30)}
          data-testid="export-30-days"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Last 30 Days
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleExport(90)}
          data-testid="export-90-days"
        >
          <FileText className="h-4 w-4 mr-2" />
          Complete Report (90 days)
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {includeML ? "ML predictions included" : "Rule-based analysis only"}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}