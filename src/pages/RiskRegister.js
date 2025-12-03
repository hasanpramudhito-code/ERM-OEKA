import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  InputAdornment,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  Rating,
  Slider,
  Checkbox,
  ListItemText as MuiListItemText
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Warning,
  Description,
  Business,
  Assessment,
  Schedule,
  Person,
  Category,
  AttachMoney,
  Search,
  Visibility,
  History,
  AccountCircle,
  CalendarToday,
  CorporateFare,
  Analytics,
  ExpandMore,
  ExpandLess,
  FilterList,
  RestartAlt
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';

const RiskRegister = () => {
  const [risks, setRisks] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [assessingRisk, setAssessingRisk] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [codeError, setCodeError] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  
  // State untuk filter
  const [filters, setFilters] = useState({
    status: [],
    riskSources: [],
    departments: [],
    riskOwners: [],
    inherentLevels: [],
    residualLevels: [],
    treatmentPriorities: [],
    dateCreatedRange: { start: null, end: null },
    targetDateRange: { start: null, end: null },
    showFilters: false,
  });
  
  // State untuk data unik dropdown
  const [uniqueRiskOwners, setUniqueRiskOwners] = useState([]);
  const [uniqueDepartments, setUniqueDepartments] = useState([]);
  
  const { userData } = useAuth();
  const { config: assessmentConfig, calculateScore, calculateRiskLevel } = useAssessmentConfig();

  // Form data structure
  const [formData, setFormData] = useState({
    riskCode: '',
    riskType: '',
    classification: '',
    riskSource: '',
    riskDescription: '',
    cause: '',
    impactText: '',
    riskOwner: '',
    department: '',
    initialProbability: '',
    initialImpact: '',
    inherentRiskQuantification: '',
    existingControls: '',
    controlEffectiveness: '',
    residualProbability: '',
    residualImpact: '',
    residualRiskQuantification: '',
    additionalControls: '',
    controlCost: '',
    responsiblePerson: '',
    targetCompletion: '',
    status: 'open'
  });

  // Assessment form data
  const [assessmentData, setAssessmentData] = useState({
    likelihood: 1,
    impact: 1,
    controlEffectiveness: 3,
    residualLikelihood: 1,
    residualImpact: 1,
    treatmentPriority: 'Medium - Sedang (Penanganan < 1 Bulan)',
    assessmentNotes: ''
  });

  // Data dropdown yang lebih lengkap
  const riskSources = [
    'Internal', 
    'External' 
  ];

  const riskTypes = [
    'Strategis', 
    'Operasional', 
    'Finansial', 
    'Kepatuhan', 
    'Reputasi', 
    'Teknologi',
    'HSSE (Health, Safety, Security, Environment)',
    'Proyek',
    'Supply Chain',
    'Pemasaran',
    'Lainnya (Input Manual)'
  ];

  const riskClassifications = [
    'Critical - Prioritas Tertinggi',
    'High Priority - Prioritas Tinggi', 
    'Medium Priority - Prioritas Menengah', 
    'Low Priority - Prioritas Rendah',
    'Monitoring - Pemantauan Rutin'
  ];

  const effectivenessLevels = [
    'Sangat Efektif (90-100%)',
    'Efektif (75-89%)', 
    'Cukup Efektif (50-74%)', 
    'Kurang Efektif (25-49%)', 
    'Tidak Efektif (0-24%)'
  ];

  const treatmentPriorities = [
    'Critical - Kritis (Penanganan Segera)',
    'High - Tinggi (Penanganan < 1 Minggu)',
    'Medium - Sedang (Penanganan < 1 Bulan)',
    'Low - Rendah (Penanganan < 3 Bulan)',
    'Monitor - Pantau Saja'
  ];

  const departmentsList = [
    'Direksi',
    'Keuangan & Akuntansi',
    'SDM & Umum',
    'Operasional',
    'Pemasaran & Penjualan',
    'Teknologi Informasi',
    'HSSE',
    'Legal & Kepatuhan',
    'Procurement',
    'R&D',
    'Quality Assurance',
    'Project Management',
    'Customer Service',
    'Logistik & Supply Chain',
    'Lainnya (Input Manual)'
  ];

  const statusOptions = [
    'Open - Baru Teridentifikasi',
    'In Assessment - Dalam Penilaian',
    'Assessed - Telah Dinilai',
    'In Treatment - Dalam Penanganan',
    'Monitored - Dalam Pemantauan',
    'Closed - Ditutup',
    'Rejected - Ditolak'
  ];

  const ratingOptions = [1, 2, 3, 4, 5];

  // Calculate risk level
  const getRiskLevelInfo = (risk) => {
    let score;
    
    if (assessmentConfig.assessmentMethod === 'coordinate') {
      score = calculateScore(risk.likelihood || 1, risk.impact || 1);
    } else {
      score = (risk.likelihood || 1) * (risk.impact || 1);
    }
    
    return calculateRiskLevel(score);
  };

  // Render risk level in table
  const renderRiskLevel = (risk) => {
    const riskLevelInfo = getRiskLevelInfo(risk);
    return (
      <Chip 
        label={`${riskLevelInfo.level} (${riskLevelInfo.score})`}
        size="small" 
        color={riskLevelInfo.color}
      />
    );
  };

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      
      const risksQuery = query(collection(db, 'risks'), orderBy('createdAt', 'desc'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksList = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRisks(risksList);

      const unitsSnapshot = await getDocs(collection(db, 'organization_units'));
      const unitsList = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrganizationUnits(unitsList);

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

  // Extract unique data for filters
  useEffect(() => {
    if (risks.length > 0) {
      // Extract unique risk owners
      const owners = [...new Set(risks.map(risk => risk.riskOwner).filter(Boolean))];
      setUniqueRiskOwners(owners);
      
      // Extract unique departments
      const depts = [...new Set(risks.map(risk => risk.department).filter(Boolean))];
      setUniqueDepartments(depts);
    }
  }, [risks]);

  // Validasi kode unik real-time
  useEffect(() => {
    if (formData.riskCode && !editingRisk) {
      const isCodeExists = risks.some(risk => 
        risk.riskCode?.toLowerCase() === formData.riskCode.toLowerCase() &&
        risk.id !== editingRisk?.id
      );
      if (isCodeExists) {
        setCodeError('Kode Risiko sudah digunakan! Silakan gunakan kode yang berbeda.');
      } else {
        setCodeError('');
      }
    } else {
      setCodeError('');
    }
  }, [formData.riskCode, risks, editingRisk]);

  // Helper function untuk mendapatkan risk level options
  const getRiskLevelOptions = () => {
    return [
      { value: 'low', label: 'Low', color: 'success' },
      { value: 'medium', label: 'Medium', color: 'warning' },
      { value: 'high', label: 'High', color: 'error' },
      { value: 'critical', label: 'Critical', color: 'error' },
      { value: 'extreme', label: 'Extreme', color: 'error' }
    ];
  };

  // Fungsi untuk filter risiko
  const getFilteredRisks = () => {
    return risks.filter(risk => {
      // Filter Status
      if (filters.status.length > 0 && !filters.status.includes(risk.status)) {
        return false;
      }
      
      // Filter Risk Source
      if (filters.riskSources.length > 0 && !filters.riskSources.includes(risk.riskSource)) {
        return false;
      }
      
      // Filter Department
      if (filters.departments.length > 0 && !filters.departments.includes(risk.department)) {
        return false;
      }
      
      // Filter Risk Owner
      if (filters.riskOwners.length > 0 && !filters.riskOwners.includes(risk.riskOwner)) {
        return false;
      }
      
      // Filter Treatment Priority
      if (filters.treatmentPriorities.length > 0 && !filters.treatmentPriorities.includes(risk.treatmentPriority)) {
        return false;
      }
      
      // Filter Inherent Risk Level
      if (filters.inherentLevels.length > 0) {
        const inherentLevel = risk.initialRiskLevel?.level?.toLowerCase() || '';
        if (!filters.inherentLevels.some(level => 
          inherentLevel.includes(level.toLowerCase())
        )) {
          return false;
        }
      }
      
      // Filter Residual Risk Level
      if (filters.residualLevels.length > 0) {
        const residualLevel = risk.residualRiskLevel?.level?.toLowerCase() || '';
        if (!filters.residualLevels.some(level => 
          residualLevel.includes(level.toLowerCase())
        )) {
          return false;
        }
      }
      
      // Filter Date Created Range
      if (filters.dateCreatedRange.start || filters.dateCreatedRange.end) {
        const riskDate = risk.createdAt?.toDate ? risk.createdAt.toDate() : new Date(risk.createdAt);
        
        if (filters.dateCreatedRange.start && riskDate < filters.dateCreatedRange.start) {
          return false;
        }
        if (filters.dateCreatedRange.end && riskDate > filters.dateCreatedRange.end) {
          return false;
        }
      }
      
      // Filter Target Date Range
      if (filters.targetDateRange.start || filters.targetDateRange.end) {
        if (!risk.targetCompletion) return false;
        
        const targetDate = new Date(risk.targetCompletion);
        
        if (filters.targetDateRange.start && targetDate < filters.targetDateRange.start) {
          return false;
        }
        if (filters.targetDateRange.end && targetDate > filters.targetDateRange.end) {
          return false;
        }
      }
      
      // Filter Search Term (existing)
      if (searchTerm && !(
        risk.riskCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.riskDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.riskType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.riskSource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.riskOwner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.status?.toLowerCase().includes(searchTerm.toLowerCase())
      )) {
        return false;
      }
      
      return true;
    });
  };

  // Get changed fields for audit trail
  const getChangedFields = (oldData, newData) => {
    const changes = [];
    Object.keys(newData).forEach(key => {
      // Skip metadata fields dan calculated fields
      const skipFields = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'auditTrail', 'initialRiskLevel', 'residualRiskLevel'];
      if (skipFields.includes(key)) return;

      const oldValue = oldData[key];
      const newValue = newData[key];
      
      // Handle perbandingan yang aman untuk berbagai tipe data
      const oldVal = oldValue === null || oldValue === undefined ? '' : oldValue;
      const newVal = newValue === null || newValue === undefined ? '' : newValue;
      
      if (oldVal.toString() !== newVal.toString()) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal
        });
      }
    });
    return changes;
  };

  // Clean data for Firestore
  const cleanDataForFirestore = (data) => {
    const cleaned = {};
    Object.keys(data).forEach(key => {
      // Simpan semua nilai termasuk empty string, tapi hapus undefined dan null
      if (data[key] !== undefined && data[key] !== null) {
        cleaned[key] = data[key];
      }
    });
    return cleaned;
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      // Validasi required fields
      if (!formData.riskCode || !formData.riskDescription || !formData.riskSource) {
        showSnackbar('Kode Risiko, Deskripsi risiko dan sumber risiko harus diisi!', 'error');
        return;
      }

      // Validasi kode unik untuk risiko baru
      if (!editingRisk) {
        const isCodeExists = risks.some(risk => 
          risk.riskCode?.toLowerCase() === formData.riskCode.toLowerCase()
        );
        if (isCodeExists) {
          showSnackbar('Kode Risiko sudah digunakan! Silakan gunakan kode yang berbeda.', 'error');
          return;
        }
      }

      // Handle custom inputs sebelum save
      const finalDepartment = formData.department === 'Lainnya (Input Manual)' 
        ? formData.customDepartment || ''
        : formData.department || '';

      const finalRiskType = formData.riskType === 'Lainnya (Input Manual)'
        ? formData.customRiskType || ''
        : formData.riskType || '';

      // Data utama yang akan disimpan
      const riskDataToSave = {
        // Copy semua form data
        riskCode: formData.riskCode.toUpperCase(),
        riskType: finalRiskType,
        classification: formData.classification || '',
        riskSource: formData.riskSource || '',
        riskDescription: formData.riskDescription || '',
        cause: formData.cause || '',
        impactText: formData.impactText || '',
        riskOwner: formData.riskOwner || '',
        department: finalDepartment,
        initialProbability: formData.initialProbability || '',
        initialImpact: formData.initialImpact || '',
        inherentRiskQuantification: formData.inherentRiskQuantification || '',
        existingControls: formData.existingControls || '',
        controlEffectiveness: formData.controlEffectiveness || '',
        residualProbability: formData.residualProbability || '',
        residualImpact: formData.residualImpact || '',
        residualRiskQuantification: formData.residualRiskQuantification || '',
        additionalControls: formData.additionalControls || '',
        controlCost: formData.controlCost || '',
        responsiblePerson: formData.responsiblePerson || '',
        targetCompletion: formData.targetCompletion || '',
        status: formData.status || 'open',
        
        // Metadata
        createdAt: editingRisk ? editingRisk.createdAt : new Date(),
        createdBy: editingRisk ? editingRisk.createdBy : userData?.name || 'System',
        updatedAt: new Date(),
        updatedBy: userData?.name || 'System'
      };

      // Hitung score jika ada probability dan impact
      if (formData.initialProbability && formData.initialImpact) {
        const likelihood = parseInt(formData.initialProbability) || 1;
        const impact = parseInt(formData.initialImpact) || 1;
        const inherentScore = calculateScore(likelihood, impact);
        
        riskDataToSave.likelihood = likelihood;
        riskDataToSave.impact = impact;
        riskDataToSave.inherentScore = inherentScore;
        riskDataToSave.initialRiskLevel = calculateRiskLevel(inherentScore);
      }

      if (formData.residualProbability && formData.residualImpact) {
        const residualLikelihood = parseInt(formData.residualProbability) || 1;
        const residualImpact = parseInt(formData.residualImpact) || 1;
        const residualScore = calculateScore(residualLikelihood, residualImpact);
        
        riskDataToSave.residualLikelihood = residualLikelihood;
        riskDataToSave.residualImpact = residualImpact;
        riskDataToSave.residualScore = residualScore;
        riskDataToSave.residualRiskLevel = calculateRiskLevel(residualScore);
      }

      // Bersihkan data sebelum simpan ke Firestore
      const cleanedRiskData = cleanDataForFirestore(riskDataToSave);

      // Handle audit trail
      if (editingRisk) {
        const existingAuditTrail = editingRisk.auditTrail || [];
        cleanedRiskData.auditTrail = [
          ...existingAuditTrail,
          {
            action: 'updated',
            timestamp: new Date(),
            user: userData?.name || 'System',
            changes: getChangedFields(editingRisk, riskDataToSave)
          }
        ];
        
        await updateDoc(doc(db, "risks", editingRisk.id), cleanedRiskData);
        showSnackbar('Risiko berhasil diupdate!', 'success');
      } else {
        cleanedRiskData.auditTrail = [
          {
            action: 'created',
            timestamp: new Date(),
            user: userData?.name || 'System',
            changes: []
          }
        ];
        
        await addDoc(collection(db, "risks"), cleanedRiskData);
        showSnackbar('Risiko berhasil ditambahkan!', 'success');
      }

      setOpenDialog(false);
      setEditingRisk(null);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('Error saving risk:', error);
      showSnackbar('Error menyimpan risiko: ' + error.message, 'error');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      riskCode: '',
      riskType: '',
      classification: '',
      riskSource: '',
      riskDescription: '',
      cause: '',
      impactText: '',
      riskOwner: '',
      department: '',
      initialProbability: '',
      initialImpact: '',
      inherentRiskQuantification: '',
      existingControls: '',
      controlEffectiveness: '',
      residualProbability: '',
      residualImpact: '',
      residualRiskQuantification: '',
      additionalControls: '',
      controlCost: '',
      responsiblePerson: '',
      targetCompletion: '',
      status: 'open'
    });
    setCodeError('');
  };

  // Reset filter
  const resetFilters = () => {
    setFilters({
      status: [],
      riskSources: [],
      departments: [],
      riskOwners: [],
      inherentLevels: [],
      residualLevels: [],
      treatmentPriorities: [],
      dateCreatedRange: { start: null, end: null },
      targetDateRange: { start: null, end: null },
      showFilters: filters.showFilters,
    });
  };

  // Handle edit
  const handleEdit = (risk) => {
    setEditingRisk(risk);
    setFormData({
      riskCode: risk.riskCode || '',
      riskType: risk.riskType || '',
      classification: risk.classification || '',
      riskSource: risk.riskSource || '',
      riskDescription: risk.riskDescription || '',
      cause: risk.cause || '',
      impactText: risk.impactText || '',
      riskOwner: risk.riskOwner || '',
      department: risk.department || '',
      initialProbability: risk.initialProbability || '',
      initialImpact: risk.initialImpact || '',
      inherentRiskQuantification: risk.inherentRiskQuantification || '',
      existingControls: risk.existingControls || '',
      controlEffectiveness: risk.controlEffectiveness || '',
      residualProbability: risk.residualProbability || '',
      residualImpact: risk.residualImpact || '',
      residualRiskQuantification: risk.residualRiskQuantification || '',
      additionalControls: risk.additionalControls || '',
      controlCost: risk.controlCost || '',
      responsiblePerson: risk.responsiblePerson || '',
      targetCompletion: risk.targetCompletion || '',
      status: risk.status || 'open'
    });
    setOpenDialog(true);
  };

  // Handle assessment
  const handleAssessment = (risk) => {
    setAssessingRisk(risk);
    setAssessmentData({
      likelihood: risk.initialProbability || 1,
      impact: risk.initialImpact || 1,
      controlEffectiveness: risk.controlEffectiveness || 3,
      residualLikelihood: risk.residualProbability || risk.initialProbability || 1,
      residualImpact: risk.residualImpact || risk.initialImpact || 1,
      treatmentPriority: risk.treatmentPriority || 'Medium - Sedang (Penanganan < 1 Bulan)',
      assessmentNotes: risk.assessmentNotes || ''
    });
    setAssessmentDialog(true);
  };

  // Handle view detail
  const handleViewDetail = (risk) => {
    setSelectedRisk(risk);
    setDetailDialog(true);
  };

  // Handle assessment submit
  const handleAssessmentSubmit = async () => {
    if (!assessingRisk) return;

    try {
      setLoading(true);
      
      const residualScore = assessmentData.residualLikelihood * assessmentData.residualImpact;
      const inherentScore = assessmentData.likelihood * assessmentData.impact;
      
      // Data assessment
      const assessmentUpdate = {
        likelihood: assessmentData.likelihood || 1,
        impact: assessmentData.impact || 1,
        controlEffectiveness: assessmentData.controlEffectiveness || 3,
        residualLikelihood: assessmentData.residualLikelihood || 1,
        residualImpact: assessmentData.residualImpact || 1,
        residualScore: residualScore || 0,
        inherentScore: inherentScore || 0,
        treatmentPriority: assessmentData.treatmentPriority || 'Medium - Sedang (Penanganan < 1 Bulan)',
        assessmentNotes: assessmentData.assessmentNotes || '',
        assessedAt: new Date(),
        assessedBy: userData?.name || 'System',
        status: 'Assessed - Telah Dinilai',
        updatedAt: new Date(),
        updatedBy: userData?.name || 'System'
      };

      // Clean undefined values
      const cleanAssessmentData = {};
      Object.keys(assessmentUpdate).forEach(key => {
        if (assessmentUpdate[key] !== undefined && assessmentUpdate[key] !== null) {
          cleanAssessmentData[key] = assessmentUpdate[key];
        }
      });

      await updateDoc(doc(db, "risks", assessingRisk.id), cleanAssessmentData);
      
      showSnackbar('Assessment risiko berhasil disimpan!', 'success');
      setAssessmentDialog(false);
      setAssessingRisk(null);
      setAssessmentData({
        likelihood: 1,
        impact: 1,
        controlEffectiveness: 3,
        residualLikelihood: 1,
        residualImpact: 1,
        treatmentPriority: 'Medium - Sedang (Penanganan < 1 Bulan)',
        assessmentNotes: ''
      });
      loadData();
      
    } catch (error) {
      console.error('Error saving assessment:', error);
      showSnackbar('Error menyimpan assessment: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (riskId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus risiko ini?')) {
      try {
        await deleteDoc(doc(db, 'risks', riskId));
        showSnackbar('Risiko berhasil dihapus!', 'success');
        loadData();
      } catch (error) {
        console.error('Error deleting risk:', error);
        showSnackbar('Error menghapus risiko: ' + error.message, 'error');
      }
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (riskId) => {
    setExpandedRows(prev => ({
      ...prev,
      [riskId]: !prev[riskId]
    }));
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Table pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter risks based on search term and filters
  const filteredRisks = getFilteredRisks();

  // Paginated risks
  const paginatedRisks = filteredRisks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Count active filters
  const countActiveFilters = () => {
    let count = 0;
    
    // Count array filters
    count += filters.status.length;
    count += filters.riskSources.length;
    count += filters.departments.length;
    count += filters.riskOwners.length;
    count += filters.inherentLevels.length;
    count += filters.residualLevels.length;
    count += filters.treatmentPriorities.length;
    
    // Count date filters
    if (filters.dateCreatedRange.start) count++;
    if (filters.dateCreatedRange.end) count++;
    if (filters.targetDateRange.start) count++;
    if (filters.targetDateRange.end) count++;
    
    return count;
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
                <Warning sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Risk Register
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Identifikasi dan kelola seluruh risiko organisasi
                </Typography>
                <Typography variant="caption" color="primary">
                  Total {risks.length} risiko teridentifikasi • {risks.filter(r => r.status === 'Assessed - Telah Dinilai').length} telah dinilai
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
              Tambah Risiko
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Search and Filter Box */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Cari risiko berdasarkan kode, deskripsi, jenis, sumber, departemen, atau pemilik risiko..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setFilters({...filters, showFilters: !filters.showFilters})}
                >
                  {filters.showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                  {countActiveFilters() > 0 && (
                    <Chip 
                      size="small" 
                      label={countActiveFilters()}
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Button>
                <Tooltip title="Reset Filter">
                  <IconButton 
                    onClick={resetFilters}
                    color="primary"
                  >
                    <RestartAlt />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filter Panel */}
      {filters.showFilters && (
        <Card sx={{ mb: 3, boxShadow: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                🔍 Filter Risiko
              </Typography>
              <Box display="flex" gap={1}>
                <Button 
                  size="small" 
                  onClick={resetFilters}
                  variant="outlined"
                  startIcon={<Delete />}
                >
                  Reset Filter
                </Button>
                <Button 
                  size="small" 
                  onClick={() => setFilters({...filters, showFilters: false})}
                >
                  Tutup
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {/* Filter Status */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    multiple
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    label="Status"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        <Checkbox checked={filters.status.indexOf(status) > -1} />
                        <MuiListItemText primary={status} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Risk Source */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sumber Risiko</InputLabel>
                  <Select
                    multiple
                    value={filters.riskSources}
                    onChange={(e) => setFilters({...filters, riskSources: e.target.value})}
                    label="Sumber Risiko"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {riskSources.map((source) => (
                      <MenuItem key={source} value={source}>
                        <Checkbox checked={filters.riskSources.indexOf(source) > -1} />
                        <MuiListItemText primary={source} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Department */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Departemen</InputLabel>
                  <Select
                    multiple
                    value={filters.departments}
                    onChange={(e) => setFilters({...filters, departments: e.target.value})}
                    label="Departemen"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {uniqueDepartments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        <Checkbox checked={filters.departments.indexOf(dept) > -1} />
                        <MuiListItemText primary={dept} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Risk Owner */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Pemilik Risiko</InputLabel>
                  <Select
                    multiple
                    value={filters.riskOwners}
                    onChange={(e) => setFilters({...filters, riskOwners: e.target.value})}
                    label="Pemilik Risiko"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {uniqueRiskOwners.map((owner) => (
                      <MenuItem key={owner} value={owner}>
                        <Checkbox checked={filters.riskOwners.indexOf(owner) > -1} />
                        <MuiListItemText primary={owner} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Treatment Priority */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Treatment Priority</InputLabel>
                  <Select
                    multiple
                    value={filters.treatmentPriorities}
                    onChange={(e) => setFilters({...filters, treatmentPriorities: e.target.value})}
                    label="Treatment Priority"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {treatmentPriorities.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        <Checkbox checked={filters.treatmentPriorities.indexOf(priority) > -1} />
                        <MuiListItemText primary={priority} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Inherent Risk Level */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Inherent Risk Level</InputLabel>
                  <Select
                    multiple
                    value={filters.inherentLevels}
                    onChange={(e) => setFilters({...filters, inherentLevels: e.target.value})}
                    label="Inherent Risk Level"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const levelOption = getRiskLevelOptions().find(opt => opt.value === value);
                          return (
                            <Chip 
                              key={value} 
                              label={value.charAt(0).toUpperCase() + value.slice(1)}
                              size="small" 
                              color={levelOption?.color}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {getRiskLevelOptions().map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        <Checkbox checked={filters.inherentLevels.indexOf(level.value) > -1} />
                        <MuiListItemText primary={level.label} />
                        <Box sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: `${level.color}.main`,
                          ml: 1 
                        }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Residual Risk Level */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Residual Risk Level</InputLabel>
                  <Select
                    multiple
                    value={filters.residualLevels}
                    onChange={(e) => setFilters({...filters, residualLevels: e.target.value})}
                    label="Residual Risk Level"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const levelOption = getRiskLevelOptions().find(opt => opt.value === value);
                          return (
                            <Chip 
                              key={value} 
                              label={value.charAt(0).toUpperCase() + value.slice(1)}
                              size="small" 
                              color={levelOption?.color}
                              variant="outlined"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {getRiskLevelOptions().map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        <Checkbox checked={filters.residualLevels.indexOf(level.value) > -1} />
                        <MuiListItemText primary={level.label} />
                        <Box sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: `${level.color}.main`,
                          ml: 1 
                        }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Date Created Range */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>Tanggal Dibuat</Typography>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Dari"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateCreatedRange.start ? filters.dateCreatedRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      dateCreatedRange: {
                        ...filters.dateCreatedRange,
                        start: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Sampai"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateCreatedRange.end ? filters.dateCreatedRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      dateCreatedRange: {
                        ...filters.dateCreatedRange,
                        end: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                </Box>
              </Grid>

              {/* Filter Target Date Range */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>Target Selesai</Typography>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Dari"
                    InputLabelProps={{ shrink: true }}
                    value={filters.targetDateRange.start ? filters.targetDateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      targetDateRange: {
                        ...filters.targetDateRange,
                        start: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Sampai"
                    InputLabelProps={{ shrink: true }}
                    value={filters.targetDateRange.end ? filters.targetDateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters({
                      ...filters, 
                      targetDateRange: {
                        ...filters.targetDateRange,
                        end: e.target.value ? new Date(e.target.value) : null
                      }
                    })}
                  />
                </Box>
              </Grid>

              {/* Summary Filter Aktif */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 1, backgroundColor: 'grey.50' }}>
                  <Typography variant="body2" color="textSecondary">
                    Filter aktif: {countActiveFilters()} • Menampilkan {filteredRisks.length} dari {risks.length} risiko
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Risks Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Daftar Risiko ({filteredRisks.length})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Klik ⬇️ untuk detail lengkap
            </Typography>
          </Box>
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" color="textSecondary" mt={1}>
                Memuat data risiko...
              </Typography>
            </Box>
          ) : risks.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Belum ada risiko yang teridentifikasi.
            </Alert>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width="50px"></TableCell>
                      <TableCell width="120px"><strong>Kode</strong></TableCell>
                      <TableCell width="200px"><strong>Deskripsi</strong></TableCell>
                      <TableCell width="120px"><strong>Jenis</strong></TableCell>
                      <TableCell width="150px"><strong>Sumber</strong></TableCell>
                      <TableCell width="120px"><strong>Departemen</strong></TableCell>
                      <TableCell width="120px"><strong>Pemilik</strong></TableCell>
                      <TableCell width="100px"><strong>Status</strong></TableCell>
                      <TableCell width="100px"><strong>Inherent</strong></TableCell>
                      <TableCell width="100px"><strong>Residual</strong></TableCell>
                      <TableCell width="120px"><strong>Treatment Priority</strong></TableCell>
                      <TableCell width="100px"><strong>PIC</strong></TableCell>
                      <TableCell width="100px"><strong>Target</strong></TableCell>
                      <TableCell width="150px"><strong>Aksi</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRisks.map((risk) => {
                      const initialLevel = risk.initialRiskLevel || {};
                      const residualLevel = risk.residualRiskLevel || {};
                      const isExpanded = expandedRows[risk.id];
                      
                      return (
                        <React.Fragment key={risk.id}>
                          {/* Main Row */}
                          <TableRow hover sx={{ backgroundColor: isExpanded ? 'action.hover' : 'inherit' }}>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                onClick={() => toggleRowExpansion(risk.id)}
                              >
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                {risk.riskCode}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={risk.riskDescription}>
                                <Typography variant="body2" sx={{ 
                                  maxWidth: 200,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {risk.riskDescription}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={risk.riskType} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={risk.riskSource} 
                                size="small" 
                                variant="outlined"
                                color="secondary"
                              />
                            </TableCell>
                            <TableCell>
                              {risk.department ? (
                                <Chip 
                                  label={risk.department}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {risk.riskOwner ? (
                                <Chip 
                                  label={risk.riskOwner}
                                  size="small"
                                  variant="outlined"
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={risk.status || 'Open'}
                                size="small"
                                color={
                                  risk.status?.includes('Critical') || risk.status?.includes('Extreme') ? 'error' :
                                  risk.status?.includes('High') ? 'warning' :
                                  risk.status?.includes('Assessed') ? 'info' :
                                  risk.status?.includes('Closed') ? 'success' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {initialLevel.level ? (
                                <Chip 
                                  label={`${initialLevel.level} (${initialLevel.score})`}
                                  size="small" 
                                  color={initialLevel.color}
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  Belum
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {residualLevel.level ? (
                                <Chip 
                                  label={`${residualLevel.level} (${residualLevel.score})`}
                                  size="small" 
                                  color={residualLevel.color}
                                  variant="outlined"
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  Belum
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {risk.treatmentPriority ? (
                                <Chip 
                                  label={risk.treatmentPriority}
                                  size="small"
                                  color={
                                    risk.treatmentPriority?.includes('Critical') ? 'error' :
                                    risk.treatmentPriority?.includes('High') ? 'warning' :
                                    risk.treatmentPriority?.includes('Medium') ? 'info' : 'default'
                                  }
                                />
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {risk.responsiblePerson ? (
                                <Typography variant="body2" fontSize="0.75rem">
                                  {risk.responsiblePerson}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {risk.targetCompletion ? (
                                <Typography variant="body2" fontSize="0.75rem">
                                  {new Date(risk.targetCompletion).toLocaleDateString('id-ID')}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5}>
                                <Tooltip title="Lihat Detail">
                                  <IconButton 
                                    color="info"
                                    size="small"
                                    onClick={() => handleViewDetail(risk)}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Assessment">
                                  <IconButton 
                                    color="warning"
                                    size="small"
                                    onClick={() => handleAssessment(risk)}
                                  >
                                    <Assessment fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton 
                                    color="primary"
                                    size="small"
                                    onClick={() => handleEdit(risk)}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Hapus">
                                  <IconButton 
                                    color="error" 
                                    size="small"
                                    onClick={() => handleDelete(risk.id)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Row dengan Detail Lengkap */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={14} sx={{ 
                                backgroundColor: 'grey.50',
                                borderBottom: '1px solid',
                                borderBottomColor: 'divider'
                              }}>
                                <Grid container spacing={2} sx={{ p: 2 }}>
                                  {/* Kolom 1 - Identifikasi */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                      📋 Identifikasi Risiko
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Penyebab:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.cause || '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Dampak:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.impactText || '-'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" fontWeight="bold">Klasifikasi:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.classification || '-'}
                                      </Typography>
                                    </Box>
                                  </Grid>

                                  {/* Kolom 2 - Kontrol */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                      🛡️ Kontrol & Assessment
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Kontrol Existing:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.existingControls ? risk.existingControls.substring(0, 100) + '...' : '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Efektivitas:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.controlEffectiveness || '-'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" fontWeight="bold">Kontrol Tambahan:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.additionalControls ? risk.additionalControls.substring(0, 100) + '...' : '-'}
                                      </Typography>
                                    </Box>
                                  </Grid>

                                  {/* Kolom 3 - Kuantifikasi & Timeline */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                      📊 Kuantifikasi & Timeline
                                    </Typography>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Inherent:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.inherentRiskQuantification || '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" fontWeight="bold">Residual:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.residualRiskQuantification || '-'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" fontWeight="bold">Biaya Kontrol:</Typography>
                                      <Typography variant="body2" sx={{ ml: 1 }}>
                                        {risk.controlCost ? `Rp ${parseInt(risk.controlCost).toLocaleString('id-ID')}` : '-'}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50, 100]}
                component="div"
                count={filteredRisks.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Baris per halaman:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} dari ${count} risiko`
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setEditingRisk(null);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { minHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning />
            {editingRisk ? 'Edit Risiko' : 'Tambah Risiko Baru'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            {/* Section 1: Identifikasi Risiko */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description /> 1. Identifikasi Risiko
              </Typography>
              <Grid container spacing={2}>
                {/* Kode Risiko */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kode Risiko *"
                    value={formData.riskCode}
                    onChange={(e) => setFormData({ ...formData, riskCode: e.target.value })}
                    placeholder="Contoh: RISK-001, OP-2024-01, FIN-001"
                    required
                    error={!!codeError}
                    helperText={codeError || "Masukkan kode unik untuk risiko ini"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Description />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Jenis Risiko dengan custom input */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Jenis Risiko</InputLabel>
                    <Select
                      value={formData.riskType}
                      label="Jenis Risiko"
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ 
                          ...formData, 
                          riskType: value,
                          customRiskType: value === 'Lainnya (Input Manual)' ? '' : formData.customRiskType
                        });
                      }}
                    >
                      {riskTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Custom Risk Type Input - Tampilkan hanya jika pilih Lainnya */}
                {formData.riskType === 'Lainnya (Input Manual)' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Jenis Risiko Lainnya"
                      value={formData.customRiskType}
                      onChange={(e) => setFormData({ ...formData, customRiskType: e.target.value })}
                      placeholder="Masukkan jenis risiko..."
                    />
                  </Grid>
                )}

                {/* Klasifikasi */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Klasifikasi</InputLabel>
                    <Select
                      value={formData.classification}
                      label="Klasifikasi"
                      onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                    >
                      {riskClassifications.map((classification) => (
                        <MenuItem key={classification} value={classification}>
                          {classification}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Sumber Risiko */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Sumber Risiko *</InputLabel>
                    <Select
                      value={formData.riskSource}
                      label="Sumber Risiko"
                      onChange={(e) => setFormData({ ...formData, riskSource: e.target.value })}
                      required
                    >
                      {riskSources.map((source) => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Departemen */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Departemen</InputLabel>
                    <Select
                      value={formData.department}
                      label="Departemen"
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ 
                          ...formData, 
                          department: value,
                          customDepartment: value === 'Lainnya (Input Manual)' ? '' : formData.customDepartment
                        });
                      }}
                    >
                      {departmentsList.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Custom Department Input - Tampilkan hanya jika pilih Lainnya */}
                {formData.department === 'Lainnya (Input Manual)' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nama Departemen Lainnya"
                      value={formData.customDepartment}
                      onChange={(e) => setFormData({ ...formData, customDepartment: e.target.value })}
                      placeholder="Masukkan nama departemen..."
                    />
                  </Grid>
                )}

                {/* Status */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {statusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Deskripsi Risiko */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Deskripsi Risiko *"
                    required
                    multiline
                    rows={3}
                    value={formData.riskDescription}
                    onChange={(e) => setFormData({ ...formData, riskDescription: e.target.value })}
                    placeholder="Jelaskan risiko secara detail..."
                  />
                </Grid>

                {/* Penyebab */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Penyebab"
                    multiline
                    rows={2}
                    value={formData.cause}
                    onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                    placeholder="Apa penyebab risiko ini?"
                  />
                </Grid>

                {/* Dampak */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Dampak (Teks)"
                    multiline
                    rows={2}
                    value={formData.impactText}
                    onChange={(e) => setFormData({ ...formData, impactText: e.target.value })}
                    placeholder="Jelaskan dampak yang mungkin terjadi..."
                  />
                </Grid>

                {/* Pemilik Risiko */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Pemilik Risiko"
                    value={formData.riskOwner}
                    onChange={(e) => setFormData({ ...formData, riskOwner: e.target.value })}
                    placeholder="Nama pemilik risiko"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Penanggung Jawab */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Penanggung Jawab"
                    value={formData.responsiblePerson}
                    onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                    placeholder="Nama penanggung jawab"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Section 2: Penilaian Risiko Inheren */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment /> 2. Penilaian Risiko Inheren (Awal)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Probabilitas Awal (1-5)</InputLabel>
                    <Select
                      value={formData.initialProbability}
                      label="Probabilitas Awal (1-5)"
                      onChange={(e) => setFormData({ ...formData, initialProbability: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Dampak Awal (1-5)</InputLabel>
                    <Select
                      value={formData.initialImpact}
                      label="Dampak Awal (1-5)"
                      onChange={(e) => setFormData({ ...formData, initialImpact: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Risiko Inherent"
                    multiline
                    rows={2}
                    value={formData.inherentRiskQuantification}
                    onChange={(e) => setFormData({ ...formData, inherentRiskQuantification: e.target.value })}
                    placeholder="Kuantifikasi risiko inherent (dalam nilai moneter atau lainnya)..."
                  />
                </Grid>
                {formData.initialProbability && formData.initialImpact && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Risk Score: {formData.initialProbability * formData.initialImpact} - 
                      Level: {calculateRiskLevel(parseInt(formData.initialProbability) * parseInt(formData.initialImpact)).level}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Section 3: Kontrol dan Penilaian Residual */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business /> 3. Kontrol dan Penilaian Residual
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kontrol Internal yang Ada"
                    multiline
                    rows={3}
                    value={formData.existingControls}
                    onChange={(e) => setFormData({ ...formData, existingControls: e.target.value })}
                    placeholder="Deskripsi kontrol yang sudah ada..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Efektivitas Kontrol</InputLabel>
                    <Select
                      value={formData.controlEffectiveness}
                      label="Efektivitas Kontrol"
                      onChange={(e) => setFormData({ ...formData, controlEffectiveness: e.target.value })}
                    >
                      {effectivenessLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Section 4: Penilaian Risiko Residual */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment /> 4. Penilaian Risiko Residual (Akhir)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Probabilitas Residual (1-5)</InputLabel>
                    <Select
                      value={formData.residualProbability}
                      label="Probabilitas Residual (1-5)"
                      onChange={(e) => setFormData({ ...formData, residualProbability: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Dampak Residual (1-5)</InputLabel>
                    <Select
                      value={formData.residualImpact}
                      label="Dampak Residual (1-5)"
                      onChange={(e) => setFormData({ ...formData, residualImpact: e.target.value })}
                    >
                      {ratingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Risiko Residual"
                    multiline
                    rows={2}
                    value={formData.residualRiskQuantification}
                    onChange={(e) => setFormData({ ...formData, residualRiskQuantification: e.target.value })}
                    placeholder="Kuantifikasi risiko residual (dalam nilai moneter atau lainnya)..."
                  />
                </Grid>
                {formData.residualProbability && formData.residualImpact && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Risk Score: {formData.residualProbability * formData.residualImpact} - 
                      Level: {calculateRiskLevel(parseInt(formData.residualProbability) * parseInt(formData.residualImpact)).level}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Section 5: Rencana Aksi */}
            <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> 5. Rencana Aksi
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Pengendalian Tambahan yang Diperlukan"
                    multiline
                    rows={3}
                    value={formData.additionalControls}
                    onChange={(e) => setFormData({ ...formData, additionalControls: e.target.value })}
                    placeholder="Rencana pengendalian tambahan untuk mengurangi risiko..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kuantifikasi Biaya Pengendalian Tambahan"
                    type="number"
                    value={formData.controlCost}
                    onChange={(e) => setFormData({ ...formData, controlCost: e.target.value })}
                    placeholder="Dalam Rupiah"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Target Selesai"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.targetCompletion}
                    onChange={(e) => setFormData({ ...formData, targetCompletion: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Schedule />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingRisk(null);
              resetForm();
            }}
          >
            Batal
          </Button>
          <Button 
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.riskCode || !formData.riskDescription || !formData.riskSource || !!codeError}
          >
            {editingRisk ? 'Update Risiko' : 'Simpan Risiko'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assessment Dialog */}
      <Dialog 
        open={assessmentDialog} 
        onClose={() => {
          setAssessmentDialog(false);
          setAssessingRisk(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Assessment />
            Risk Assessment - {assessingRisk?.riskCode}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {assessingRisk && (
            <Box sx={{ mt: 2 }}>
              <Stepper activeStep={0} sx={{ mb: 4 }}>
                <Step><StepLabel>Inherent Risk</StepLabel></Step>
                <Step><StepLabel>Control Assessment</StepLabel></Step>
                <Step><StepLabel>Residual Risk</StepLabel></Step>
              </Stepper>

              <Grid container spacing={3}>
                {/* Inherent Risk Assessment */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Inherent Risk Assessment
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>Likelihood</Typography>
                    <Select
                      value={assessmentData.likelihood}
                      onChange={(e) => setAssessmentData({...assessmentData, likelihood: e.target.value})}
                    >
                      <MenuItem value={1}>1 - Sangat Rendah</MenuItem>
                      <MenuItem value={2}>2 - Rendah</MenuItem>
                      <MenuItem value={3}>3 - Sedang</MenuItem>
                      <MenuItem value={4}>4 - Tinggi</MenuItem>
                      <MenuItem value={5}>5 - Sangat Tinggi</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>Impact</Typography>
                    <Select
                      value={assessmentData.impact}
                      onChange={(e) => setAssessmentData({...assessmentData, impact: e.target.value})}
                    >
                      <MenuItem value={1}>1 - Dampak tidak signifikan</MenuItem>
                      <MenuItem value={2}>2 - Dampak terbatas</MenuItem>
                      <MenuItem value={3}>3 - Dampak signifikan</MenuItem>
                      <MenuItem value={4}>4 - Dampak kritis</MenuItem>
                      <MenuItem value={5}>5 - Dampak katastropik</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Control Effectiveness */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Control Effectiveness
                  </Typography>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>
                      Efektivitas Kontrol (1-5)
                    </Typography>
                    <Slider
                      value={assessmentData.controlEffectiveness}
                      onChange={(e, newValue) => setAssessmentData({...assessmentData, controlEffectiveness: newValue})}
                      min={1}
                      max={5}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </FormControl>
                </Grid>

                {/* Residual Risk Assessment */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Residual Risk Assessment
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>Residual Likelihood</Typography>
                    <Select
                      value={assessmentData.residualLikelihood}
                      onChange={(e) => setAssessmentData({...assessmentData, residualLikelihood: e.target.value})}
                    >
                      <MenuItem value={1}>1 - Sangat Rendah</MenuItem>
                      <MenuItem value={2}>2 - Rendah</MenuItem>
                      <MenuItem value={3}>3 - Sedang</MenuItem>
                      <MenuItem value={4}>4 - Tinggi</MenuItem>
                      <MenuItem value={5}>5 - Sangat Tinggi</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <Typography variant="body2" gutterBottom>Residual Impact</Typography>
                    <Select
                      value={assessmentData.residualImpact}
                      onChange={(e) => setAssessmentData({...assessmentData, residualImpact: e.target.value})}
                    >
                      <MenuItem value={1}>1 - Dampak tidak signifikan</MenuItem>
                      <MenuItem value={2}>2 - Dampak terbatas</MenuItem>
                      <MenuItem value={3}>3 - Dampak signifikan</MenuItem>
                      <MenuItem value={4}>4 - Dampak kritis</MenuItem>
                      <MenuItem value={5}>5 - Dampak katastropik</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Treatment Priority */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Treatment Priority</InputLabel>
                    <Select
                      value={assessmentData.treatmentPriority}
                      label="Treatment Priority"
                      onChange={(e) => setAssessmentData({...assessmentData, treatmentPriority: e.target.value})}
                    >
                      {treatmentPriorities.map((priority) => (
                        <MenuItem key={priority} value={priority}>
                          {priority}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Assessment Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Assessment Notes"
                    multiline
                    rows={3}
                    value={assessmentData.assessmentNotes}
                    onChange={(e) => setAssessmentData({...assessmentData, assessmentNotes: e.target.value})}
                    placeholder="Catatan tambahan untuk assessment..."
                  />
                </Grid>

                {/* Risk Score Display */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ backgroundColor: 'grey.50', p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Inherent Score
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {assessmentData.likelihood * assessmentData.impact}
                        </Typography>
                        <Chip 
                          label={calculateRiskLevel(assessmentData.likelihood * assessmentData.impact).level}
                          color={calculateRiskLevel(assessmentData.likelihood * assessmentData.impact).color}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Residual Score
                        </Typography>
                        <Typography variant="h4" color="secondary">
                          {assessmentData.residualLikelihood * assessmentData.residualImpact}
                        </Typography>
                        <Chip 
                          label={calculateRiskLevel(assessmentData.residualLikelihood * assessmentData.residualImpact).level}
                          color={calculateRiskLevel(assessmentData.residualLikelihood * assessmentData.residualImpact).color}
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAssessmentDialog(false)}>
            Batal
          </Button>
          <Button 
            variant="contained"
            onClick={handleAssessmentSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Simpan Assessment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="lg"
        fullWidth
        sx={{ 
          '& .MuiDialog-paper': { 
            minHeight: '80vh',
            maxHeight: '90vh'
          } 
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Visibility />
            Detail Risiko - {selectedRisk?.riskCode}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRisk ? (
            <Box>
              {/* Header Info */}
              <Card sx={{ mb: 3, backgroundColor: 'primary.light', color: 'white' }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Kode Risiko</Typography>
                      <Typography variant="h6">{selectedRisk.riskCode}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Jenis Risiko</Typography>
                      <Chip label={selectedRisk.riskType} color="primary" sx={{ background: 'white', color: 'primary.main' }} />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Sumber Risiko</Typography>
                      <Chip label={selectedRisk.riskSource} variant="outlined" sx={{ color: 'white', borderColor: 'white' }} />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2">Status</Typography>
                      <Chip 
                        label={selectedRisk.status || 'Open'} 
                        color={
                          selectedRisk.status?.includes('Critical') || selectedRisk.status?.includes('Extreme') ? 'error' :
                          selectedRisk.status?.includes('High') ? 'warning' :
                          selectedRisk.status?.includes('Assessed') ? 'info' :
                          selectedRisk.status?.includes('Closed') ? 'success' : 'default'
                        }
                        sx={{ background: 'white' }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Grid container spacing={3}>
                {/* Kolom Kiri - Identifikasi & Kontrol */}
                <Grid item xs={12} md={6}>
                  {/* Identifikasi Risiko */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Description />
                        Identifikasi Risiko
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Deskripsi Risiko</Typography>
                          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.riskDescription}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Klasifikasi</Typography>
                          <Typography variant="body1">{selectedRisk.classification || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Departemen</Typography>
                          <Typography variant="body1">{selectedRisk.department || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Pemilik Risiko</Typography>
                          <Typography variant="body1">{selectedRisk.riskOwner || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Penanggung Jawab</Typography>
                          <Typography variant="body1">{selectedRisk.responsiblePerson || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Penyebab</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.cause || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Dampak</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.impactText || '-'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Kontrol Existing */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business />
                        Kontrol & Rencana Aksi
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Kontrol Internal yang Ada</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.existingControls || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Efektivitas Kontrol</Typography>
                          <Typography variant="body1">{selectedRisk.controlEffectiveness || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Pengendalian Tambahan</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.additionalControls || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Biaya Pengendalian</Typography>
                          <Typography variant="body1">
                            {selectedRisk.controlCost ? `Rp ${parseInt(selectedRisk.controlCost).toLocaleString('id-ID')}` : '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Target Selesai</Typography>
                          <Typography variant="body1">
                            {selectedRisk.targetCompletion ? 
                              new Date(selectedRisk.targetCompletion).toLocaleDateString('id-ID') : '-'
                            }
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Kolom Kanan - Penilaian & Assessment */}
                <Grid item xs={12} md={6}>
                  {/* Penilaian Risiko Inheren */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment />
                        Penilaian Risiko Inheren
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Probabilitas Awal</Typography>
                          <Typography variant="body1">{selectedRisk.initialProbability || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Dampak Awal</Typography>
                          <Typography variant="body1">{selectedRisk.initialImpact || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Kuantifikasi Risiko Inherent</Typography>
                          <Typography variant="body1">{selectedRisk.inherentRiskQuantification || '-'}</Typography>
                        </Grid>
                        {selectedRisk.initialRiskLevel && (
                          <Grid item xs={12}>
                            <Alert severity="info">
                              <strong>Risk Score: {selectedRisk.initialRiskLevel.score}</strong> - 
                              Level: {selectedRisk.initialRiskLevel.level}
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Penilaian Risiko Residual */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment />
                        Penilaian Risiko Residual
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Probabilitas Residual</Typography>
                          <Typography variant="body1">{selectedRisk.residualProbability || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Dampak Residual</Typography>
                          <Typography variant="body1">{selectedRisk.residualImpact || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Kuantifikasi Risiko Residual</Typography>
                          <Typography variant="body1">{selectedRisk.residualRiskQuantification || '-'}</Typography>
                        </Grid>
                        {selectedRisk.residualRiskLevel && (
                          <Grid item xs={12}>
                            <Alert severity="info">
                              <strong>Risk Score: {selectedRisk.residualRiskLevel.score}</strong> - 
                              Level: {selectedRisk.residualRiskLevel.level}
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Assessment Data */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Analytics />
                        Assessment Data
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Likelihood</Typography>
                          <Typography variant="body1">{selectedRisk.likelihood || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Impact</Typography>
                          <Typography variant="body1">{selectedRisk.impact || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Inherent Score</Typography>
                          <Typography variant="body1">{selectedRisk.inherentScore || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" fontWeight="bold">Residual Score</Typography>
                          <Typography variant="body1">{selectedRisk.residualScore || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Treatment Priority</Typography>
                          <Typography variant="body1">{selectedRisk.treatmentPriority || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" fontWeight="bold">Assessment Notes</Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedRisk.assessmentNotes || '-'}
                          </Typography>
                        </Grid>
                        {selectedRisk.assessedBy && (
                          <Grid item xs={12}>
                            <Alert severity="success">
                              Dinilai oleh: {selectedRisk.assessedBy} pada {selectedRisk.assessedAt ? new Date(selectedRisk.assessedAt.seconds * 1000).toLocaleDateString('id-ID') : '-'}
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Audit Trail */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History />
                        Audit Trail
                      </Typography>
                      {selectedRisk.auditTrail && selectedRisk.auditTrail.length > 0 ? (
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                          {selectedRisk.auditTrail.map((audit, index) => (
                            <ListItem key={index} divider>
                              <ListItemIcon>
                                <CalendarToday />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box display="flex" justifyContent="space-between">
                                    <Typography variant="subtitle1">
                                      {audit.action === 'created' ? 'Dibuat' : 'Diupdate'} oleh {audit.user}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                      {audit.timestamp?.toDate().toLocaleString('id-ID')}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  audit.changes && audit.changes.length > 0 ? (
                                    <Box sx={{ mt: 1 }}>
                                      <Typography variant="body2" fontWeight="bold">
                                        Perubahan:
                                      </Typography>
                                      {audit.changes.map((change, changeIndex) => (
                                        <Typography key={changeIndex} variant="body2" sx={{ ml: 2 }}>
                                          • {change.field}: "{change.oldValue || 'kosong'}" → "{change.newValue || 'kosong'}"
                                        </Typography>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="textSecondary">
                                      Tidak ada perubahan field
                                    </Typography>
                                  )
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Alert severity="info">
                          Belum ada riwayat perubahan untuk risiko ini.
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <Typography>Memuat data risiko...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDetailDialog(false)}>
            Tutup
          </Button>
          {selectedRisk && (
            <Button 
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                setDetailDialog(false);
                handleEdit(selectedRisk);
              }}
            >
              Edit Risiko
            </Button>
          )}
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

export default RiskRegister;