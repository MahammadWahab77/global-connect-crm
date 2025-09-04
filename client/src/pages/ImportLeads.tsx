import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Users, Download, AlertTriangle, Filter, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { apiRequest } from '../lib/queryClient';
import { FixedSizeList as List } from 'react-window';

// Define the required headers exactly as specified
const REQUIRED_HEADERS = [
  'UID',
  'Lead Created Date',
  'Student Name',
  'Intake',
  'Country',
  'Source',
  'MobileNumber',
  'Current Stage',
  'Remarks',
  'Counsellors',
  'Passport Status'
];

const REQUIRED_FIELDS = ['Student Name', 'Current Stage'];

interface ParsedLead {
  uid: string;
  leadCreatedDate: string;
  studentName: string;
  intake: string;
  country: string;
  source: string;
  mobileNumber: string;
  currentStage: string;
  remarks: string;
  counsellors: string;
  passportStatus: string;
  
  // Validation fields
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateGroup: number;
  rowIndex: number;
  
  // Normalized fields
  normalizedIntake: string;
  normalizedCountry: string;
  normalizedMobile: string;
  defaultedDate: boolean;
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  duplicateRows: number;
  duplicateGroups: number;
  headerMismatch: boolean;
}

// Country code mapping (ISO alpha-2)
const COUNTRY_MAPPING: Record<string, string> = {
  'UNITED STATES': 'US',
  'USA': 'US',
  'AMERICA': 'US',
  'CANADA': 'CA',
  'UNITED KINGDOM': 'GB',
  'UK': 'GB',
  'BRITAIN': 'GB',
  'AUSTRALIA': 'AU',
  'NEW ZEALAND': 'NZ',
  'GERMANY': 'DE',
  'FRANCE': 'FR',
  'INDIA': 'IN',
  'CHINA': 'CN',
  'JAPAN': 'JP',
  'SOUTH KOREA': 'KR',
  'SINGAPORE': 'SG',
  'NETHERLANDS': 'NL',
  'SWEDEN': 'SE',
  'NORWAY': 'NO',
  'DENMARK': 'DK',
  'SWITZERLAND': 'CH',
  'IRELAND': 'IE',
  'ITALY': 'IT',
  'SPAIN': 'ES',
  'PORTUGAL': 'PT',
  'BELGIUM': 'BE',
  'AUSTRIA': 'AT',
  'FINLAND': 'FI',
};

