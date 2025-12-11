import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Typography, Button } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AssessmentConfigProvider } from './contexts/AssessmentConfigContext';
import { ApprovalProvider } from './contexts/ApprovalContext';
import ApprovalNotification from './components/Approval/ApprovalNotification';
import ProtectedRoute from './components/ProtectedRoute';

// Layout - GANTI dengan AppLayout yang baru
import AppLayout from './components/AppLayout'; // ✅ GANTI DI SINI SAJA

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import OrganizationStructure from './pages/OrganizationStructure';
import UserManagement from './pages/UserManagement';
import RiskRegister from './pages/RiskRegister';
import RiskAssessment from './pages/RiskAssessment';
import RiskTreatmentPlans from './pages/RiskTreatmentPlans';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import KRIMonitoring from './pages/KRIMonitoring';
import IncidentReporting from './pages/IncidentReporting';
import Reporting from './pages/Reporting';
import KRIMonitoringService from './services/kriMonitoringService';
import RiskCulture from './pages/RiskCulture';
import DatabaseManagement from './pages/DatabaseManagement';
import APIIntegration from './pages/APIIntegration';
import SettingsPanel from './pages/SettingsPanel';
import RiskParameterSettings from './pages/RiskParameterSettings';
import RACIChart from './components/RACIChart';
import RiskAppetiteDashboard from './pages/RiskAppetite/RiskAppetiteDashboard';
import KRISettings from './pages/KRIMonitoring/KRISettings';
import RiskToleranceSettings from './pages/RiskAppetite/RiskToleranceSettings';
import ControlRegister from './pages/ControlTesting/ControlRegister';
import TestingSchedule from './pages/ControlTesting/TestingSchedule';
import TestResults from './pages/ControlTesting/TestResults';
import DeficiencyTracking from './pages/ControlTesting/DeficiencyTracking';
import DocumentTitle from './components/DocumentTitle';
import Configuration from './pages/Configuration';
import Organization from './pages/Organization';
import ApprovalDashboard from './pages/ApprovalDashboard';
import WorkflowConfig from './components/Approval/WorkflowConfig';
import PendingApprovals from './components/Approval/PendingApprovals';
import ApprovalHistory from './components/Approval/ApprovalHistory';

const theme = createTheme({
  palette: {
    primary: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20' },
    secondary: { main: '#ff6f00', light: '#ff9800', dark: '#e65100' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h6: { fontWeight: 600 }
  },
  shape: { borderRadius: 8 },
});

// Helper Component untuk wrap dengan AppLayout
const LayoutWrapper = ({ children }) => {
  return <AppLayout>{children}</AppLayout>; // ✅ GUNAKAN AppLayout
};

function App() {
  useEffect(() => {
    console.log('Starting KRI Monitoring Service...');
    KRIMonitoringService.startMonitoring();

    return () => {
      console.log('Stopping KRI Monitoring Service...');
      KRIMonitoringService.stopMonitoring();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <DocumentTitle />
        <AuthProvider>
          <SettingsProvider>
            <AssessmentConfigProvider> 
            <ApprovalProvider>
              <Routes>

                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Dashboard */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <LayoutWrapper><Dashboard /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <LayoutWrapper><Dashboard /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* EXECUTIVE DASHBOARD */}
                <Route
                  path="/executive-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><ExecutiveDashboard /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* KRI MONITORING */}
                <Route
                  path="/kri-monitoring"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><KRIMonitoring /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* ORGANIZATION */}
                <Route
                  path="/organization"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><Organization /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* ORGANIZATION STRUCTURE (old route - keep for compatibility) */}
                <Route
                  path="/organization-structure"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><OrganizationStructure /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* USER MANAGEMENT */}
                <Route
                  path="/user-management"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <LayoutWrapper><UserManagement /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* RISK REGISTER */}
                <Route
                  path="/risk-register"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><RiskRegister /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* RISK ASSESSMENT */}
                <Route
                  path="/risk-assessment"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><RiskAssessment /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* TREATMENT PLANS */}
                <Route
                  path="/treatment-plans"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR']}>
                      <LayoutWrapper><RiskTreatmentPlans /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* RISK PARAMETERS */}
                <Route
                  path="/risk-parameters"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'RISK_OWNER']}>
                      <LayoutWrapper><RiskParameterSettings /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* CONFIGURATION */}
                <Route
                  path="/configuration"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'DIRECTOR', 'RISK_MANAGER']}>
                      <LayoutWrapper><Configuration /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* SETTINGS */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><SettingsPanel /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* INCIDENT REPORTING */}
                <Route
                  path="/incident-reporting"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><IncidentReporting /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* REPORTING */}
                <Route
                  path="/reporting"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><Reporting /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* RISK CULTURE */}
                <Route
                  path="/risk-culture"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><RiskCulture /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* DATABASE MGMT */}
                <Route
                  path="/database-management"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <LayoutWrapper><DatabaseManagement /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* API INTEGRATION */}
                <Route
                  path="/api-integration"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER']}>
                      <LayoutWrapper><APIIntegration /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* RACI */}
                <Route
                  path="/raci-chart"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><RACIChart /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* RISK APPETITE */}
                <Route
                  path="/risk-appetite"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><RiskAppetiteDashboard /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* KRI SETTINGS */}
                <Route
                  path="/kri-settings"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER']}>
                      <LayoutWrapper><KRISettings /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* RISK TOLERANCE */}
                <Route
                  path="/risk-tolerance"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR']}>
                      <LayoutWrapper><RiskToleranceSettings /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* CONTROL REGISTER */}
                <Route
                  path="/control-register"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR']}>
                      <LayoutWrapper><ControlRegister /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                {/* CONTROL TESTING */}
                <Route
                  path="/testing-schedule"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER']}>
                      <LayoutWrapper><TestingSchedule /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/test-results"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                      <LayoutWrapper><TestResults /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/deficiency-tracking"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR']}>
                      <LayoutWrapper><DeficiencyTracking /></LayoutWrapper>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/approval" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ApprovalDashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/approval/workflows" 
                  element={
                    <ProtectedRoute>
                      <AppLayout> {/* ← GANTI MENJADI 'AppLayout' */}
                        <WorkflowConfig />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/approval/pending" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <PendingApprovals />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/approval/history" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ApprovalHistory />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                {/* 404 */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <LayoutWrapper>
                        <Box display="flex" justifyContent="center" alignItems="center" height="80vh" flexDirection="column">
                          <Typography variant="h4" color="textSecondary" gutterBottom>
                            404 - Page Not Found
                          </Typography>
                          <Button variant="contained" onClick={() => window.location.href = '/'}>
                            Back to Dashboard
                          </Button>
                        </Box>
                      </LayoutWrapper>
                    </ProtectedRoute>
                  }
                />

              </Routes>
            </ApprovalProvider>
            </AssessmentConfigProvider>
          </SettingsProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;