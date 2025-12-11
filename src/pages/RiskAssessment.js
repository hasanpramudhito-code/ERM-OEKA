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
  Add,
  Timeline,
  ShowChart
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
import HeatMapFilters from '../components/HeatMapFilters';
import RiskCellDetailModal from '../components/RiskCellDetailModal';
import { exportHeatmapAsPNG, exportHeatmapAsPDF, exportHeatmapAsCSV, exportCellDetailsAsText } from '../utils/heatmapExport';
import { useApprovalActions } from '../hooks/useApproval';

// =======================================================================
// DEFAULT CONSTANTS (JIKA IMPORT GAGAL)
// =======================================================================

const DEFAULT_RISK_LEVELS = [
  { label: 'Rendah', min: 1, max: 5, color: '#4caf50' },
  { label: 'Sedang', min: 6, max: 12, color: '#ff9800' },
  { label: 'Tinggi', min: 13, max: 20, color: '#f44336' },
  { label: 'Ekstrim', min: 21, max: 25, color: '#7b1fa2' }
];

const DEFAULT_COORDINATE_MATRIX = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25]
];

const getCoordinateScoreDefault = (likelihood, impact) => {
  if (likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5) {
    return likelihood * impact;
  }
  return DEFAULT_COORDINATE_MATRIX[likelihood - 1][impact - 1];
};

// Coba import Configuration
let importedConfig = {
  RISK_LEVELS: DEFAULT_RISK_LEVELS,
  COORDINATE_MATRIX: DEFAULT_COORDINATE_MATRIX,
  getCoordinateScore: getCoordinateScoreDefault
};

try {
  const configModule = require('./Configuration');
  if (configModule.RISK_LEVELS) importedConfig.RISK_LEVELS = configModule.RISK_LEVELS;
  if (configModule.COORDINATE_MATRIX) importedConfig.COORDINATE_MATRIX = configModule.COORDINATE_MATRIX;
  if (configModule.getCoordinateScore) importedConfig.getCoordinateScore = configModule.getCoordinateScore;
} catch (error) {
  console.warn('Configuration.js not found, using defaults');
}

const { RISK_LEVELS, COORDINATE_MATRIX, getCoordinateScore } = importedConfig;

// =======================================================================
// LINE CHART COMPONENT UNTUK PERBANDINGAN
// =======================================================================

