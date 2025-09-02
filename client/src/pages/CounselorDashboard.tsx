
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, Clock, FileText, Calendar, Users, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

const CounselorDashboard = () => {
  const navigate = useNavigate();
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Fetch counselor's leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['/api/leads', { counselorId: currentUser.id }],
    queryFn: () => apiRequest(`/api/leads?counselorId=${currentUser.id}`)
  });

  // Calculate KPI metrics from real data
  const totalLeads = leads.length;
  const activeApplications = leads.filter((lead: any) => 
    ['Application Preparation', 'Application Submitted', 'Offer Received'].includes(lead.currentStage)
  ).length;
  const recentLeads = leads.filter((lead: any) => {
    const daysSinceAssigned = Math.floor((new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 3600 * 24));
    return daysSinceAssigned <= 7;
  }).length;
  const overdueLeads = leads.filter((lead: any) => {
    const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 3600 * 24));
    return daysSinceUpdate > 7;
  }).length;

  // Group leads by stage for pipeline
  const stageGroups = leads.reduce((acc: any, lead: any) => {
    const stage = lead.currentStage;
    if (!acc[stage]) acc[stage] = 0;
    acc[stage]++;
    return acc;
  }, {});

  // Get recent leads for the list (last 5)
  const recentLeadsList = [...leads]
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-green-600 text-white p-2 rounded-lg mr-3">
                <UserCheck className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Counselor Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/counselor/leads')}
              >
                <Users className="h-4 w-4 mr-2" />
                View All Leads
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, Counselor!</h2>
          <p className="text-gray-600">Here's your lead pipeline and tasks for today.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Total Leads</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalLeads}</div>
                  <p className="text-xs text-muted-foreground">Assigned to you</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">{overdueLeads}</div>
                  <p className="text-xs text-muted-foreground">No activity &gt;7 days</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{activeApplications}</div>
                  <p className="text-xs text-muted-foreground">In application stages</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{recentLeads}</div>
                  <p className="text-xs text-muted-foreground">Updated this week</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>My Lead Pipeline</CardTitle>
              <CardDescription>Current status of your assigned leads</CardDescription>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading pipeline...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(stageGroups).length > 0 ? (
                    Object.entries(stageGroups).map(([stage, count]: [string, any]) => (
                      <div key={stage} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{stage}</span>
                        <span className="text-sm text-gray-500">{count} leads</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No leads assigned yet</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Leads</CardTitle>
                  <CardDescription>Leads assigned to you recently</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/counselor/leads')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading leads...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLeadsList.length > 0 ? (
                    recentLeadsList.map((lead: any) => {
                      const initials = lead.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                      const colors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600', 'bg-red-100 text-red-600'];
                      const colorClass = colors[lead.id % colors.length];
                      
                      return (
                        <div key={lead.id} className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center text-sm font-medium`}>
                            {initials}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{lead.name}</p>
                            <p className="text-xs text-gray-500">
                              {lead.course ? `${lead.course} • ` : ''}{lead.country || 'No country'} • {lead.currentStage}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/lead/${lead.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No recent leads</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CounselorDashboard;
