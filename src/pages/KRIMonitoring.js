import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Snackbar,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  TrendingUp,
  Warning,
  CheckCircle,
  NotificationsActive,
  Analytics,
  Refresh
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import KRIService from '../services/kriService'; // ✅ IMPORT KRI SERVICE
import KRIMonitoringService from '../services/kriMonitoringService'; // ✅ IMPORT MONITORING SERVICE

const KRIMonitoring = () => {
  const [kris, setKris] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKri, setEditingKri] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    data_source: 'manual',
    metric_type: 'percentage',
    threshold_green: 70,
    threshold_yellow: 85,
    threshold_red: 95,
    target_direction: 'lower',
    frequency: 'monthly',
    responsible_person: '',
    unit: '%'
  });

  // Frequency options
  const frequencyOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'quarterly', label: 'Kuartalan' }
  ];

  // Data source options
  const dataSourceOptions = [
    { value: 'manual', label: 'Manual Input' },
    { value: 'risk_count', label: 'Jumlah Risiko' },
    { value: 'treatment_progress', label: 'Progress Treatment' },
    { value: 'high_risk_count', label: 'Jumlah Risiko Tinggi' },
    { value: 'overdue_treatments', label: 'Treatment Terlambat' },
    { value: 'incident_count', label: 'Jumlah Insiden' }
  ];

  // Target direction options
  const targetDirectionOptions = [
    { value: 'lower', label: 'Lower is Better' },
    { value: 'higher', label: 'Higher is Better' }
  ];

  // ✅ LOAD KRIs DARI KRI SERVICE
  const loadKris = async () => {
    try {
      setLoading(true);
      const krisData = await KRIService.getAllKRIs();
      setKris(krisData);
      console.log('Loaded KRIs:', krisData.length);
    } catch (error) {
      console.error('Error loading KRIs:', error);
      showSnackbar('Error memuat data KRI: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MANUAL REFRESH KRI DATA
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await KRIMonitoringService.manualTrigger();
      await loadKris();
      showSnackbar('KRI data refreshed successfully!', 'success');
    } catch (error) {
      console.error('Error refreshing KRI data:', error);
      showSnackbar('Error refreshing KRI data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadKris();
  }, []);

  // ✅ GET CURRENT STATUS FOR KRI
  const getKriStatus = (kri) => {
    const currentValue = kri.current_value || 0;
    
    if (kri.target_direction === 'lower') {
      if (currentValue <= kri.threshold_green) return { status: 'green', label: 'Normal', color: 'success' };
      if (currentValue <= kri.threshold_yellow) return { status: 'yellow', label: 'Warning', color: 'warning' };
      return { status: 'red', label: 'Critical', color: 'error' };
    } else {
      if (currentValue >= kri.threshold_green) return { status: 'green', label: 'Normal', color: 'success' };
      if (currentValue >= kri.threshold_yellow) return { status: 'yellow', label: 'Warning', color: 'warning' };
      return { status: 'red', label: 'Critical', color: 'error' };
    }
  };

  // ✅ GET STATUS ICON
  const getStatusIcon = (status) => {
    switch (status) {
      case 'green': return <CheckCircle />;
      case 'yellow': return <Warning />;
      case 'red': return <NotificationsActive />;
      default: return <CheckCircle />;
    }
  };

  // ✅ HANDLE CREATE/UPDATE KRI
  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.description) {
        showSnackbar('Nama dan Deskripsi KRI harus diisi!', 'error');
        return;
      }

      const kriData = {
        ...formData,
        threshold_green: parseFloat(formData.threshold_green),
        threshold_yellow: parseFloat(formData.threshold_yellow),
        threshold_red: parseFloat(formData.threshold_red),
        current_value: 0,
        previous_value: 0,
        status: 'inactive',
        trend: 'stable'
      };

      if (editingKri) {
        // Update existing KRI
        await updateDoc(doc(db, 'kris', editingKri.id), kriData);
        showSnackbar('KRI berhasil diupdate!', 'success');
      } else {
        // Create new KRI menggunakan KRIService
        await KRIService.createKRI(kriData);
        showSnackbar('KRI berhasil dibuat!', 'success');
      }

      setOpenDialog(false);
      setEditingKri(null);
      resetForm();
      await loadKris();
      
    } catch (error) {
      console.error('Error saving KRI:', error);
      showSnackbar('Error menyimpan KRI: ' + error.message, 'error');
    }
  };

  // ✅ RESET FORM
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      data_source: 'manual',
      metric_type: 'percentage',
      threshold_green: 70,
      threshold_yellow: 85,
      threshold_red: 95,
      target_direction: 'lower',
      frequency: 'monthly',
      responsible_person: '',
      unit: '%'
    });
  };

  // ✅ HANDLE EDIT
  const handleEdit = (kri) => {
    setEditingKri(kri);
    setFormData({
      name: kri.name,
      description: kri.description,
      data_source: kri.data_source || 'manual',
      metric_type: kri.metric_type || 'percentage',
      threshold_green: kri.threshold_green || 70,
      threshold_yellow: kri.threshold_yellow || 85,
      threshold_red: kri.threshold_red || 95,
      target_direction: kri.target_direction || 'lower',
      frequency: kri.frequency || 'monthly',
      responsible_person: kri.responsible_person || '',
      unit: kri.unit || '%'
    });
    setOpenDialog(true);
  };

  // ✅ HANDLE DELETE
  const handleDelete = async (kriId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus KRI ini?')) {
      try {
        await deleteDoc(doc(db, 'kris', kriId));
        showSnackbar('KRI berhasil dihapus!', 'success');
        loadKris();
      } catch (error) {
        console.error('Error deleting KRI:', error);
        showSnackbar('Error menghapus KRI: ' + error.message, 'error');
      }
    }
  };

  // ✅ UPDATE KRI VALUE MANUALLY
  const handleUpdateValue = async (kriId, newValue) => {
    try {
      await KRIService.updateKRIValue(kriId, newValue);
      showSnackbar('KRI value updated successfully!', 'success');
      await loadKris();
    } catch (error) {
      console.error('Error updating KRI value:', error);
      showSnackbar('Error updating KRI value', 'error');
    }
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Statistics
  const stats = {
    total: kris.length,
    critical: kris.filter(kri => getKriStatus(kri).status === 'red').length,
    warning: kris.filter(kri => getKriStatus(kri).status === 'yellow').length,
    normal: kris.filter(kri => getKriStatus(kri).status === 'green').length
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
                backgroundColor: 'warning.main', 
                borderRadius: 2,
                color: 'white'
              }}>
                <Analytics sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  KRI Monitoring
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Key Risk Indicators - Real-time Monitoring System
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                size="large"
                sx={{ borderRadius: 2 }}
                onClick={() => setOpenDialog(true)}
              >
                Buat KRI Baru
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Analytics sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total KRI
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.normal}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Normal Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.warning}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Warning Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <NotificationsActive sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.critical}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Critical Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KRI Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Daftar Key Risk Indicators ({kris.length})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Last updated: {new Date().toLocaleString()}
            </Typography>
          </Box>
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <LinearProgress />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Memuat data KRI...
              </Typography>
            </Box>
          ) : kris.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Belum ada KRI yang dibuat. Klik "Buat KRI Baru" untuk membuat yang pertama.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell width="20%">KRI Name</TableCell>
                    <TableCell width="20%">Description</TableCell>
                    <TableCell width="10%">Current Value</TableCell>
                    <TableCell width="10%">Status</TableCell>
                    <TableCell width="10%">Trend</TableCell>
                    <TableCell width="15%">Thresholds</TableCell>
                    <TableCell width="15%">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kris.map((kri) => {
                    const status = getKriStatus(kri);
                    const currentValue = kri.current_value || 0;
                    
                    return (
                      <TableRow key={kri.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {kri.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {kri.unit || '%'} • {frequencyOptions.find(f => f.value === kri.frequency)?.label}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Source: {dataSourceOptions.find(d => d.value === kri.data_source)?.label}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {kri.description}
                          </Typography>
                          {kri.responsible_person && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              PIC: {kri.responsible_person}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" fontWeight="bold" color={status.color}>
                            {currentValue}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Target: {kri.target_direction === 'lower' ? 'Lower' : 'Higher'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={getStatusIcon(status.status)}
                            label={status.label}
                            color={status.color}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={kri.trend === 'increasing' ? 'Trend Naik' : kri.trend === 'decreasing' ? 'Trend Turun' : 'Stabil'}>
                            <TrendingUp 
                              sx={{ 
                                color: kri.trend === 'increasing' ? 'error.main' : kri.trend === 'decreasing' ? 'success.main' : 'text.secondary',
                                transform: kri.trend === 'decreasing' ? 'rotate(180deg)' : 'none'
                              }} 
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="caption" display="block">
                              Green: {kri.target_direction === 'lower' ? '≤' : '≥'} {kri.threshold_green}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Yellow: {kri.threshold_yellow}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Red: {kri.target_direction === 'lower' ? '>' : '<'} {kri.threshold_red}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Edit KRI">
                              <IconButton 
                                color="primary"
                                size="small"
                                onClick={() => handleEdit(kri)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Update Value">
                              <Button 
                                variant="outlined" 
                                size="small"
                                onClick={() => {
                                  const newValue = prompt(`Enter new value for ${kri.name}:`, currentValue);
                                  if (newValue !== null) {
                                    handleUpdateValue(kri.id, parseFloat(newValue));
                                  }
                                }}
                              >
                                Update
                              </Button>
                            </Tooltip>
                            <Tooltip title="Delete KRI">
                              <IconButton 
                                color="error" 
                                size="small"
                                onClick={() => handleDelete(kri.id)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
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

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setEditingKri(null);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingKri ? 'Edit Key Risk Indicator' : 'Buat Key Risk Indicator Baru'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nama KRI"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deskripsi"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Sumber Data</InputLabel>
                <Select
                  value={formData.data_source}
                  label="Sumber Data"
                  onChange={(e) => setFormData({ ...formData, data_source: e.target.value })}
                >
                  {dataSourceOptions.map((source) => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Arah Target</InputLabel>
                <Select
                  value={formData.target_direction}
                  label="Arah Target"
                  onChange={(e) => setFormData({ ...formData, target_direction: e.target.value })}
                >
                  {targetDirectionOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Threshold Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Green Threshold"
                type="number"
                value={formData.threshold_green}
                onChange={(e) => setFormData({ ...formData, threshold_green: e.target.value })}
                helperText="Nilai untuk status Green"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Yellow Threshold"
                type="number"
                value={formData.threshold_yellow}
                onChange={(e) => setFormData({ ...formData, threshold_yellow: e.target.value })}
                helperText="Nilai untuk status Yellow"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Red Threshold"
                type="number"
                value={formData.threshold_red}
                onChange={(e) => setFormData({ ...formData, threshold_red: e.target.value })}
                helperText="Nilai untuk status Red"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Frekuensi Monitoring</InputLabel>
                <Select
                  value={formData.frequency}
                  label="Frekuensi Monitoring"
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  {frequencyOptions.map((freq) => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Penanggung Jawab"
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingKri(null);
              resetForm();
            }}
          >
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.description}
          >
            {editingKri ? 'Update KRI' : 'Buat KRI'}
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

export default KRIMonitoring;