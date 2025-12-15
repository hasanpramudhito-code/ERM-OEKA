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
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
  FormControl,
  Select,
  MenuItem
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
  Add,
  Search,
  BugReport,
  Download,
  FilterList,
  Error as ErrorIcon,
  Info,
  RemoveRedEye,
  Assessment,
  ViewModule,
  ViewList,
  PieChart
} from '@mui/icons-material';
import { 
  collection, 
  getDocs, 
  query,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import CompositeScoreService from '../services/compositeScoreService';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';

// ✅ IMPORT DENGAN METODE YANG SAMA SEPERTI RiskAssessment.js
const importedConfig = {
  RISK_LEVELS: [],
  COORDINATE_MATRIX: [],
  getCoordinateScore: (likelihood, impact) => likelihood * impact // Default: multiplication
};

try {
  const configModule = require('./Configuration');
  importedConfig.RISK_LEVELS = configModule.RISK_LEVELS || [];
  importedConfig.COORDINATE_MATRIX = configModule.COORDINATE_MATRIX || [];
  importedConfig.getCoordinateScore = configModule.getCoordinateScore || ((l, i) => l * i);
  console.log('✅ [Dashboard] Imported Configuration:', {
    method: importedConfig.getCoordinateScore === configModule.getCoordinateScore ? 'COORDINATE' : 'MULTIPLICATION',
    matrixSize: importedConfig.COORDINATE_MATRIX.length
  });
} catch (error) {
  console.warn('⚠️ [Dashboard] Could not import Configuration:', error.message);
}

const ExecutiveDashboard = () => {
  const [risks, setRisks] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [compositeScore, setCompositeScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [matrixType, setMatrixType] = useState('inherent');
  const { assessmentConfig } = useAssessmentConfig();

  // ✅ FUNGSI CALCULATE SCORE YANG MENGIKUTI RiskAssessment.js
  const calculateScore = (likelihood, impact) => {
    // Priority 1: Gunakan metode dari context assessment
    const method = assessmentConfig?.assessmentMethod || 'multiplication';
    
    if (method === 'coordinate') {
      // Gunakan fungsi dari importedConfig
      const score = importedConfig.getCoordinateScore(likelihood, impact);
      return score;
    } else {
      // Default: multiplication method
      return likelihood * impact;
    }
  };

  // ✅ FUNGSI GET RISK LEVEL
  const getRiskLevelInfo = (score) => {
    // Gunakan konfigurasi langsung
    if (assessmentConfig?.riskLevels?.length > 0) {
      const level = assessmentConfig.riskLevels.find(
        levelItem => score >= levelItem.min && score <= levelItem.max
      );
      if (level) {
        return {
          level: level.label,
          color: level.color,
          min: level.min,
          max: level.max
        };
      }
    }
    
    // Default fallback
    return { 
      level: 'Unknown', 
      color: '#ccc', 
      min: 0, 
      max: 25 
    };
  };

  // ✅ DEBUG: VERIFIKASI MATRIX COORDINATE
  const debugCoordinateMatrix = () => {
    console.log('🔍 [Dashboard] ===== DEBUG COORDINATE MATRIX =====');
    
    const method = assessmentConfig?.assessmentMethod || 'multiplication';
    console.log(`Current method: ${method}`);
    console.log(`Assessment Config:`, assessmentConfig);
    
    if (method === 'coordinate') {
      console.log('📍 COORDINATE MATRIX VALUES:');
      console.log('Matrix size:', importedConfig.COORDINATE_MATRIX.length);
      
      // Tampilkan matrix 5x5
      console.log('Y\\X  | I1  | I2  | I3  | I4  | I5');
      console.log('-----|-----|-----|-----|-----|-----');
      for (let l = 5; l >= 1; l--) {
        const row = [];
        for (let i = 1; i <= 5; i++) {
          const score = calculateScore(l, i);
          row.push(score.toString().padStart(2, ' '));
        }
        console.log(`L${l}  | ${row.join(' | ')}`);
      }
      
      // Test values
      console.log('\n📍 SPECIFIC TESTS:');
      const testCases = [
        [1, 1, 1],   // L1-I1 = 1
        [1, 5, 15],  // L1-I5 = 15
        [2, 3, 9],   // L2-I3 = 9
        [3, 2, 8],   // L3-I2 = 8
        [5, 1, 5],   // L5-I1 = 5
        [5, 5, 25]   // L5-I5 = 25
      ];
      
      testCases.forEach(([l, i, expected]) => {
        const actual = calculateScore(l, i);
        const status = actual === expected ? '✅' : '❌';
        console.log(`${status} L${l}-I${i}: Expected ${expected}, Got ${actual}`);
      });
    } else {
      console.log('✖️ MULTIPLICATION METHOD ACTIVE');
      console.log('L1-I1:', calculateScore(1, 1), '(should be 1)');
      console.log('L5-I5:', calculateScore(5, 5), '(should be 25)');
    }
    
    console.log('=====================================\n');
    
    // Test dengan data risiko aktual
    console.log('📊 ACTUAL RISK DATA TEST:');
    const assessedRisks = risks.filter(r => r.hasAssessment);
    assessedRisks.slice(0, 5).forEach((risk, idx) => {
      if (risk.likelihood && risk.impact) {
        const score = calculateScore(risk.likelihood, risk.impact);
        console.log(`Risk ${idx + 1}: L${risk.likelihood}-I${risk.impact} = ${score} (Stored: ${risk.inherentScore})`);
      }
    });
  };

  // ✅ DEBUG FUNCTION
  const debugFirestoreStructure = async () => {
    console.log('🔍 [DEBUG] Debugging Firestore Structure...');
    const debugData = {};
    
    try {
      const collections = ['risks', 'treatment_plans', 'incidents'];
      
      for (const colName of collections) {
        try {
          const snapshot = await getDocs(collection(db, colName));
          debugData[colName] = {
            count: snapshot.size,
            documents: [],
            assessmentStats: {
              total: 0,
              hasAssessmentFlag: 0,
              statusAssessed: 0,
              hasAssessedBy: 0,
              hasAssessedAt: 0
            }
          };
          
          console.log(`📁 ${colName}: ${snapshot.size} documents`);
          
          if (colName === 'risks') {
            snapshot.docs.slice(0, 3).forEach((doc, index) => {
              const data = doc.data();
              const hasAssessedFlag = 
                data.status === 'Assessed - Telah Dinilai' ||
                data.assessedAt !== undefined ||
                data.assessedBy !== undefined;
              
              debugData[colName].assessmentStats.total++;
              if (hasAssessedFlag) debugData[colName].assessmentStats.hasAssessmentFlag++;
              if (data.status === 'Assessed - Telah Dinilai') debugData[colName].assessmentStats.statusAssessed++;
              if (data.assessedBy) debugData[colName].assessmentStats.hasAssessedBy++;
              if (data.assessedAt) debugData[colName].assessmentStats.hasAssessedAt++;
              
              console.log(`   Risk ${index + 1}:`, {
                id: doc.id,
                title: data.title,
                status: data.status,
                assessedBy: data.assessedBy,
                assessedAt: data.assessedAt,
                riskScore: data.riskScore,
                likelihood: data.likelihood,
                impact: data.impact,
                residualScore: data.residualScore,
                inherentScore: data.inherentScore
              });
            });
            console.log(`📊 Assessment Stats:`, debugData[colName].assessmentStats);
          }
          
        } catch (e) {
          debugData[colName] = { error: e.message };
          console.log(`   ❌ ${colName}: ${e.message}`);
        }
      }
      
      setDebugInfo(debugData);
      setDebugMode(true);
      console.log('🔍 [DEBUG] Complete debug data:', debugData);
      
    } catch (error) {
      console.error('❌ [DEBUG] Debug error:', error);
    }
  };

  // ✅ LOAD REAL DATA
  const loadRealData = async () => {
    try {
      setLoading(true);
      console.log('🔄 [Dashboard] Loading dashboard data...');
      
      // Debug configuration
      console.log('📋 [Dashboard] Assessment Config:', {
        method: assessmentConfig?.assessmentMethod,
        configExists: !!assessmentConfig,
        coordinateMatrixSize: importedConfig.COORDINATE_MATRIX.length
      });
      
      // Debug coordinate method
      debugCoordinateMatrix();
      
      // 1. LOAD RISKS
      const risksQuery = query(collection(db, 'risks'), orderBy('createdAt', 'desc'));
      const risksSnapshot = await getDocs(risksQuery);
      const allRisks = risksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Loaded ${allRisks.length} risks total`);
      
      // 2. LOGIKA ASSESSMENT - MENGGUNAKAN calculateScore YANG SUDAH DIPERBAIKI
      const integratedRisks = allRisks.map(risk => {
        const isAssessed = 
          risk.status === 'Assessed - Telah Dinilai' ||
          risk.assessedAt !== undefined ||
          risk.assessedBy !== undefined;
        
        const finalLikelihood = risk.likelihood || 1;
        const finalImpact = risk.impact || 1;
        
        // Debug perhitungan score
        const inherentScore = risk.inherentScore || calculateScore(finalLikelihood, finalImpact);
        console.log(`[Risk ${risk.id}] L${finalLikelihood}-I${finalImpact} = ${inherentScore}`, {
          method: assessmentConfig?.assessmentMethod,
          hasInherentScore: !!risk.inherentScore
        });
        
        const residualScore = risk.residualScore || inherentScore;
        const finalScore = inherentScore;
        const level = getRiskLevelInfo(finalScore);
        const residualLevel = getRiskLevelInfo(residualScore);
        
        return {
          ...risk,
          likelihood: finalLikelihood,
          impact: finalImpact,
          riskScore: finalScore,
          inherentScore: inherentScore,
          residualScore: residualScore,
          riskLevel: level,
          residualRiskLevel: residualLevel,
          hasAssessment: isAssessed,
          assessmentDate: risk.assessedAt || null,
          assessedBy: risk.assessedBy || null
        };
      });
      
      const assessedRisks = integratedRisks.filter(r => r.hasAssessment).length;
      const unassessedRisks = integratedRisks.length - assessedRisks;
      
      console.log(`📈 Assessment Summary: ${assessedRisks} assessed, ${unassessedRisks} not assessed`);
      
      setRisks(integratedRisks);
      
      // 3. LOAD TREATMENT PLANS
      let treatmentPlansData = [];
      try {
        const plansQuery = query(collection(db, 'treatment_plans'), orderBy('createdAt', 'desc'));
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
        const incidentsQuery = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
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
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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

  // ✅ HANDLE VIEW MODE CHANGE
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      console.log(`🔄 Switching to ${newMode} view`);
    }
  };

  // ✅ HANDLE MATRIX TYPE CHANGE
  const handleMatrixTypeChange = (event) => {
    setMatrixType(event.target.value);
    console.log(`🔄 Switching to ${event.target.value} risk matrix`);
  };

  useEffect(() => {
    loadRealData();
    
    // Setup real-time listeners untuk semua collection
    const setupRealTimeListeners = () => {
      const unsubscribers = [];
      
      // Risks listener
      const risksUnsub = onSnapshot(collection(db, 'risks'), (snapshot) => {
        console.log('🔄 Risks updated in real-time');
        if (!loading) loadRealData();
      });
      unsubscribers.push(risksUnsub);
      
      // Treatment plans listener
      const treatmentsUnsub = onSnapshot(collection(db, 'treatment_plans'), (snapshot) => {
        console.log('🔄 Treatment plans updated in real-time');
        if (!loading) loadRealData();
      });
      unsubscribers.push(treatmentsUnsub);
      
      // Incidents listener
      const incidentsUnsub = onSnapshot(collection(db, 'incidents'), (snapshot) => {
        console.log('🔄 Incidents updated in real-time');
        if (!loading) loadRealData();
      });
      unsubscribers.push(incidentsUnsub);
      
      return () => unsubscribers.forEach(unsub => unsub());
    };
    
    const cleanup = setupRealTimeListeners();
    return cleanup;
  }, []);

  // ✅ HITUNG STATISTIK DENGAN KONFIGURASI
  const calculateStats = () => {
    const totalRisks = risks.length;
    const assessedRisks = risks.filter(r => r.hasAssessment).length;
    const notAssessedRisks = totalRisks - assessedRisks;
    
    const config = assessmentConfig || {};
    const riskLevels = config.riskLevels || [];
    
    // Cari thresholds dari konfigurasi risk levels
    const getThresholdsFromConfig = () => {
      const sortedLevels = [...riskLevels].sort((a, b) => a.min - b.min);
      
      if (sortedLevels.length >= 4) {
        return {
          low: sortedLevels[3]?.min || 1,
          medium: sortedLevels[4]?.min || 10,
          high: sortedLevels[5]?.min || 16,
          extreme: sortedLevels[5]?.max || 25
        };
      }
      
      return {
        extreme: 20,
        high: 16,
        medium: 10,
        low: 1
      };
    };
    
    const thresholds = getThresholdsFromConfig();
    
    const assessedRisksOnly = risks.filter(r => r.hasAssessment);
    
    // Inherent risks
    const extremeRisks = assessedRisksOnly.filter(risk => 
      risk.inherentScore >= thresholds.high
    ).length;

    const highRisks = assessedRisksOnly.filter(risk => 
      risk.inherentScore >= thresholds.medium && risk.inherentScore < thresholds.high
    ).length;

    const mediumRisks = assessedRisksOnly.filter(risk => 
      risk.inherentScore >= thresholds.low && risk.inherentScore < thresholds.medium
    ).length;

    const lowRisks = assessedRisksOnly.filter(risk => 
      risk.inherentScore < thresholds.low
    ).length;

    // Residual risks
    const residualExtremeRisks = assessedRisksOnly.filter(risk => 
      risk.residualScore >= thresholds.high
    ).length;

    const residualHighRisks = assessedRisksOnly.filter(risk => 
      risk.residualScore >= thresholds.medium && risk.residualScore < thresholds.high
    ).length;

    const residualMediumRisks = assessedRisksOnly.filter(risk => 
      risk.residualScore >= thresholds.low && risk.residualScore < thresholds.medium
    ).length;

    const residualLowRisks = assessedRisksOnly.filter(risk => 
      risk.residualScore < thresholds.low
    ).length;

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

    // Calculate risk reduction
    const totalInherentScore = assessedRisksOnly.reduce((sum, risk) => sum + (risk.inherentScore || 0), 0);
    const totalResidualScore = assessedRisksOnly.reduce((sum, risk) => sum + (risk.residualScore || 0), 0);
    const riskReductionPercentage = totalInherentScore > 0 
      ? Math.round(((totalInherentScore - totalResidualScore) / totalInherentScore) * 100)
      : 0;

    return {
      totalRisks,
      assessedRisks,
      notAssessedRisks,
      assessmentPercentage: totalRisks > 0 ? Math.round((assessedRisks / totalRisks) * 100) : 0,
      extremeRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      residualExtremeRisks,
      residualHighRisks,
      residualMediumRisks,
      residualLowRisks,
      riskReductionPercentage,
      totalTreatments,
      completedTreatments,
      inProgressTreatments,
      avgProgress: Math.round(avgProgress),
      totalIncidents,
      criticalIncidents,
      thresholds
    };
  };

  // ✅ GET TOP 10 RISKS
  const getTopRisks = () => {
    const sortedRisks = [...risks].sort((a, b) => b.inherentScore - a.inherentScore);
    
    return sortedRisks.slice(0, 10).map((risk, index) => {
      const inherentLevelInfo = getRiskLevelInfo(risk.inherentScore || 1);
      const residualLevelInfo = getRiskLevelInfo(risk.residualScore || risk.inherentScore || 1);
      
      return {
        id: risk.id,
        title: risk.title || risk.riskDescription || 'Unnamed Risk',
        description: risk.description || risk.riskDescription || risk.title || 'No description',
        inherentScore: risk.inherentScore || 1,
        residualScore: risk.residualScore || risk.inherentScore || 1,
        inherentLevel: inherentLevelInfo.level,
        residualLevel: residualLevelInfo.level,
        department: risk.department || 'Unknown',
        owner: risk.riskOwner || risk.owner || 'Unassigned',
        status: risk.status || 'Identified',
        hasAssessment: risk.hasAssessment || false,
        likelihood: risk.likelihood || 1,
        impact: risk.impact || 1,
        inherentColor: inherentLevelInfo.color,
        residualColor: residualLevelInfo.color
      };
    });
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
      ).length,
      not_started: treatmentPlans.filter(p => 
        p.status?.toLowerCase().includes('not started') || 
        p.status === 'not_started' ||
        !p.status
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

  // ✅ RELOAD DATA
  const handleReloadData = () => {
    loadRealData();
  };

  // ✅ EXPORT DATA
  const handleExportData = () => {
    const stats = calculateStats();
    const dataToExport = {
      timestamp: new Date().toISOString(),
      dashboardInfo: {
        totalRisks: stats.totalRisks,
        assessedRisks: stats.assessedRisks,
        compositeScore: compositeScore?.score,
        treatmentPlans: stats.totalTreatments,
        incidents: stats.totalIncidents,
        assessmentMethod: assessmentConfig?.assessmentMethod
      },
      risks: risks.map(r => ({
        id: r.id,
        title: r.title,
        inherentScore: r.inherentScore,
        residualScore: r.residualScore,
        inherentRiskLevel: r.riskLevel?.level,
        residualRiskLevel: r.residualRiskLevel?.level,
        hasAssessment: r.hasAssessment
      })),
      compositeScore,
      stats: stats
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `executive-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    console.log('📤 Data exported successfully');
  };

  // ✅ GET RISK COUNT FOR MATRIX CELL
  const getRiskCountForCell = (likelihood, impact) => {
    const targetScore = calculateScore(likelihood, impact);
    
    if (matrixType === 'residual') {
      return risks.filter(r => 
        r.hasAssessment && 
        r.residualScore === targetScore
      ).length;
    } else {
      return risks.filter(r => 
        r.hasAssessment && 
        r.likelihood === likelihood && 
        r.impact === impact
      ).length;
    }
  };

  // ✅ RENDER RISK MATRIX COMPONENT
  const renderRiskMatrix = ({ title, matrixType: type, showSelector = true }) => {
    const config = assessmentConfig || {};
    const assessmentMethod = config.assessmentMethod || 'multiplication';
    
    // Debug: Tampilkan beberapa nilai untuk verifikasi
    if (assessmentMethod === 'coordinate') {
      console.log('📍 [Dashboard Matrix] Coordinate values from imported config:');
      console.log('- L1-I1:', importedConfig.getCoordinateScore(1, 1));
      console.log('- L2-I3:', importedConfig.getCoordinateScore(2, 3));
      console.log('- L3-I2:', importedConfig.getCoordinateScore(3, 2));
      console.log('- L5-I5:', importedConfig.getCoordinateScore(5, 5));
    }
    
    const likelihoodOptions = config.likelihoodOptions || [
      { value: 1, label: 'Very Low' },
      { value: 2, label: 'Low' },
      { value: 3, label: 'Medium' },
      { value: 4, label: 'High' },
      { value: 5, label: 'Very High' }
    ];
    
    const impactOptions = config.impactOptions || [
      { value: 1, label: 'Very Low' },
      { value: 2, label: 'Low' },
      { value: 3, label: 'Medium' },
      { value: 4, label: 'High' },
      { value: 5, label: 'Very High' }
    ];
    
    // Sort: Likelihood 5→1 (top to bottom), Impact 1→5 (left to right)
    const likelihoods = [...likelihoodOptions]
      .map(opt => opt.value)
      .sort((a, b) => b - a);
    
    const impacts = [...impactOptions]
      .map(opt => opt.value)
      .sort((a, b) => a - b);

    return (
      <Card sx={{ boxShadow: 3, height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight="bold">
              {title}
            </Typography>
            {showSelector && (
              <Box display="flex" alignItems="center" gap={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={matrixType}
                    onChange={handleMatrixTypeChange}
                    displayEmpty
                  >
                    <MenuItem value="inherent">Inherent Risk</MenuItem>
                    <MenuItem value="residual">Residual Risk</MenuItem>
                  </Select>
                </FormControl>
                <Chip
                  label={`${stats.assessedRisks}/${stats.totalRisks} assessed`}
                  size="small"
                  color={stats.assessedRisks === stats.totalRisks ? "success" : "warning"}
                />
              </Box>
            )}
          </Box>

          {/* INDICATOR METHOD */}
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, 
            bgcolor: assessmentMethod === 'coordinate' ? '#e3f2fd' : '#f5f5f5',
            border: `1px solid ${assessmentMethod === 'coordinate' ? '#1976d2' : '#ddd'}` 
          }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Assessment fontSize="small" color={assessmentMethod === 'coordinate' ? 'primary' : 'disabled'} />
              <Typography variant="body2" fontWeight="bold">
                Assessment Method: {assessmentMethod.toUpperCase()}
              </Typography>
              {assessmentMethod === 'coordinate' && (
                <Chip 
                  label="COORDINATE" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            {assessmentMethod === 'coordinate' && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Using pre-defined coordinate matrix (non-linear scoring)
              </Typography>
            )}
          </Box>

          {/* MATRIX */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `100px repeat(${impacts.length}, 1fr)`,
              border: '1px solid #ddd'
            }}
          >
            {/* HEADER */}
            <Box sx={{ 
              p: 1, 
              textAlign: 'center', 
              fontWeight: 'bold',
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2">Likelihood ↓<br/>Impact →</Typography>
            </Box>

            {/* IMPACT HEADERS */}
            {impacts.map((impact) => {
              const impactOption = impactOptions.find(opt => opt.value === impact);
              return (
                <Tooltip key={`impact-${impact}`} title={impactOption?.label || `Impact ${impact}`}>
                  <Box
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      fontWeight: 'bold',
                      bgcolor: 'primary.main',
                      color: 'white'
                    }}
                  >
                    I{impact}
                    <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem' }}>
                      {impactOption?.label?.substring(0, 10) || `I${impact}`}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}

            {/* MATRIX ROWS */}
            {likelihoods.map((likelihood) => {
              const likelihoodOption = likelihoodOptions.find(opt => opt.value === likelihood);
              return (
                <React.Fragment key={`likelihood-${likelihood}`}>
                  {/* LIKELIHOOD LABEL */}
                  <Tooltip title={likelihoodOption?.label || `Likelihood ${likelihood}`}>
                    <Box
                      sx={{
                        p: 1,
                        fontWeight: 'bold',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      L{likelihood}
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem' }}>
                        {likelihoodOption?.label?.substring(0, 10) || `L${likelihood}`}
                      </Typography>
                    </Box>
                  </Tooltip>

                  {/* MATRIX CELLS */}
                  {impacts.map((impact) => {
                    const score = calculateScore(likelihood, impact);
                    const level = getRiskLevelInfo(score);
                    const count = getRiskCountForCell(likelihood, impact);

                    return (
                      <Tooltip 
                        key={`cell-${likelihood}-${impact}`} 
                        title={
                          <Box>
                            <Typography><strong>L{likelihood}-I{impact}</strong></Typography>
                            <Typography>Score: {score} ({assessmentMethod === 'coordinate' ? 'Coordinate' : 'Multiplication'})</Typography>
                            <Typography>Level: {level.level}</Typography>
                            <Typography>Risks: {count}</Typography>
                          </Box>
                        }
                      >
                        <Box
                          sx={{
                            minHeight: 90,
                            bgcolor: level?.color || '#ccc',
                            color: 'white',
                            textAlign: 'center',
                            border: '1px solid #fff',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative',
                            '&:hover': {
                              opacity: 0.9,
                              transform: 'scale(1.02)',
                              transition: 'all 0.2s ease'
                            }
                          }}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            {count}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {level?.level || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                            Score: {score}
                          </Typography>
                          {type === 'residual' && count > 0 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'rgba(0,0,0,0.5)',
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Typography variant="caption" fontSize="0.6rem">
                                R
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </Box>

          {/* MATRIX INFO */}
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              <strong>Matrix Configuration:</strong> 5×5 matrix
            </Typography>
            <Box display="flex" gap={2} mt={0.5}>
              <Typography variant="caption" color="textSecondary">
                <strong>Assessment Method:</strong> {assessmentMethod.toUpperCase()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                <strong>Likelihood (Y):</strong> L5 (top) → L1 (bottom)
              </Typography>
              <Typography variant="caption" color="textSecondary">
                <strong>Impact (X):</strong> I1 (left) → I5 (right)
              </Typography>
            </Box>
            
            {/* Coordinate method indicator */}
            {assessmentMethod === 'coordinate' && (
              <Box sx={{ mt: 1, p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="caption" color="primary" fontWeight="bold">
                  📍 COORDINATE MATRIX ACTIVE
                </Typography>
                <Typography variant="caption" color="primary" display="block">
                  Using pre-defined scores from Configuration.js
                </Typography>
                <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                  <Chip label="L1-I1 = 1" size="small" variant="outlined" />
                  <Chip label="L1-I5 = 15" size="small" variant="outlined" />
                  <Chip label="L2-I3 = 9" size="small" variant="outlined" />
                  <Chip label="L3-I2 = 8" size="small" variant="outlined" />
                  <Chip label="L5-I5 = 25" size="small" variant="outlined" />
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const stats = calculateStats();
  const topRisks = getTopRisks();
  const treatmentStatus = getTreatmentStatus();

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Executive Dashboard...
        </Typography>
      </Box>
    );
  }

  // ✅ RENDER OVERVIEW VIEW (DEFAULT)
  const renderOverviewView = () => (
    <>
      {/* Alert Status */}
      {stats.totalRisks === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>No risks found!</strong> Please add risks first.
          <Button 
            size="small" 
            color="inherit" 
            onClick={() => window.location.href = '/risk-register'}
            sx={{ ml: 2 }}
          >
            Go to Risk Register
          </Button>
        </Alert>
      ) : stats.assessedRisks === 0 ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <strong>NO RISKS ASSESSED YET!</strong>
              <Typography variant="body2">
                All {stats.totalRisks} risks need assessment. Assessment is required for composite score calculation.
              </Typography>
            </Box>
            <Button 
              size="small" 
              variant="contained"
              onClick={() => window.location.href = '/risk-register'}
              sx={{ ml: 2 }}
            >
              Start Assessment
            </Button>
          </Box>
        </Alert>
      ) : stats.notAssessedRisks > 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <strong>INCOMPLETE ASSESSMENTS!</strong>
              <Typography variant="body2">
                {stats.assessedRisks} of {stats.totalRisks} risks assessed. {stats.notAssessedRisks} still need assessment.
              </Typography>
            </Box>
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => window.location.href = '/risk-register'}
              sx={{ ml: 2 }}
            >
              Complete Assessments
            </Button>
          </Box>
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>✅ ALL RISKS ASSESSED!</strong> All {stats.totalRisks} risks have been properly assessed.
        </Alert>
      )}

      {/* Debug Info Panel */}
      {debugMode && Object.keys(debugInfo).length > 0 && (
        <Card sx={{ mb: 3, border: '2px dashed #ff9800' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                🔍 Firestore Debug Info
              </Typography>
              <IconButton size="small" onClick={() => setDebugMode(false)}>
                <Typography variant="caption">Close</Typography>
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              {Object.entries(debugInfo).map(([collectionName, data]) => (
                <Grid item xs={12} md={4} key={collectionName}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {collectionName.toUpperCase()}
                    </Typography>
                    {data.error ? (
                      <Typography variant="caption" color="error">
                        Error: {data.error}
                      </Typography>
                    ) : (
                      <>
                        <Typography variant="body2">
                          Count: <strong>{data.count || 0}</strong>
                        </Typography>
                        {data.assessmentStats && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="textSecondary" display="block">
                              Assessment Flags:
                            </Typography>
                            <Typography variant="caption" display="block">
                              • With flags: {data.assessmentStats.hasAssessmentFlag}
                            </Typography>
                            <Typography variant="caption" display="block">
                              • Status assessed: {data.assessmentStats.statusAssessed}
                            </Typography>
                            <Typography variant="caption" display="block">
                              • Has assessedBy: {data.assessmentStats.hasAssessedBy}
                            </Typography>
                            <Typography variant="caption" display="block">
                              • Has assessedAt: {data.assessmentStats.hasAssessedAt}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

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
                      {stats.notAssessedRisks > 0 && (
                        <span> ({stats.notAssessedRisks} not included)</span>
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                      Last calculated: {compositeScore.calculated_at?.toDate?.().toLocaleString('id-ID') || 'Unknown'}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      startIcon={<Refresh />}
                      onClick={handleRefreshScore}
                      disabled={refreshing}
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                      }}
                    >
                      {refreshing ? 'Recalculating...' : 'Refresh'}
                    </Button>
                  </Box>
                </Box>
                
                <Box display="flex" alignItems="center" gap={4} sx={{ mt: 2 }}>
                  <Box sx={{ textAlign: 'center', minWidth: 150 }}>
                    <Typography variant="h1" fontWeight="bold">
                      {compositeScore.score}
                    </Typography>
                    <Typography variant="h6">/ 100</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 1 }}>
                      Overall Risk Level
                    </Typography>
                  </Box>

                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Chip 
                        label={compositeScore.risk_level} 
                        color={getCompositeScoreChipColor(compositeScore.score)}
                        sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}
                      />
                      {getTrendIcon(compositeScore.trend)}
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Trend: {compositeScore.trend || 'stable'}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                      Score Components
                    </Typography>
                    <Grid container spacing={2}>
                      {compositeScore.components && Object.entries(compositeScore.components).map(([component, score]) => (
                        <Grid item xs={6} md={4} key={component}>
                          <Box>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.8rem' }}>
                              {component.replace('_', ' ').toUpperCase()}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={score}
                              sx={{ 
                                height: 8, 
                                borderRadius: 4,
                                mt: 0.5,
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getCompositeScoreColor(score)
                                }
                              }}
                            />
                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                              <Typography variant="body2" fontWeight="bold" fontSize="0.9rem">
                                {score}
                              </Typography>
                              <Chip 
                                label={score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low'}
                                size="small"
                                color={getCompositeScoreChipColor(score)}
                                sx={{ height: 20, fontSize: '0.6rem' }}
                              />
                            </Box>
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
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Score History & Assessment Progress
                  </Typography>
                  <Chip 
                    label={`${stats.assessmentPercentage}%`}
                    size="small"
                    color={stats.assessmentPercentage === 100 ? "success" : "warning"}
                  />
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Assessment Completion
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.assessmentPercentage}
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      mb: 1.5
                    }}
                  />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                        <Typography variant="h5">{stats.assessedRisks}</Typography>
                        <Typography variant="caption">Assessed</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                        <Typography variant="h5">{stats.notAssessedRisks}</Typography>
                        <Typography variant="caption">Not Assessed</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Recent Score History
                </Typography>
                {scoreHistory.length === 0 ? (
                  <Alert severity="info" size="small">
                    No historical data available
                  </Alert>
                ) : (
                  <Box>
                    {scoreHistory.slice(0, 3).map((score) => (
                      <Box key={score.id} sx={{ mb: 1.5, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {score.score}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {score.calculated_at?.toDate?.().toLocaleDateString('id-ID') || 'Unknown date'}
                            </Typography>
                          </Box>
                          <Chip 
                            label={score.risk_level} 
                            size="small"
                            color={getCompositeScoreChipColor(score.score)}
                          />
                        </Box>
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
          <Card sx={{ height: '100%', boxShadow: 2, borderTop: '4px solid #7b1fa2' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, color: '#7b1fa2', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" style={{ color: '#7b1fa2' }}>
                {matrixType === 'residual' ? stats.residualExtremeRisks : stats.extremeRisks}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                {matrixType === 'residual' ? 'Residual Extreme' : 'Inherent Extreme'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Score ≥ {stats.thresholds?.high || 16}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2, borderTop: '4px solid #2196f3' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 48, color: '#2196f3', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="#2196f3">
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
          <Card sx={{ height: '100%', boxShadow: 2, borderTop: '4px solid #4caf50' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingDown sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="#4caf50">
                {stats.riskReductionPercentage}%
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Risk Reduction
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Inherent → Residual
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2, borderTop: '4px solid #ff9800' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 48, color: '#ff9800', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="#ff9800">
                {stats.criticalIncidents}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Critical Incidents
              </Typography>
              <Typography variant="body2" color="textSecondary">
                from {stats.totalIncidents} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Heatmap & Top Risks */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} lg={6}>
          {renderRiskMatrix({ 
            title: matrixType === 'residual' ? 'Residual Risk Matrix' : 'Inherent Risk Matrix',
            matrixType: matrixType,
            showSelector: true 
          })}
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">
                  Top 10 Risks ({matrixType === 'residual' ? 'Residual' : 'Inherent'} Score)
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip 
                    label={`${topRisks.filter(r => r.hasAssessment).length} assessed`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip 
                    label={`By ${matrixType === 'residual' ? 'Residual' : 'Inherent'} Score`}
                    size="small"
                    color="info"
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
                        <TableCell align="center"><strong>Inherent</strong></TableCell>
                        <TableCell align="center"><strong>Residual</strong></TableCell>
                        <TableCell align="center"><strong>Level</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topRisks.map((risk, index) => {
                        const getColor = (score) => {
                          const level = getRiskLevelInfo(score);
                          if (level?.level?.toLowerCase().includes('extreme')) return 'error';
                          if (level?.level?.toLowerCase().includes('tinggi')) return 'warning';
                          if (level?.level?.toLowerCase().includes('sedang')) return 'info';
                          return 'success';
                        };

                        const currentScore = matrixType === 'residual' ? risk.residualScore : risk.inherentScore;
                        const currentLevel = matrixType === 'residual' ? risk.residualLevel : risk.inherentLevel;

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
                                <Typography variant="caption" color="textSecondary" display="block">
                                  Owner: {risk.owner} | Dept: {risk.department}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {risk.inherentScore}
                                </Typography>
                                <Chip 
                                  label={risk.inherentLevel} 
                                  color={getColor(risk.inherentScore)} 
                                  size="small"
                                  sx={{ 
                                    height: 20, 
                                    fontSize: '0.6rem',
                                    backgroundColor: risk.inherentColor || undefined
                                  }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {risk.residualScore}
                                </Typography>
                                <Chip 
                                  label={risk.residualLevel} 
                                  color={getColor(risk.residualScore)} 
                                  size="small"
                                  sx={{ 
                                    height: 20, 
                                    fontSize: '0.6rem',
                                    backgroundColor: risk.residualColor || undefined
                                  }}
                                />
                                {risk.residualScore < risk.inherentScore && (
                                  <Typography variant="caption" color="success.main" display="block">
                                    ↓{Math.round(((risk.inherentScore - risk.residualScore) / risk.inherentScore) * 100)}%
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={currentLevel} 
                                color={getColor(currentScore)} 
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );

  // ✅ RENDER DETAILED VIEW
  const renderDetailedView = () => (
    <>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Detailed Analysis View</strong> - Showing comprehensive risk assessment data
      </Alert>

      {/* Detailed Risk Analysis */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                📊 Detailed Risk Analysis
              </Typography>
              
              {/* Risk Assessment Details */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Assessment Status Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                      <Typography variant="h4">{stats.assessedRisks}</Typography>
                      <Typography variant="body2">Assessed Risks</Typography>
                      <Typography variant="caption" color="textSecondary">
                        With assessment flags
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                      <Typography variant="h4">{stats.notAssessedRisks}</Typography>
                      <Typography variant="body2">Not Assessed</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Missing assessment flags
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                      <Typography variant="h4">{stats.extremeRisks}</Typography>
                      <Typography variant="body2">Inherent Extreme Risks</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Score ≥ {stats.thresholds?.high || 16}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                      <Typography variant="h4">{stats.residualExtremeRisks}</Typography>
                      <Typography variant="body2">Residual Extreme Risks</Typography>
                      <Typography variant="caption" color="textSecondary">
                        After treatment
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
              
              {/* All Risks Table */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>All Risks ({risks.length})</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Risk</strong></TableCell>
                        <TableCell align="center"><strong>Inherent</strong></TableCell>
                        <TableCell align="center"><strong>Residual</strong></TableCell>
                        <TableCell align="center"><strong>Reduction</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                        <TableCell align="center"><strong>Assessment</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {risks.slice(0, 20).map((risk) => (
                        <TableRow key={risk.id} hover>
                          <TableCell>
                            <Typography variant="body2">{risk.title}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {risk.department} • {risk.owner}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {risk.inherentScore}
                              </Typography>
                              <Chip 
                                label={risk.riskLevel?.level || 'Unknown'}
                                size="small"
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.6rem', 
                                  mt: 0.5,
                                  backgroundColor: risk.riskLevel?.color || undefined
                                }}
                                color={
                                  getRiskLevelInfo(risk.inherentScore)?.level?.toLowerCase().includes('extreme') ? 'error' :
                                  getRiskLevelInfo(risk.inherentScore)?.level?.toLowerCase().includes('tinggi') ? 'warning' :
                                  getRiskLevelInfo(risk.inherentScore)?.level?.toLowerCase().includes('sedang') ? 'info' : 'success'
                                }
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {risk.residualScore}
                              </Typography>
                              <Chip 
                                label={risk.residualRiskLevel?.level || 'Unknown'}
                                size="small"
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.6rem', 
                                  mt: 0.5,
                                  backgroundColor: risk.residualRiskLevel?.color || undefined
                                }}
                                color={
                                  getRiskLevelInfo(risk.residualScore)?.level?.toLowerCase().includes('extreme') ? 'error' :
                                  getRiskLevelInfo(risk.residualScore)?.level?.toLowerCase().includes('tinggi') ? 'warning' :
                                  getRiskLevelInfo(risk.residualScore)?.level?.toLowerCase().includes('sedang') ? 'info' : 'success'
                                }
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {risk.residualScore < risk.inherentScore ? (
                              <Typography variant="body2" color="success.main" fontWeight="bold">
                                -{Math.round(((risk.inherentScore - risk.residualScore) / risk.inherentScore) * 100)}%
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                No change
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={risk.status || 'Unknown'} 
                              size="small"
                              color={risk.hasAssessment ? "success" : "warning"}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {risk.hasAssessment ? (
                              <Tooltip title={`Assessed by: ${risk.assessedBy || 'Unknown'}`}>
                                <CheckCircle color="success" />
                              </Tooltip>
                            ) : (
                              <Tooltip title="Not assessed">
                                <Warning color="warning" />
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );

  // ✅ RENDER MATRIX VIEW
  const renderMatrixView = () => (
    <>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Advanced Risk Matrix View</strong> - Side by side comparison of Inherent vs Residual Risk
      </Alert>

      {/* Dual Matrix Visualization */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderRiskMatrix({ 
            title: '🎯 Inherent Risk Matrix',
            matrixType: 'inherent',
            showSelector: false 
          })}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderRiskMatrix({ 
            title: '🛡️ Residual Risk Matrix',
            matrixType: 'residual',
            showSelector: false 
          })}
        </Grid>
      </Grid>

      {/* Comparison Summary */}
      <Box sx={{ mt: 3, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Risk Comparison Summary</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Inherent Risk (Before Treatment)
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Extreme Risks:</Typography>
                  <Chip label={stats.extremeRisks} size="small" color="error" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="body2">High Risks:</Typography>
                  <Chip label={stats.highRisks} size="small" color="warning" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="body2">Medium Risks:</Typography>
                  <Chip label={stats.mediumRisks} size="small" color="info" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="body2">Low Risks:</Typography>
                  <Chip label={stats.lowRisks} size="small" color="success" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#f3e5f5' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Residual Risk (After Treatment)
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Extreme Risks:</Typography>
                  <Chip label={stats.residualExtremeRisks} size="small" color="error" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="body2">High Risks:</Typography>
                  <Chip label={stats.residualHighRisks} size="small" color="warning" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="body2">Medium Risks:</Typography>
                  <Chip label={stats.residualMediumRisks} size="small" color="info" />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="body2">Low Risks:</Typography>
                  <Chip label={stats.residualLowRisks} size="small" color="success" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Overall Risk Reduction */}
        <Box sx={{ mt: 3, p: 2, bgcolor: '#e8f5e8', borderRadius: 1 }}>
          <Typography variant="h6" color="success.main" gutterBottom>
            🎉 Overall Risk Reduction Achievement
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="body1">
                Treatment effectiveness has reduced overall risk by <strong>{stats.riskReductionPercentage}%</strong> from inherent to residual levels.
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                This represents a significant improvement in organizational risk posture through implemented treatments.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={stats.riskReductionPercentage} 
                    size={100}
                    thickness={4}
                    color="success"
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
                    <Typography variant="h5" component="div" fontWeight="bold" color="success.main">
                      {stats.riskReductionPercentage}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );

  // ✅ RENDER UTAMA DENGAN VIEW MODE
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
                {viewMode === 'overview' && 'Integrated Risk Management Overview'}
                {viewMode === 'detailed' && 'Detailed Risk Analysis View'}
                {viewMode === 'matrix' && 'Advanced Risk Matrix View'}
              </Typography>
            </Box>
            
            <Box display="flex" gap={1}>
              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
              >
                <ToggleButton value="overview" sx={{ color: 'white' }}>
                  <ViewModule fontSize="small" sx={{ mr: 0.5 }} />
                  Overview
                </ToggleButton>
                <ToggleButton value="detailed" sx={{ color: 'white' }}>
                  <ViewList fontSize="small" sx={{ mr: 0.5 }} />
                  Detailed
                </ToggleButton>
                <ToggleButton value="matrix" sx={{ color: 'white' }}>
                  <BarChart fontSize="small" sx={{ mr: 0.5 }} />
                  Matrix
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Debug Button */}
              <Tooltip title="Debug Coordinate Matrix">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={debugCoordinateMatrix}
                  startIcon={<BugReport />}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    '&:hover': { 
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'white'
                    }
                  }}
                >
                  Debug Matrix
                </Button>
              </Tooltip>
              
              <Tooltip title="Refresh Dashboard Data">
                <IconButton
                  onClick={handleReloadData}
                  disabled={loading}
                  sx={{ color: 'white' }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Export Data">
                <IconButton
                  onClick={handleExportData}
                  sx={{ color: 'white' }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Config Status Indicator */}
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="caption">
                <strong>Config:</strong> {assessmentConfig?.assessmentMethod || 'multiplication'}. 
                <strong> Risks:</strong> {risks.length} total, {risks.filter(r => r.hasAssessment).length} assessed. 
                <strong> Method:</strong> {importedConfig.getCoordinateScore.toString().includes('function') ? 'Coordinate' : 'Multiplication'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      {/* Render selected view */}
      {viewMode === 'overview' && renderOverviewView()}
      {viewMode === 'detailed' && renderDetailedView()}
      {viewMode === 'matrix' && renderMatrixView()}
    </Box>
  );
};

export default ExecutiveDashboard;