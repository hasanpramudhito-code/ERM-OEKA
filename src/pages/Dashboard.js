import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Warning,
  Timeline,
  Assessment,
  People,
  AccountTree,
  TrendingUp,
  CheckCircle,
  Error,
  Schedule,
  InsertChart,
  Psychology,
  Storage,
  Api,
  AssignmentInd,
  Security
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const Dashboard = () => {
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalRisks: 0,
    activeRTP: 0,
    highRisks: 0,
    riskOwners: 0,
    riskDistribution: {
      extreme: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    recentActivities: [],
    systemStatus: 'normal'
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
      
        // 1. Total Risks Count (Tetap sama)
        const risksQuery = query(collection(db, 'risks'));
        const risksSnapshot = await getCountFromServer(risksQuery);
        const totalRisks = risksSnapshot.data().count;

        // 2. Active RTP Count - DIPERBAIKI: ganti nama koleksi sesuai dengan halaman RTP
        let activeRTP = 0;
        try {
          // Mencoba berbagai nama koleksi yang mungkin
          const possibleCollections = [
            'treatment_plans',  // ← INI YANG DIPAKAI DI HALAMAN RTP
            'risk_treatment_plans',
            'rtp',
            'risk_treatments'
          ];

          for (const collectionName of possibleCollections) {
            try {
              // Debug: Cek koleksi
              const testCollection = collection(db, collectionName);
              const testSnapshot = await getDocs(testCollection);
              
              console.log(`Collection '${collectionName}': ${testSnapshot.size} documents`);
              
              if (testSnapshot.size > 0) {
                // Coba query dengan berbagai status
                const statusOptions = ['in_progress', 'In Progress', 'active', 'Active', 'ACTIVE', 'aktif'];
                
                for (const statusOption of statusOptions) {
                  try {
                    const rtpQuery = query(
                      collection(db, collectionName),
                      where('status', '==', statusOption)
                    );
                    const rtpSnapshot = await getCountFromServer(rtpQuery);
                    const count = rtpSnapshot.data().count;
                    console.log(`  - Status '${statusOption}': ${count} documents`);
                    
                    if (count > 0) {
                      activeRTP += count;
                    }
                  } catch (queryError) {
                    // Skip query error
                  }
                }
                
                // Jika masih 0, hitung manual
                if (activeRTP === 0) {
                  const allRtpData = testSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));
                  
                  // Cari yang statusnya aktif/progress (case insensitive)
                  const activeCount = allRtpData.filter(rtp => {
                    const status = rtp.status?.toString().toLowerCase() || '';
                    return status.includes('progress') || 
                          status.includes('active') || 
                          status.includes('in progress') ||
                          status === 'in_progress';
                  }).length;
                  
                  activeRTP += activeCount;
                  console.log(`Active RTP (manual filter in ${collectionName}):`, activeCount);
                }
              }
            } catch (collectionError) {
              // Collection tidak ada, lanjut ke yang berikutnya
              continue;
            }
          }

          console.log("Total Active RTP found:", activeRTP);
          
        } catch (rtpError) {
          console.error("Error counting active RTP:", rtpError);
          activeRTP = 0;
        }
        // 3. High & Extreme Risks (MODIFIKASI: Ambil dari residualRiskLevel.level)
        const highRisksQuery = query(
          collection(db, 'risks'),
          where('residualRiskLevel.level', 'in', ['Tinggi', 'Ekstrim', 'High', 'Extreme']) 
        );
        const highRisksSnapshot = await getCountFromServer(highRisksQuery);
        const highRisks = highRisksSnapshot.data().count;

        // 4. Risk Owners (Tetap sama, tapi pastikan role di user benar)
        const ownersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'risk_owner')
        );
        const ownersSnapshot = await getCountFromServer(ownersQuery);
        const riskOwners = ownersSnapshot.data().count;

        // 5. Risk Distribution (MODIFIKASI: Ambil dari residualRiskLevel.level)
        const extremeQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Ekstrim', 'Extreme']));
        const highQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Tinggi', 'High']));
        const mediumQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Sedang', 'Medium']));
        const lowQuery = query(collection(db, 'risks'), where('residualRiskLevel.level', 'in', ['Rendah', 'Sangat Rendah', 'Low', 'Very Low']));

        const [extremeSnap, highSnap, mediumSnap, lowSnap] = await Promise.all([
          getCountFromServer(extremeQuery),
          getCountFromServer(highQuery),
          getCountFromServer(mediumQuery),
          getCountFromServer(lowQuery)
        ]);

        const riskDistribution = {
          extreme: extremeSnap.data().count,
          high: highSnap.data().count,
          medium: mediumSnap.data().count,
          low: lowSnap.data().count
        };

        // 6. Recent Activities (from audit_logs or activities collection)
        const activitiesQuery = query(
          collection(db, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const recentActivities = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          time: formatTimestamp(doc.data().timestamp)
        }));

        // Fallback activities if no activities found
        const fallbackActivities = [
          { 
            action: 'Sistem ERM diinisialisasi', 
            time: 'Baru saja', 
            status: 'completed',
            id: '1'
          },
          { 
            action: `User ${userData?.name || 'admin'} berhasil login`, 
            time: '2 menit lalu', 
            status: 'completed',
            id: '2'
          },
          { 
            action: totalRisks > 0 ? `${totalRisks} risiko teridentifikasi` : 'Belum ada risiko teridentifikasi', 
            time: 'Sistem', 
            status: totalRisks > 0 ? 'completed' : 'pending',
            id: '3'
          },
        ];

        setDashboardData({
          totalRisks,
          activeRTP,
          highRisks,
          riskOwners,
          riskDistribution,
          recentActivities: recentActivities.length > 0 ? recentActivities : fallbackActivities,
          systemStatus: 'normal'
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set fallback data on error
        setDashboardData(prev => ({
          ...prev,
          recentActivities: [
            { action: 'Error loading data', time: 'Just now', status: 'error', id: 'error' },
            { action: 'Sistem tetap berjalan', time: 'Sistem', status: 'completed', id: 'system' }
          ],
          systemStatus: 'warning'
        }));
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, userData]);

  // Format timestamp to relative time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const time = timestamp.toDate();
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam lalu`;
    return `${Math.floor(diffInMinutes / 1440)} hari lalu`;
  };

  // Statistics data - NOW USING REAL DATA
  const stats = [
    { 
      title: 'Total Risks', 
      value: dashboardData.totalRisks.toString(), 
      icon: <Warning />, 
      color: '#f44336',
      description: 'Risiko teridentifikasi'
    },
    { 
      title: 'Active RTP', 
      value: dashboardData.activeRTP.toString(), 
      icon: <Timeline />, 
      color: '#2196f3',
      description: 'Risk Treatment Plan aktif'
    },
    { 
      title: 'High Risks', 
      value: dashboardData.highRisks.toString(), 
      icon: <Assessment />, 
      color: '#ff9800',
      description: 'Risiko tingkat tinggi/extreme'
    },
    { 
      title: 'Risk Owners', 
      value: dashboardData.riskOwners.toString(), 
      icon: <People />, 
      color: '#4caf50',
      description: 'Pemilik risiko aktif'
    },
  ];

  // Risk status summary - USING REAL DISTRIBUTION
  const riskStatus = [
    { status: 'Extreme', count: dashboardData.riskDistribution.extreme, color: '#d32f2f' },
    { status: 'High', count: dashboardData.riskDistribution.high, color: '#f57c00' },
    { status: 'Medium', count: dashboardData.riskDistribution.medium, color: '#fbc02d' },
    { status: 'Low', count: dashboardData.riskDistribution.low, color: '#388e3c' },
  ];

  // Quick actions
  const quickActions = [
    {
      title: 'Kelola Struktur Organisasi',
      description: 'Buat unit, sub-unit, dan proses bisnis',
      icon: <AccountTree />,
      path: '/organization',
      color: '#1976d2'
    },
    {
      title: 'Monitoring KRI',
      description: 'Key Risk Indicators',
      icon: <TrendingUp />,
      path: '/kri-monitoring',
      color: '#4caf50'
    },
    {
      title: 'Kelola Users',
      description: 'Management user dan hak akses',
      icon: <People />,
      path: '/user-management',
      color: '#9c27b0'
    },
    {
      title: 'Lihat Risk Register',
      description: 'Daftar semua risiko',
      icon: <Assessment />,
      path: '/risk-register',
      color: '#ff9800'
    },
    {
      title: 'Risk Assessment',
      description: 'Analisis dan heatmap risiko',
      icon: <InsertChart />,
      path: '/risk-assessment',
      color: '#2196f3'
    },
    {
      title: 'Risk Culture Assessment',
      description: 'Measure organizational risk culture maturity',
      icon: <Psychology />,
      path: '/risk-culture',
      color: '#9c27b0'
    },
    {
      title: 'Database Management',
      description: 'Backup, restore, and migrate database',
      icon: <Storage />,
      path: '/database-management',
      color: '#607d8b'
    },
    {
      title: 'API Integration',
      description: 'Connect with external systems',
      icon: <Api />,
      path: '/api-integration',
      color: '#7e57c2'
    },
    {
      title: 'RACI Chart',
      description: 'Responsibility Assignment Matrix',
      icon: <AssignmentInd />,
      path: '/raci-chart', 
      color: '#7b1fa2'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'pending': return <Schedule color="warning" />;
      case 'error': return <Error color="error" />;
      default: return <CheckCircle color="success" />;
    }
  };

  const getSystemStatusColor = () => {
    switch (dashboardData.systemStatus) {
      case 'normal': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'success';
    }
  };

  const getSystemStatusMessage = () => {
    switch (dashboardData.systemStatus) {
      case 'normal': return 'Sistem ERM Berjalan Normal';
      case 'warning': return 'Sistem ERM Dalam Pengawasan';
      case 'error': return 'Sistem ERM Mengalami Gangguan';
      default: return 'Sistem ERM Berjalan Normal';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Memuat data dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          📊 PT Odira Energi Karang Agung
        </Typography>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Selamat datang kembali, <strong>{userData?.name || 'User'}!</strong>
        </Typography>
        <Chip 
          label={userData?.role || 'User'} 
          color="primary" 
          variant="outlined"
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2" fontWeight="medium">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold" color={stat.color}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {stat.description}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      color: stat.color, 
                      fontSize: 48,
                      opacity: 0.8
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              height: '100%',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight="bold">
              🚀 Quick Actions
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Akses cepat ke modul utama sistem
            </Typography>
            
            <Grid container spacing={2}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} key={index}>
                  <Card 
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                        borderColor: action.color
                      }
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box sx={{ color: action.color, fontSize: 32 }}>
                          {action.icon}
                        </Box>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {action.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {action.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Right Column - Activities & Status */}
        <Grid item xs={12} md={6}>
          {/* Recent Activities */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              📝 Aktivitas Terbaru
            </Typography>
            <List dense>
              {dashboardData.recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id || index}>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(activity.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.action}
                      secondary={activity.time}
                    />
                  </ListItem>
                  {index < dashboardData.recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>

          {/* Risk Status Summary */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              🎯 Status Risiko
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Distribusi tingkat risiko
            </Typography>
            
            <Grid container spacing={1}>
              {riskStatus.map((risk, index) => (
                <Grid item xs={6} key={index}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      backgroundColor: risk.color, 
                      borderRadius: 1,
                      color: 'white',
                      textAlign: 'center',
                      opacity: risk.count > 0 ? 1 : 0.6
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      {risk.count}
                    </Typography>
                    <Typography variant="body2">
                      {risk.status}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* System Status Footer */}
      <Paper 
        sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: dashboardData.systemStatus === 'normal' ? '#e8f5e8' : 
                          dashboardData.systemStatus === 'warning' ? '#fff3e0' : '#ffebee',
          border: dashboardData.systemStatus === 'normal' ? '1px solid #4caf50' :
                  dashboardData.systemStatus === 'warning' ? '1px solid #ff9800' : '1px solid #f44336'
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {dashboardData.systemStatus === 'normal' ? '✅' : 
               dashboardData.systemStatus === 'warning' ? '⚠️' : '❌'} 
              {getSystemStatusMessage()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {dashboardData.totalRisks > 0 ? 
                `${dashboardData.totalRisks} risiko terkelola dengan ${dashboardData.activeRTP} treatment plan aktif` : 
                'Belum ada risiko teridentifikasi'}
            </Typography>
          </Box>
          <Chip 
            label={dashboardData.systemStatus === 'normal' ? 'Online' : 
                   dashboardData.systemStatus === 'warning' ? 'Warning' : 'Error'} 
            color={getSystemStatusColor()} 
            variant="filled"
            size="small"
          />
        </Box>
      </Paper>

      {/* Getting Started Guide - Only show if no risks */}
      {dashboardData.totalRisks === 0 && (
        <Paper sx={{ mt: 3, p: 3, backgroundColor: '#fff3e0' }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            🏁 Memulai ERM System
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                1. <strong>Setup Struktur Organisasi</strong> - Definisikan unit dan sub-unit
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                2. <strong>Kelola User</strong> - Tambah user dan assign role
              </Typography>
              <Typography variant="body2">
                3. <strong>Identifikasi Risiko</strong> - Mulai input risiko per unit
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                4. <strong>Assessment</strong> - Nilai likelihood dan impact
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                5. <strong>Treatment Plan</strong> - Buat rencana mitigasi
              </Typography>
              <Typography variant="body2">
                6. <strong>Monitoring</strong> - Pantau progress dan KRI
              </Typography>
            </Grid>
          </Grid>
          <Button 
            variant="contained" 
            startIcon={<AccountTree />}
            onClick={() => navigate('/organization')}
            sx={{ mt: 2 }}
          >
            Mulai dengan Struktur Organisasi
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;