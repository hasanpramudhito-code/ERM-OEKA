import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Warning,
  CheckCircle,
  Schedule,
  Assignment,
  BarChart,
  Refresh,
  Add
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import CompositeScoreService from '../services/compositeScoreService';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';

const ExecutiveDashboard = () => {
  const [risks, setRisks] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [compositeScore, setCompositeScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const { assessmentConfig, calculateScore, calculateRiskLevel } = useAssessmentConfig();

  // ✅ LOAD REAL DATA DARI FIRESTORE - DIPERBAIKI
  const loadRealData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading integrated data from Firestore...');
      
      // 1. LOAD DATA DARI 3 COLLECTION BERBEDA
      // a. Load risks dari risk_register (collection 'risks')
      const risksQuery = query(collection(db, 'risks'));
      const risksSnapshot = await getDocs(risksQuery);
      const riskRegisterData = risksSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'register',
        ...doc.data()
      }));
      
      // b. Load risk assessments (collection 'risk_assessments')
      let assessmentData = [];
      try {
        const assessmentQuery = query(collection(db, 'risk_assessments'));
        const assessmentSnapshot = await getDocs(assessmentQuery);
        assessmentData = assessmentSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'assessment',
          ...doc.data()
        }));
        console.log(`✅ Loaded ${assessmentData.length} risk assessments`);
      } catch (error) {
        console.log('⚠️ No risk_assessments collection found or error:', error);
      }
      
      // c. Load risk scoring (collection 'risk_scoring' atau similar)
      let scoringData = [];
      try {
        // Coba beberapa kemungkinan collection names
        const collectionsToTry = ['risk_scoring', 'risk_scores', 'scoring'];
        
        for (const collectionName of collectionsToTry) {
          try {
            const scoringQuery = query(collection(db, collectionName));
            const scoringSnapshot = await getDocs(scoringQuery);
            if (!scoringSnapshot.empty) {
              scoringData = scoringSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'scoring',
                collection: collectionName,
                ...doc.data()
              }));
              console.log(`✅ Loaded ${scoringData.length} scorings from ${collectionName}`);
              break;
            }
          } catch (e) {
            // Continue to next collection name
          }
        }
      } catch (error) {
        console.log('⚠️ No scoring collections found');
      }
      
      console.log(`📊 Raw data: ${riskRegisterData.length} risks, ${assessmentData.length} assessments, ${scoringData.length} scorings`);
      
      // 2. ✅ GABUNGKAN SEMUA DATA DENGAN PRIORITAS ASSESSMENT
      const integratedRisks = riskRegisterData.map(risk => {
        // Cari assessment untuk risk ini (by riskId atau matching fields)
        const assessment = assessmentData.find(a => 
          a.riskId === risk.id || 
          a.riskCode === risk.riskCode ||
          a.title === risk.title
        );
        
        // Cari scoring untuk risk ini
        const scoring = scoringData.find(s => 
          s.riskId === risk.id ||
          s.riskCode === risk.riskCode
        );
        
        // HITUNG SCORE AKHIR DENGAN PRIORITAS:
        // 1. Assessment data (likelihood × impact)
        // 2. Scoring data (riskScore)
        // 3. Default dari risk register
        // 4. Fallback: likelihood=1, impact=1
        
        let finalLikelihood = 1;
        let finalImpact = 1;
        let finalScore = 1;
        let dataSource = 'default';
        
        if (assessment) {
          // Gunakan data assessment
          finalLikelihood = assessment.likelihood || assessment.probability || risk.likelihood || 1;
          finalImpact = assessment.impact || assessment.consequence || risk.impact || 1;
          finalScore = assessment.riskScore || (finalLikelihood * finalImpact);
          dataSource = 'assessment';
          console.log(`📈 Using assessment data for risk ${risk.id}: L=${finalLikelihood}, I=${finalImpact}, Score=${finalScore}`);
        } else if (scoring) {
          // Gunakan data scoring
          finalScore = scoring.riskScore || scoring.score || (risk.likelihood * risk.impact) || 1;
          finalLikelihood = scoring.likelihood || risk.likelihood || 1;
          finalImpact = scoring.impact || risk.impact || 1;
          dataSource = 'scoring';
        } else {
          // Gunakan data dari risk register
          finalLikelihood = risk.likelihood || risk.initialProbability || risk.probability || 1;
          finalImpact = risk.impact || risk.initialImpact || 1;
          finalScore = risk.riskScore || risk.inherentScore || (finalLikelihood * finalImpact);
          dataSource = 'register';
        }
        
        // Pastikan nilai numerik
        finalLikelihood = Number(finalLikelihood);
        finalImpact = Number(finalImpact);
        finalScore = Number(finalScore);
        
        // Calculate risk level
        const level = calculateRiskLevel(finalScore);
        
        return {
          ...risk,
          likelihood: finalLikelihood,
          impact: finalImpact,
          riskScore: finalScore,
          riskLevel: level,
          // Metadata untuk tracking
          hasAssessment: !!assessment,
          hasScoring: !!scoring,
          dataSource: dataSource,
          assessmentData: assessment || null,
          scoringData: scoring || null
        };
      });
      
      console.log('✅ Integrated risks (first 5):', integratedRisks.slice(0, 5));
      setRisks(integratedRisks);
      
      // 3. LOAD TREATMENT PLANS
      let treatmentPlansData = [];
      try {
        const plansQuery = query(collection(db, 'treatment_plans'));
        const plansSnapshot = await getDocs(plansQuery);
        treatmentPlansData = plansSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        console.log(`✅ Loaded ${treatmentPlansData.length} treatment plans`);
      } catch (error) {
        console.error('Error loading treatment_plans:', error);
      }
      setTreatmentPlans(treatmentPlansData);
      
      // 4. LOAD INCIDENTS
      let incidentsData = [];
      try {
        const incidentsQuery = query(collection(db, 'incidents'));
        const incidentsSnapshot = await getDocs(incidentsQuery);
        incidentsData = incidentsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        console.log(`✅ Loaded ${incidentsData.length} incidents`);
      } catch (error) {
        console.error('Error loading incidents:', error);
      }
      setIncidents(incidentsData);
      
      // 5. LOAD COMPOSITE SCORE
      try {
        const latestScore = await CompositeScoreService.manualCalculate();
        setCompositeScore(latestScore);
        const history = await CompositeScoreService.getScoreHistory();
        setScoreHistory(history);
      } catch (scoreError) {
        console.log('Composite score not available yet:', scoreError);
        setCompositeScore(null);
      }
      
    } catch (error) {
      console.error('❌ Error loading integrated dashboard data:', error);
    } finally {
      setLoading(false);
      console.log('✅ Data loading completed');
    }
  };

  // ✅ REFRESH COMPOSITE SCORE
  const handleRefreshScore = async () => {
    try {
      setRefreshing(true);
      const newScore = await CompositeScoreService.manualCalculate();
      setCompositeScore(newScore);
      const history = await CompositeScoreService.getScoreHistory();
      setScoreHistory(history);
    } catch (error) {
      console.error('Error refreshing composite score:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRealData();
  }, []);

  // ✅ HITUNG STATISTIK DARI DATA REAL YANG SUDAH DIINTEGRASI
  const calculateStats = () => {
    const totalRisks = risks.length;
    
    // Hitung risks by level dari data terintegrasi
    const extremeRisks = risks.filter(risk => 
      risk.riskScore >= 20 || 
      risk.riskLevel?.level === 'Extreme' || 
      risk.riskLevel?.level === 'Ekstrim'
    ).length;

    const highRisks = risks.filter(risk => 
      (risk.riskScore >= 16 && risk.riskScore < 20) ||
      risk.riskLevel?.level === 'High' || 
      risk.riskLevel?.level === 'Tinggi'
    ).length;

    const mediumRisks = risks.filter(risk => 
      (risk.riskScore >= 10 && risk.riskScore < 16) ||
      risk.riskLevel?.level === 'Medium' || 
      risk.riskLevel?.level === 'Sedang'
    ).length;

    const lowRisks = risks.filter(risk => 
      risk.riskScore < 10 ||
      risk.riskLevel?.level === 'Low' || 
      risk.riskLevel?.level === 'Rendah' || 
      risk.riskLevel?.level === 'Very Low' || 
      risk.riskLevel?.level === 'Sangat Rendah'
    ).length;

    // Hitung risks dengan assessment
    const assessedRisks = risks.filter(risk => risk.hasAssessment).length;
    
    // Treatment stats
    const totalTreatments = treatmentPlans.length;
    const completedTreatments = treatmentPlans.filter(p => 
      p.status?.toLowerCase().includes('completed') || 
      p.status?.toLowerCase().includes('selesai') ||
      p.status === 'completed'
    ).length;

    const inProgressTreatments = treatmentPlans.filter(p => 
      p.status?.toLowerCase().includes('progress') || 
      p.status?.toLowerCase().includes('dalam') ||
      p.status === 'in_progress'
    ).length;

    const avgProgress = treatmentPlans.length > 0 
      ? treatmentPlans.reduce((sum, plan) => sum + (Number(plan.progress) || 0), 0) / treatmentPlans.length 
      : 0;

    // Incident statistics
    const totalIncidents = incidents.length;
    const criticalIncidents = incidents.filter(incident => 
      incident.severity?.toLowerCase().includes('critical') || 
      incident.severity?.toLowerCase().includes('kritis') ||
      incident.severity === 'critical'
    ).length;

    const stats = {
      totalRisks,
      extremeRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      assessedRisks, // ✅ Baru: jumlah risks yang sudah di-assessment
      totalTreatments,
      completedTreatments,
      inProgressTreatments,
      avgProgress: Math.round(avgProgress),
      totalIncidents,
      criticalIncidents
    };

    console.log('📈 Final stats from integrated data:', stats);
    return stats;
  };

  // ✅ GET TOP 10 RISKS DENGAN DATA ASSESSMENT
  const getTopRisks = () => {
    // Filter risks yang memiliki assessment atau scoring
    const assessedRisks = risks.filter(risk => 
      risk.hasAssessment || 
      risk.hasScoring || 
      risk.dataSource !== 'default'
    );
    
    // Jika ada risks dengan assessment, prioritaskan mereka
    if (assessedRisks.length > 0) {
      return assessedRisks
        .map(risk => ({
          id: risk.id,
          title: risk.title || risk.riskDescription || 'Unnamed Risk',
          description: risk.riskDescription || risk.title || 'No description',
          score: risk.riskScore || 1,
          level: risk.riskLevel?.level || calculateRiskLevel(risk.riskScore || 1),
          department: risk.department || 'Unknown',
          owner: risk.riskOwner || 'Unassigned',
          status: risk.status || 'Identified',
          hasAssessment: risk.hasAssessment,
          hasScoring: risk.hasScoring,
          dataSource: risk.dataSource,
          warning: !risk.hasAssessment && !risk.hasScoring ? '⚠️ Using register data' : null
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    }
    
    // Jika tidak ada assessment, tampilkan semua risks dengan warning
    return risks
      .map(risk => ({
        id: risk.id,
        title: risk.title || risk.riskDescription || 'Unnamed Risk',
        description: risk.riskDescription || risk.title || 'No description',
        score: risk.riskScore || 1,
        level: risk.riskLevel?.level || calculateRiskLevel(risk.riskScore || 1),
        department: risk.department || 'Unknown',
        owner: risk.riskOwner || 'Unassigned',
        status: risk.status || 'Identified',
        hasAssessment: false,
        hasScoring: false,
        dataSource: 'default',
        warning: '⚠️ Not assessed yet'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  };

  // ✅ GENERATE RISK MATRIX DARI DATA TERINTEGRASI
  const getRiskMatrix = () => {
    const matrix = {
      extreme: [],
      high: [],
      medium: [],
      low: []
    };

    risks.forEach(risk => {
      const score = risk.riskScore || 1;
      const level = risk.riskLevel?.level || '';
      
      if (score >= 20 || level.includes('Extreme') || level.includes('Ekstrim')) {
        matrix.extreme.push(risk);
      } else if (score >= 16 || level.includes('High') || level.includes('Tinggi')) {
        matrix.high.push(risk);
      } else if (score >= 10 || level.includes('Medium') || level.includes('Sedang')) {
        matrix.medium.push(risk);
      } else {
        matrix.low.push(risk);
      }
    });

    return matrix;
  };

  // Get treatment status distribution
  const getTreatmentStatus = () => {
    const status = {
      completed: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('completed') || 
        p.status === 'completed'
      ).length,
      in_progress: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('progress') || 
        p.status === 'in_progress'
      ).length,
      planned: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('planned') || 
        p.status === 'planned'
      ).length,
      delayed: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('delayed') || 
        p.status === 'delayed'
      ).length
    };
    return status;
  };

  // Get composite score color
  const getCompositeScoreColor = (score) => {
    if (!score) return '#1976d2';
    if (score >= 80) return '#f44336';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#2196f3';
    return '#4caf50';
  };

  // Get composite score chip color
  const getCompositeScoreChipColor = (score) => {
    if (!score) return 'default';
    if (score >= 80) return 'error';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'info';
    return 'success';
  };

  // Get trend icon
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingDown sx={{ color: 'success.main' }} />;
      case 'deteriorating': return <TrendingUp sx={{ color: 'error.main' }} />;
      default: return <TrendingFlat sx={{ color: 'warning.main' }} />;
    }
  };

  // ✅ RELOAD DATA FUNCTION
  const handleReloadData = () => {
    loadRealData();
  };

  // Statistik akan otomatis konsisten dengan RiskRegister
  const stats = calculateStats();
  const topRisks = getTopRisks();
  const riskMatrix = getRiskMatrix();
  const treatmentStatus = getTreatmentStatus();

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Integrated Executive Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Executive Dashboard
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Integrated Risk Management Overview
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Data dari Risk Register + Risk Assessment + Treatment Plans
                <br />
                <strong>Total Risks: {stats.totalRisks} | Assessed: {stats.assessedRisks} | Treatments: {stats.totalTreatments}</strong>
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleReloadData}
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Reload Data
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Data Status Alert */}
      {stats.totalRisks === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>No risks found in Risk Register!</strong> Please add risks first in the Risk Register page.
        </Alert>
      ) : stats.assessedRisks === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>{stats.totalRisks} risks found but none have been assessed.</strong> Scores shown are defaults from Risk Register.
          <Button 
            size="small" 
            color="primary" 
            onClick={() => window.location.href = '/risk-assessment'}
            sx={{ ml: 2 }}
          >
            Go to Risk Assessment
          </Button>
        </Alert>
      ) : null}

      {/* Composite Score Section */}
      {compositeScore && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ boxShadow: 3, background: 'linear-gradient(135deg, #0c1bf067 0%, #b2b2d3ff 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      🎯 Composite Risk Score
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Based on {stats.assessedRisks} assessed risks
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={handleRefreshScore}
                    disabled={refreshing}
                    sx={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                    }}
                  >
                    {refreshing ? 'Recalculating...' : 'Refresh Score'}
                  </Button>
                </Box>
                
                <Box display="flex" alignItems="center" gap={4} sx={{ mt: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h1" fontWeight="bold">
                      {compositeScore.score}
                    </Typography>
                    <Typography variant="h6">/ 100</Typography>
                  </Box>

                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Chip 
                        label={compositeScore.risk_level} 
                        color={getCompositeScoreChipColor(compositeScore.score)}
                        sx={{ color: 'white', fontWeight: 'bold' }}
                      />
                      {getTrendIcon(compositeScore.trend)}
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Trend: {compositeScore.trend}
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      {compositeScore.components && Object.entries(compositeScore.components).map(([component, score]) => (
                        <Grid item xs={6} key={component}>
                          <Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {component.replace('_', ' ').toUpperCase()}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={score}
                              sx={{ 
                                height: 8, 
                                borderRadius: 4,
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getCompositeScoreColor(score)
                                }
                              }}
                            />
                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                              {score}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Score History
                </Typography>
                {scoreHistory.length === 0 ? (
                  <Alert severity="info">
                    No historical data available yet.
                  </Alert>
                ) : (
                  <Box>
                    {scoreHistory.slice(0, 4).map((score, index) => (
                      <Box key={score.id} sx={{ mb: 2, p: 1, borderLeft: `4px solid` }} style={{ 
                        borderLeftColor: getCompositeScoreColor(score.score)
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight="bold">
                            {score.score}
                          </Typography>
                          <Chip 
                            label={score.risk_level} 
                            size="small"
                            color={getCompositeScoreChipColor(score.score)}
                          />
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {score.calculated_at?.toDate?.().toLocaleDateString('id-ID') || 'Unknown date'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, color: '#7b1fa2', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" style={{ color: '#7b1fa2' }}>
                {stats.extremeRisks}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Extreme Risks
              </Typography>
              <Typography variant="caption" color="textSecondary">
                from {stats.assessedRisks} assessed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {stats.totalTreatments}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Treatment Plans
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.completedTreatments} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="info.main">
                {stats.avgProgress}%
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Avg Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="warning.main">
                {stats.criticalIncidents}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Critical Incidents
              </Typography>
              <Typography variant="body2" color="textSecondary">
                dari {stats.totalIncidents} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Heatmap & Top Risks */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">
                  Risk Heatmap
                </Typography>
                <Chip 
                  label={`${stats.assessedRisks}/${stats.totalRisks} assessed`}
                  size="small"
                  color={stats.assessedRisks === stats.totalRisks ? "success" : "warning"}
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 2 }}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#7b1fa2', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.extreme.length}</Typography>
                  <Typography variant="body2">Extreme</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Score ≥ 20
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#d32f2f', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.high.length}</Typography>
                  <Typography variant="body2">High</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Score 16-20
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.medium.length}</Typography>
                  <Typography variant="body2">Medium</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Score 10-15
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold' }}>
                  <Typography variant="h4">{riskMatrix.low.length}</Typography>
                  <Typography variant="body2">Low</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {'Score < 10'}
                  </Typography>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">
                  Top 10 Risks (Integrated Data)
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip 
                    label={`${topRisks.filter(r => r.hasAssessment).length} assessed`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip 
                    label={`${topRisks.filter(r => !r.hasAssessment).length} default`}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              {topRisks.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No risks found. Add risks to the Risk Register.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell><strong>No</strong></TableCell>
                        <TableCell><strong>Risk Description</strong></TableCell>
                        <TableCell align="center"><strong>Score</strong></TableCell>
                        <TableCell align="center"><strong>Level</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topRisks.map((risk, index) => {
                        const getColor = (level) => {
                          const levelStr = String(level).toLowerCase();
                          if (levelStr.includes('extreme') || levelStr.includes('ekstrim')) return 'error';
                          if (levelStr.includes('high') || levelStr.includes('tinggi')) return 'warning';
                          if (levelStr.includes('medium') || levelStr.includes('sedang')) return 'info';
                          return 'success';
                        };

                        return (
                          <TableRow key={risk.id} hover>
                            <TableCell>
                              <Typography variant="body2">{index + 1}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {risk.description}
                                </Typography>
                                {risk.warning && (
                                  <Typography variant="caption" color="warning.main">
                                    {risk.warning}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="textSecondary" display="block">
                                  Owner: {risk.owner} | Dept: {risk.department}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {risk.score}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {risk.hasAssessment ? '✓ Assessed' : 'Default'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={risk.level} 
                                color={getColor(risk.level)} 
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {risk.hasAssessment ? (
                                <CheckCircle color="success" fontSize="small" />
                              ) : (
                                <Warning color="warning" fontSize="small" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {risks.length > 0 && (
                <Box sx={{ mt: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    🔍 Data dari: Risk Register ({stats.totalRisks}) + 
                    Assessment ({stats.assessedRisks}) | 
                    Showing top {topRisks.length} by risk score
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Treatment Progress Summary & Overall Progress */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Treatment Progress Summary
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Status Distribution</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light', color: 'white' }}>
                      <CheckCircle sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.completed}</Typography>
                      <Typography variant="body2">Completed</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'primary.light', color: 'white' }}>
                      <TrendingUp sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.in_progress}</Typography>
                      <Typography variant="body2">In Progress</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'warning.light', color: 'white' }}>
                      <Schedule sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.planned}</Typography>
                      <Typography variant="body2">Planned</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'error.light', color: 'white' }}>
                      <Warning sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{treatmentStatus.delayed}</Typography>
                      <Typography variant="body2">Delayed</Typography>
                    </Paper>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.500', color: 'white' }}>
                      <Assignment sx={{ fontSize: 32, mb: 1 }} />
                      <Typography variant="h5">{stats.totalTreatments}</Typography>
                      <Typography variant="body2">Total</Typography>
                    </Paper>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Overall Progress
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={stats.avgProgress} 
                    size={120}
                    thickness={4}
                    color={stats.avgProgress >= 80 ? "success" : stats.avgProgress >= 50 ? "primary" : "warning"}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {stats.avgProgress}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 2 }}>
                Average completion rate across all treatment plans
              </Typography>
              
              {/* Assessment Status */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Risk Assessment Status
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Total Risks:</Typography>
                  <Typography variant="body2" fontWeight="bold">{stats.totalRisks}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Assessed Risks:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">{stats.assessedRisks}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Not Assessed:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">
                    {stats.totalRisks - stats.assessedRisks}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;