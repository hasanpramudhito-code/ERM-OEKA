// File: src/pages/RiskAssessment.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Snackbar,
  Menu,
  Popover,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Slider,
  Rating,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonGroup
} from '@mui/material';
import {
  Warning,
  TrendingUp,
  Assessment,
  FilterList,
  Download,
  Edit,
  Visibility,
  BarChart,
  KeyboardArrowDown,
  Close,
  CheckCircle,
  Cancel,
  ExpandMore,
  Settings,
  Link,
  CompareArrows,
  Delete,
  Add
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { hasPermission, canAssessRisks, ROLES } from '../config/roles';
import { useNavigate } from 'react-router-dom';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';

// Konfigurasi default risk level ranges berdasarkan tabel koordinat
const DEFAULT_RISK_LEVELS = [
  { min: 1, max: 3, label: 'Sangat Rendah', color: '#4caf50' },
  { min: 4, max: 6, label: 'Rendah', color: '#81c784' },
  { min: 7, max: 10, label: 'Sedang', color: '#ffeb3b' },
  { min: 11, max: 15, label: 'Tinggi', color: '#f57c00' },
  { min: 16, max: 20, label: 'Sangat Tinggi', color: '#d32f2f' },
  { min: 21, max: 25, label: 'Ekstrim', color: '#7b1fa2' }
];

// MATRIKS KOORDINAT BERDASARKAN TABEL YANG DIBERIKAN
const COORDINATE_MATRIX = [
  [1, 1, 1],   // L1-I1
  [1, 2, 3],   // L1-I2
  [1, 3, 5],   // L1-I3
  [1, 4, 8],   // L1-I4
  [1, 5, 20],  // L1-I5
  
  [2, 1, 2],   // L2-I1
  [2, 2, 7],   // L2-I2
  [2, 3, 11],  // L2-I3
  [2, 4, 13],  // L2-I4
  [2, 5, 21],  // L2-I5
  
  [3, 1, 4],   // L3-I1
  [3, 2, 10],  // L3-I2
  [3, 3, 14],  // L3-I3
  [3, 4, 17],  // L3-I4
  [3, 5, 22],  // L3-I5
  
  [4, 1, 6],   // L4-I1
  [4, 2, 12],  // L4-I2
  [4, 3, 16],  // L4-I3
  [4, 4, 19],  // L4-I4
  [4, 5, 24],  // L4-I5
  
  [5, 1, 9],   // L5-I1
  [5, 2, 15],  // L5-I2
  [5, 3, 18],  // L5-I3
  [5, 4, 23],  // L5-I4
  [5, 5, 25]   // L5-I5
];

// Fungsi untuk mendapatkan score berdasarkan koordinat
const getCoordinateScore = (likelihood, impact) => {
  const entry = COORDINATE_MATRIX.find(
    ([l, i]) => l === likelihood && i === impact
  );
  return entry ? entry[2] : likelihood * impact;
};

// Professional Heatmap Component dengan support inherent vs residual
const ProfessionalRiskMatrix = ({ 
  risks, 
  onCellClick, 
  assessmentMethod,
  riskLevels,
  onHeatmapClick,
  viewMode // 'inherent' or 'residual'
}) => {
  const navigate = useNavigate();
  
  // Initialize 5x5 matrix - [likelihood][impact]
  const matrix = Array(5).fill().map(() => Array(5).fill(0));
  
  // Count risks in each cell berdasarkan viewMode
  risks.forEach(risk => {
    let likelihood, impact;
    
    if (viewMode === 'inherent') {
      // Gunakan data INHERENT dari Risk Register
      likelihood = risk.likelihood || risk.inherentLikelihood || 1;
      impact = risk.impact || risk.inherentImpact || 1;
    } else {
      // Gunakan data RESIDUAL dari Risk Register, fallback ke inherent
      likelihood = risk.residualLikelihood || risk.likelihood || risk.inherentLikelihood || 1;
      impact = risk.residualImpact || risk.impact || risk.inherentImpact || 1;
    }
    
    if (likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5) {
      matrix[likelihood - 1][impact - 1]++;
    }
  });

  // Get color based on risk level
  const getCellColor = (likelihood, impact) => {
    let score;
    
    if (assessmentMethod === 'coordinate') {
      score = getCoordinateScore(likelihood, impact);
    } else {
      score = likelihood * impact;
    }
    
    const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
    return riskLevel ? riskLevel.color : '#cccccc';
  };

  // Get risk level text
  const getRiskLevel = (likelihood, impact) => {
    let score;
    
    if (assessmentMethod === 'coordinate') {
      score = getCoordinateScore(likelihood, impact);
    } else {
      score = likelihood * impact;
    }
    
    const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
    return riskLevel ? riskLevel.label : 'Unknown';
  };

  // Get score untuk display
  const getScore = (likelihood, impact) => {
    if (assessmentMethod === 'coordinate') {
      return getCoordinateScore(likelihood, impact);
    } else {
      return likelihood * impact;
    }
  };

  // Handle cell click dengan navigasi ke risk register
  const handleCellClick = (likelihood, impact) => {
    const cellRisks = risks.filter(risk => {
      let riskLikelihood, riskImpact;
      
      if (viewMode === 'inherent') {
        riskLikelihood = risk.likelihood || risk.inherentLikelihood;
        riskImpact = risk.impact || risk.inherentImpact;
      } else {
        riskLikelihood = risk.residualLikelihood || risk.likelihood || risk.inherentLikelihood;
        riskImpact = risk.residualImpact || risk.impact || risk.inherentImpact;
      }
      
      return riskLikelihood === likelihood && riskImpact === impact;
    });
    
    if (cellRisks.length > 0 && onHeatmapClick) {
      const score = getScore(likelihood, impact);
      const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
      
      if (riskLevel) {
        onHeatmapClick(riskLevel.label, likelihood, impact, viewMode);
      }
    }
    
    onCellClick?.(likelihood, impact);
  };

  // Impact labels (X-Axis - Horizontal)
  const impactLabels = [
    { level: 1, label: 'Tdk Signifikan', description: 'Dampak tidak signifikan' },
    { level: 2, label: 'Minor', description: 'Dampak minor' },
    { level: 3, label: 'Moderat', description: 'Dampak moderat' },
    { level: 4, label: 'Signifikan', description: 'Dampak signifikan' },
    { level: 5, label: 'Sangat Signifikan', description: 'Dampak sangat signifikan' }
  ];

  // Likelihood labels (Y-Axis - Vertical)
  const likelihoodLabels = [
    { level: 5, label: 'Hampir Pasti Terjadi', description: 'Hampir pasti terjadi' },
    { level: 4, label: 'Sering Terjadi', description: 'Sering terjadi' },
    { level: 3, label: 'Kadang Terjadi', description: 'Kadang terjadi' },
    { level: 2, label: 'Jarang Terjadi', description: 'Jarang terjadi' },
    { level: 1, label: 'Hampir Tidak Terjadi', description: 'Hampir tidak terjadi' }
  ];

  return (
    <Card sx={{ height: '100%', boxShadow: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <BarChart sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {viewMode === 'inherent' ? 'Inherent Risk Matrix' : 'Residual Risk Matrix'}
                <Chip 
                  label={assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
                <Chip 
                  label={viewMode === 'inherent' ? 'Inherent' : 'Residual'} 
                  size="small" 
                  color={viewMode === 'inherent' ? 'secondary' : 'success'}
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {viewMode === 'inherent' 
                  ? 'Distribusi risiko inherent sebelum treatment'
                  : 'Distribusi risiko residual setelah treatment'
                }
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Klik sel untuk lihat risiko terkait">
            <Link color="action" />
          </Tooltip>
        </Box>

        {/* Heatmap Table */}
        <TableContainer 
          component={Paper} 
          variant="outlined"
          sx={{ 
            maxWidth: '100%', // atau ukuran spesifik seperti '600px'
            overflow: 'auto' 
          }}
        >
          <Table 
            sx={{ 
              minWidth: 300, // ⬅️ UBAH INI menjadi lebih kecil (dari 650)
              '& .MuiTableCell-root': {
                padding: '4px 8px', // ⬅️ Kurangi padding untuk sel lebih kecil
                fontSize: '0.75rem' // ⬅️ Perkecil font size
              }
            }}
            size="small" // ⬅️ PASTIKAN ADA INI untuk ukuran kecil
          >
            <TableHead>
              <TableRow>
                <TableCell 
                  align="center" 
                  colSpan={2}
                  sx={{ 
                    backgroundColor: '#1976d2', 
                    color: 'white',
                    fontWeight: 'bold',
                    border: '2px solid #dee2e6',
                    py: 1 // ⬅️ Kurangi padding vertikal
                  }}
                >
                  DAMPAK (IMPACT) →
                </TableCell>
                {impactLabels.map((impact) => (
                  <TableCell
                    key={impact.level}
                    align="center"
                    sx={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      fontWeight: 'bold',
                      border: '2px solid #dee2e6',
                      minWidth: 80, // ⬅️ UBAH INI menjadi lebih kecil (dari 100)
                      py: 0.5 // ⬅️ Kurangi padding
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontSize: '0.7rem' }}>
                        I{impact.level}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                        {impact.label}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {likelihoodLabels.map((likelihood, rowIndex) => (
                <TableRow key={likelihood.level}>
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      fontWeight: 'bold',
                      border: '2px solid #dee2e6',
                      minWidth: 60, // ⬅️ Sesuaikan juga untuk sel likelihood
                      py: 0.5
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontSize: '0.7rem' }}>
                        L{likelihood.level}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                        {likelihood.label}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  {/* Likelihood Level Number */}
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: 'grey.100',
                      fontWeight: 'bold',
                      border: '2px solid #dee2e6'
                    }}
                  >
                    {likelihood.level}
                  </TableCell>

                  {/* Heatmap Cells */}
                  {impactLabels.map((impact, impactIndex) => {
                    const count = matrix[likelihood.level - 1][impactIndex];
                    const riskLevel = getRiskLevel(likelihood.level, impact.level);
                    const cellColor = getCellColor(likelihood.level, impact.level);
                    const score = getScore(likelihood.level, impact.level);
                    
                    return (
                      <Tooltip
                        key={`${likelihood.level}-${impact.level}`}
                        title={
                          <Box>
                            <Typography variant="subtitle2">
                              {impact.label} Impact, {likelihood.label} Likelihood
                            </Typography>
                            <Typography variant="body2">
                              Score: {score} | Risks: {count} | Level: {riskLevel}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Mode: {viewMode === 'inherent' ? 'Inherent Risk' : 'Residual Risk'}
                            </Typography>
                            <Typography variant="caption">
                              Posisi: L{likelihood.level}-I{impact.level}
                            </Typography>
                            {count > 0 && (
                              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                Klik untuk lihat {count} risiko
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                      >
                        <TableCell
                          align="center"
                          sx={{
                            backgroundColor: cellColor,
                            color: riskLevel.includes('Sedang') ? '#333' : 'white',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            border: '2px solid white',
                            cursor: count > 0 ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            minWidth: 100,
                            height: 80,
                            '&:hover': count > 0 ? {
                              transform: 'scale(1.05)',
                              boxShadow: 3,
                              zIndex: 10
                            } : {}
                          }}
                          onClick={() => handleCellClick(likelihood.level, impact.level)}
                        >
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {count > 0 ? count : '0'}
                            </Typography>
                            {count > 0 && (
                              <Typography variant="caption" display="block">
                                {riskLevel}
                              </Typography>
                            )}
                            <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
                              Score: {score}
                            </Typography>
                          </Box>
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Legend */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Risk Levels:
              </Typography>
              <Grid container spacing={1}>
                {riskLevels.map((level, index) => (
                  <Grid item xs={12} key={index}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 20, 
                          backgroundColor: level.color, 
                          borderRadius: 1,
                          border: '1px solid #ccc'
                        }} 
                      />
                      <Box>
                        <Typography variant="caption" fontWeight="medium">
                          {level.label} ({level.min}-{level.max})
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Score range: {level.min}-{level.max}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                View Mode: {viewMode === 'inherent' ? 'Inherent Risk' : 'Residual Risk'}
              </Typography>
              <Box sx={{ fontSize: '0.8rem' }}>
                <Typography variant="caption" display="block">
                  <strong>Inherent Risk:</strong> Risiko sebelum treatment
                </Typography>
                <Typography variant="caption" display="block">
                  <strong>Residual Risk:</strong> Risiko setelah treatment
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Data diambil langsung dari Risk Register
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

// COMPONENT BARU: Risk Comparison Card
const RiskComparisonCard = ({ risks }) => {
  // Hitung statistics untuk inherent risk
  const inherentStats = {
    extreme: risks.filter(r => 
      r.inherentLevel?.includes('Ekstrim') || r.inherentLevel?.includes('Extreme') ||
      r.riskLevel?.includes('Ekstrim') || r.riskLevel?.includes('Extreme')
    ).length,
    high: risks.filter(r => 
      r.inherentLevel?.includes('Tinggi') || r.inherentLevel?.includes('High') ||
      r.riskLevel?.includes('Tinggi') || r.riskLevel?.includes('High')
    ).length,
    medium: risks.filter(r => 
      r.inherentLevel?.includes('Sedang') || r.inherentLevel?.includes('Medium') ||
      r.riskLevel?.includes('Sedang') || r.riskLevel?.includes('Medium')
    ).length,
    low: risks.filter(r => 
      r.inherentLevel?.includes('Rendah') || r.inherentLevel?.includes('Low') ||
      r.riskLevel?.includes('Rendah') || r.riskLevel?.includes('Low')
    ).length
  };
  
  // Hitung statistics untuk residual risk
  const residualStats = {
    extreme: risks.filter(r => 
      r.residualLevel?.includes('Ekstrim') || r.residualLevel?.includes('Extreme')
    ).length,
    high: risks.filter(r => 
      r.residualLevel?.includes('Tinggi') || r.residualLevel?.includes('High')
    ).length,
    medium: risks.filter(r => 
      r.residualLevel?.includes('Sedang') || r.residualLevel?.includes('Medium')
    ).length,
    low: risks.filter(r => 
      r.residualLevel?.includes('Rendah') || r.residualLevel?.includes('Low')
    ).length
  };

  const totalInherent = inherentStats.extreme + inherentStats.high + inherentStats.medium + inherentStats.low;
  const totalResidual = residualStats.extreme + residualStats.high + residualStats.medium + residualStats.low;
  const riskReduction = inherentStats.high - residualStats.high;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CompareArrows color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Risk Level Comparison
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              📊 Inherent Risk (Sebelum Treatment)
            </Typography>
            <Box display="flex" gap={1} flexDirection="column">
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Ekstrim:</Typography>
                <Chip label={inherentStats.extreme} size="small" sx={{ backgroundColor: '#7b1fa2', color: 'white' }} />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Tinggi:</Typography>
                <Chip label={inherentStats.high} size="small" sx={{ backgroundColor: '#d32f2f', color: 'white' }} />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Sedang:</Typography>
                <Chip label={inherentStats.medium} size="small" sx={{ backgroundColor: '#f57c00', color: 'white' }} />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Rendah:</Typography>
                <Chip label={inherentStats.low} size="small" sx={{ backgroundColor: '#4caf50', color: 'white' }} />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight="bold">Total:</Typography>
                <Chip label={totalInherent} size="small" variant="outlined" />
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="secondary" gutterBottom>
              📈 Residual Risk (Setelah Treatment)
            </Typography>
            <Box display="flex" gap={1} flexDirection="column">
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Ekstrim:</Typography>
                <Chip label={residualStats.extreme} size="small" sx={{ backgroundColor: '#7b1fa2', color: 'white' }} />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Tinggi:</Typography>
                <Chip label={residualStats.high} size="small" sx={{ backgroundColor: '#d32f2f', color: 'white' }} />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Sedang:</Typography>
                <Chip label={residualStats.medium} size="small" sx={{ backgroundColor: '#f57c00', color: 'white' }} />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Rendah:</Typography>
                <Chip label={residualStats.low} size="small" sx={{ backgroundColor: '#4caf50', color: 'white' }} />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight="bold">Total:</Typography>
                <Chip label={totalResidual} size="small" variant="outlined" />
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {/* Risk Reduction Summary */}
        {riskReduction > 0 && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold" color="success.dark">
              ✅ Risk Reduction Berhasil: {riskReduction} high risks berkurang setelah treatment
            </Typography>
          </Box>
        )}
        
        {totalResidual === 0 && totalInherent > 0 && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold" color="warning.dark">
              ⚠️ Data residual risk belum tersedia. Treatment plans mungkin belum selesai.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Configuration Dialog
const RiskAssessmentConfigDialog = ({ open, onClose, config, onSave }) => {
  const [formData, setFormData] = useState({
    assessmentMethod: config.assessmentMethod || 'coordinate',
    riskLevels: config.riskLevels || DEFAULT_RISK_LEVELS
  });

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings />
          <Typography variant="h6" fontWeight="bold">
            Konfigurasi Risk Assessment
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={0} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Pilih Metode Assessment</StepLabel>
          </Step>
          <Step>
            <StepLabel>Konfigurasi Tingkat Risiko</StepLabel>
          </Step>
        </Stepper>

        {/* Step 1: Assessment Method Selection */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">📊 1. Metode Penilaian Risiko</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: formData.assessmentMethod === 'coordinate' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    backgroundColor: formData.assessmentMethod === 'coordinate' ? '#e3f2fd' : 'white',
                    transition: 'all 0.3s ease',
                    '&:hover': { borderColor: '#1976d2' }
                  }}
                  onClick={() => setFormData({...formData, assessmentMethod: 'coordinate'})}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Assessment sx={{ fontSize: 40, color: '#1976d2' }} />
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          Metode Koordinat (Tabel)
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Menggunakan tabel koordinat khusus
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" paragraph>
                      <strong>Keuntungan:</strong>
                    </Typography>
                    <List dense>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemText 
                          primary="• Lebih akurat dengan skala khusus"
                          secondary="Menggunakan tabel koordinat 5x5"
                        />
                      </ListItem>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemText 
                          primary="• Konsisten dengan standar industri"
                          secondary="Sesuai tabel referensi yang diberikan"
                        />
                      </ListItem>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemText 
                          primary="• Hasil lebih terperinci"
                          secondary="25 tingkat risiko berbeda"
                        />
                      </ListItem>
                    </List>
                    
                    <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        Contoh Perhitungan:
                      </Typography>
                      <Typography variant="caption" display="block">
                        Likelihood = 3, Impact = 4 → Score = 17 (L3-I4)
                      </Typography>
                      <Typography variant="caption" display="block">
                        Berdasarkan tabel koordinat yang diberikan
                      </Typography>
                    </Box>
                    
                    {formData.assessmentMethod === 'coordinate' && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Chip label="DIPILIH" color="primary" />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: formData.assessmentMethod === 'multiplication' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    backgroundColor: formData.assessmentMethod === 'multiplication' ? '#e3f2fd' : 'white',
                    transition: 'all 0.3s ease',
                    '&:hover': { borderColor: '#1976d2' }
                  }}
                  onClick={() => setFormData({...formData, assessmentMethod: 'multiplication'})}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <TrendingUp sx={{ fontSize: 40, color: '#1976d2' }} />
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          Metode Perkalian (Tradisional)
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Likelihood × Impact sederhana
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" paragraph>
                      <strong>Keuntungan:</strong>
                    </Typography>
                    <List dense>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemText 
                          primary="• Perhitungan sederhana"
                          secondary="Hanya perkalian dua angka"
                        />
                      </ListItem>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemText 
                          primary="• Mudah dipahami"
                          secondary="Konsep yang familiar"
                        />
                      </ListItem>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemText 
                          primary="• Fleksibel"
                          secondary="Tidak perlu tabel referensi"
                        />
                      </ListItem>
                    </List>
                    
                    <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        Contoh Perhitungan:
                      </Typography>
                      <Typography variant="caption" display="block">
                        Likelihood = 3, Impact = 4 → Score = 12 (3 × 4)
                      </Typography>
                      <Typography variant="caption" display="block">
                        Range score: 1-25 (1×1 sampai 5×5)
                      </Typography>
                    </Box>
                    
                    {formData.assessmentMethod === 'multiplication' && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Chip label="DIPILIH" color="primary" />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, p: 2, backgroundColor: '#fff8e1', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Perbedaan Metode:</strong>
              </Typography>
              <Typography variant="caption" display="block">
                • <strong>Koordinat:</strong> L3-I4 = 17 (sesuai tabel)
              </Typography>
              <Typography variant="caption" display="block">
                • <strong>Perkalian:</strong> 3 × 4 = 12
              </Typography>
              <Typography variant="caption" display="block">
                Rekomendasi: Gunakan <strong>Koordinat</strong> untuk konsistensi dengan standar
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Step 2: Risk Levels Configuration */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">🎨 2. Konfigurasi Tingkat Risiko</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph color="textSecondary">
              Atur range score untuk setiap tingkat risiko. Range akan berbeda tergantung metode yang dipilih.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Total Score Range untuk Metode {formData.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}:
              </Typography>
              <Chip 
                label={`${formData.assessmentMethod === 'coordinate' ? '1-25' : '1-25'}`}
                color="primary"
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                (Likelihood 1-5 × Impact 1-5)
              </Typography>
            </Box>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="30%">Tingkat Risiko</TableCell>
                    <TableCell width="30%">Warna</TableCell>
                    <TableCell width="20%">Min Score</TableCell>
                    <TableCell width="20%">Max Score</TableCell>
                    <TableCell width="10%">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.riskLevels.map((level, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={level.label}
                          onChange={(e) => {
                            const newLevels = [...formData.riskLevels];
                            newLevels[index].label = e.target.value;
                            setFormData({...formData, riskLevels: newLevels});
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box 
                            sx={{ 
                              width: 24, 
                              height: 24, 
                              backgroundColor: level.color,
                              borderRadius: 1,
                              border: '1px solid #ccc'
                            }} 
                          />
                          <TextField
                            size="small"
                            value={level.color}
                            onChange={(e) => {
                              const newLevels = [...formData.riskLevels];
                              newLevels[index].color = e.target.value;
                              setFormData({...formData, riskLevels: newLevels});
                            }}
                            sx={{ width: 100 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={level.min}
                          onChange={(e) => {
                            const newLevels = [...formData.riskLevels];
                            newLevels[index].min = parseInt(e.target.value) || 1;
                            setFormData({...formData, riskLevels: newLevels});
                          }}
                          inputProps={{ min: 1, max: 25 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={level.max}
                          onChange={(e) => {
                            const newLevels = [...formData.riskLevels];
                            newLevels[index].max = parseInt(e.target.value) || 25;
                            setFormData({...formData, riskLevels: newLevels});
                          }}
                          inputProps={{ min: 1, max: 25 }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newLevels = formData.riskLevels.filter((_, i) => i !== index);
                            setFormData({...formData, riskLevels: newLevels});
                          }}
                          disabled={formData.riskLevels.length <= 1}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => {
                  const newLevels = [...formData.riskLevels];
                  const lastLevel = newLevels[newLevels.length - 1];
                  newLevels.push({
                    min: lastLevel ? lastLevel.max + 1 : 1,
                    max: lastLevel ? lastLevel.max + 5 : 5,
                    label: `Tingkat ${newLevels.length + 1}`,
                    color: '#cccccc'
                  });
                  setFormData({...formData, riskLevels: newLevels});
                }}
                disabled={formData.riskLevels.length >= 10}
              >
                Tambah Tingkat
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => setFormData({...formData, riskLevels: DEFAULT_RISK_LEVELS})}
              >
                Reset ke Default
              </Button>
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                <strong>Catatan:</strong> Pastikan tidak ada overlap antar range score.
                Total range harus mencakup 1-25 untuk metode perkalian atau koordinat.
              </Typography>
            </Alert>
          </AccordionDetails>
        </Accordion>
        
        {/* Preview */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">👁️ 3. Preview Konfigurasi</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Metode yang dipilih:
                </Typography>
                <Chip 
                  label={formData.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'} 
                  color="primary"
                  sx={{ mr: 1 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Distribusi Tingkat Risiko:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.riskLevels.map((level, index) => (
                    <Tooltip key={index} title={`Score: ${level.min}-${level.max}`}>
                      <Chip 
                        label={`${level.label} (${level.min}-${level.max})`}
                        sx={{ 
                          backgroundColor: level.color,
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Contoh Perhitungan:
                </Typography>
                <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Likelihood = 3, Impact = 4</strong>
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Metode {formData.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}:</strong>
                  </Typography>
                  <Typography variant="body2">
                    Score: {
                      formData.assessmentMethod === 'coordinate' 
                        ? '17 (L3-I4 dari tabel koordinat)'
                        : '12 (3 × 4 = 12)'
                    }
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Tingkat Risiko:</strong> {
                      formData.riskLevels.find(level => 
                        (formData.assessmentMethod === 'coordinate' ? 17 : 12) >= level.min && 
                        (formData.assessmentMethod === 'coordinate' ? 17 : 12) <= level.max
                      )?.label || 'Tidak ditemukan'
                    }
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Batal
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Simpan Konfigurasi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Custom Export Menu
const CustomExportMenu = ({ anchorEl, open, onClose, onExportPDF, onExportCSV, onExportText, loading }) => {
  return (
    <Popover 
      open={open} 
      anchorEl={anchorEl} 
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Box sx={{ p: 2, minWidth: 200 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Export Options
        </Typography>
        
        <List dense>
          <ListItem 
            button 
            onClick={() => {
              onExportPDF();
              onClose();
            }}
            disabled={loading}
          >
            <ListItemText primary="Export as PDF" secondary="Format dokumen" />
          </ListItem>
          
          <ListItem 
            button 
            onClick={() => {
              onExportCSV();
              onClose();
            }}
            disabled={loading}
          >
            <ListItemText primary="Export as CSV" secondary="Format spreadsheet" />
          </ListItem>
          
          <ListItem 
            button 
            onClick={() => {
              onExportText();
              onClose();
            }}
            disabled={loading}
          >
            <ListItemText primary="Export as Text" secondary="Format teks sederhana" />
          </ListItem>
        </List>
        
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
          Data akan diekspor berdasarkan filter yang aktif
        </Typography>
      </Box>
    </Popover>
  );
};

// Enhanced Risk Assessment Component
const RiskAssessment = () => {
  const { currentUser, userData } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { assessmentConfig, calculateScore } = useAssessmentConfig();
  
  // STATES
  const [risks, setRisks] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [configDialog, setConfigDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewMode, setViewMode] = useState('inherent');

  // Risk categories
  const riskCategories = [
    'Strategis', 'Operasional', 'Finansial', 'HSSE', 'IT & Teknologi', 
    'Legal & Kepatuhan', 'Fraud', 'Reputasi', 'Lainnya'
  ];

  // Risk status options
  const riskStatuses = [
    { value: 'identified', label: 'Teridentifikasi', color: 'default' },
    { value: 'assessed', label: 'Telah Dinilai', color: 'primary' },
    { value: 'treated', label: 'Dalam Treatment', color: 'warning' },
    { value: 'monitored', label: 'Dimonitor', color: 'info' },
    { value: 'closed', label: 'Ditutup', color: 'success' }
  ];

  // HELPER FUNCTIONS - DI DALAM COMPONENT
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getUnitName = (unitId) => {
    const unit = organizationUnits.find(u => u.id === unitId);
    return unit ? unit.name : 'Tidak ada';
  };

  const getStatusLabel = (status) => {
    const statusInfo = riskStatuses.find(s => s.value === status);
    return statusInfo ? statusInfo.label : 'Teridentifikasi';
  };

  const calculateRiskLevel = (score) => {
    const level = assessmentConfig.riskLevels.find(level => score >= level.min && score <= level.max);
    return level ? level.label : 'Unknown';
  };

  // Export functions
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      showSnackbar('Memulai export PDF...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSnackbar('Export PDF berhasil!', 'success');
    } catch (error) {
      showSnackbar('Error export PDF: ' + error.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      showSnackbar('Memulai export CSV...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSnackbar('Export CSV berhasil!', 'success');
    } catch (error) {
      showSnackbar('Error export CSV: ' + error.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportText = async () => {
    setExportLoading(true);
    try {
      showSnackbar('Memulai export Text...', 'info');
      await new Promise(resolve => setTimeout(resolve, 800));
      showSnackbar('Export Text berhasil!', 'success');
    } catch (error) {
      showSnackbar('Error export Text: ' + error.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Export menu handlers
  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Save configuration to Firestore
  const saveConfig = async (newConfig) => {
    try {
      await setDoc(doc(db, 'risk_assessment_config', 'default'), newConfig, { merge: true });
      showSnackbar('Konfigurasi berhasil disimpan!', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      showSnackbar('Error menyimpan konfigurasi: ' + error.message, 'error');
    }
  };

  // Handle cell click
  const handleCellClick = (likelihood, impact) => {
    const cellRisks = risks.filter(risk => {
      let riskLikelihood, riskImpact;
      
      if (viewMode === 'inherent') {
        riskLikelihood = risk.likelihood || risk.inherentLikelihood;
        riskImpact = risk.impact || risk.inherentImpact;
      } else {
        riskLikelihood = risk.residualLikelihood || risk.likelihood || risk.inherentLikelihood;
        riskImpact = risk.residualImpact || risk.impact || risk.inherentImpact;
      }
      
      return riskLikelihood === likelihood && riskImpact === impact;
    });
    
    console.log(`Risks in cell L${likelihood}-I${impact} (${viewMode}):`, cellRisks);
  };

  // Handle heatmap click - navigasi ke risk register dengan filter
  const handleHeatmapClick = (riskLevel, likelihood, impact, mode) => {
    const queryParams = new URLSearchParams({
      riskLevel: riskLevel,
      likelihood: likelihood,
      impact: impact,
      assessmentMethod: assessmentConfig.assessmentMethod,
      viewMode: mode
    });
    
    navigate(`/risk-register?${queryParams.toString()}`);
    showSnackbar(`Membuka Risk Register dengan filter: ${riskLevel} (${mode})`, 'info');
  };

  // Load data function
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load risks dengan SEMUA field assessment dari Risk Register
      const risksSnapshot = await getDocs(collection(db, 'risks'));
      const risksList = risksSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // STANDARDISASI field names - ambil dari data yang ada
        likelihood: doc.data().likelihood || doc.data().inherentLikelihood || 1,
        impact: doc.data().impact || doc.data().inherentImpact || 1,
        inherentScore: doc.data().inherentScore || doc.data().riskScore || 1,
        inherentLevel: doc.data().inherentLevel || doc.data().riskLevel || 'Rendah',
        
        // Data residual (jika ada)
        residualLikelihood: doc.data().residualLikelihood,
        residualImpact: doc.data().residualImpact, 
        residualScore: doc.data().residualScore,
        residualLevel: doc.data().residualLevel,
        
        // Data treatment
        treatmentEffectiveness: doc.data().treatmentEffectiveness,
        treatmentStatus: doc.data().treatmentStatus,
        
        // Status
        status: doc.data().status || 'identified',
        
        // Info tambahan dari risk register
        riskTitle: doc.data().riskTitle,
        riskDescription: doc.data().riskDescription,
        category: doc.data().category,
        unitId: doc.data().unitId,
        riskOwner: doc.data().riskOwner
      }));
      
      // Load organization units
      const unitsSnapshot = await getDocs(collection(db, 'organization_units'));
      const unitsList = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrganizationUnits(unitsList);
      
      setRisks(risksList);
      setFilteredRisks(risksList);
      
      console.log('Loaded risks with assessment data:', risksList);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error memuat data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load data saat component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter risks
  useEffect(() => {
    let filtered = risks;
    
    if (selectedUnit !== 'all') {
      filtered = filtered.filter(risk => risk.unitId === selectedUnit);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(risk => risk.category === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(risk => risk.status === selectedStatus);
    }
    
    setFilteredRisks(filtered);
  }, [selectedUnit, selectedCategory, selectedStatus, risks]);

  // Statistics
  const stats = {
    totalRisks: risks.length,
    assessedRisks: risks.filter(r => r.status === 'assessed' || r.inherentScore).length,
    hasResidualData: risks.filter(r => r.residualLikelihood || r.residualScore).length,
    assessmentProgress: risks.length > 0 ? (risks.filter(r => r.status === 'assessed' || r.inherentScore).length / risks.length) * 100 : 0
  };

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={3}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'primary.main', 
                borderRadius: 2,
                color: 'white'
              }}>
                <Assessment sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Risk Assessment Dashboard
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Visualisasi dan analisis tingkat risiko organisasi
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  <Typography variant="caption" color="primary" fontWeight="bold">
                    Metode: {assessmentConfig.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'} | 
                    Total Risks: {risks.length} | 
                    Assessed: {stats.assessedRisks}
                  </Typography>
                  <ButtonGroup variant="outlined" size="small">
                    <Button 
                      onClick={() => setViewMode('inherent')}
                      variant={viewMode === 'inherent' ? 'contained' : 'outlined'}
                      color="primary"
                    >
                      Inherent Risk
                    </Button>
                    <Button 
                      onClick={() => setViewMode('residual')}
                      variant={viewMode === 'residual' ? 'contained' : 'outlined'}
                      color="secondary"
                      disabled={stats.hasResidualData === 0}
                    >
                      Residual Risk ({stats.hasResidualData})
                    </Button>
                  </ButtonGroup>
                </Box>
              </Box>
            </Box>
            
            <Box display="flex" gap={2}>
              {/* Configuration Button */}
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setConfigDialog(true)}
              >
                Konfigurasi
              </Button>
              
              {/* Export Button */}
              <Button 
                variant="contained" 
                endIcon={<KeyboardArrowDown />}
                startIcon={<Download />}
                size="large"
                sx={{ borderRadius: 2, minWidth: 160 }}
                onClick={handleExportMenuOpen}
                disabled={exportLoading}
              >
                {exportLoading ? <CircularProgress size={24} /> : 'Export Report'}
              </Button>
              
              <CustomExportMenu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                onExportText={handleExportText}
                loading={exportLoading}
              />
            </Box>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="textSecondary">
                Assessment Progress
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {stats.assessedRisks} / {stats.totalRisks} ({Math.round(stats.assessmentProgress)}%)
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={stats.assessmentProgress}
              sx={{ height: 8, borderRadius: 4 }}
              color={stats.assessmentProgress >= 80 ? "success" : "primary"}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Risk Comparison Card */}
      <RiskComparisonCard risks={risks} />

      <Grid container spacing={3}>
        {/* Left Column - PROFESSIONAL HEATMAP dengan view mode */}
        <Grid item xs={12} lg={8}>
          <ProfessionalRiskMatrix 
            risks={filteredRisks} 
            onCellClick={handleCellClick}
            assessmentMethod={assessmentConfig.assessmentMethod}
            riskLevels={assessmentConfig.riskLevels}
            onHeatmapClick={handleHeatmapClick}
            viewMode={viewMode}
          />
        </Grid>

        {/* Right Column - Filters dan Info */}
        <Grid item xs={12} lg={4}>
          {/* Configuration Info Card */}
          <Card sx={{ mb: 3, boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Settings color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Konfigurasi Saat Ini
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Metode Assessment:
                </Typography>
                <Chip 
                  label={assessmentConfig.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'} 
                  color="primary" 
                  size="small"
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  View Mode:
                </Typography>
                <Chip 
                  label={viewMode === 'inherent' ? 'Inherent Risk' : 'Residual Risk'} 
                  color={viewMode === 'inherent' ? 'primary' : 'secondary'} 
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Tingkat Risiko:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {assessmentConfig.riskLevels.slice(0, 3).map((level, index) => (
                  <Box key={index} display="flex" alignItems="center" gap={1}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        backgroundColor: level.color,
                        borderRadius: 1 
                      }} 
                    />
                    <Typography variant="caption">
                      {level.label} ({level.min}-{level.max})
                    </Typography>
                  </Box>
                ))}
                {assessmentConfig.riskLevels.length > 3 && (
                  <Typography variant="caption" color="textSecondary">
                    +{assessmentConfig.riskLevels.length - 3} level lainnya...
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Data Summary Card */}
          <Card sx={{ mb: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Data Summary
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Total Risks:</Typography>
                  <Chip label={stats.totalRisks} size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Assessed Risks:</Typography>
                  <Chip label={stats.assessedRisks} size="small" color="primary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">With Residual Data:</Typography>
                  <Chip label={stats.hasResidualData} size="small" color="secondary" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">View Mode:</Typography>
                  <Chip 
                    label={viewMode} 
                    size="small" 
                    color={viewMode === 'inherent' ? 'primary' : 'secondary'}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<Assessment />}
                onClick={() => navigate('/risk-register')}
                sx={{ mb: 1 }}
              >
                Buka Risk Register
              </Button>
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<CompareArrows />}
                onClick={() => setViewMode(viewMode === 'inherent' ? 'residual' : 'inherent')}
                disabled={viewMode === 'residual' && stats.hasResidualData === 0}
                sx={{ mb: 1 }}
              >
                Switch to {viewMode === 'inherent' ? 'Residual' : 'Inherent'} View
              </Button>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                Data diambil otomatis dari Risk Register. Untuk mengubah assessment, edit di Risk Register.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Configuration Dialog */}
      <RiskAssessmentConfigDialog
        open={configDialog}
        onClose={() => setConfigDialog(false)}
        config={assessmentConfig}
        onSave={saveConfig}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RiskAssessment;