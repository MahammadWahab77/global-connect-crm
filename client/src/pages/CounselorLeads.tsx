
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Users, Filter, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

// 18 stages for the CRM pipeline
const LEAD_STAGES = [
  'Yet to Assign',
  'Assigned',
  'Initial Contact',
  'Interest Confirmed',
  'Documents Requested',
  'Documents Received',
  'Profile Evaluation',
  'University Shortlisting',
  'Application Preparation',
  'Application Submitted',
  'Offer Received',
  'Offer Accepted',
  'Visa Documentation',
  'Visa Applied',
  'Visa Approved',
  'Pre-departure',
  'Departed',
  'Enrolled'
];


const CounselorLeads = () => {
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Fetch leads assigned to current counselor
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['/api/leads', { counselorId: currentUser.id }],
    queryFn: () => apiRequest(`/api/leads?counselorId=${currentUser.id}`)
  });

  // Get unique countries for filter
  const countries = ['all', ...Array.from(new Set(leads.map((lead: any) => lead.country).filter(Boolean)))];

  // Filter leads based on stage, search term, and country
  const filteredLeads = leads.filter((lead: any) => {
    const matchesStage = selectedStage === 'all' || lead.currentStage === selectedStage;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.phone.includes(searchTerm) ||
                         (lead.course && lead.course.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCountry = selectedCountry === 'all' || lead.country === selectedCountry;
    return matchesStage && matchesSearch && matchesCountry;
  });

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

  const getPriorityStatus = (stage: string, lastContact: string) => {
    if (!lastContact) return { status: 'New', color: 'bg-blue-100 text-blue-800' };
    const daysSinceContact = Math.floor((new Date().getTime() - new Date(lastContact).getTime()) / (1000 * 3600 * 24));
    
    if (daysSinceContact > 7) return { status: 'Overdue', color: 'bg-red-100 text-red-800' };
    if (daysSinceContact > 3) return { status: 'Due Soon', color: 'bg-orange-100 text-orange-800' };
    return { status: 'Current', color: 'bg-green-100 text-green-800' };
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
                onClick={() => navigate('/counselor')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="bg-green-600 text-white p-2 rounded-lg mr-3">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">My Leads</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.filter((lead: any) => !['Enrolled', 'Departed'].includes(lead.currentStage)).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Needs Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {leads.filter((lead: any) => {
                  const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 3600 * 24));
                  return daysSinceUpdate > 7;
                }).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.filter((lead: any) => 
                  ['Application Preparation', 'Application Submitted', 'Offer Received'].includes(lead.currentStage)
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Stage Filter */}
            <div className="flex-1">
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {LEAD_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div className="flex-1">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country === 'all' ? 'All Countries' : country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <div className="text-sm text-gray-600">
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        </div>

        {/* Leads Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Country/Course</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <div>Loading leads...</div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead: any) => {
                  const priority = getPriorityStatus(lead.currentStage, lead.updatedAt);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.country || '-'}</div>
                          <div className="text-sm text-gray-500">{lead.course || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStageColor(lead.currentStage)}>
                          {lead.currentStage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priority.color}>
                          {priority.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(lead.updatedAt).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewLead(lead.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {!isLoading && filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No leads match your search criteria.' : 'No leads match the selected filters.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CounselorLeads;