const ImportLeads = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const [importMode, setImportMode] = useState<'standard' | 'bulk'>('standard');
  const [bulkProgress, setBulkProgress] = useState<any>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const bulkImportMutation = useMutation({
    mutationFn: ({ leadsData, dryRun }: { leadsData: ParsedLead[], dryRun: boolean }) => 
      apiRequest('/api/imports/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({ 
          leads: leadsData, 
          dryRun,
          chunkSize: 1000 
        })
      }),
    onSuccess: (result) => {
      setBulkProgress(result);
      setBulkProcessing(false);
      if (!result.batchSummary) return;
      
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      toast({
        title: "Bulk Import Complete!",
        description: `${result.batchSummary.imported + result.batchSummary.importedWithIssues} leads processed successfully.`,
      });
    },
    onError: (error: any) => {
      setBulkProcessing(false);
      toast({
        title: "Bulk Import Failed",
        description: error.message || "There was an error with the bulk import.",
        variant: "destructive",
      });
    }
  });

  const importMutation = useMutation({
    mutationFn: (leadsData: ParsedLead[]) => 
      apiRequest('/api/leads/import-csv', {
        method: 'POST',
        body: JSON.stringify({ leads: leadsData })
      }),
    onSuccess: (result) => {
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
      toast({
        title: "Import Successful!",
        description: `Leads imported successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "There was an error importing your leads.",
        variant: "destructive",
      });
    }
  });

  const normalizeIntake = (intake: string): string => {
    if (!intake) return '';
    
    // Try to extract year and season
    const yearMatch = intake.match(/20\d{2}/);
    const seasonMatch = intake.toLowerCase().match(/(spring|summer|fall|autumn|winter)/);
    
    if (yearMatch) {
      const year = yearMatch[0];
      const season = seasonMatch ? seasonMatch[1].charAt(0).toUpperCase() + seasonMatch[1].slice(1) : 'Spring';
      return `${year}-${season}`;
    }
    
    return intake;
  };

  const normalizeCountry = (country: string): string => {
    if (!country) return '';
    
    const upperCountry = country.toUpperCase().trim();
    return COUNTRY_MAPPING[upperCountry] || country;
  };

  const normalizeMobile = (mobile: string): string => {
    if (!mobile) return '';
    
    // Remove all non-digit characters
    return mobile.replace(/\D/g, '');
  };

  const validateDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    
    // Try to parse as ISO8601
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr.includes('-');
  };

  const detectDuplicates = (leads: ParsedLead[]): ParsedLead[] => {
    const mobileGroups = new Map<string, ParsedLead[]>();
    
    // Group by normalized mobile number
    leads.forEach(lead => {
      const normalizedMobile = lead.normalizedMobile;
      if (normalizedMobile) {
        if (!mobileGroups.has(normalizedMobile)) {
          mobileGroups.set(normalizedMobile, []);
        }
        mobileGroups.get(normalizedMobile)!.push(lead);
      }
    });

    // Mark duplicates
    let duplicateGroupCounter = 1;
    mobileGroups.forEach(group => {
      if (group.length > 1) {
        group.forEach((lead, index) => {
          lead.isDuplicate = true;
          lead.duplicateGroup = duplicateGroupCounter;
          if (index > 0) {
            lead.warnings.push(`Duplicate mobile number (Group ${duplicateGroupCounter})`);
          }
        });
        duplicateGroupCounter++;
      }
    });

    return leads;
  };

  const parseAndValidateCSV = (results: Papa.ParseResult<any>) => {
    const headers = results.meta.fields || [];
    
    // Check exact header match
    const headerMismatch = !REQUIRED_HEADERS.every(h => headers.includes(h));
    if (headerMismatch) {
      const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
      const extra = headers.filter(h => !REQUIRED_HEADERS.includes(h));
      
      let errorMsg = 'Header validation failed.\n';
      if (missing.length > 0) errorMsg += `Missing: ${missing.join(', ')}\n`;
      if (extra.length > 0) errorMsg += `Extra: ${extra.join(', ')}\n`;
      errorMsg += `\nRequired exact headers: ${REQUIRED_HEADERS.join(', ')}`;
      
      setHeaderError(errorMsg);
      setValidationSummary({ 
        totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0, 
        duplicateRows: 0, duplicateGroups: 0, headerMismatch: true 
      });
      return;
    }

    setHeaderError(null);
    
    const data = results.data as any[];
    const parsedLeads: ParsedLead[] = [];

    data.forEach((row, index) => {
      const lead: ParsedLead = {
        uid: row['UID']?.toString().trim() || '',
        leadCreatedDate: row['Lead Created Date']?.toString().trim() || '',
        studentName: row['Student Name']?.toString().trim() || '',
        intake: row['Intake']?.toString().trim() || '',
        country: row['Country']?.toString().trim() || '',
        source: row['Source']?.toString().trim() || '',
        mobileNumber: row['MobileNumber']?.toString().trim() || '',
        currentStage: row['Current Stage']?.toString().trim() || '',
        remarks: row['Remarks']?.toString().trim() || '',
        counsellors: row['Counsellors']?.toString().trim() || '',
        passportStatus: row['Passport Status']?.toString().trim() || '',
        
        errors: [],
        warnings: [],
        isDuplicate: false,
        duplicateGroup: 0,
        rowIndex: index + 1,
        
        normalizedIntake: '',
        normalizedCountry: '',
        normalizedMobile: '',
        defaultedDate: false
      };

      // Validate required fields
      REQUIRED_FIELDS.forEach(field => {
        const key = field === 'Student Name' ? 'studentName' : 'currentStage';
        if (!lead[key as keyof ParsedLead]) {
          lead.errors.push(`Missing required field: ${field}`);
        }
      });

      // Validate and normalize fields
      if (lead.leadCreatedDate) {
        if (!validateDate(lead.leadCreatedDate)) {
          lead.errors.push('Invalid Lead Created Date format (expected ISO8601)');
        }
      } else {
        lead.defaultedDate = true;
        lead.warnings.push('Lead Created Date is blank - will default on import');
      }

      // Normalize intake
      lead.normalizedIntake = normalizeIntake(lead.intake);
      if (lead.intake && lead.normalizedIntake !== lead.intake) {
        lead.warnings.push(`Intake normalized to: ${lead.normalizedIntake}`);
      }

      // Normalize country
      lead.normalizedCountry = normalizeCountry(lead.country);
      if (lead.country && lead.normalizedCountry !== lead.country) {
        lead.warnings.push(`Country normalized to: ${lead.normalizedCountry}`);
      }

      // Normalize and validate mobile
      lead.normalizedMobile = normalizeMobile(lead.mobileNumber);
      if (!lead.normalizedMobile) {
        lead.warnings.push('Mobile number is blank');
      } else if (lead.normalizedMobile.length < 7) {
        lead.warnings.push('Mobile number appears too short (<7 digits)');
      }

      parsedLeads.push(lead);
    });

    // Detect duplicates
    const leadsWithDuplicates = detectDuplicates(parsedLeads);

    // Calculate summary
    const summary: ValidationSummary = {
      totalRows: leadsWithDuplicates.length,
      validRows: leadsWithDuplicates.filter(l => l.errors.length === 0).length,
      errorRows: leadsWithDuplicates.filter(l => l.errors.length > 0).length,
      warningRows: leadsWithDuplicates.filter(l => l.warnings.length > 0 && l.errors.length === 0).length,
      duplicateRows: leadsWithDuplicates.filter(l => l.isDuplicate).length,
      duplicateGroups: Math.max(...leadsWithDuplicates.map(l => l.duplicateGroup), 0),
      headerMismatch: false
    };

    setLeads(leadsWithDuplicates);
    setValidationSummary(summary);
    setStep(2);
  };

  const downloadTemplate = () => {
    const template = REQUIRED_HEADERS.join(',') + '\n' +
      'LD001,2024-01-15T10:30:00Z,John Doe,2024-Spring,United States,Website,+1234567890,Initial Contact,First contact made,Sarah Johnson,Valid';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportCleanCSV = () => {
    const cleanData = leads.map(lead => ({
      'UID': lead.uid,
      'Lead Created Date': lead.defaultedDate ? new Date().toISOString() : lead.leadCreatedDate,
      'Student Name': lead.studentName,
      'Intake': lead.normalizedIntake || lead.intake,
      'Country': lead.normalizedCountry || lead.country,
      'Source': lead.source,
      'MobileNumber': lead.normalizedMobile || lead.mobileNumber,
      'Current Stage': lead.currentStage,
      'Remarks': lead.remarks,
      'Counsellors': lead.counsellors,
      'Passport Status': lead.passportStatus
    }));

    const csv = Papa.unparse(cleanData, { header: true });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_cleaned.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportIssuesReport = () => {
    const duplicateGroups = leads.reduce((acc, lead) => {
      if (lead.isDuplicate) {
        if (!acc[lead.duplicateGroup]) {
          acc[lead.duplicateGroup] = [];
        }
        acc[lead.duplicateGroup].push({
          row: lead.rowIndex,
          name: lead.studentName,
          mobile: lead.mobileNumber
        });
      }
      return acc;
    }, {} as Record<number, any[]>);

    const report = {
      summary: validationSummary,
      rowIssues: leads.map(lead => ({
        row: lead.rowIndex,
        errors: lead.errors,
        warnings: lead.warnings,
        isDuplicate: lead.isDuplicate,
        duplicateGroup: lead.duplicateGroup
      })).filter(r => r.errors.length > 0 || r.warnings.length > 0 || r.isDuplicate),
      duplicateGroups
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'issues_report.json';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setHeaderError(null);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: parseAndValidateCSV,
      error: (error) => {
        setHeaderError(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const filteredLeads = useMemo(() => {
    if (!showOnlyDuplicates) return leads;
    return leads.filter(lead => lead.isDuplicate);
  }, [leads, showOnlyDuplicates]);

  const canProceed = validationSummary && !validationSummary.headerMismatch && validationSummary.errorRows === 0;

  const runBulkImport = async (dryRun: boolean = false) => {
    if (!canProceed) return;
    
    setBulkProcessing(true);
    setBulkProgress(null);
    
    // Filter out leads with errors for actual import
    const validLeads = leads.filter(lead => lead.errors.length === 0);
    
    bulkImportMutation.mutate({ 
      leadsData: validLeads, 
      dryRun 
    });
  };

  const downloadBulkReport = (reportType: 'validation' | 'normalized') => {
    if (!bulkProgress?.downloadableReports) return;
    
    const content = reportType === 'validation' 
      ? bulkProgress.downloadableReports.validationLog
      : bulkProgress.downloadableReports.normalizedPayload;
    
    const filename = reportType === 'validation' 
      ? 'bulk_validation_log.csv'
      : 'normalized_payload.jsonl';
    
    const mimeType = reportType === 'validation' ? 'text/csv' : 'application/jsonl';
    
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Virtual list row renderer
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const lead = filteredLeads[index];
    const hasError = lead.errors.length > 0;
    const hasWarning = lead.warnings.length > 0;
    
    return (
      <div style={style} className={`flex items-center border-b border-gray-200 ${hasError ? 'bg-red-50' : lead.isDuplicate ? 'bg-yellow-50' : 'bg-white'}`}>
        <div className="w-12 px-2 text-xs text-gray-500">{lead.rowIndex}</div>
        <div className="flex-1 grid grid-cols-10 gap-2 px-2 py-2 text-xs">
          <div className="truncate">{lead.uid}</div>
          <div className="truncate">{lead.defaultedDate ? '(will default)' : lead.leadCreatedDate}</div>
          <div className="truncate font-medium">{lead.studentName}</div>
          <div className="truncate">{lead.normalizedIntake || lead.intake}</div>
          <div className="truncate">{lead.normalizedCountry || lead.country}</div>
          <div className="truncate">{lead.source}</div>
          <div className="truncate">{lead.normalizedMobile || lead.mobileNumber}</div>
          <div className="truncate">{lead.currentStage}</div>
          <div className="truncate">{lead.counsellors}</div>
          <div className="flex items-center space-x-1">
            {hasError && <AlertCircle className="h-3 w-3 text-red-500" />}
            {hasWarning && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
            {lead.isDuplicate && <Badge variant="secondary" className="text-xs">Dup #{lead.duplicateGroup}</Badge>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate('/admin')} className="mr-2" data-testid="button-back-to-admin">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="bg-primary text-primary-foreground p-2 rounded-lg mr-3">
                <Upload className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Advanced CSV Import</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[
              { num: 1, label: "Upload & Validate", active: step >= 1 },
              { num: 2, label: "Review & Clean", active: step >= 2 },
              { num: 3, label: "Import Complete", active: step >= 3 }
            ].map((item, index) => (
              <div key={item.num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  item.active ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-600'
                }`}>
                  {item.num}
                </div>
                <span className={`ml-2 text-sm font-medium ${item.active ? 'text-primary' : 'text-gray-500'}`}>
                  {item.label}
                </span>
                {index < 2 && <div className="w-16 h-0.5 bg-gray-200 ml-4" />}
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Upload & Validate CSV
                </CardTitle>
                <CardDescription>
                  Upload your CSV file with the exact required headers for comprehensive validation and duplicate detection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Download Template</h3>
                    <p className="text-sm text-gray-600">Get the exact CSV format with required headers</p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Required Headers (exact match):</div>
                    <div className="text-xs bg-gray-100 p-2 rounded font-mono">
                      {REQUIRED_HEADERS.join(', ')}
                    </div>
                    <div className="mt-2 text-sm">
                      <strong>Required fields:</strong> {REQUIRED_FIELDS.join(', ')}
                    </div>
                  </AlertDescription>
                </Alert>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <FileSpreadsheet className="mx-auto h-16 w-16 text-gray-400 mb-6" />
                  <div className="mb-4">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-lg font-medium text-primary mb-2">
                        Click to upload your CSV file
                      </div>
                      <div className="text-sm text-gray-500">
                        Advanced validation with duplicate detection
                      </div>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="input-csv-file"
                    />
                  </div>
                  <p className="text-xs text-gray-500">CSV files only</p>
                  
                  {file && !headerError && validationSummary && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                      <div className="text-green-700 font-medium">{file.name}</div>
                      <div className="text-green-600 text-sm">
                        {validationSummary.totalRows} rows processed • 
                        {validationSummary.validRows} valid • 
                        {validationSummary.errorRows} errors • 
                        {validationSummary.duplicateRows} duplicates
                      </div>
                    </div>
                  )}
                  
                  {headerError && (
                    <Alert className="mt-6" variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="text-left">
                          <div className="font-medium mb-2">Validation Error:</div>
                          <div className="text-sm whitespace-pre-line font-mono">{headerError}</div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && validationSummary && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Review & Clean Data
                </CardTitle>
                <CardDescription>
                  Comprehensive validation results with duplicate detection and data normalization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{validationSummary.totalRows}</div>
                      <div className="text-sm text-gray-600">Total Rows</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{validationSummary.validRows}</div>
                      <div className="text-sm text-gray-600">Valid</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{validationSummary.errorRows}</div>
                      <div className="text-sm text-gray-600">Errors</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{validationSummary.duplicateRows}</div>
                      <div className="text-sm text-gray-600">Duplicates</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="show-duplicates"
                        checked={showOnlyDuplicates}
                        onCheckedChange={(checked) => setShowOnlyDuplicates(checked === true)}
                      />
                      <Label htmlFor="show-duplicates" className="text-sm">
                        Show only duplicates ({validationSummary.duplicateRows})
                      </Label>
                      {showOnlyDuplicates ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={exportCleanCSV} size="sm">
                      <Download className="mr-1 h-3 w-3" />
                      Export Clean CSV
                    </Button>
                    <Button variant="outline" onClick={exportIssuesReport} size="sm">
                      <Download className="mr-1 h-3 w-3" />
                      Export Issues Report
                    </Button>
                  </div>
                </div>

                {/* Data Table with Virtualization */}
                <div className="border rounded-lg">
                  <div className="bg-gray-50 border-b">
                    <div className="flex items-center font-medium text-xs text-gray-700 py-2">
                      <div className="w-12 px-2">#</div>
                      <div className="flex-1 grid grid-cols-10 gap-2 px-2">
                        <div>UID</div>
                        <div>Created Date</div>
                        <div>Student Name</div>
                        <div>Intake</div>
                        <div>Country</div>
                        <div>Source</div>
                        <div>Mobile</div>
                        <div>Stage</div>
                        <div>Counsellors</div>
                        <div>Status</div>
                      </div>
                    </div>
                  </div>
                  
                  <List
                    height={400}
                    itemCount={filteredLeads.length}
                    itemSize={40}
                    width="100%"
                    className="border-0"
                  >
                    {Row}
                  </List>
                </div>

                {/* Status Messages */}
                {validationSummary.errorRows > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cannot proceed: {validationSummary.errorRows} rows have validation errors that must be fixed.
                    </AlertDescription>
                  </Alert>
                )}

                {validationSummary.duplicateRows > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Found {validationSummary.duplicateRows} duplicate entries in {validationSummary.duplicateGroups} groups based on mobile number.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Import Mode Selection */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Import Mode Selection</h3>
                      <p className="text-sm text-gray-600">Choose between standard import or high-volume bulk import with advanced resilience</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="importMode"
                          value="standard"
                          checked={importMode === 'standard'}
                          onChange={(e) => setImportMode(e.target.value as 'standard' | 'bulk')}
                          className="mr-2"
                        />
                        Standard Import
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="importMode"
                          value="bulk"
                          checked={importMode === 'bulk'}
                          onChange={(e) => setImportMode(e.target.value as 'standard' | 'bulk')}
                          className="mr-2"
                        />
                        Bulk Import (4K+ leads)
                      </label>
                    </div>
                  </div>

                  {importMode === 'bulk' && (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Bulk Import Features:</strong>
                        <ul className="list-disc list-inside mt-1 text-sm">
                          <li>Resilient processing with auto-fixes (dates, countries, phone numbers)</li>
                          <li>Chunked processing (1000 rows/chunk) for high throughput</li>
                          <li>Detailed validation logs and normalization reports</li>
                          <li>Dry-run mode for validation without committing</li>
                          <li>Never blocks on individual row errors</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Bulk Import Progress */}
                  {bulkProgress && (
                    <div className="mt-6">
                      <h3 className="font-medium text-gray-900 mb-4">Bulk Import Results</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{bulkProgress.batchSummary.imported}</div>
                            <div className="text-sm text-gray-600">Successfully Imported</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-600">{bulkProgress.batchSummary.importedWithIssues}</div>
                            <div className="text-sm text-gray-600">Imported with Issues</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{bulkProgress.batchSummary.failed}</div>
                            <div className="text-sm text-gray-600">Failed</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{(bulkProgress.batchSummary.processingTimeMs / 1000).toFixed(1)}s</div>
                            <div className="text-sm text-gray-600">Processing Time</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Field Issues Summary */}
                      {Object.keys(bulkProgress.batchSummary.fieldIssues).length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Field Issues Detected & Auto-Fixed:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(bulkProgress.batchSummary.fieldIssues).map(([field, issues]: [string, any]) => (
                              <div key={field} className="bg-gray-50 p-2 rounded text-sm">
                                <strong>{field}:</strong> {issues.count} issues
                                <div className="text-xs text-gray-600 mt-1">
                                  Sample: {issues.samples[0]}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 mb-4">
                        <Button variant="outline" onClick={() => downloadBulkReport('validation')} data-testid="button-download-validation-log">
                          <Download className="mr-2 h-4 w-4" />
                          Download Validation Log
                        </Button>
                        <Button variant="outline" onClick={() => downloadBulkReport('normalized')} data-testid="button-download-normalized">
                          <Download className="mr-2 h-4 w-4" />
                          Download Normalized Data
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4">
                    {importMode === 'standard' ? (
                      <Button 
                        onClick={() => importMutation.mutate(leads.filter(l => l.errors.length === 0))}
                        disabled={!canProceed || importMutation.isPending}
                        data-testid="button-import-leads"
                      >
                        {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import {validationSummary.validRows} Valid Leads
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => runBulkImport(true)}
                          disabled={!canProceed || bulkProcessing}
                          data-testid="button-dry-run"
                        >
                          {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Dry Run Validation
                        </Button>
                        <Button 
                          onClick={() => runBulkImport(false)}
                          disabled={!canProceed || bulkProcessing}
                          data-testid="button-bulk-import"
                        >
                          {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Bulk Import {validationSummary.validRows} Leads
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Import Complete
                </CardTitle>
                <CardDescription>
                  Your leads have been successfully imported with all validations and normalizations applied.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-20 w-20 text-green-500 mb-6" />
                  <h3 className="text-2xl font-medium text-gray-900 mb-4">Import Successful!</h3>
                  <div className="space-y-2 mb-8">
                    <p className="text-lg text-gray-600">
                      All valid leads have been imported into your CRM system
                    </p>
                    <p className="text-sm text-gray-500">
                      Data has been normalized and duplicates have been handled according to your specifications
                    </p>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <Button onClick={() => navigate('/admin/leads')} data-testid="button-view-leads">
                      View All Leads
                    </Button>
                    <Button variant="outline" onClick={() => { setStep(1); setFile(null); setLeads([]); setValidationSummary(null); }} data-testid="button-import-more">
                      Import More Leads
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
          
          {step < 3 && (
            <div className="flex justify-between p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                onClick={() => step === 2 ? importMutation.mutate(leads.filter(l => l.errors.length === 0)) : undefined}
                disabled={
                  (step === 1 && (!file || !!headerError || !validationSummary)) ||
                  (step === 2 && (!canProceed || importMutation.isPending))
                }
                data-testid="button-next"
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === 2 ? `Import ${validationSummary?.validRows || 0} Valid Leads` : 'Next'}
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default ImportLeads;