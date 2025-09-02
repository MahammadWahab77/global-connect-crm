import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  
  // Fetch all leads for recent activity
  const { data: allLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => apiRequest('/api/leads')
  });

  // Get recent leads (last 5 updated) with time calculations
  const recentLeads = [...allLeads]
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
    .map((lead: any) => {
      const timeDiff = new Date().getTime() - new Date(lead.updatedAt).getTime();
      const minutes = Math.floor(timeDiff / (1000 * 60));
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      let timeAgo;
      if (minutes < 60) {
        timeAgo = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (hours < 24) {
        timeAgo = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        timeAgo = `${days} ${days === 1 ? 'day' : 'days'} ago`;
      }
      
      return { ...lead, timeAgo };
    });
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/auth');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats/overview');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg mr-3">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, Admin!</h2>
          <p className="text-gray-600">Here's what's happening with your CRM today.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground">Total leads in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned Leads</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.unassignedLeads || 0}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Counselors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeCounselors || 0}</div>
              <p className="text-xs text-muted-foreground">Ready to handle leads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.conversionRate || "0.0"}%</div>
              <p className="text-xs text-muted-foreground">Lead to commission rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/leads')}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Leads
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/import-leads')}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Import New Leads
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/manage-users')}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/reports')}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system updates</CardDescription>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading recent activity...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLeads.length > 0 ? (
                    recentLeads.map((lead: any, index: number) => {
                      const colors = ['bg-green-500', 'bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-red-500'];
                      const colorClass = colors[index % colors.length];
                      
                      return (
                        <div key={lead.id} className="flex items-center space-x-3">
                          <div className={`w-2 h-2 ${colorClass} rounded-full`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Lead "{lead.name}" updated to {lead.currentStage}
                            </p>
                            <p className="text-xs text-gray-500">{lead.timeAgo}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No recent activity</p>
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

export default AdminDashboard;
