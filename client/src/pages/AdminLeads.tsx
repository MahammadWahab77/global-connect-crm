import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Search, Users, Filter, UserPlus, Loader2, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// 18 stages for the CRM pipeline
const LEAD_STAGES = [
  'Yet to Assign', 
  'Yet to Contact', 
  'Contact Again', 
  'Not Interested', 
  'Planning Later', 
  'Yet to Decide', 
  'Irrelevant Lead', 
  'Registered for Session', 
  'Session Completed', 
  'Docs Submitted', 
  'Shortlisted Univ.', 
  'Application in Progress', 
  'Offer Letter Received',
  'Deposit Paid', 
  'Visa Received', 
  'Flight and Accommodation Booked', 
  'Tuition Fee Paid', 
  'Commission Received'
];


const AdminLeads = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedStages, setSelectedStages] = useState<string[]>(['Yet to Assign']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState('');
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  
  // Dynamic filter states
  const [countryFilter, setCountryFilter] = useState('');
  const [intakeFilter, setIntakeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('');

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => apiRequest('/api/leads')
  });

  // Fetch counselors
  const { data: counselors = [] } = useQuery({
    queryKey: ['/api/users/counselors'],
    queryFn: () => apiRequest('/api/users/counselors')
  });

  // Get unique filter values from leads data
  const countries = Array.from(new Set(leads.map((lead: any) => lead.country).filter(Boolean))) as string[];
  const intakes = Array.from(new Set(leads.map((lead: any) => lead.intake).filter(Boolean))) as string[];
  const sources = Array.from(new Set(leads.map((lead: any) => lead.source).filter(Boolean))) as string[];

  // Enhanced filtering with multiple criteria
  const filteredLeads = leads.filter((lead: any) => {
    const matchesStage = selectedStages.length === 0 || selectedStages.includes(lead.currentStage);
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (lead.phone && lead.phone.includes(searchTerm));
    const matchesCountry = !countryFilter || countryFilter === 'all-countries' || lead.country === countryFilter;
    const matchesIntake = !intakeFilter || intakeFilter === 'all-intakes' || lead.intake === intakeFilter;
    const matchesSource = !sourceFilter || sourceFilter === 'all-sources' || lead.source === sourceFilter;
    const matchesCounselor = !counselorFilter || counselorFilter === 'all-counselors' || 
      (lead.counselorId && lead.counselorId.toString() === counselorFilter) ||
      (counselorFilter === 'unassigned' && !lead.counselorId);
    
    return matchesStage && matchesSearch && matchesCountry && matchesIntake && matchesSource && matchesCounselor;
  });

  // Smart counselor suggestions based on current lead selection
  const getSmartCounselorSuggestions = () => {
    if (selectedLeads.length === 0) return counselors;
    
    // Get countries of selected leads
    const selectedLeadData = leads.filter((lead: any) => selectedLeads.includes(lead.id));
    const leadCountries = Array.from(new Set(selectedLeadData.map((lead: any) => lead.country).filter(Boolean))) as string[];
    
    // If leads are from similar countries, suggest counselors with experience in those countries
    // For now, return all counselors but this could be enhanced with counselor specialization data
    return counselors;
  };

  const bulkAssignMutation = useMutation({
    mutationFn: ({ leadIds, counselorId }: { leadIds: number[], counselorId: number }) =>
      apiRequest('/api/leads/assign-bulk', {
        method: 'POST',
        body: JSON.stringify({ leadIds, counselorId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({ title: 'Success', description: 'Leads assigned successfully' });
      setSelectedLeads([]);
      setSelectedCounselor('');
      setShowBulkAssign(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to assign leads', variant: 'destructive' });
    }
  });

  const handleSelectLead = (leadId: number) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead: any) => lead.id));
    }
  };

  const handleBulkAssign = () => {
    if (selectedLeads.length > 0 && selectedCounselor) {
      const counselor = counselors.find((c: any) => c.id.toString() === selectedCounselor);
      if (counselor) {
        bulkAssignMutation.mutate({ leadIds: selectedLeads, counselorId: counselor.id });
      }
    }
  };

  const handleViewLead = (leadId: number) => {
    navigate(`/lead/${leadId}`);
  };

  const getStageColor = (stage: string) => {
    const stageIndex = LEAD_STAGES.indexOf(stage);
    if (stageIndex <= 1) return 'bg-red-100 text-red-800';
    if (stageIndex <= 5) return 'bg-yellow-100 text-yellow-800';
    if (stageIndex <= 10) return 'bg-blue-100 text-blue-800';
    if (stageIndex <= 14) return 'bg-purple-100 text-purple-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="bg-primary text-primary-foreground p-2 rounded-lg mr-3">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Lead Management</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Multi-Stage Filter */}
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    data-testid="filter-stages"
                  >
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      {selectedStages.length === 0 
                        ? "All Stages" 
                        : selectedStages.length === 1 
                        ? selectedStages[0]
                        : `${selectedStages.length} stages selected`
                      }
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search stages..." className="h-9" />
                    <CommandEmpty>No stage found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => setSelectedStages([])}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={selectedStages.length === 0}
                            className="mr-2"
                          />
                          <span>All Stages</span>
                        </CommandItem>
                        {LEAD_STAGES.map((stage) => (
                          <CommandItem
                            key={stage}
                            onSelect={() => {
                              setSelectedStages(prev => 
                                prev.includes(stage)
                                  ? prev.filter(s => s !== stage)
                                  : [...prev, stage]
                              );
                            }}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              checked={selectedStages.includes(stage)}
                              className="mr-2"
                            />
                            <span>{stage}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bulk Actions */}
            {selectedLeads.length > 0 && (
              <Button 
                onClick={() => setShowBulkAssign(true)}
                className="whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Selected ({selectedLeads.length})
              </Button>
            )}
          </div>

          {/* Additional Filters Row */}
          <div className="flex gap-4 items-center">
            {/* Country Filter */}
            <div className="flex-shrink-0 w-40">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger data-testid="filter-country">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-countries">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Intake Filter */}
            <div className="flex-shrink-0 w-40">
              <Select value={intakeFilter} onValueChange={setIntakeFilter}>
                <SelectTrigger data-testid="filter-intake">
                  <SelectValue placeholder="All Intakes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-intakes">All Intakes</SelectItem>
                  {intakes.map((intake) => (
                    <SelectItem key={intake} value={intake}>
                      {intake}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="flex-shrink-0 w-40">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="filter-source">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-sources">All Sources</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Counselor Filter */}
            <div className="flex-shrink-0 w-40">
              <Select value={counselorFilter} onValueChange={setCounselorFilter}>
                <SelectTrigger data-testid="filter-counselor">
                  <SelectValue placeholder="All Counselors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-counselors">All Counselors</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {counselors.map((counselor: any) => (
                    <SelectItem key={counselor.id} value={counselor.id.toString()}>
                      {counselor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(countryFilter || intakeFilter || sourceFilter || counselorFilter) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setCountryFilter('');
                  setIntakeFilter('');
                  setSourceFilter('');
                  setCounselorFilter('');
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <div className="text-sm text-gray-600">
            Showing {filteredLeads.length} leads {selectedStages.length === 0 ? 'across all stages' : selectedStages.length === 1 ? `in ${selectedStages[0]} stage` : `in ${selectedStages.length} selected stages`}
            {(countryFilter || intakeFilter || sourceFilter || counselorFilter) && (
              <span className="ml-2 text-orange-600">
                (filtered by {[
                  countryFilter && `Country: ${countryFilter}`,
                  intakeFilter && `Intake: ${intakeFilter}`,
                  sourceFilter && `Source: ${sourceFilter}`,
                  counselorFilter && counselorFilter === 'unassigned' ? 'Counselor: Unassigned' : 
                    counselorFilter && counselors.find((c: any) => c.id.toString() === counselorFilter) ? 
                    `Counselor: ${counselors.find((c: any) => c.id.toString() === counselorFilter).name}` : null
                ].filter(Boolean).join(', ')})
              </span>
            )}
          </div>
        </div>

          {/* Bulk Assignment Modal */}
          {showBulkAssign && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg">Bulk Assignment</CardTitle>
                <CardDescription>
                  Assign {selectedLeads.length} selected leads to a counselor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Select value={selectedCounselor} onValueChange={setSelectedCounselor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select counselor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getSmartCounselorSuggestions().map((counselor: any) => (
                          <SelectItem key={counselor.id} value={counselor.id.toString()}>
                            {counselor.name} - {counselor.email}
                            {selectedLeads.length > 0 && (
                              <span className="text-xs text-gray-500 ml-2">
                                {/* Show lead count for this counselor */}
                                (Available)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleBulkAssign} 
                    disabled={!selectedCounselor || bulkAssignMutation.isPending}
                  >
                    {bulkAssignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign Leads
                  </Button>
                  <Button variant="outline" onClick={() => setShowBulkAssign(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Results Summary */}
        <div className="mb-6">
          <div className="text-sm text-gray-600">
            Showing {filteredLeads.length} leads {selectedStages.length === 0 ? 'across all stages' : selectedStages.length === 1 ? `in ${selectedStages[0]} stage` : `in ${selectedStages.length} selected stages`}
            {(countryFilter || intakeFilter || sourceFilter || counselorFilter) && (
              <span className="ml-2 text-orange-600">
                (filtered by {[
                  countryFilter && `Country: ${countryFilter}`,
                  intakeFilter && `Intake: ${intakeFilter}`,
                  sourceFilter && `Source: ${sourceFilter}`,
                  counselorFilter && counselorFilter === 'unassigned' ? 'Counselor: Unassigned' : 
                    counselorFilter && counselors.find((c: any) => c.id.toString() === counselorFilter) ? 
                    `Counselor: ${counselors.find((c: any) => c.id.toString() === counselorFilter).name}` : null
                ].filter(Boolean).join(', ')})
              </span>
            )}
          </div>
        </div>

        {/* Leads Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Counselor</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <div>Loading leads...</div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => handleSelectLead(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.country || '-'}</TableCell>
                    <TableCell>{lead.course || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStageColor(lead.currentStage)}>
                        {lead.currentStage}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.counselorName || 'Unassigned'}</TableCell>
                    <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewLead(lead.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {!leadsLoading && filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No leads match your search criteria.' : selectedStages.length === 0 ? 'No leads found across all stages.' : `No leads in selected stage${selectedStages.length > 1 ? 's' : ''}.`}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLeads;
