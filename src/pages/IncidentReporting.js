// File: src/pages/IncidentReporting.js - UPDATE dengan search functionality
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
  Alert,
  Snackbar,
  Paper,
  Tooltip,
  LinearProgress,
  InputAdornment // ✅ TAMBAHKAN
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Warning,
  Assignment,
  Schedule,
  CheckCircle,
  Search // ✅ TAMBAHKAN
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import RiskSearchDialog from '../components/RiskSearch/RiskSearchDialog'; // ✅ TAMBAHKAN IMPORT

const IncidentReporting = () => {
  const [incidents, setIncidents] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { userData } = useAuth();

  // ✅ STATE BARU UNTUK RISK SEARCH
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const [formData, setFormData] = useState({
    riskId: '',
    riskName: '', // ✅ TAMBAHKAN untuk display
    incidentDate: '',
    description: '',
    impact: '',
    immediateAction: '',
    reportedBy: '',
    status: 'reported',
    severity: 'medium',
    followUpRequired: false,
    followUpAction: ''
  });

  // Severity options
  const severityOptions = [
    { value: 'low', label: 'Rendah', color: 'success' },
    { value: 'medium', label: 'Sedang', color: 'warning' },
    { value: 'high', label: 'Tinggi', color: 'error' },
    { value: 'critical', label: 'Kritis', color: 'error' }
  ];

  // Status options
  const statusOptions = [
    { value: 'reported', label: 'Dilaporkan', color: 'default' },
    { value: 'under_investigation', label: 'Dalam Investigasi', color: 'primary' },
    { value: 'action_taken', label: 'Tindakan Diambil', color: 'info' },
    { value: 'resolved', label: 'Terselesaikan', color: 'success' },
    { value: 'closed', label: 'Ditutup', color: 'default' }
  ];

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load risks for dropdown (masih diperlukan untuk data existing)
      const risksSnapshot = await getDocs(collection(db, 'risks'));
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        risksList.push({ id: doc.id, ...doc.data() });
      });
      setRisks(risksList);

      // Load incidents
      const incidentsQuery = query(collection(db, 'incidents'), orderBy('incidentDate', 'desc'));
      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidentsList = [];
      incidentsSnapshot.forEach((doc) => {
        incidentsList.push({ id: doc.id, ...doc.data() });
      });
      setIncidents(incidentsList);

    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Error memuat data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get risk name by ID
  const getRiskName = (riskId) => {
    const risk = risks.find(r => r.id === riskId);
    return risk ? risk.title || risk.riskDescription : 'Risk tidak ditemukan';
  };

  // ✅ FUNGSI BARU: Handle Risk Selection dari Search
  const handleRiskSelect = (risk) => {
    setSelectedRisk(risk);
    setFormData({
      ...formData,
      riskId: risk.id,
      riskName: risk.title || risk.riskDescription // Simpan nama untuk display
    });
  };

  // ✅ FUNGSI BARU: Clear Selected Risk
  const handleClearRisk = () => {
    setSelectedRisk(null);
    setFormData({
      ...formData,
      riskId: '',
      riskName: ''
    });
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      if (!formData.riskId || !formData.description || !formData.incidentDate) {
        showSnackbar('Risk, Deskripsi, dan Tanggal Kejadian harus diisi!', 'error');
        return;
      }

      const incidentData = {
        ...formData,
        incidentDate: new Date(formData.incidentDate),
        reportedBy: userData?.name || 'Unknown',
        reportedById: userData?.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Hapus riskName sebelum save (hanya untuk display)
      delete incidentData.riskName;

      if (editingIncident) {
        // Update existing incident
        await updateDoc(doc(db, 'incidents', editingIncident.id), incidentData);
        showSnackbar('Laporan kejadian berhasil diupdate!', 'success');
      } else {
        // Create new incident
        await addDoc(collection(db, 'incidents'), incidentData);
        showSnackbar('Laporan kejadian berhasil dibuat!', 'success');
      }

      setOpenDialog(false);
      setEditingIncident(null);
      setSelectedRisk(null);
      setFormData({
        riskId: '',
        riskName: '',
        incidentDate: '',
        description: '',
        impact: '',
        immediateAction: '',
        reportedBy: '',
        status: 'reported',
        severity: 'medium',
        followUpRequired: false,
        followUpAction: ''
      });
      
      loadData();
      
    } catch (error) {
      console.error('Error saving incident:', error);
      showSnackbar('Error menyimpan laporan kejadian: ' + error.message, 'error');
    }
  };

  // Handle edit
  const handleEdit = (incident) => {
    setEditingIncident(incident);
    
    // Cari risk data untuk display
    const relatedRisk = risks.find(r => r.id === incident.riskId);
    
    setFormData({
      riskId: incident.riskId,
      riskName: relatedRisk ? (relatedRisk.title || relatedRisk.riskDescription) : '',
      incidentDate: incident.incidentDate ? new Date(incident.incidentDate).toISOString().split('T')[0] : '',
      description: incident.description,
      impact: incident.impact || '',
      immediateAction: incident.immediateAction || '',
      reportedBy: incident.reportedBy,
      status: incident.status,
      severity: incident.severity,
      followUpRequired: incident.followUpRequired || false,
      followUpAction: incident.followUpAction || ''
    });
    
    setSelectedRisk(relatedRisk || null);
    setOpenDialog(true);
  };

  // Handle delete
  const handleDelete = async (incidentId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus laporan kejadian ini?')) {
      try {
        await deleteDoc(doc(db, 'incidents', incidentId));
        showSnackbar('Laporan kejadian berhasil dihapus!', 'success');
        loadData();
      } catch (error) {
        console.error('Error deleting incident:', error);
        showSnackbar('Error menghapus laporan kejadian: ' + error.message, 'error');
      }
    }
  };

  // Handle view details
  const handleViewDetails = (incident) => {
    setSelectedIncident(incident);
    setViewDialog(true);
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
    total: incidents.length,
    critical: incidents.filter(incident => incident.severity === 'critical').length,
    high: incidents.filter(incident => incident.severity === 'high').length,
    resolved: incidents.filter(incident => incident.status === 'resolved' || incident.status === 'closed').length
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
                backgroundColor: 'error.main', 
                borderRadius: 2,
                color: 'white'
              }}>
                <Warning sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Lapor Kejadian Risiko
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Pelaporan dan tracking kejadian risiko yang terjadi
                </Typography>
                <Typography variant="caption" color="primary">
                  🔍 Fitur pencarian risiko tersedia untuk memudahkan input laporan
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              size="large"
              sx={{ borderRadius: 2 }}
              onClick={() => setOpenDialog(true)}
            >
              Laporkan Kejadian
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Kejadian
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.critical}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Kejadian Kritis
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.high}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Kejadian Tinggi
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.resolved}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Terselesaikan
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Incidents Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Daftar Kejadian Risiko ({incidents.length})
          </Typography>
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="textSecondary">
                Memuat data kejadian...
              </Typography>
            </Box>
          ) : incidents.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Belum ada kejadian yang dilaporkan. Klik "Laporkan Kejadian" untuk membuat laporan pertama.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell width="15%">Tanggal Kejadian</TableCell>
                    <TableCell width="20%">Risk</TableCell>
                    <TableCell width="25%">Deskripsi Kejadian</TableCell>
                    <TableCell width="10%">Severity</TableCell>
                    <TableCell width="10%">Status</TableCell>
                    <TableCell width="10%">Pelapor</TableCell>
                    <TableCell width="10%">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents.map((incident) => {
                    const severityInfo = severityOptions.find(s => s.value === incident.severity) || severityOptions[0];
                    const statusInfo = statusOptions.find(s => s.value === incident.status) || statusOptions[0];
                    
                    return (
                      <TableRow key={incident.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(incident.incidentDate).toLocaleDateString('id-ID')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {getRiskName(incident.riskId)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {incident.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={severityInfo.label}
                            color={severityInfo.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={statusInfo.label}
                            color={statusInfo.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {incident.reportedBy}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Details">
                              <IconButton 
                                color="info"
                                size="small"
                                onClick={() => handleViewDetails(incident)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton 
                                color="primary"
                                size="small"
                                onClick={() => handleEdit(incident)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton 
                                color="error" 
                                size="small"
                                onClick={() => handleDelete(incident.id)}
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
          setEditingIncident(null);
          setSelectedRisk(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingIncident ? 'Edit Laporan Kejadian' : 'Laporkan Kejadian Risiko Baru'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* ✅ UBAH RISK SELECTION MENJADI SEARCH FIELD */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Pilih Risiko Terkait *
              </Typography>
              
              {formData.riskName ? (
                // Tampilkan risk yang sudah dipilih
                <Card variant="outlined" sx={{ p: 2, backgroundColor: 'success.50' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {formData.riskName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Risk ID: {formData.riskId}
                      </Typography>
                    </Box>
                    <Button 
                      color="error" 
                      size="small"
                      onClick={handleClearRisk}
                    >
                      Ganti Risk
                    </Button>
                  </Box>
                </Card>
              ) : (
                // Tampilkan search button
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Search />}
                  onClick={() => setSearchDialogOpen(true)}
                  sx={{ 
                    py: 2,
                    borderStyle: 'dashed',
                    borderWidth: 2
                  }}
                >
                  Klik untuk Cari Risiko ({risks.length} risiko tersedia)
                </Button>
              )}
              
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Gunakan fitur pencarian untuk menemukan risiko dari {risks.length} entri yang tersedia
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tanggal Kejadian"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={formData.severity}
                  label="Severity"
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  {severityOptions.map((severity) => (
                    <MenuItem key={severity.value} value={severity.value}>
                      {severity.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deskripsi Kejadian"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Jelaskan secara detail kejadian yang terjadi..."
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dampak yang Terjadi"
                multiline
                rows={2}
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                placeholder="Deskripsikan dampak dari kejadian ini..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tindakan Segera yang Diambil"
                multiline
                rows={2}
                value={formData.immediateAction}
                onChange={(e) => setFormData({ ...formData, immediateAction: e.target.value })}
                placeholder="Tindakan apa yang segera dilakukan setelah kejadian..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tindakan Lanjutan (Jika diperlukan)"
                multiline
                rows={2}
                value={formData.followUpAction}
                onChange={(e) => setFormData({ ...formData, followUpAction: e.target.value })}
                placeholder="Tindakan lanjutan yang diperlukan untuk mencegah terulang..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingIncident(null);
              setSelectedRisk(null);
            }}
          >
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.riskId || !formData.description || !formData.incidentDate}
          >
            {editingIncident ? 'Update Laporan' : 'Simpan Laporan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ TAMBAHKAN RISK SEARCH DIALOG */}
      <RiskSearchDialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        onRiskSelect={handleRiskSelect}
        db={db} // ← TAMBAH INI!
      />

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detail Laporan Kejadian
          {selectedIncident && (
            <Chip 
              label={severityOptions.find(s => s.value === selectedIncident.severity)?.label}
              color={severityOptions.find(s => s.value === selectedIncident.severity)?.color}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Tanggal Kejadian</Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedIncident.incidentDate).toLocaleDateString('id-ID')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Risk Terkait</Typography>
                  <Typography variant="body1" gutterBottom fontWeight="bold">
                    {getRiskName(selectedIncident.riskId)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Deskripsi Kejadian</Typography>
                  <Typography variant="body1" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedIncident.description}
                  </Typography>
                </Grid>
                {selectedIncident.impact && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Dampak</Typography>
                    <Typography variant="body1" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedIncident.impact}
                    </Typography>
                  </Grid>
                )}
                {selectedIncident.immediateAction && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Tindakan Segera</Typography>
                    <Typography variant="body1" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedIncident.immediateAction}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Severity</Typography>
                  <Chip 
                    label={severityOptions.find(s => s.value === selectedIncident.severity)?.label}
                    color={severityOptions.find(s => s.value === selectedIncident.severity)?.color}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={statusOptions.find(s => s.value === selectedIncident.status)?.label}
                    color={statusOptions.find(s => s.value === selectedIncident.status)?.color}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Pelapor</Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedIncident.reportedBy}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Tanggal Lapor</Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedIncident.createdAt).toLocaleDateString('id-ID')}
                  </Typography>
                </Grid>
                {selectedIncident.followUpAction && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Tindakan Lanjutan</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedIncident.followUpAction}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Tutup</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setViewDialog(false);
              handleEdit(selectedIncident);
            }}
          >
            Edit Laporan
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

export default IncidentReporting;