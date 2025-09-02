
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import AdminLeads from './pages/AdminLeads';
import CounselorLeads from './pages/CounselorLeads';
import ManageUsers from './pages/ManageUsers';
import ImportLeads from './pages/ImportLeads';
import ViewReports from './pages/ViewReports';
import LeadWorkspace from './pages/LeadWorkspace';
import NotFound from './pages/NotFound';
import Index from './pages/Index';

// Mock authentication check
const isAuthenticated = () => {
  return localStorage.getItem('user') !== null;
};

const getUserRole = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user).role : null;
};

// Protected Route component
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }
  
  if (requiredRole && getUserRole() !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <Navigate to="/admin/dashboard" replace />
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/leads" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLeads />
            </ProtectedRoute>
          } />
          <Route path="/admin/manage-users" element={
            <ProtectedRoute requiredRole="admin">
              <ManageUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/import-leads" element={
            <ProtectedRoute requiredRole="admin">
              <ImportLeads />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute requiredRole="admin">
              <ViewReports />
            </ProtectedRoute>
          } />
          
          {/* Counselor Routes */}
          <Route path="/counselor" element={
            <ProtectedRoute requiredRole="counselor">
              <Navigate to="/counselor/dashboard" replace />
            </ProtectedRoute>
          } />
          <Route path="/counselor/dashboard" element={
            <ProtectedRoute requiredRole="counselor">
              <CounselorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/counselor/leads" element={
            <ProtectedRoute requiredRole="counselor">
              <CounselorLeads />
            </ProtectedRoute>
          } />
          
          {/* Shared Routes */}
          <Route path="/lead/:leadId" element={
            <ProtectedRoute>
              <LeadWorkspace />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
