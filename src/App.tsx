import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AuditFormPage } from './pages/AuditFormPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { DepartmentPage } from './pages/DepartmentPage';
import { MainLayout } from './components/layout/MainLayout';
import { ObservationActionPage } from './pages/ObservationActionPage';
import { SIRFormPage } from './pages/SIRFormPage';
import { OAFDirectoryPage } from './pages/OAFDirectoryPage';
import { EventManagementPage } from './pages/EventManagementPage';
import { ArchiveDetailPage } from './pages/ArchiveDetailPage';
import { OTPPage } from './pages/OTPPage';
import { OTPMonitoringPage } from './pages/OTPMonitoringPage';

import type { UserRole } from './lib/types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user, userData, loading } = useAuth();

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;

  // Role check
  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    // Redirect to appropriate page based on role
    if (userData.role === 'Auditee') {
      return <Navigate to={`/department/${userData.department}`} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

function App() {
  console.log('App mounting...');
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute> {/* General protection, let internal logic handle redirect */}
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin']}>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/audit-form" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin']}>
              <AuditFormPage />
            </ProtectedRoute>
          } />

          <Route path="/audit-form/:id" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin']}>
              <AuditFormPage />
            </ProtectedRoute>
          } />



          <Route path="/audit/:id" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin', 'Auditee']}>
              <AuditFormPage />
            </ProtectedRoute>
          } />

          <Route path="/observation-form" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin']}>
              <ObservationActionPage />
            </ProtectedRoute>
          } />

          <Route path="/observation-form/:id" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin', 'Auditee']}>
              <ObservationActionPage />
            </ProtectedRoute>
          } />

          <Route path="/sir-form" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin']}>
              <SIRFormPage />
            </ProtectedRoute>
          } />

          <Route path="/sir-form/:id" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin', 'Auditee']}>
              <SIRFormPage />
            </ProtectedRoute>
          } />

          <Route path="/oaf-directory" element={
            <ProtectedRoute allowedRoles={['Auditee']}>
              <OAFDirectoryPage />
            </ProtectedRoute>
          } />

          <Route path="/directory" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin', 'Auditee']}>
              <DirectoryPage />
            </ProtectedRoute>
          } />

          <Route path="/approvals" element={
            <ProtectedRoute allowedRoles={['LeadAuditor', 'QMSAdmin']}>
              <ApprovalsPage />
            </ProtectedRoute>
          } />

          <Route path="/department/:departmentName" element={
            <ProtectedRoute allowedRoles={['Auditee']}>
              <DepartmentPage />
            </ProtectedRoute>
          } />

          <Route path="/department/:departmentName/otp" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin', 'Auditee']}>
              <OTPPage />
            </ProtectedRoute>
          } />

          <Route path="/otp-monitoring" element={
            <ProtectedRoute allowedRoles={['LeadAuditor', 'QMSAdmin']}>
              <OTPMonitoringPage />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['LeadAuditor', 'QMSAdmin']}>
              <SettingsPage />
            </ProtectedRoute>
          } />

          <Route path="/events" element={
            <ProtectedRoute allowedRoles={['LeadAuditor', 'QMSAdmin']}>
              <EventManagementPage />
            </ProtectedRoute>
          } />

          <Route path="/archives/:eventId" element={
            <ProtectedRoute allowedRoles={['Auditor', 'LeadAuditor', 'QMSAdmin', 'Auditee']}>
              <ArchiveDetailPage />
            </ProtectedRoute>
          } />

          {/* Catch all to prevent blank screen on wrong paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
