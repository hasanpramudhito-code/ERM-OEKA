// File: src/pages/Configuration.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Divider,
  InputAdornment,
  CircularProgress,
  FormHelperText,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import {
  Settings,
  Add,
  Edit,
  Delete,
  Save,
  Warning,
  Assessment,
  TrendingUp,
  TrendingDown,
  Palette
} from '@mui/icons-material';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';

// === KONSTANTA YANG AKAN DIEKSPOR - DIPINDAHKAN KE LEVEL MODUL ===
export const COORDINATE_MATRIX = [
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

export const RISK_LEVELS = [
  { min: 1, max: 3, label: 'Sangat Rendah', color: '#4caf50' },
  { min: 4, max: 6, label: 'Rendah', color: '#81c784' },
  { min: 7, max: 10, label: 'Sedang', color: '#ffeb3b' },
  { min: 11, max: 15, label: 'Tinggi', color: '#f57c00' },
  { min: 16, max: 20, label: 'Sangat Tinggi', color: '#d32f2f' },
  { min: 21, max: 25, label: 'Ekstrim', color: '#7b1fa2' }
];

// Fungsi untuk mendapatkan score berdasarkan koordinat
export const getCoordinateScore = (likelihood, impact) => {
  const entry = COORDINATE_MATRIX.find(
    ([l, i]) => l === likelihood && i === impact
  );
  return entry ? entry[2] : likelihood * impact;
};

// === KOMPONEN UTAMA ===
const Configuration = () => {
  const { 
    assessmentConfig, 
    loading: configLoading, 
    updateConfig, // Tambah fungsi updateConfig dari context
    refreshConfig // Tambah fungsi refresh untuk real-time update
  } = useAssessmentConfig();

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openLikelihoodDialog, setOpenLikelihoodDialog] = useState(false);
  const [openImpactDialog, setOpenImpactDialog] = useState(false);
  const [openRiskLevelDialog, setOpenRiskLevelDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingRiskLevel, setEditingRiskLevel] = useState(null);

  // State untuk form
  const [likelihoodForm, setLikelihoodForm] = useState({ value: '', label: '' });
  const [impactForm, setImpactForm] = useState({ value: '', label: '' });
  const [riskLevelForm, setRiskLevelForm] = useState({ 
    label: '', 
    min: '', 
    max: '', 
    color: '#4caf50' 
  });
  const [assessmentMethod, setAssessmentMethod] = useState('multiplication');

  // Setup real-time listener untuk Firestore
  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(doc(db, 'risk_assessment_config', 'default'), (doc) => {
      if (doc.exists()) {
        const newData = doc.data();
        console.log('Firestore config updated:', newData);
        // Update context secara langsung
        if (updateConfig && typeof updateConfig === 'function') {
          updateConfig(newData);
        }
        // Update local state
        if (newData.assessmentMethod) {
          setAssessmentMethod(newData.assessmentMethod);
        }
      }
    }, (error) => {
      console.error('Error listening to config updates:', error);
    });

    return () => unsubscribe();
  }, [updateConfig]);

  useEffect(() => {
    if (assessmentConfig) {
      setAssessmentMethod(assessmentConfig.assessmentMethod || 'multiplication');
    }
  }, [assessmentConfig]);

  // Reset forms
  const resetLikelihoodForm = () => {
    setLikelihoodForm({ value: '', label: '' });
    setEditingItem(null);
  };

  const resetImpactForm = () => {
    setImpactForm({ value: '', label: '' });
    setEditingItem(null);
  };

  const resetRiskLevelForm = () => {
    setRiskLevelForm({ label: '', min: '', max: '', color: '#4caf50' });
    setEditingRiskLevel(null);
  };

  // Fungsi helper untuk update context secara langsung
  const updateContextConfig = async (updates) => {
    try {
      if (updateConfig && typeof updateConfig === 'function') {
        // Update context secara langsung
        const updatedConfig = {
          ...assessmentConfig,
          ...updates,
          lastUpdated: new Date().toISOString()
        };
        updateConfig(updatedConfig);
        console.log('Context updated directly:', updatedConfig);
      }
    } catch (error) {
      console.error('Error updating context:', error);
    }
  };

  // Handle save assessment method
  const handleSaveAssessmentMethod = async () => {
    try {
      setLoading(true);
      
      // Update Firestore
      await updateDoc(doc(db, 'risk_assessment_config', 'default'), {
        assessmentMethod,
        lastUpdated: new Date().toISOString()
      });
      
      // Update context secara langsung tanpa menunggu Firestore listener
      updateContextConfig({ assessmentMethod });
      
      showSnackbar('Metode assessment berhasil disimpan! Perubahan akan terlihat langsung.', 'success');
    } catch (error) {
      console.error('Error saving assessment method:', error);
      showSnackbar('Error menyimpan metode assessment: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle save likelihood option
  const handleSaveLikelihood = async () => {
    try {
      setLoading(true);
      
      const newLikelihoodOptions = [...(assessmentConfig?.likelihoodOptions || [])];
      
      if (editingItem) {
        // Edit existing
        const index = newLikelihoodOptions.findIndex(opt => opt.value === editingItem.value);
        if (index !== -1) {
          newLikelihoodOptions[index] = { 
            value: parseInt(likelihoodForm.value), 
            label: likelihoodForm.label 
          };
        }
      } else {
        // Add new
        newLikelihoodOptions.push({ 
          value: parseInt(likelihoodForm.value), 
          label: likelihoodForm.label 
        });
        newLikelihoodOptions.sort((a, b) => a.value - b.value);
      }
      
      // Update Firestore
      await updateDoc(doc(db, 'risk_assessment_config', 'default'), {
        likelihoodOptions: newLikelihoodOptions,
        lastUpdated: new Date().toISOString()
      });
      
      // Update context secara langsung
      updateContextConfig({ likelihoodOptions: newLikelihoodOptions });
      
      showSnackbar('Likelihood option berhasil disimpan! Perubahan akan terlihat langsung.', 'success');
      setOpenLikelihoodDialog(false);
      resetLikelihoodForm();
    } catch (error) {
      console.error('Error saving likelihood option:', error);
      showSnackbar('Error menyimpan likelihood option: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle save impact option
  const handleSaveImpact = async () => {
    try {
      setLoading(true);
      
      const newImpactOptions = [...(assessmentConfig?.impactOptions || [])];
      
      if (editingItem) {
        // Edit existing
        const index = newImpactOptions.findIndex(opt => opt.value === editingItem.value);
        if (index !== -1) {
          newImpactOptions[index] = { 
            value: parseInt(impactForm.value), 
            label: impactForm.label 
          };
        }
      } else {
        // Add new
        newImpactOptions.push({ 
          value: parseInt(impactForm.value), 
          label: impactForm.label 
        });
        newImpactOptions.sort((a, b) => a.value - b.value);
      }
      
      // Update Firestore
      await updateDoc(doc(db, 'risk_assessment_config', 'default'), {
        impactOptions: newImpactOptions,
        lastUpdated: new Date().toISOString()
      });
      
      // Update context secara langsung
      updateContextConfig({ impactOptions: newImpactOptions });
      
      showSnackbar('Impact option berhasil disimpan! Perubahan akan terlihat langsung.', 'success');
      setOpenImpactDialog(false);
      resetImpactForm();
    } catch (error) {
      console.error('Error saving impact option:', error);
      showSnackbar('Error menyimpan impact option: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle save risk level
  const handleSaveRiskLevel = async () => {
    try {
      setLoading(true);
      
      const newRiskLevels = [...(assessmentConfig?.riskLevels || [])];
      
      if (editingRiskLevel) {
        // Edit existing
        const index = newRiskLevels.findIndex(level => 
          level.min === editingRiskLevel.min && level.max === editingRiskLevel.max
        );
        if (index !== -1) {
          newRiskLevels[index] = {
            min: parseInt(riskLevelForm.min),
            max: parseInt(riskLevelForm.max),
            label: riskLevelForm.label,
            color: riskLevelForm.color
          };
        }
      } else {
        // Add new
        newRiskLevels.push({
          min: parseInt(riskLevelForm.min),
          max: parseInt(riskLevelForm.max),
          label: riskLevelForm.label,
          color: riskLevelForm.color
        });
        newRiskLevels.sort((a, b) => a.min - b.min);
      }
      
      // Update Firestore
      await updateDoc(doc(db, 'risk_assessment_config', 'default'), {
        riskLevels: newRiskLevels,
        lastUpdated: new Date().toISOString()
      });
      
      // Update context secara langsung
      updateContextConfig({ riskLevels: newRiskLevels });
      
      showSnackbar('Risk level berhasil disimpan! Perubahan akan terlihat langsung.', 'success');
      setOpenRiskLevelDialog(false);
      resetRiskLevelForm();
    } catch (error) {
      console.error('Error saving risk level:', error);
      showSnackbar('Error menyimpan risk level: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit likelihood
  const handleEditLikelihood = (option) => {
    setEditingItem(option);
    setLikelihoodForm({ value: option.value, label: option.label });
    setOpenLikelihoodDialog(true);
  };

  // Handle edit impact
  const handleEditImpact = (option) => {
    setEditingItem(option);
    setImpactForm({ value: option.value, label: option.label });
    setOpenImpactDialog(true);
  };

  // Handle edit risk level
  const handleEditRiskLevel = (level) => {
    setEditingRiskLevel(level);
    setRiskLevelForm({ 
      label: level.label, 
      min: level.min, 
      max: level.max, 
      color: level.color 
    });
    setOpenRiskLevelDialog(true);
  };

  // Handle delete likelihood
  const handleDeleteLikelihood = async (value) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus likelihood option ini?')) {
      try {
        setLoading(true);
        const newLikelihoodOptions = assessmentConfig?.likelihoodOptions?.filter(opt => opt.value !== value) || [];
        
        // Update Firestore
        await updateDoc(doc(db, 'risk_assessment_config', 'default'), {
          likelihoodOptions: newLikelihoodOptions,
          lastUpdated: new Date().toISOString()
        });
        
        // Update context secara langsung
        updateContextConfig({ likelihoodOptions: newLikelihoodOptions });
        
        showSnackbar('Likelihood option berhasil dihapus!', 'success');
      } catch (error) {
        console.error('Error deleting likelihood option:', error);
        showSnackbar('Error menghapus likelihood option: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle delete impact
  const handleDeleteImpact = async (value) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus impact option ini?')) {
      try {
        setLoading(true);
        const newImpactOptions = assessmentConfig?.impactOptions?.filter(opt => opt.value !== value) || [];
        
        // Update Firestore
        await updateDoc(doc(db, 'risk_assessment_config', 'default'), {
          impactOptions: newImpactOptions,
          lastUpdated: new Date().toISOString()
        });
        
        // Update context secara langsung
        updateContextConfig({ impactOptions: newImpactOptions });
        
        showSnackbar('Impact option berhasil dihapus!', 'success');
      } catch (error) {
        console.error('Error deleting impact option:', error);
        showSnackbar('Error menghapus impact option: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle delete risk level
  const handleDeleteRiskLevel = async (level) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus risk level ini?')) {
      try {
        setLoading(true);
        const newRiskLevels = assessmentConfig?.riskLevels?.filter(l => 
          !(l.min === level.min && l.max === level.max)
        ) || [];
        
        // Update Firestore
        await updateDoc(doc(db, 'risk_assessment_config', 'default'), {
          riskLevels: newRiskLevels,
          lastUpdated: new Date().toISOString()
        });
        
        // Update context secara langsung
        updateContextConfig({ riskLevels: newRiskLevels });
        
        showSnackbar('Risk level berhasil dihapus!', 'success');
      } catch (error) {
        console.error('Error deleting risk level:', error);
        showSnackbar('Error menghapus risk level: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Manual refresh button
  const handleManualRefresh = () => {
    if (refreshConfig && typeof refreshConfig === 'function') {
      refreshConfig();
      showSnackbar('Config diperbarui secara manual!', 'info');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Color options for risk levels
  const colorOptions = [
    { value: '#4caf50', label: 'Hijau (Sangat Rendah)', color: 'success' },
    { value: '#81c784', label: 'Hijau Muda (Rendah)', color: 'success' },
    { value: '#ffeb3b', label: 'Kuning (Sedang)', color: 'warning' },
    { value: '#f57c00', label: 'Orange (Tinggi)', color: 'warning' },
    { value: '#d32f2f', label: 'Merah (Sangat Tinggi)', color: 'error' },
    { value: '#7b1fa2', label: 'Ungu (Ekstrim)', color: 'secondary' },
    { value: '#2196f3', label: 'Biru', color: 'info' },
    { value: '#607d8b', label: 'Abu-abu', color: 'default' }
  ];

  if (configLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

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
                <Settings sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Konfigurasi Risk Assessment
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Atur metode assessment, likelihood, impact, dan risk levels sesuai kebutuhan organisasi
                </Typography>
              </Box>
            </Box>
            
            {/* Refresh Button */}
            <Button
              variant="outlined"
              onClick={handleManualRefresh}
              disabled={loading}
              startIcon={<RefreshIcon />}
            >
              Refresh Config
            </Button>
          </Box>
          
          {/* Status Indicator */}
          <Alert 
            severity="info" 
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleManualRefresh}>
                Refresh Now
              </Button>
            }
          >
            <Typography variant="body2">
              <strong>Real-time Update Aktif</strong> - Perubahan akan langsung terlihat di semua modul
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Kolom Kiri - Assessment Method */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment />
                Metode Assessment
              </Typography>
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <RadioGroup
                  value={assessmentMethod}
                  onChange={(e) => setAssessmentMethod(e.target.value)}
                >
                  <FormControlLabel 
                    value="multiplication" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography fontWeight="bold">Metode Perkalian</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Risk Score = Likelihood × Impact
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="coordinate" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography fontWeight="bold">Metode Matriks Koordinat</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Menggunakan matriks 5x5 dengan nilai yang telah ditentukan
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              {assessmentMethod === 'coordinate' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Matriks koordinat menggunakan skala 1-5 untuk Likelihood dan Impact, dengan risk score yang telah ditentukan.
                  </Typography>
                </Alert>
              )}
              
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveAssessmentMethod}
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Simpan Metode'}
              </Button>
            </CardContent>
          </Card>

          {/* Risk Levels Configuration */}
          <Card sx={{ boxShadow: 2, mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning />
                  Risk Levels
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  size="small"
                  onClick={() => {
                    resetRiskLevelForm();
                    setOpenRiskLevelDialog(true);
                  }}
                >
                  Tambah
                </Button>
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Label</strong></TableCell>
                      <TableCell><strong>Min Score</strong></TableCell>
                      <TableCell><strong>Max Score</strong></TableCell>
                      <TableCell><strong>Warna</strong></TableCell>
                      <TableCell align="center"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessmentConfig?.riskLevels?.map((level, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip 
                            label={level.label}
                            size="small"
                            sx={{ 
                              backgroundColor: level.color,
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>{level.min}</TableCell>
                        <TableCell>{level.max}</TableCell>
                        <TableCell>
                          <Box sx={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: '50%', 
                            backgroundColor: level.color,
                            border: '1px solid #ccc'
                          }} />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditRiskLevel(level)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteRiskLevel(level)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Kolom Kanan - Likelihood & Impact Configuration */}
        <Grid item xs={12} md={6}>
          {/* Likelihood Options */}
          <Card sx={{ boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp />
                  Likelihood Options
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  size="small"
                  onClick={() => {
                    resetLikelihoodForm();
                    setOpenLikelihoodDialog(true);
                  }}
                >
                  Tambah
                </Button>
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Value</strong></TableCell>
                      <TableCell><strong>Label</strong></TableCell>
                      <TableCell align="center"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessmentConfig?.likelihoodOptions?.map((option, index) => (
                      <TableRow key={index}>
                        <TableCell>{option.value}</TableCell>
                        <TableCell>{option.label}</TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditLikelihood(option)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteLikelihood(option.value)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Impact Options */}
          <Card sx={{ boxShadow: 2, mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingDown />
                  Impact Options
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  size="small"
                  onClick={() => {
                    resetImpactForm();
                    setOpenImpactDialog(true);
                  }}
                >
                  Tambah
                </Button>
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Value</strong></TableCell>
                      <TableCell><strong>Label</strong></TableCell>
                      <TableCell align="center"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessmentConfig?.impactOptions?.map((option, index) => (
                      <TableRow key={index}>
                        <TableCell>{option.value}</TableCell>
                        <TableCell>{option.label}</TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditImpact(option)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteImpact(option.value)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card sx={{ boxShadow: 2, mt: 3, backgroundColor: 'info.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💡 Informasi Penting
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Likelihood:</strong> Kemungkinan terjadinya risiko (1-5)
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Impact:</strong> Dampak yang ditimbulkan jika risiko terjadi (1-5)
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Risk Levels:</strong> Tingkat risiko berdasarkan score (Likelihood × Impact)
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>REAL-TIME UPDATE:</strong> Perubahan disimpan secara otomatis dan langsung terlihat di semua modul tanpa perlu refresh!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog untuk Likelihood */}
      <Dialog 
        open={openLikelihoodDialog} 
        onClose={() => setOpenLikelihoodDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? 'Edit Likelihood Option' : 'Tambah Likelihood Option'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Value (1-5)"
                type="number"
                value={likelihoodForm.value}
                onChange={(e) => setLikelihoodForm({...likelihoodForm, value: e.target.value})}
                inputProps={{ min: 1, max: 5 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Label"
                value={likelihoodForm.label}
                onChange={(e) => setLikelihoodForm({...likelihoodForm, label: e.target.value})}
                placeholder="Contoh: Sangat Rendah"
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLikelihoodDialog(false)}>
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveLikelihood}
            disabled={!likelihoodForm.value || !likelihoodForm.label || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog untuk Impact */}
      <Dialog 
        open={openImpactDialog} 
        onClose={() => setOpenImpactDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? 'Edit Impact Option' : 'Tambah Impact Option'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Value (1-5)"
                type="number"
                value={impactForm.value}
                onChange={(e) => setImpactForm({...impactForm, value: e.target.value})}
                inputProps={{ min: 1, max: 5 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Label"
                value={impactForm.label}
                onChange={(e) => setImpactForm({...impactForm, label: e.target.value})}
                placeholder="Contoh: Dampak tidak signifikan"
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImpactDialog(false)}>
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveImpact}
            disabled={!impactForm.value || !impactForm.label || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog untuk Risk Level */}
      <Dialog 
        open={openRiskLevelDialog} 
        onClose={() => setOpenRiskLevelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRiskLevel ? 'Edit Risk Level' : 'Tambah Risk Level'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Label"
                value={riskLevelForm.label}
                onChange={(e) => setRiskLevelForm({...riskLevelForm, label: e.target.value})}
                placeholder="Contoh: Sangat Rendah"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Min Score"
                type="number"
                value={riskLevelForm.min}
                onChange={(e) => setRiskLevelForm({...riskLevelForm, min: e.target.value})}
                inputProps={{ min: 1, max: 25 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Score"
                type="number"
                value={riskLevelForm.max}
                onChange={(e) => setRiskLevelForm({...riskLevelForm, max: e.target.value})}
                inputProps={{ min: 1, max: 25 }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Warna</InputLabel>
                <Select
                  value={riskLevelForm.color}
                  label="Warna"
                  onChange={(e) => setRiskLevelForm({...riskLevelForm, color: e.target.value})}
                >
                  {colorOptions.map((color) => (
                    <MenuItem key={color.value} value={color.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: '50%', 
                          backgroundColor: color.value,
                          border: '1px solid #ccc'
                        }} />
                        {color.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Pastikan range score tidak overlap dengan risk level lainnya.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRiskLevelDialog(false)}>
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveRiskLevel}
            disabled={!riskLevelForm.label || !riskLevelForm.min || !riskLevelForm.max || !riskLevelForm.color || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

// Tambahkan Refresh icon jika belum ada
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/>
    <path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

// === DEFAULT EXPORT ===
// Default export untuk komponen React
export default Configuration;