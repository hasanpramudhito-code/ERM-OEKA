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
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
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
  Tabs,
  Tab,
  Checkbox,
  Toolbar,
  InputAdornment,
  Slider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Assignment,
  Schedule,
  TrendingUp,
  CheckCircle,
  Warning,
  PlayArrow,
  PriorityHigh,
  Search
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import ProgressTracking from '../components/ProgressTracking';
import EvidenceUpload from '../components/EvidenceUpload';

const RiskTreatmentPlans = () => {
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { userData } = useAuth();
  
  const [viewPlan, setViewPlan] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchRisk, setSearchRisk] = useState('');

  const [formData, setFormData] = useState({
    riskId: '',
    treatmentDescription: '',
    treatmentType: 'mitigation',
    responsiblePerson: '',
    deadline: '',
    budget: '',
    status: 'planned',
    progress: 0,
    effectiveness: '',
    priority: 'medium'
  });

  const treatmentTypes = [
    { value: 'mitigation', label: 'Mitigasi', color: 'primary' },
    { value: 'avoidance', label: 'Avoidance', color: 'secondary' },
    { value: 'transfer', label: 'Transfer', color: 'info' },
    { value: 'acceptance', label: 'Acceptance', color: 'default' }
  ];

  const statusOptions = [
    { value: 'planned', label: 'Terencana', color: 'default' },
    { value: 'in_progress', label: 'Dalam Progress', color: 'primary' },
    { value: 'completed', label: 'Selesai', color: 'success' },
    { value: 'delayed', label: 'Terlambat', color: 'warning' },
    { value: 'cancelled', label: 'Dibatalkan', color: 'error' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Rendah', color: 'success', icon: <PriorityHigh sx={{ transform: 'rotate(180deg)' }} /> },
    { value: 'medium', label: 'Sedang', color: 'warning', icon: <PriorityHigh /> },
    { value: 'high', label: 'Tinggi', color: 'error', icon: <PriorityHigh /> },
    { value: 'critical', label: 'Kritis', color: 'error', icon: <Warning /> }
  ];

  // Load data dari Firebase
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load risks dari Firebase
      const risksSnapshot = await getDocs(collection(db, 'risks'));
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        risksList.push({ id: doc.id, ...doc.data() });
      });
      setRisks(risksList);
      setFilteredRisks(risksList);

      // Load treatment plans dari Firebase
      const plansQuery = query(
        collection(db, 'treatment_plans'),
        orderBy('createdAt', 'desc')
      );
      const plansSnapshot = await getDocs(plansQuery);
      const plansList = [];
      plansSnapshot.forEach((doc) => {
        const data = doc.data();
        plansList.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          deadline: data.deadline?.toDate?.() || null
        });
      });
      setTreatmentPlans(plansList);

    } catch (error) {
      console.error('Error loading data from Firebase:', error);
      showSnackbar('Error memuat data dari Firebase: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter risks berdasarkan pencarian
  useEffect(() => {
    if (searchRisk.trim() === '') {
      setFilteredRisks(risks);
    } else {
      const filtered = risks.filter(risk => 
        risk.title?.toLowerCase().includes(searchRisk.toLowerCase()) ||
        risk.riskDescription?.toLowerCase().includes(searchRisk.toLowerCase()) ||
        risk.riskCategory?.toLowerCase().includes(searchRisk.toLowerCase())
      );
      setFilteredRisks(filtered);
    }
  }, [searchRisk, risks]);

  // Filter treatment plans
  const getFilteredPlans = () => {
    let filtered = treatmentPlans;

    // Tab filtering
    switch (activeTab) {
      case 0: // All
        break;
      case 1: // In Progress
        filtered = filtered.filter(p => p.status === 'in_progress');
        break;
      case 2: // Completed
        filtered = filtered.filter(p => p.status === 'completed');
        break;
      case 3: // High Priority
        filtered = filtered.filter(p => p.priority === 'high' || p.priority === 'critical');
        break;
      case 4: // Delayed
        filtered = filtered.filter(p => p.status === 'delayed');
        break;
      default:
        break;
    }

    // Additional filters
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.treatmentType === filterType);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(p => p.priority === filterPriority);
    }

    return filtered;
  };

  // Get risk name by ID
  const getRiskName = (riskId) => {
    const risk = risks.find(r => r.id === riskId);
    return risk ? risk.title || risk.riskDescription : 'Risk tidak ditemukan';
  };

  // Get risk level by ID
  const getRiskLevel = (riskId) => {
    const risk = risks.find(r => r.id === riskId);
    if (!risk) return { level: 'Unknown', color: 'default' };
    
    const score = (risk.likelihood * risk.impact) || 1;
    if (score >= 20) return { level: 'Extreme', color: 'error' };
    if (score >= 16) return { level: 'High', color: 'warning' };
    if (score >= 10) return { level: 'Medium', color: 'info' };
    return { level: 'Low', color: 'success' };
  };

  // Get priority info
  const getPriorityInfo = (priority) => {
    return priorityOptions.find(p => p.value === priority) || priorityOptions[1];
  };

  // Handle form submit ke Firebase
  const handleSubmit = async () => {
    try {
      if (!formData.riskId || !formData.treatmentDescription) {
        showSnackbar('Risk dan Deskripsi Treatment harus diisi!', 'error');
        return;
      }

      const planData = {
        ...formData,
        updatedAt: new Date(),
        updatedBy: userData?.name
      };

      if (editingPlan) {
        // Update existing plan di Firebase
        await updateDoc(doc(db, 'treatment_plans', editingPlan.id), planData);
        showSnackbar('Treatment plan berhasil diupdate di Firebase!', 'success');
      } else {
        // Create new plan di Firebase
        planData.createdAt = new Date();
        planData.createdBy = userData?.name;
        await addDoc(collection(db, 'treatment_plans'), planData);
        showSnackbar('Treatment plan berhasil dibuat di Firebase!', 'success');
      }

      setOpenDialog(false);
      setEditingPlan(null);
      setFormData({
        riskId: '',
        treatmentDescription: '',
        treatmentType: 'mitigation',
        responsiblePerson: '',
        deadline: '',
        budget: '',
        status: 'planned',
        progress: 0,
        effectiveness: '',
        priority: 'medium'
      });
      setSearchRisk('');
      
      loadData();
      
    } catch (error) {
      console.error('Error saving treatment plan to Firebase:', error);
      showSnackbar('Error menyimpan treatment plan: ' + error.message, 'error');
    }
  };

  // Handle edit
  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      riskId: plan.riskId,
      treatmentDescription: plan.treatmentDescription,
      treatmentType: plan.treatmentType,
      responsiblePerson: plan.responsiblePerson,
      deadline: plan.deadline ? plan.deadline.toISOString().split('T')[0] : '',
      budget: plan.budget || '',
      status: plan.status,
      progress: plan.progress || 0,
      effectiveness: plan.effectiveness || '',
      priority: plan.priority || 'medium'
    });
    
    const currentRisk = risks.find(r => r.id === plan.riskId);
    if (currentRisk) {
      setSearchRisk(currentRisk.title || currentRisk.riskDescription);
    }
    
    setOpenDialog(true);
  };

  // Handle delete dari Firebase
  const handleDelete = async (planId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus treatment plan ini?')) {
      try {
        await deleteDoc(doc(db, 'treatment_plans', planId));
        showSnackbar('Treatment plan berhasil dihapus dari Firebase!', 'success');
        loadData();
      } catch (error) {
        console.error('Error deleting treatment plan from Firebase:', error);
        showSnackbar('Error menghapus treatment plan: ' + error.message, 'error');
      }
    }
  };

  // Bulk delete dari Firebase
  const handleBulkDelete = async () => {
    if (selectedPlans.length === 0) return;
    
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedPlans.length} treatment plan?`)) {
      try {
        const deletePromises = selectedPlans.map(planId => 
          deleteDoc(doc(db, 'treatment_plans', planId))
        );
        await Promise.all(deletePromises);
        showSnackbar(`${selectedPlans.length} treatment plan berhasil dihapus dari Firebase!`, 'success');
        setSelectedPlans([]);
        loadData();
      } catch (error) {
        console.error('Error bulk deleting from Firebase:', error);
        showSnackbar('Error menghapus treatment plans: ' + error.message, 'error');
      }
    }
  };

  // Bulk status update ke Firebase
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedPlans.length === 0) return;

    try {
      const updatePromises = selectedPlans.map(planId =>
        updateDoc(doc(db, 'treatment_plans', planId), {
          status: newStatus,
          updatedAt: new Date(),
          updatedBy: userData?.name
        })
      );
      await Promise.all(updatePromises);
      showSnackbar(`${selectedPlans.length} plan berhasil diupdate di Firebase!`, 'success');
      setSelectedPlans([]);
      loadData();
    } catch (error) {
      console.error('Error bulk updating Firebase:', error);
      showSnackbar('Error update status: ' + error.message, 'error');
    }
  };

  // Handle view details
  const handleViewDetails = (plan) => {
    setViewPlan(plan);
    setViewDialog(true);
  };

  // Handle select all
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedPlans(getFilteredPlans().map(plan => plan.id));
    } else {
      setSelectedPlans([]);
    }
  };

  // Handle individual selection
  const handleSelectPlan = (planId) => {
    const selectedIndex = selectedPlans.indexOf(planId);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedPlans, planId);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedPlans.slice(1));
    } else if (selectedIndex === selectedPlans.length - 1) {
      newSelected = newSelected.concat(selectedPlans.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedPlans.slice(0, selectedIndex),
        selectedPlans.slice(selectedIndex + 1),
      );
    }

    setSelectedPlans(newSelected);
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Statistics dari data Firebase
  const stats = {
    total: treatmentPlans.length,
    completed: treatmentPlans.filter(p => p.status === 'completed').length,
    inProgress: treatmentPlans.filter(p => p.status === 'in_progress').length,
    delayed: treatmentPlans.filter(p => p.status === 'delayed').length,
    highPriority: treatmentPlans.filter(p => p.priority === 'high' || p.priority === 'critical').length,
    averageProgress: treatmentPlans.length > 0 
      ? treatmentPlans.reduce((sum, plan) => sum + (plan.progress || 0), 0) / treatmentPlans.length 
      : 0,
    byType: treatmentTypes.map(type => ({
      type: type.label,
      count: treatmentPlans.filter(p => p.treatmentType === type.value).length,
      color: type.color
    }))
  };

  const filteredPlans = getFilteredPlans();

  // Jika tidak ada data di Firebase
  if (!loading && risks.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', minHeight: '100vh' }}>
        <Card sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Assignment sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Belum Ada Data Treatment Plans
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Mulai dengan membuat treatment plan pertama Anda.
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Pastikan koleksi 'risks' dan 'treatment_plans' sudah ada di Firebase.
          </Alert>
          <Button
            variant="contained"
            startIcon={<Add />}
            size="large"
            onClick={() => setOpenDialog(true)}
          >
            Buat Treatment Plan Pertama
          </Button>
        </Card>
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
                <Assignment sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Risk Treatment Plans
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Data diambil dari Firebase Firestore
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
              Buat Treatment Plan
            </Button>
          </Box>

          {/* Enhanced Progress Summary */}
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="textSecondary">
                Overall Progress ({treatmentPlans.length} plans dari Firebase)
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {Math.round(stats.averageProgress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={stats.averageProgress}
              sx={{ height: 8, borderRadius: 4 }}
              color={stats.averageProgress >= 80 ? "success" : "primary"}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Enhanced Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Plans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {stats.inProgress}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.highPriority}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                High Priority
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Treatment Type Distribution */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.byType.map((typeStat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Chip 
                  label={typeStat.type}
                  color={typeStat.color}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="h5" fontWeight="bold">
                  {typeStat.count}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {Math.round((typeStat.count / Math.max(stats.total, 1)) * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Enhanced Treatment Plans Table dengan Tabs & Filtering */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => {
                setActiveTab(newValue);
                setSelectedPlans([]);
              }}
              sx={{ px: 2 }}
            >
              <Tab label={`All Plans (${stats.total})`} />
              <Tab label={`In Progress (${stats.inProgress})`} />
              <Tab label={`Completed (${stats.completed})`} />
              <Tab label={`High Priority (${stats.highPriority})`} />
              <Tab label={`Delayed (${stats.delayed})`} />
            </Tabs>
          </Box>

          {/* Toolbar dengan Bulk Actions & Filters */}
          <Toolbar sx={{ pl: 2, pr: 1, bgcolor: 'grey.50' }}>
            {/* Bulk Actions */}
            {selectedPlans.length > 0 ? (
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  {selectedPlans.length} selected
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => handleBulkStatusUpdate('in_progress')}
                  startIcon={<PlayArrow />}
                >
                  Start
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleBulkStatusUpdate('completed')}
                  startIcon={<CheckCircle />}
                >
                  Complete
                </Button>
                <Button 
                  size="small" 
                  color="error"
                  onClick={handleBulkDelete}
                  startIcon={<Delete />}
                >
                  Delete
                </Button>
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1 }} />
            )}

            {/* Additional Filters */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {treatmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  label="Priority"
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  {priorityOptions.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Toolbar>

          {/* Table */}
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" color="textSecondary" mt={1}>
                Memuat data treatment plans...
              </Typography>
            </Box>
          ) : filteredPlans.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Tidak ada treatment plans yang sesuai dengan filter yang dipilih.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell padding="checkbox" width="5%">
                      <Checkbox
                        indeterminate={selectedPlans.length > 0 && selectedPlans.length < filteredPlans.length}
                        checked={filteredPlans.length > 0 && selectedPlans.length === filteredPlans.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell width="18%">Risk</TableCell>
                    <TableCell width="22%">Treatment Description</TableCell>
                    <TableCell width="8%">Type</TableCell>
                    <TableCell width="8%">Priority</TableCell>
                    <TableCell width="10%">Responsible</TableCell>
                    <TableCell width="10%">Status</TableCell>
                    <TableCell width="10%">Progress</TableCell>
                    <TableCell width="9%">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPlans.map((plan) => {
                    const riskLevel = getRiskLevel(plan.riskId);
                    const statusInfo = statusOptions.find(s => s.value === plan.status) || statusOptions[0];
                    const priorityInfo = getPriorityInfo(plan.priority);
                    const isSelected = selectedPlans.indexOf(plan.id) !== -1;
                    
                    return (
                      <TableRow 
                        key={plan.id} 
                        hover
                        selected={isSelected}
                        sx={{ 
                          '&:last-child td, &:last-child th': { border: 0 }
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectPlan(plan.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {getRiskName(plan.riskId)}
                          </Typography>
                          <Chip 
                            label={riskLevel.level}
                            color={riskLevel.color}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {plan.treatmentDescription}
                          </Typography>
                          {plan.deadline && (
                            <Typography variant="caption" color="textSecondary" display="block">
                              <Schedule sx={{ fontSize: 12, mr: 0.5 }} />
                              {plan.deadline.toLocaleDateString('id-ID')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={treatmentTypes.find(t => t.value === plan.treatmentType)?.label || plan.treatmentType}
                            color={treatmentTypes.find(t => t.value === plan.treatmentType)?.color}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={priorityInfo.label}>
                            <Chip 
                              icon={priorityInfo.icon}
                              label={priorityInfo.label}
                              color={priorityInfo.color}
                              size="small"
                              variant="filled"
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {plan.responsiblePerson}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={statusInfo.label}
                            color={statusInfo.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={plan.progress || 0}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              color={
                                plan.progress >= 100 ? "success" :
                                plan.progress >= 50 ? "primary" : "warning"
                              }
                            />
                            <Typography variant="body2" fontWeight="bold" minWidth={35}>
                              {plan.progress || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Details">
                              <IconButton 
                                color="info" 
                                size="small"
                                onClick={() => handleViewDetails(plan)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Plan">
                              <IconButton 
                                color="primary"
                                size="small"
                                onClick={() => handleEdit(plan)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Plan">
                              <IconButton 
                                color="error" 
                                size="small"
                                onClick={() => handleDelete(plan.id)}
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

      {/* Create/Edit Dialog - Enhanced dengan Search untuk Risk */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setEditingPlan(null);
          setFormData({
            riskId: '',
            treatmentDescription: '',
            treatmentType: 'mitigation',
            responsiblePerson: '',
            deadline: '',
            budget: '',
            status: 'planned',
            progress: 0,
            effectiveness: '',
            priority: 'medium'
          });
          setSearchRisk('');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPlan ? 'Edit Treatment Plan' : 'Buat Treatment Plan Baru'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Enhanced: Risk Selection with Search */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Pilih Risk</InputLabel>
                <Select
                  value={formData.riskId}
                  label="Pilih Risk"
                  onChange={(e) => setFormData({ ...formData, riskId: e.target.value })}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <MenuItem disabled>
                    <TextField
                      fullWidth
                      placeholder="Cari risiko..."
                      value={searchRisk}
                      onChange={(e) => setSearchRisk(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  </MenuItem>

                  <MenuItem disabled>
                    <Typography variant="caption" color="textSecondary">
                      {filteredRisks.length} risiko ditemukan
                      {searchRisk && ` untuk "${searchRisk}"`}
                    </Typography>
                  </MenuItem>

                  {filteredRisks.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                        Tidak ada risiko yang sesuai dengan pencarian
                      </Typography>
                    </MenuItem>
                  ) : (
                    filteredRisks.map((risk) => {
                      const riskScore = (risk.likelihood * risk.impact) || 1;
                      const riskLevel = 
                        riskScore >= 20 ? { level: 'Extreme', color: 'error' } :
                        riskScore >= 16 ? { level: 'High', color: 'warning' } :
                        riskScore >= 10 ? { level: 'Medium', color: 'info' } :
                        { level: 'Low', color: 'success' };

                      return (
                        <MenuItem key={risk.id} value={risk.id}>
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {risk.title || risk.riskDescription}
                            </Typography>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="textSecondary">
                                {risk.riskCategory} • Score: {riskScore}
                              </Typography>
                              <Chip 
                                label={riskLevel.level}
                                color={riskLevel.color}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          </Box>
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deskripsi Treatment"
                multiline
                rows={3}
                value={formData.treatmentDescription}
                onChange={(e) => setFormData({ ...formData, treatmentDescription: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipe Treatment</InputLabel>
                <Select
                  value={formData.treatmentType}
                  label="Tipe Treatment"
                  onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value })}
                >
                  {treatmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {priorityOptions.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {priority.icon}
                        {priority.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Penanggung Jawab"
                value={formData.responsiblePerson}
                onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Deadline"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>Rp</Typography>,
                }}
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

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <Typography variant="body2" gutterBottom>
                  Progress: {formData.progress}%
                </Typography>
                <Slider
                  value={formData.progress}
                  onChange={(e, newValue) => setFormData({ ...formData, progress: newValue })}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Effectiveness (Setelah Implementasi)"
                multiline
                rows={2}
                value={formData.effectiveness}
                onChange={(e) => setFormData({ ...formData, effectiveness: e.target.value })}
                placeholder="Deskripsi efektivitas treatment setelah diimplementasikan..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingPlan(null);
              setSearchRisk('');
            }}
          >
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.riskId || !formData.treatmentDescription}
          >
            {editingPlan ? 'Update Plan' : 'Buat Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Detail Treatment Plan
          {viewPlan && (
            <Chip 
              label={statusOptions.find(s => s.value === viewPlan.status)?.label}
              color={statusOptions.find(s => s.value === viewPlan.status)?.color}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {viewPlan && (
            <Box sx={{ mt: 2 }}>
              <ProgressTracking 
                treatmentPlan={viewPlan}
                onUpdate={async (updatedData) => {
                  try {
                    await updateDoc(doc(db, 'treatment_plans', viewPlan.id), {
                      ...updatedData,
                      updatedAt: new Date(),
                      updatedBy: userData?.name
                    });
                    showSnackbar('Progress berhasil diupdate di Firebase!', 'success');
                    setViewDialog(false);
                    loadData();
                  } catch (error) {
                    console.error('Error updating progress in Firebase:', error);
                    showSnackbar('Error mengupdate progress: ' + error.message, 'error');
                  }
                }}
              />
              
              <EvidenceUpload 
                treatmentPlan={viewPlan}
                onUpdate={async (updatedData) => {
                  try {
                    await updateDoc(doc(db, 'treatment_plans', viewPlan.id), {
                      ...updatedData,
                      updatedAt: new Date(),
                      updatedBy: userData?.name
                    });
                    showSnackbar('Evidence berhasil diupdate di Firebase!', 'success');
                    loadData();
                  } catch (error) {
                    console.error('Error updating evidence in Firebase:', error);
                    showSnackbar('Error mengupdate evidence: ' + error.message, 'error');
                  }
                }}
              />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Informasi Risk</Typography>
                      <Typography variant="body1" fontWeight="bold" gutterBottom>
                        {getRiskName(viewPlan.riskId)}
                      </Typography>
                      <Chip 
                        label={getRiskLevel(viewPlan.riskId).level}
                        color={getRiskLevel(viewPlan.riskId).color}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Treatment Details</Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Deskripsi:</strong> {viewPlan.treatmentDescription}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Tipe:</strong> {treatmentTypes.find(t => t.value === viewPlan.treatmentType)?.label}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Priority:</strong> 
                        <Chip 
                          label={getPriorityInfo(viewPlan.priority).label}
                          color={getPriorityInfo(viewPlan.priority).color}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2">
                        <strong>PIC:</strong> {viewPlan.responsiblePerson}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Timeline & Budget</Typography>
                      {viewPlan.deadline && (
                        <Typography variant="body2" paragraph>
                          <strong>Deadline:</strong> {viewPlan.deadline.toLocaleDateString('id-ID')}
                        </Typography>
                      )}
                      {viewPlan.budget && (
                        <Typography variant="body2" paragraph>
                          <strong>Budget:</strong> Rp {parseInt(viewPlan.budget).toLocaleString('id-ID')}
                        </Typography>
                      )}
                      {viewPlan.effectiveness && (
                        <Typography variant="body2">
                          <strong>Effectiveness:</strong> {viewPlan.effectiveness}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
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
              handleEdit(viewPlan);
            }}
          >
            Edit Plan
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

export default RiskTreatmentPlans;