const RiskComparisonLineChart = ({ risks }) => {
  const chartData = RISK_LEVELS.map(level => ({
    level: level.label,
    inherent: risks.filter(r => r.inherentLevel === level.label).length,
    residual: risks.filter(r => r.residualLevel === level.label).length,
    color: level.color
  }));

  const maxCount = Math.max(
    ...chartData.map(d => Math.max(d.inherent, d.residual)),
    1
  );

  return (
    <Card sx={{ height: '100%', mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <Timeline sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold">
            Risk Level Comparison
          </Typography>
        </Box>

        {/* Chart Container */}
        <Box sx={{ height: 250, position: 'relative' }}>
          {/* Y-axis labels */}
          <Box sx={{ 
            position: 'absolute', 
            left: 0, 
            top: 0, 
            bottom: 30, 
            width: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            pr: 1
          }}>
            {[0, Math.ceil(maxCount/2), maxCount].map((value, index) => (
              <Typography key={index} variant="caption" color="textSecondary">
                {value}
              </Typography>
            ))}
          </Box>

          {/* Chart area */}
          <Box sx={{ 
            position: 'absolute', 
            left: 50, 
            right: 0, 
            top: 0, 
            bottom: 30,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around'
          }}>
            {chartData.map((data, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                width: '20%'
              }}>
                {/* Inherent bars */}
                <Box sx={{ 
                  width: 30,
                  height: `${(data.inherent / maxCount) * 180}px`,
                  backgroundColor: 'primary.main',
                  borderRadius: '4px 4px 0 0',
                  position: 'relative',
                  mb: 0.5
                }}>
                  <Tooltip title={`Inherent: ${data.inherent} risks`}>
                    <Box sx={{
                      position: 'absolute',
                      top: -25,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: 'primary.main'
                    }}>
                      {data.inherent}
                    </Box>
                  </Tooltip>
                </Box>

                {/* Residual bars */}
                <Box sx={{ 
                  width: 30,
                  height: `${(data.residual / maxCount) * 180}px`,
                  backgroundColor: 'success.main',
                  borderRadius: '4px 4px 0 0',
                  position: 'relative'
                }}>
                  <Tooltip title={`Residual: ${data.residual} risks`}>
                    <Box sx={{
                      position: 'absolute',
                      top: -25,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: 'success.main'
                    }}>
                      {data.residual}
                    </Box>
                  </Tooltip>
                </Box>

                {/* Level label */}
                <Box sx={{ mt: 1 }}>
                  <Box sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: data.color,
                    borderRadius: 1,
                    mx: 'auto',
                    mb: 0.5
                  }} />
                  <Typography variant="caption" align="center" sx={{ display: 'block' }}>
                    {data.level}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* X-axis */}
          <Box sx={{ 
            position: 'absolute', 
            left: 50, 
            right: 0, 
            bottom: 0,
            borderTop: '1px solid',
            borderColor: 'divider'
          }} />
        </Box>

        {/* Legend */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 3, 
          mt: 3,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              backgroundColor: 'primary.main',
              borderRadius: 1 
            }} />
            <Typography variant="body2">Inherent Risk</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              backgroundColor: 'success.main',
              borderRadius: 1 
            }} />
            <Typography variant="body2">Residual Risk</Typography>
          </Box>
        </Box>

        {/* Summary */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Card variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="textSecondary">Total Reduction</Typography>
              <Typography variant="h6" color="success.main">
                {risks.filter(r => r.inherentLevel && r.residualLevel).length > 0 ? 
                  `${Math.round((risks.filter(r => {
                    const inherentIndex = RISK_LEVELS.findIndex(l => l.label === r.inherentLevel);
                    const residualIndex = RISK_LEVELS.findIndex(l => l.label === r.residualLevel);
                    return inherentIndex > residualIndex;
                  }).length / risks.filter(r => r.inherentLevel && r.residualLevel).length) * 100)}%` 
                  : '0%'
                }
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="textSecondary">Avg Risk Score</Typography>
              <Typography variant="h6">
                {risks.length > 0 ? 
                  `${(risks.reduce((sum, r) => sum + (r.inherentScore || 0), 0) / risks.length).toFixed(1)} → 
                  ${(risks.reduce((sum, r) => sum + (r.residualScore || 0), 0) / risks.length).toFixed(1)}`
                  : 'N/A'
                }
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// =======================================================================
// PROFESSIONAL RISK MATRIX
// =======================================================================

const ProfessionalRiskMatrix = ({ 
  risks, 
  onCellClick, 
  assessmentMethod,
  riskLevels,
  onHeatmapClick,
  viewMode,
  id
}) => {
  const navigate = useNavigate();

  const matrix = Array(5).fill().map(() => Array(5).fill(0));
  
  risks.forEach(risk => {
    let likelihood, impact;
    
    if (viewMode === 'inherent') {
      likelihood = risk.likelihood || risk.inherentLikelihood || 1;
      impact = risk.impact || risk.inherentImpact || 1;
    } else {
      likelihood = risk.residualLikelihood || risk.likelihood || risk.inherentLikelihood || 1;
      impact = risk.residualImpact || risk.impact || risk.inherentImpact || 1;
    }
    
    if (likelihood >= 1 && likelihood <= 5 && impact >= 1 && impact <= 5) {
      matrix[likelihood - 1][impact - 1]++;
    }
  });

  const getScore = (likelihood, impact) => {
    return assessmentMethod === 'coordinate'
      ? getCoordinateScore(likelihood, impact)
      : likelihood * impact;
  };

  const getCellColor = (likelihood, impact) => {
    let score = getScore(likelihood, impact);
    
    if (!riskLevels || !Array.isArray(riskLevels) || riskLevels.length === 0) {
      if (score <= 5) return '#4caf50';
      if (score <= 12) return '#ff9800';
      if (score <= 20) return '#f44336';
      return '#7b1fa2';
    }
    
    const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
    return riskLevel ? riskLevel.color : '#cccccc';
  };

  const getRiskLevel = (likelihood, impact) => {
    let score = getScore(likelihood, impact);
    
    if (!riskLevels || !Array.isArray(riskLevels) || riskLevels.length === 0) {
      if (score <= 5) return 'Rendah';
      if (score <= 12) return 'Sedang';
      if (score <= 20) return 'Tinggi';
      return 'Ekstrim';
    }
    
    const riskLevel = riskLevels.find(level => score >= level.min && score <= level.max);
    return riskLevel ? riskLevel.label : 'Unknown';
  };

  const handleCellClickLocal = (likelihood, impact) => {
    const cellRisks = risks.filter(risk => {
      let L =
        viewMode === 'inherent'
          ? (risk.likelihood || risk.inherentLikelihood)
          : (risk.residualLikelihood || risk.likelihood || risk.inherentLikelihood);

      let I =
        viewMode === 'inherent'
          ? (risk.impact || risk.inherentImpact)
          : (risk.residualImpact || risk.impact || risk.inherentImpact);

      return L === likelihood && I === impact;
    });

    if (cellRisks.length > 0 && onHeatmapClick) {
      const score = getScore(likelihood, impact);
      const riskLevel = riskLevels?.find(level => score >= level.min && score <= level.max);
      
      if (riskLevel) {
        onHeatmapClick(riskLevel.label, likelihood, impact, viewMode);
      }
    }

    onCellClick?.(likelihood, impact);
  };

  const impactLabels = [
    { level: 1, label: 'Tdk Signifikan' },
    { level: 2, label: 'Minor' },
    { level: 3, label: 'Moderat' },
    { level: 4, label: 'Signifikan' },
    { level: 5, label: 'Sangat Signifikan' }
  ];

  const likelihoodLabels = [
    { level: 5, label: 'Hampir Pasti Terjadi' },
    { level: 4, label: 'Sering Terjadi' },
    { level: 3, label: 'Kadang Terjadi' },
    { level: 2, label: 'Jarang Terjadi' },
    { level: 1, label: 'Hampir Tidak Terjadi' }
  ];

  return (
    <Card sx={{ height: '100%', boxShadow: 3 }} id={id || 'heatmap-container'}>
      <CardContent>
        {/* HEADER */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <BarChart sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {viewMode === 'inherent' ? 'Inherent Risk Matrix' : 'Residual Risk Matrix'}
                <Chip 
                  label={assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}
                  size="small"
                  sx={{
                    ml: 1,
                    border: '1px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    backgroundColor: 'transparent'
                  }}
                />
                <Chip 
                  label={viewMode === 'inherent' ? 'Inherent' : 'Residual'} 
                  size="small"
                  sx={{
                    ml: 1,
                    backgroundColor: viewMode === 'inherent' ? 'secondary.main' : 'success.main',
                    '& .MuiChip-label': { color: 'white' }
                  }}
                />
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {viewMode === 'inherent'
                  ? 'Distribusi risiko inherent sebelum treatment'
                  : 'Distribusi risiko residual setelah treatment'}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Klik sel untuk lihat risiko terkait">
            <Link color="action" />
          </Tooltip>
        </Box>

        {/* TABLE */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell colSpan={2} align="center"
                  sx={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  DAMPAK (IMPACT) →
                </TableCell>
                {impactLabels.map(impact => (
                  <TableCell
                    key={impact.level}
                    align="center"
                    sx={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">I{impact.level}</Typography>
                      <Typography variant="caption">{impact.label}</Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {likelihoodLabels.map((likelihood) => (
                <TableRow key={likelihood.level}>
                  <TableCell 
                    align="center"
                    sx={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    <Typography variant="subtitle2">L{likelihood.level}</Typography>
                    <Typography variant="caption">{likelihood.label}</Typography>
                  </TableCell>

                  <TableCell align="center" sx={{ backgroundColor: 'grey.100' }}>
                    {likelihood.level}
                  </TableCell>

                  {impactLabels.map((impact, index) => {
                    const count = matrix[likelihood.level - 1][index];
                    const cellColor = getCellColor(likelihood.level, impact.level);
                    const score = getScore(likelihood.level, impact.level);
                    const riskLevel = getRiskLevel(likelihood.level, impact.level);

                    return (
                      <Tooltip
                        key={impact.level}
                        title={
                          <Box>
                            <Typography variant="subtitle2">
                              {impact.label} Impact, {likelihood.label}
                            </Typography>
                            <Typography variant="caption">
                              {count} risks | Score: {score} | Level: {riskLevel}
                            </Typography>
                          </Box>
                        }
                      >
                        <TableCell
                          align="center"
                          onClick={() => handleCellClickLocal(likelihood.level, impact.level)}
                          sx={{
                            backgroundColor: cellColor,
                            color: '#fff',
                            cursor: count > 0 ? 'pointer' : 'default',
                            border: '1px solid white',
                            '&:hover': {
                              opacity: 0.9,
                              transform: count > 0 ? 'scale(1.05)' : 'none',
                              transition: 'all 0.2s'
                            }
                          }}
                        >
                          <Typography variant="h6">{count}</Typography>
                          <Typography variant="caption" display="block">
                            {riskLevel}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Score: {score}
                          </Typography>
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* LEGEND */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Risk Level Legend:
          </Typography>
          <Grid container spacing={1}>
            {(riskLevels || RISK_LEVELS).map((level, idx) => (
              <Grid item xs={6} sm={3} key={idx}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      backgroundColor: level.color,
                      borderRadius: 1
                    }}
                  />
                  <Typography variant="caption">
                    {level.label} ({level.min}-{level.max})
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

// =======================================================================
// CONFIGURATION DIALOG
// =======================================================================

const RiskAssessmentConfigDialog = ({ open, onClose, config }) => {
  if (!config) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings />
          <Typography variant="h6" fontWeight="bold">
            Konfigurasi Risk Assessment Saat Ini
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" paragraph color="textSecondary">
          Konfigurasi penentuan level risiko sudah dikelola secara terpusat di
          <strong> configuration.js</strong>. Untuk mengubah konfigurasi,
          silakan edit file tersebut.
        </Typography>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">📊 Metode Penilaian Risiko</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Assessment Method */}
              <Grid item xs={12} md={6}>
                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Assessment sx={{ fontSize: 40, color: '#1976d2' }} />
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {config.assessmentMethod === 'coordinate'
                            ? 'Metode Koordinat (Tabel)'
                            : 'Metode Perkalian (Tradisional)'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          {config.assessmentMethod === 'coordinate'
                            ? 'Menggunakan tabel koordinat 5x5'
                            : 'Perkalian sederhana Likelihood × Impact'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Risk Levels */}
              <Grid item xs={12} md={6}>
                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <TrendingUp sx={{ fontSize: 40, color: '#1976d2' }} />
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          Tingkat Risiko
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {config.riskLevels?.length || 0} level risiko
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {(config.riskLevels || RISK_LEVELS).map((level, index) => (
                        <Box key={index} display="flex" alignItems="center" gap={1} mb={1}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: level.color,
                              borderRadius: 1,
                              border: '1px solid #ccc'
                            }}
                          />
                          <Typography variant="caption" sx={{ flex: 1 }}>
                            {level.label}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ({level.min}-{level.max})
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Informasi:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            • Konfigurasi berada di <code>src/pages/configuration.js</code>
          </Typography>
          <Typography variant="caption" display="block">
            • Perubahan mempengaruhi seluruh aplikasi
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained">
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =======================================================================
// EXPORT MENU
// =======================================================================

const CustomExportMenu = ({
  anchorEl,
  open,
  onClose,
  onExportPNG,
  onExportPDF,
  onExportCSV,
  onExportText,
  loading
}) => (
  <Popover
    open={open}
    anchorEl={anchorEl}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
  >
    <Box sx={{ p: 2, minWidth: 200 }}>
      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        Export Options
      </Typography>

      <List dense>
        <ListItem button disabled={loading} onClick={() => { onExportPNG(); onClose(); }}>
          <ListItemText 
            primary="Export as PNG" 
            secondary="Gambar heatmap" 
          />
        </ListItem>

        <ListItem button disabled={loading} onClick={() => { onExportPDF(); onClose(); }}>
          <ListItemText 
            primary="Export as PDF" 
            secondary="Laporan lengkap" 
          />
        </ListItem>

        <ListItem button disabled={loading} onClick={() => { onExportCSV(); onClose(); }}>
          <ListItemText 
            primary="Export as CSV" 
            secondary="Data spreadsheet" 
          />
        </ListItem>

        <ListItem button disabled={loading} onClick={() => { onExportText(); onClose(); }}>
          <ListItemText 
            primary="Export as Text" 
            secondary="Laporan teks" 
          />
        </ListItem>
      </List>
    </Box>
  </Popover>
);

// =======================================================================
// MAIN COMPONENT
// =======================================================================

const RiskAssessment = () => {
  const { currentUser, userData } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { assessmentConfig, calculateScore } = useAssessmentConfig();
  const { submitForApproval, loading: approvalLoading } = useApprovalActions();

  const defaultConfig = {
    assessmentMethod: 'coordinate',
    riskLevels: RISK_LEVELS
  };

  const config = assessmentConfig || defaultConfig;

  const safeCalculateScore = calculateScore || ((likelihood, impact) => {
    return config.assessmentMethod === 'coordinate'
      ? getCoordinateScore(likelihood, impact)
      : likelihood * impact;
  });

  // ===================================================================
  // STATES
  // ===================================================================

  const [risks, setRisks] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);

  const [heatmapFilters, setHeatmapFilters] = useState({
    department: 'all',
    category: 'all',
    timeRange: 'all',
    riskLevel: 'all',
    search: ''
  });

  const [selectedCell, setSelectedCell] = useState(null);
  const [cellDetailOpen, setCellDetailOpen] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [configDialog, setConfigDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [viewMode, setViewMode] = useState('inherent');

  // ===================================================================
  // EXPORT HANDLERS
  // ===================================================================

  const prepareHeatmapData = () => {
    const heatmapData = [];
    
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      for (let impact = 1; impact <= 5; impact++) {
        const cellRisks = filteredRisks.filter(risk => {
          const L = viewMode === 'inherent'
            ? (risk.likelihood || risk.inherentLikelihood)
            : (risk.residualLikelihood || risk.likelihood || risk.inherentLikelihood);
          
          const I = viewMode === 'inherent'
            ? (risk.impact || risk.inherentImpact)
            : (risk.residualImpact || risk.impact || risk.inherentImpact);
          
          return L === likelihood && I === impact;
        });
        
        const score = safeCalculateScore(likelihood, impact);
        const riskLevel = config.riskLevels.find(
          level => score >= level.min && score <= level.max
        )?.label || 'Unknown';
        
        heatmapData.push({
          likelihood,
          impact,
          riskCount: cellRisks.length,
          score,
          riskLevel,
          cellRisks
        });
      }
    }
    
    return heatmapData;
  };

  const handleExportPNG = async () => {
    setExportLoading(true);
    try {
      await exportHeatmapAsPNG('heatmap-container', `risk-matrix-${viewMode}-${new Date().toISOString().slice(0,10)}.png`);
      showSnackbar('Export PNG berhasil!', 'success');
    } catch (error) {
      showSnackbar(`Gagal export PNG: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const heatmapData = prepareHeatmapData();
      await exportHeatmapAsPDF(
        heatmapData,
        heatmapFilters,
        viewMode,
        `risk-report-${viewMode}-${new Date().toISOString().slice(0,10)}.pdf`
      );
      showSnackbar('Export PDF berhasil!', 'success');
    } catch (error) {
      showSnackbar(`Gagal export PDF: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const heatmapData = prepareHeatmapData();
      exportHeatmapAsCSV(
        heatmapData,
        `risk-data-${viewMode}-${new Date().toISOString().slice(0,10)}.csv`
      );
      showSnackbar('Export CSV berhasil!', 'success');
    } catch (error) {
      showSnackbar(`Gagal export CSV: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportText = async () => {
    setExportLoading(true);
    try {
      if (selectedCell) {
        await exportCellDetailsAsText(
          selectedCell,
          `risk-cell-details-${selectedCell.likelihood}-${selectedCell.impact}-${new Date().toISOString().slice(0,10)}.txt`
        );
        showSnackbar('Export Text berhasil!', 'success');
      } else {
        const summaryText = `
Risk Assessment Summary Report
===============================
Date: ${new Date().toLocaleString()}
View Mode: ${viewMode}
Total Risks: ${filteredRisks.length}
Assessment Method: ${config.assessmentMethod}
Filter: ${JSON.stringify(heatmapFilters, null, 2)}
        `;
        
        const blob = new Blob([summaryText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `risk-summary-${viewMode}-${new Date().toISOString().slice(0,10)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        
        showSnackbar('Export Text berhasil!', 'success');
      }
    } catch (error) {
      showSnackbar(`Gagal export Text: ${error.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMenuOpen = (e) => setExportMenuAnchor(e.currentTarget);
  const handleExportMenuClose = () => setExportMenuAnchor(null);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () =>
    setSnackbar({ ...snackbar, open: false });

  const handleCellClick = (likelihood, impact) => {
    const cellRisks = filteredRisks.filter(risk => {
      const L = viewMode === 'inherent'
        ? (risk.likelihood || risk.inherentLikelihood)
        : (risk.residualLikelihood || risk.likelihood);

      const I = viewMode === 'inherent'
        ? (risk.impact || risk.inherentImpact)
        : (risk.residualImpact || risk.impact);

      return L === likelihood && I === impact;
    });

    if (cellRisks.length === 0) return;

    const score = safeCalculateScore(likelihood, impact);
    const riskLevel = config.riskLevels.find(
      level => score >= level.min && score <= level.max
    )?.label || 'Unknown';

    setSelectedCell({
      likelihood,
      impact,
      risks: cellRisks,
      score,
      riskLevel
    });

    setCellDetailOpen(true);
  };

  const handleHeatmapClick = (riskLevel, likelihood, impact, mode) => {
    const params = new URLSearchParams({
      riskLevel,
      likelihood,
      impact,
      viewMode: mode,
      assessmentMethod: config.assessmentMethod
    });

    navigate(`/risk-register?${params.toString()}`);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const riskSnap = await getDocs(collection(db, 'risks'));
      const risksList = riskSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        likelihood: doc.data().likelihood || doc.data().inherentLikelihood || 1,
        impact: doc.data().impact || doc.data().inherentImpact || 1,
        inherentScore: doc.data().inherentScore || doc.data().riskScore || 1,
        inherentLevel: doc.data().inherentLevel || doc.data().riskLevel || 'Rendah',
        residualLikelihood: doc.data().residualLikelihood,
        residualImpact: doc.data().residualImpact,
        residualScore: doc.data().residualScore,
        residualLevel: doc.data().residualLevel
      }));

      const unitSnap = await getDocs(collection(db, 'organization_units'));
      const unitsList = unitSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRisks(risksList);
      setFilteredRisks(risksList);
      setOrganizationUnits(unitsList);
    } catch (err) {
      showSnackbar('Error memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let filtered = risks;
    if (selectedUnit !== 'all') filtered = filtered.filter(r => r.unitId === selectedUnit);
    if (selectedCategory !== 'all') filtered = filtered.filter(r => r.category === selectedCategory);
    if (selectedStatus !== 'all') filtered = filtered.filter(r => r.status === selectedStatus);
    setFilteredRisks(filtered);
  }, [selectedUnit, selectedCategory, selectedStatus, risks]);

  const stats = {
    totalRisks: risks.length,
    assessedRisks: risks.filter(r => r.inherentScore).length,
    hasResidualData: risks.filter(r => r.residualScore).length,
    assessmentProgress: risks.length === 0
      ? 0
      : (risks.filter(r => r.inherentScore).length / risks.length) * 100
  };

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* HEADER */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={2}>
              <Box sx={{
                p: 2,
                backgroundColor: 'primary.main',
                borderRadius: 2,
                color: 'white'
              }}>
                <Assessment sx={{ fontSize: 40 }} />
              </Box>

              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Risk Assessment Dashboard
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Metode: {config.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}
                  {' '}| Total Risks: {stats.totalRisks}
                </Typography>

                <Box mt={1}>
                  <ButtonGroup size="small">
                    <Button
                      variant={viewMode === 'inherent' ? 'contained' : 'outlined'}
                      onClick={() => setViewMode('inherent')}
                    >
                      Inherent
                    </Button>
                    <Button
                      variant={viewMode === 'residual' ? 'contained' : 'outlined'}
                      onClick={() => setViewMode('residual')}
                      disabled={stats.hasResidualData === 0}
                    >
                      Residual
                    </Button>
                  </ButtonGroup>
                </Box>
              </Box>
            </Box>

            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setConfigDialog(true)}
              >
                Konfigurasi
              </Button>

              <Button
                variant="contained"
                startIcon={<Download />}
                endIcon={<KeyboardArrowDown />}
                onClick={handleExportMenuOpen}
                disabled={exportLoading}
              >
                {exportLoading ? 'Exporting...' : 'Export'}
              </Button>

              <CustomExportMenu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={handleExportMenuClose}
                onExportPNG={handleExportPNG}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                onExportText={handleExportText}
                loading={exportLoading}
              />
            </Box>
          </Box>

          {/* Progress */}
          <Box mt={2}>
            <Typography variant="caption">Assessment Progress</Typography>
            <LinearProgress
              value={stats.assessmentProgress}
              variant="determinate"
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* FILTER BAR */}
      <HeatMapFilters
        filters={heatmapFilters}
        onFilterChange={(newFilters) => {
          setHeatmapFilters(newFilters);
          let filtered = risks;
          if (newFilters.department !== 'all') filtered = filtered.filter(r => r.unitId === newFilters.department);
          if (newFilters.category !== 'all') filtered = filtered.filter(r => r.category === newFilters.category);
          if (newFilters.riskLevel !== 'all') filtered = filtered.filter(r => r.inherentLevel === newFilters.riskLevel);
          setFilteredRisks(filtered);
        }}
        organizationUnits={organizationUnits}
        onExport={handleExportPNG}
        exportLoading={exportLoading}
      />

      {/* MAIN LAYOUT - HEATMAP DI ATAS */}
      <Grid container spacing={3}>
        {/* HEATMAP - FULL WIDTH */}
        <Grid item xs={12}>
          <ProfessionalRiskMatrix
            id="heatmap-container"
            risks={filteredRisks}
            onCellClick={handleCellClick}
            assessmentMethod={config.assessmentMethod}
            riskLevels={config.riskLevels}
            onHeatmapClick={handleHeatmapClick}
            viewMode={viewMode}
          />
        </Grid>

        {/* LINE CHART COMPARISON */}
        <Grid item xs={12}>
          <RiskComparisonLineChart risks={risks} />
        </Grid>

        {/* RIGHT SIDEBAR */}
        <Grid item xs={12} lg={4}>
          {/* Configuration Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">Konfigurasi Saat Ini</Typography>
              <Typography variant="caption" color="textSecondary">Metode:</Typography>
              <Typography variant="body2" sx={{ 
                display: 'inline-block', 
                ml: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: 'primary.light',
                color: 'primary.contrastText'
              }}>
                {config.assessmentMethod === 'coordinate' ? 'Koordinat' : 'Perkalian'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption" color="textSecondary">View Mode:</Typography>
              <Typography variant="body2" sx={{ 
                display: 'inline-block', 
                ml: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: viewMode === 'inherent' ? 'primary.main' : 'success.main',
                color: 'white'
              }}>
                {viewMode === 'inherent' ? 'Inherent' : 'Residual'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption">Level Risiko:</Typography>
              {(config.riskLevels || RISK_LEVELS).map((level, idx) => (
                <Box key={idx} display="flex" alignItems="center" gap={1} mt={1}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: level.color }} />
                  <Typography variant="caption">
                    {level.label} ({level.min}-{level.max})
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* DATA SUMMARY */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">Data Summary</Typography>

              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Total Risks:</Typography>
                <Typography variant="body2" fontWeight="bold">{stats.totalRisks}</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Assessed:</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {stats.assessedRisks}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Residual:</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {stats.hasResidualData}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography>Progress:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Math.round(stats.assessmentProgress)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* QUICK ACTIONS */}
          <Card>
            <CardContent>
              <Typography variant="h6">Quick Actions</Typography>

              <Button
                fullWidth
                variant="contained"
                startIcon={<Assessment />}
                sx={{ mt: 1 }}
                onClick={() => navigate('/risk-register')}
              >
                Buka Risk Register
              </Button>

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() => setViewMode(viewMode === 'inherent' ? 'residual' : 'inherent')}
              >
                Switch View Mode
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* MODALS */}
      <RiskAssessmentConfigDialog
        open={configDialog}
        onClose={() => setConfigDialog(false)}
        config={config}
      />

      {selectedCell && (
        <RiskCellDetailModal
          open={cellDetailOpen}
          onClose={() => { setCellDetailOpen(false); setSelectedCell(null); }}
          cellData={selectedCell}
          viewMode={viewMode}
          assessmentMethod={config.assessmentMethod}
          riskLevels={config.riskLevels}
          onExport={handleExportText}
        />
      )}

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={handleCloseSnackbar} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RiskAssessment;