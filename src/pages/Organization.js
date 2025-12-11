import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
  Alert,
  Chip,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Business,
  AccountTree,
  Tune,
  Build,
  Settings,
  Warning,
  People,
  Description
} from '@mui/icons-material';

// Import komponen-komponen
import OrganizationStructure from '../components/OrganizationStructure';
import Configuration from './Configuration'; // Halaman config yang sudah ada

// GANTI placeholder dengan komponen yang sudah ada
import RiskParameterSettings from './RiskParameterSettings'; // PAKAI YANG KOMPREHENSIF
import SystemSettings from '../components/SystemSettings'; // Tetap placeholder untuk sekarang

const Organization = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fungsi untuk membaca parameter tab dari URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    const tabIndex = {
      'structure': 0,
      'risk-params': 1,
      'assessment-config': 2,
      'system-settings': 3
    }[tabParam];
    
    if (tabIndex !== undefined) {
      setActiveTab(tabIndex);
    }
  }, []);

  // Component untuk setiap tab
  const TabContent = ({ tabId }) => {
    switch (tabId) {
      case 'structure':
        return <OrganizationStructure />;
      case 'risk-params':
        return <RiskParameterSettings />; // PAKAI YANG KOMPREHENSIF
      case 'assessment-config':
        return <Configuration />;
      case 'system-settings':
        return <SystemSettings />;
      default:
        return (
          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="textSecondary">
              No content available
            </Typography>
          </Box>
        );
    }
  };

  const tabs = [
    {
      id: 'structure',
      label: 'Struktur Organisasi',
      icon: <AccountTree />,
      description: 'Kelola hierarki unit, sub-unit, dan proses bisnis',
      accessLevel: ['ADMIN', 'DIRECTOR', 'RISK_MANAGER']
    },
    {
      id: 'risk-params',
      label: 'Risk Parameters',
      icon: <Tune />,
      description: 'Konfigurasi skala likelihood, impact, dan risk appetite',
      accessLevel: ['ADMIN', 'DIRECTOR', 'RISK_MANAGER'],
      badge: 'COMPREHENSIVE'
    },
    {
      id: 'assessment-config',
      label: 'Risk Assessment Config',
      icon: <Build />,
      description: 'Setting likelihood, impact, dan risk levels',
      accessLevel: ['ADMIN', 'DIRECTOR', 'RISK_MANAGER'],
      badge: 'CONFIG'
    },
    {
      id: 'system-settings',
      label: 'System Settings',
      icon: <Settings />,
      description: 'Pengaturan sistem dan preferensi',
      accessLevel: ['ADMIN'],
      badge: 'ADMIN'
    }
  ];

  // Untuk sekarang, kita asumsikan user adalah ADMIN
  const userRole = 'ADMIN'; // Nanti bisa diambil dari context
  const accessibleTabs = tabs.filter(tab => tab.accessLevel.includes(userRole));

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Update URL dengan parameter tab
    const tabId = accessibleTabs[newValue]?.id;
    if (tabId) {
      window.history.replaceState(null, '', `/organization?tab=${tabId}`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const currentTab = accessibleTabs[activeTab];

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={3}>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'primary.main', 
              borderRadius: 2,
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <Business sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Organization
              </Typography>
            </Box>
            <Box flex={1}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Organization & Configuration
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Pusat pengelolaan struktur organisasi dan konfigurasi sistem risk management
              </Typography>
              
              {/* Current Tab Info */}
              {currentTab && (
                <Box display="flex" gap={3} mt={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Current Tab</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {currentTab.icon}
                      <Typography variant="h6" fontWeight="bold">
                        {currentTab.label}
                      </Typography>
                      {currentTab.badge && (
                        <Chip 
                          label={currentTab.badge} 
                          size="small" 
                          color={
                            currentTab.badge === 'COMPREHENSIVE' ? 'success' :
                            currentTab.badge === 'CONFIG' ? 'info' :
                            currentTab.badge === 'ADMIN' ? 'warning' : 'default'
                          }
                          sx={{ height: 20, fontSize: '0.6rem' }}
                        />
                      )}
                    </Box>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Description</Typography>
                    <Typography variant="body2" sx={{ maxWidth: 400 }}>
                      {currentTab.description}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
            
            {/* Quick Actions */}
            <Box display="flex" flexDirection="column" gap={1}>
              {currentTab?.id === 'risk-params' && (
                <Tooltip title="Initialize Default Parameters">
                  <Chip 
                    icon={<Warning />} 
                    label="Initialize Default" 
                    variant="outlined" 
                    color="warning"
                    clickable
                    sx={{ borderRadius: 1 }}
                  />
                </Tooltip>
              )}
              <Tooltip title="Export Configuration">
                <Chip 
                  icon={<Description />} 
                  label="Export" 
                  variant="outlined" 
                  clickable
                  sx={{ borderRadius: 1 }}
                />
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 60,
              py: 1.5,
              fontSize: '0.9rem'
            }
          }}
        >
          {accessibleTabs.map((tab, index) => (
            <Tab
              key={tab.id}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {tab.icon}
                  <Box>
                    <Typography variant="body2" fontWeight={activeTab === index ? 600 : 400}>
                      {tab.label}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                      {tab.description}
                    </Typography>
                  </Box>
                  {tab.badge && (
                    <Chip 
                      label={tab.badge} 
                      size="small" 
                      color={
                        tab.badge === 'COMPREHENSIVE' ? 'success' :
                        tab.badge === 'CONFIG' ? 'info' :
                        tab.badge === 'ADMIN' ? 'warning' : 'default'
                      }
                      sx={{ 
                        height: 20, 
                        fontSize: '0.6rem',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Card sx={{ 
        boxShadow: 2, 
        borderRadius: 2,
        minHeight: '60vh',
        overflow: 'hidden'
      }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            {currentTab ? (
              <TabContent tabId={currentTab.id} />
            ) : (
              <Box textAlign="center" py={6}>
                <Typography variant="h6" color="textSecondary">
                  No content available
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Info Panel */}
      {currentTab?.id === 'risk-params' && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 3, 
            borderRadius: 2,
            '& .MuiAlert-icon': { alignItems: 'center' }
          }}
        >
          <Typography variant="body2">
            <strong>Risk Parameters Lengkap:</strong> Konfigurasi ini mencakup Likelihood Scale, Impact Scales, Risk Appetite, dan Tolerance Matrix yang akan digunakan di seluruh sistem risk management.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Organization;