// File: src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Typography, Button } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AssessmentConfigProvider } from './contexts/AssessmentConfigContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

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
import KRIMonitoring from './pages/KRIMonitoring'; // ✅ Gunakan yang original
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

// ❌ HAPUS: import EnhancedKRIMonitoring from './pages/KRIMonitoring/KRIDashboard';

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
            <Routes>

              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Dashboard */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* EXECUTIVE DASHBOARD */}
              <Route
                path="/executive-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><ExecutiveDashboard /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* ✅ FIXED: KRI MONITORING - Gunakan KRIMonitoring bukan EnhancedKRIMonitoring */}
              <Route
                path="/kri-monitoring"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><KRIMonitoring /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* ORGANIZATION */}
              <Route
                path="/organization"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><OrganizationStructure /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* USER MANAGEMENT */}
              <Route
                path="/user-management"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <Layout><UserManagement /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* RISK REGISTER */}
              <Route
                path="/risk-register"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><RiskRegister /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* RISK ASSESSMENT */}
              <Route
                path="/risk-assessment"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><RiskAssessment /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* TREATMENT PLANS */}
              <Route
                path="/treatment-plans"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR']}>
                    <Layout><RiskTreatmentPlans /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* RISK PARAMETERS */}
              <Route
                path="/risk-parameters"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'RISK_OWNER']}>
                    <Layout><RiskParameterSettings /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* SETTINGS */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><SettingsPanel /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* INCIDENT REPORTING */}
              <Route
                path="/incident-reporting"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><IncidentReporting /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* REPORTING */}
              <Route
                path="/reporting"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><Reporting /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* RISK CULTURE */}
              <Route
                path="/risk-culture"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><RiskCulture /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* DATABASE MGMT */}
              <Route
                path="/database-management"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <Layout><DatabaseManagement /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* API INTEGRATION */}
              <Route
                path="/api-integration"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER']}>
                    <Layout><APIIntegration /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* RACI */}
              <Route
                path="/raci-chart"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><RACIChart /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* RISK APPETITE */}
              <Route
                path="/risk-appetite"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><RiskAppetiteDashboard /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* KRI SETTINGS */}
              <Route
                path="/kri-settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER']}>
                    <Layout><KRISettings /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* RISK TOLERANCE */}
              <Route
                path="/risk-tolerance"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR']}>
                    <Layout><RiskToleranceSettings /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* CONTROL REGISTER */}
              <Route
                path="/control-register"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER', 'DIRECTOR']}>
                    <Layout><ControlRegister /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* CONTROL TESTING */}
              <Route
                path="/testing-schedule"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER']}>
                    <Layout><TestingSchedule /></Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/test-results"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR', 'DK/DEWAS']}>
                    <Layout><TestResults /></Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/deficiency-tracking"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OWNER', 'RISK_OFFICER', 'DIRECTOR']}>
                    <Layout><DeficiencyTracking /></Layout>
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Box display="flex" justifyContent="center" alignItems="center" height="80vh" flexDirection="column">
                        <Typography variant="h4" color="textSecondary" gutterBottom>
                          404 - Page Not Found
                        </Typography>
                        <Button variant="contained" onClick={() => window.location.href = '/'}>
                          Back to Dashboard
                        </Button>
                      </Box>
                    </Layout>
                  </ProtectedRoute>
                }
              />

            </Routes>
            </AssessmentConfigProvider>
          </SettingsProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;