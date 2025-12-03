import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  PictureAsPdf,
  TableChart,
  Download,
  Schedule,
  Assignment,
  Warning,
  Analytics
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const Reporting = () => {
  const [risks, setRisks] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { userData } = useAuth();

  const [reportConfig, setReportConfig] = useState({
    reportType: 'executive_summary',
    format: 'pdf',
    dateRange: 'all_time',
    department: 'all',
    riskLevel: 'all',
    includeCharts: true
  });

  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'monthly',
    recipients: '',
    reportType: 'executive_summary',
    format: 'pdf'
  });

  // Report types
  const reportTypes = [
    { value: 'executive_summary', label: 'Executive Summary', icon: <Analytics /> },
    { value: 'risk_register', label: 'Risk Register', icon: <Warning /> },
    { value: 'treatment_progress', label: 'Treatment Progress', icon: <Assignment /> },
    { value: 'incident_report', label: 'Incident Report', icon: <Warning /> },
    { value: 'comprehensive', label: 'Comprehensive Report', icon: <TableChart /> }
  ];

  // Date ranges
  const dateRanges = [
    { value: 'last_week', label: 'Minggu Lalu' },
    { value: 'last_month', label: 'Bulan Lalu' },
    { value: 'last_quarter', label: 'Kuartal Lalu' },
    { value: 'last_year', label: 'Tahun Lalu' },
    { value: 'all_time', label: 'Semua Data' }
  ];

  // Helper function to convert Firebase timestamp to Date
  const convertFirebaseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) {
      return timestamp.toDate();
    }
    return new Date(timestamp);
  };

  // Load data untuk reporting
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading report data from Firebase...');
      
      // Load risks
      const risksQuery = query(collection(db, 'risks'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        const data = doc.data();
        risksList.push({ 
          id: doc.id, 
          ...data,
          likelihood: data.likelihood || 1,
          impact: data.impact || 1,
          classification: data.classification || 'Uncategorized',
          riskOwner: data.riskOwner || '',
          title: data.title || data.riskDescription || 'Unnamed Risk',
          riskDescription: data.riskDescription || data.title || 'No description',
          riskCode: data.riskCode || '',
          department: data.department || '',
          riskType: data.riskType || '',
          riskSource: data.riskSource || '',
          cause: data.cause || '',
          effect: data.effect || '',
          existingControl: data.existingControl || '',
          status: data.status || 'Identified',
          progress: data.progress || 0,
          comments: data.comments || '',
          createdBy: data.createdBy || '',
          identificationDate: convertFirebaseTimestamp(data.identificationDate),
          targetDate: convertFirebaseTimestamp(data.targetDate),
          createdAt: convertFirebaseTimestamp(data.createdAt),
          updatedAt: convertFirebaseTimestamp(data.updatedAt)
        });
      });
      console.log('✅ Loaded risks:', risksList.length);
      setRisks(risksList);

      // Load treatment plans
      const plansQuery = query(collection(db, 'treatment_plans'));
      const plansSnapshot = await getDocs(plansQuery);
      const plansList = [];
      plansSnapshot.forEach((doc) => {
        const data = doc.data();
        plansList.push({ 
          id: doc.id, 
          ...data,
          progress: data.progress || 0,
          status: data.status || 'planned',
          responsiblePerson: data.responsiblePerson || '',
          treatmentDescription: data.treatmentDescription || 'No description',
          treatmentType: data.treatmentType || 'mitigation',
          createdAt: convertFirebaseTimestamp(data.createdAt)
        });
      });
      console.log('✅ Loaded treatment plans:', plansList.length);
      setTreatmentPlans(plansList);

      // Load incidents
      const incidentsQuery = query(collection(db, 'incidents'));
      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidentsList = [];
      incidentsSnapshot.forEach((doc) => {
        const data = doc.data();
        incidentsList.push({ 
          id: doc.id, 
          ...data,
          severity: data.severity || 'medium',
          status: data.status || 'reported',
          description: data.description || 'No description',
          reportedBy: data.reportedBy || '',
          incidentDate: convertFirebaseTimestamp(data.incidentDate),
          createdAt: convertFirebaseTimestamp(data.createdAt)
        });
      });
      console.log('✅ Loaded incidents:', incidentsList.length);
      setIncidents(incidentsList);

      showSnackbar('Data berhasil dimuat!', 'success');
    } catch (error) {
      console.error('❌ Error loading report data:', error);
      showSnackbar('Error memuat data laporan: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter data berdasarkan config
  const getFilteredData = () => {
    try {
      let filteredRisks = [...risks];
      let filteredTreatments = [...treatmentPlans];
      let filteredIncidents = [...incidents];

      // Filter by date range
      const now = new Date();
      let startDate = new Date(0); // Default: all time

      switch (reportConfig.dateRange) {
        case 'last_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'last_quarter':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case 'last_year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case 'all_time':
        default:
          startDate = new Date(0); // All time
      }

      // Filter risks by date
      filteredRisks = filteredRisks.filter(risk => {
        const riskDate = risk.createdAt;
        return riskDate >= startDate;
      });

      // Filter treatments by date
      filteredTreatments = filteredTreatments.filter(plan => {
        const planDate = plan.createdAt;
        return planDate >= startDate;
      });

      // Filter incidents by date
      filteredIncidents = filteredIncidents.filter(incident => {
        const incidentDate = incident.incidentDate;
        return incidentDate >= startDate;
      });

      // Filter by risk level
      if (reportConfig.riskLevel !== 'all') {
        filteredRisks = filteredRisks.filter(risk => {
          const score = (risk.likelihood || 1) * (risk.impact || 1);
          
          if (reportConfig.riskLevel === 'high' && score >= 16) return true;
          if (reportConfig.riskLevel === 'medium' && score >= 10 && score < 16) return true;
          if (reportConfig.riskLevel === 'low' && score < 10) return true;
          return false;
        });
      }

      return { filteredRisks, filteredTreatments, filteredIncidents };
    } catch (error) {
      console.error('❌ Error in getFilteredData:', error);
      return { filteredRisks: [], filteredTreatments: [], filteredIncidents: [] };
    }
  };

  // ✅ PDF EXPORT BARU - Risk Register Landscape
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { filteredRisks } = getFilteredData();
      
      if (filteredRisks.length === 0) {
        showSnackbar('Tidak ada data risiko untuk diexport!', 'warning');
        setGenerating(false);
        return;
      }

      console.log('🔄 Generating PDF Risk Register (Landscape)...');

      // Dynamic import jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('landscape'); // ✅ LANDSCAPE MODE

      // Set document properties
      const pageWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const margin = 10;
      let yPosition = margin;

      // Function untuk check new page
      const checkNewPage = (spaceNeeded = 10) => {
        if (yPosition + spaceNeeded > pageHeight - margin) {
          doc.addPage('landscape');
          yPosition = margin;
          return true;
        }
        return false;
      };

      // ✅ HEADER - RISK REGISTER LENGKAP
      doc.setFillColor(25, 118, 210);
      doc.rect(0, 0, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RISK REGISTER - LAPORAN LENGKAP', pageWidth / 2, 9, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text('Sistem Enterprise Risk Management', pageWidth / 2, 14, { align: 'center' });
      
      yPosition = 20;

      // ✅ REPORT INFO
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      const reportInfo = [
        `Tanggal Generate: ${new Date().toLocaleString('id-ID')}`,
        `Jumlah Data: ${filteredRisks.length} risiko`,
        `High/Extreme: ${filteredRisks.filter(r => (r.likelihood * r.impact) >= 16).length}`,
        `Generated By: ${userData?.name || 'Unknown'}`
      ];

      reportInfo.forEach((info, i) => {
        doc.text(info, margin + (i * 70), yPosition);
      });

      yPosition += 8;

      // ✅ TABLE HEADER DETAIL LENGKAP (20 kolom)
      checkNewPage(15);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      
      // Define column positions (20 kolom dalam landscape)
      const colPositions = {
        no: margin + 2,
        id: margin + 8,
        title: margin + 18,
        dept: margin + 48,
        category: margin + 58,
        type: margin + 68,
        source: margin + 78,
        likelihood: margin + 88,
        impact: margin + 94,
        score: margin + 100,
        level: margin + 108,
        classification: margin + 116,
        owner: margin + 134,
        existingControl: margin + 152,
        status: margin + 172,
        identificationDate: margin + 182,
        targetDate: margin + 200,
        progress: margin + 218,
        createdBy: margin + 226,
        createdAt: margin + 244
      };

      // Header titles
      doc.text('No', colPositions.no, yPosition + 5);
      doc.text('ID', colPositions.id, yPosition + 5);
      doc.text('Judul Risiko', colPositions.title, yPosition + 5);
      doc.text('Dept', colPositions.dept, yPosition + 5);
      doc.text('Kategori', colPositions.category, yPosition + 5);
      doc.text('Tipe', colPositions.type, yPosition + 5);
      doc.text('Sumber', colPositions.source, yPosition + 5);
      doc.text('L', colPositions.likelihood, yPosition + 5);
      doc.text('I', colPositions.impact, yPosition + 5);
      doc.text('Score', colPositions.score, yPosition + 5);
      doc.text('Level', colPositions.level, yPosition + 5);
      doc.text('Klasifikasi', colPositions.classification, yPosition + 5);
      doc.text('Pemilik', colPositions.owner, yPosition + 5);
      doc.text('Existing Control', colPositions.existingControl, yPosition + 5);
      doc.text('Status', colPositions.status, yPosition + 5);
      doc.text('Tgl. Identifikasi', colPositions.identificationDate, yPosition + 5);
      doc.text('Target', colPositions.targetDate, yPosition + 5);
      doc.text('Progress', colPositions.progress, yPosition + 5);
      doc.text('Dibuat Oleh', colPositions.createdBy, yPosition + 5);
      doc.text('Tanggal Dibuat', colPositions.createdAt, yPosition + 5);

      yPosition += 10;

      // ✅ TABLE DATA - Semua field dari form
      doc.setFont('helvetica', 'normal');
      
      filteredRisks.forEach((risk, index) => {
        checkNewPage(8);
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPosition - 2, pageWidth - (margin * 2), 8, 'F');
        }

        doc.setFontSize(5);
        doc.setTextColor(0, 0, 0);
        
        // Calculate risk score and level
        const likelihood = risk.likelihood || 1;
        const impact = risk.impact || 1;
        const score = likelihood * impact;
        const level = score >= 20 ? 'E' : score >= 16 ? 'H' : score >= 10 ? 'M' : 'L';
        
        // Format dates
        const formatDate = (date) => {
          if (!date) return '-';
          try {
            if (date.toDate) date = date.toDate();
            return new Date(date).toLocaleDateString('id-ID');
          } catch {
            return '-';
          }
        };

        // Truncate text for fit columns
        const truncate = (text, maxLength) => {
          if (!text) return '-';
          return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        };

        // Fill data row
        doc.text((index + 1).toString(), colPositions.no, yPosition + 5);
        doc.text(truncate(risk.riskCode || risk.id.substring(0, 6), 6), colPositions.id, yPosition + 5);
        doc.text(truncate(risk.title || 'No Title', 20), colPositions.title, yPosition + 5);
        doc.text(truncate(risk.department, 6), colPositions.dept, yPosition + 5);
        doc.text(truncate(risk.riskCategory, 6), colPositions.category, yPosition + 5);
        doc.text(truncate(risk.riskType, 6), colPositions.type, yPosition + 5);
        doc.text(truncate(risk.riskSource, 6), colPositions.source, yPosition + 5);
        doc.text(likelihood.toString(), colPositions.likelihood, yPosition + 5);
        doc.text(impact.toString(), colPositions.impact, yPosition + 5);
        doc.text(score.toString(), colPositions.score, yPosition + 5);
        doc.text(level, colPositions.level, yPosition + 5);
        doc.text(truncate(risk.classification, 10), colPositions.classification, yPosition + 5);
        doc.text(truncate(risk.riskOwner, 10), colPositions.owner, yPosition + 5);
        doc.text(truncate(risk.existingControl, 12), colPositions.existingControl, yPosition + 5);
        doc.text(truncate(risk.status, 6), colPositions.status, yPosition + 5);
        doc.text(formatDate(risk.identificationDate), colPositions.identificationDate, yPosition + 5);
        doc.text(formatDate(risk.targetDate), colPositions.targetDate, yPosition + 5);
        doc.text(`${risk.progress || 0}%`, colPositions.progress, yPosition + 5);
        doc.text(truncate(risk.createdBy, 8), colPositions.createdBy, yPosition + 5);
        doc.text(formatDate(risk.createdAt), colPositions.createdAt, yPosition + 5);
        
        yPosition += 8;
      });

      yPosition += 5;

      // ✅ RISK DESCRIPTION DETAILS (Optional untuk 5 risiko pertama)
      if (reportConfig.reportType === 'risk_register') {
        checkNewPage(30);
        doc.setFontSize(10);
        doc.setTextColor(25, 118, 210);
        doc.text('DETAIL DESKRIPSI RISIKO (Sample 5 Data)', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        
        filteredRisks.slice(0, 5).forEach((risk, index) => {
          checkNewPage(25);
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${risk.title || 'No Title'}`, margin, yPosition);
          yPosition += 5;
          
          doc.setFont('helvetica', 'normal');
          const details = [
            `Deskripsi: ${risk.riskDescription || '-'}`,
            `Penyebab: ${risk.cause || '-'}`,
            `Dampak: ${risk.effect || '-'}`,
            `Komentar: ${risk.comments || '-'}`
          ];
          
          details.forEach(detail => {
            checkNewPage(4);
            doc.text(detail, margin + 5, yPosition);
            yPosition += 4;
          });
          
          yPosition += 5;
        });
      }

      // ✅ FOOTER
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Halaman ${i} dari ${pageCount} | Generated: ${new Date().toLocaleString('id-ID')}`, 
          pageWidth / 2, 
          pageHeight - 5, 
          { align: 'center' }
        );
      }

      // ✅ SAVE PDF
      const fileName = `Risk_Register_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('✅ PDF Risk Register berhasil dibuat (Landscape)');
      showSnackbar('PDF Risk Register berhasil dibuat dalam format landscape!', 'success');
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      showSnackbar('Error membuat PDF: ' + error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Generate Excel Report - DIPERBAIKI untuk Risk Register lengkap
  const generateExcel = async () => {
    setGenerating(true);
    try {
      const { filteredRisks, filteredTreatments, filteredIncidents } = getFilteredData();
      
      // Create comprehensive CSV content
      let csvContent = 'ERM System - Enterprise Risk Management Report\n\n';
      
      // Report header
      csvContent += `Report Type,${reportTypes.find(t => t.value === reportConfig.reportType)?.label}\n`;
      csvContent += `Period,${dateRanges.find(d => d.value === reportConfig.dateRange)?.label}\n`;
      csvContent += `Generated,${new Date().toLocaleString('id-ID')}\n`;
      csvContent += `Generated By,${userData?.name || 'Unknown User'}\n\n`;
      
      // Executive Summary section
      csvContent += 'EXECUTIVE SUMMARY\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Risks,${filteredRisks.length}\n`;
      csvContent += `High & Extreme Risks,${filteredRisks.filter(r => (r.likelihood * r.impact) >= 16).length}\n`;
      csvContent += `Treatment Plans,${filteredTreatments.length}\n`;
      csvContent += `Completed Treatments,${filteredTreatments.filter(p => p.status === 'completed').length}\n`;
      csvContent += `Incidents Reported,${filteredIncidents.length}\n`;
      csvContent += `Critical Incidents,${filteredIncidents.filter(i => i.severity === 'critical').length}\n\n`;

      // Risks section - DIPERBAIKI dengan semua field
      if (filteredRisks.length > 0 && (reportConfig.reportType === 'risk_register' || reportConfig.reportType === 'comprehensive')) {
        csvContent += 'RISK REGISTER - LENGKAP\n';
        // Header dengan semua field dari form input
        csvContent += 'No,Kode Risiko,Judul Risiko,Deskripsi Risiko,Departemen,Tipe Risiko,Sumber Risiko,Penyebab,Dampak,Likelihood,Impact,Score,Level,Klasifikasi,Pemilik Risiko,Existing Control,Status,Tanggal Identifikasi,Target Penyelesaian,Progress,Komentar,Dibuat Oleh,Tanggal Dibuat\n';
        
        filteredRisks.forEach((risk, index) => {
          const score = (risk.likelihood || 1) * (risk.impact || 1);
          const level = score >= 20 ? 'Extreme' : score >= 16 ? 'High' : score >= 10 ? 'Medium' : 'Low';
          
          // Format data untuk menghindari issue CSV
          const formatCSVValue = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Escape quotes dan handle comma
            return `"${stringValue.replace(/"/g, '""')}"`;
          };

          csvContent += 
            `${index + 1},` +
            `${formatCSVValue(risk.riskCode)},` +
            `${formatCSVValue(risk.title)},` +
            `${formatCSVValue(risk.riskDescription)},` +
            `${formatCSVValue(risk.department)},` +
            `${formatCSVValue(risk.riskType)},` +
            `${formatCSVValue(risk.riskSource)},` +
            `${formatCSVValue(risk.cause)},` +
            `${formatCSVValue(risk.effect)},` +
            `${risk.likelihood || 1},` +
            `${risk.impact || 1},` +
            `${score},` +
            `${level},` +
            `${formatCSVValue(risk.classification)},` +
            `${formatCSVValue(risk.riskOwner)},` +
            `${formatCSVValue(risk.existingControl)},` +
            `${formatCSVValue(risk.status)},` +
            `${formatCSVValue(risk.identificationDate?.toLocaleDateString('id-ID'))},` +
            `${formatCSVValue(risk.targetDate?.toLocaleDateString('id-ID'))},` +
            `${formatCSVValue(risk.progress)}%,` +
            `${formatCSVValue(risk.comments)},` +
            `${formatCSVValue(risk.createdBy)},` +
            `${formatCSVValue(risk.createdAt?.toLocaleDateString('id-ID'))}\n`;
        });
        csvContent += '\n';
      }

      // Treatment plans section
      if (filteredTreatments.length > 0 && (reportConfig.reportType === 'treatment_progress' || reportConfig.reportType === 'comprehensive')) {
        csvContent += 'TREATMENT PLANS\n';
        csvContent += 'No,Description,Status,Progress,Responsible Person,Treatment Type\n';
        filteredTreatments.forEach((plan, index) => {
          csvContent += `${index + 1},"${plan.treatmentDescription}","${plan.status}",${plan.progress || 0}%,"${plan.responsiblePerson || ''}","${plan.treatmentType || ''}"\n`;
        });
        csvContent += '\n';
      }

      // Incidents section
      if (filteredIncidents.length > 0 && (reportConfig.reportType === 'incident_report' || reportConfig.reportType === 'comprehensive')) {
        csvContent += 'INCIDENT REPORTS\n';
        csvContent += 'No,Description,Severity,Status,Reported By,Incident Date\n';
        filteredIncidents.forEach((incident, index) => {
          csvContent += `${index + 1},"${incident.description}","${incident.severity}","${incident.status}","${incident.reportedBy || ''}","${incident.incidentDate.toLocaleDateString('id-ID')}"\n`;
        });
      }

      // Create and download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ERM_Report_${reportConfig.reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('Excel report berhasil di-generate dengan data lengkap!', 'success');
    } catch (error) {
      console.error('❌ Error generating Excel:', error);
      showSnackbar('Error generating Excel report: ' + error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Handle report generation
  const handleGenerateReport = () => {
    if (reportConfig.format === 'pdf') {
      generatePDF();
    } else {
      generateExcel();
    }
  };

  // Schedule report
  const handleScheduleReport = async () => {
    try {
      // Simulate scheduling
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSnackbar('Report scheduling berhasil!', 'success');
      setScheduleDialog(false);
    } catch (error) {
      showSnackbar('Error scheduling report: ' + error.message, 'error');
    }
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Statistics untuk preview
  const { filteredRisks, filteredTreatments, filteredIncidents } = getFilteredData();
  
  const stats = {
    totalRisks: filteredRisks.length,
    highRisks: filteredRisks.filter(risk => {
      const score = (risk.likelihood || 1) * (risk.impact || 1);
      return score >= 16;
    }).length,
    totalTreatments: filteredTreatments.length,
    completedTreatments: filteredTreatments.filter(plan => plan.status === 'completed').length,
    totalIncidents: filteredIncidents.length,
    criticalIncidents: filteredIncidents.filter(incident => incident.severity === 'critical').length
  };
  
  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Reporting System...
        </Typography>
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
                <PictureAsPdf sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Reporting System
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Generate laporan risiko untuk Direksi & Dewan Komisaris
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Data terkini: {risks.length} Risks, {treatmentPlans.length} Treatments, {incidents.length} Incidents
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Report Configuration */}
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 3, height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Report Configuration
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Jenis Laporan</InputLabel>
                    <Select
                      value={reportConfig.reportType}
                      label="Jenis Laporan"
                      onChange={(e) => setReportConfig({ ...reportConfig, reportType: e.target.value })}
                    >
                      {reportTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {type.icon}
                            {type.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Format</InputLabel>
                    <Select
                      value={reportConfig.format}
                      label="Format"
                      onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                    >
                      <MenuItem value="pdf">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PictureAsPdf />
                          PDF Document
                        </Box>
                      </MenuItem>
                      <MenuItem value="excel">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TableChart />
                          Excel/CSV
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Periode</InputLabel>
                    <Select
                      value={reportConfig.dateRange}
                      label="Periode"
                      onChange={(e) => setReportConfig({ ...reportConfig, dateRange: e.target.value })}
                    >
                      {dateRanges.map((range) => (
                        <MenuItem key={range.value} value={range.value}>
                          {range.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Level Risiko</InputLabel>
                    <Select
                      value={reportConfig.riskLevel}
                      label="Level Risiko"
                      onChange={(e) => setReportConfig({ ...reportConfig, riskLevel: e.target.value })}
                    >
                      <MenuItem value="all">Semua Level</MenuItem>
                      <MenuItem value="high">High & Extreme</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={reportConfig.format === 'pdf' ? <PictureAsPdf /> : <TableChart />}
                    onClick={handleGenerateReport}
                    disabled={generating}
                    sx={{ py: 1.5 }}
                  >
                    {generating ? 'Generating...' : `Generate ${reportConfig.format.toUpperCase()} Report`}
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Schedule />}
                    onClick={() => setScheduleDialog(true)}
                  >
                    Schedule Report
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Report Preview */}
          <Card sx={{ boxShadow: 3, mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Report Preview
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Total Risks:</Typography>
                  <Typography variant="body2" fontWeight="bold">{stats.totalRisks}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent:'space-between', mb: 1 }}>
                  <Typography variant="body2">High Risks:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">{stats.highRisks}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent:'space-between', mb: 1 }}>
                  <Typography variant="body2">Treatment Plans:</Typography>
                  <Typography variant="body2" fontWeight="bold">{stats.totalTreatments}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent:'space-between', mb: 1 }}>
                  <Typography variant="body2">Completed Treatments:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">{stats.completedTreatments}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent:'space-between' }}>
                  <Typography variant="body2">Incidents:</Typography>
                  <Typography variant="body2" fontWeight="bold">{stats.totalIncidents}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Report Templates */}
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Available Report Templates
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {reportTypes.map((template) => (
                  <Grid item xs={12} key={template.value}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        border: reportConfig.reportType === template.value ? 2 : 1,
                        borderColor: reportConfig.reportType === template.value ? 'primary.main' : 'divider',
                        backgroundColor: reportConfig.reportType === template.value ? 'primary.light' : 'background.paper',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }}
                      onClick={() => setReportConfig({ ...reportConfig, reportType: template.value })}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ color: 'primary.main' }}>
                          {template.icon}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {template.label}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {getTemplateDescription(template.value)}
                          </Typography>
                        </Box>
                        <Chip 
                          label="PDF/Excel" 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Recent Data Preview */}
          <Card sx={{ boxShadow: 3, mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Data Preview ({filteredRisks.length} risks)
              </Typography>
              
              {filteredRisks.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No data available for selected filters.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell>Kode</TableCell>
                        <TableCell>Risk Description</TableCell>
                        <TableCell align="center">Dept</TableCell>
                        <TableCell align="center">L</TableCell>
                        <TableCell align="center">I</TableCell>
                        <TableCell align="center">Score</TableCell>
                        <TableCell align="center">Level</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRisks.slice(0, 10).map((risk) => {
                        const score = (risk.likelihood || 1) * (risk.impact || 1);
                        const level = score >= 20 ? 'Extreme' : score >= 16 ? 'High' : score >= 10 ? 'Medium' : 'Low';
                        const color = score >= 20 ? 'error' : score >= 16 ? 'warning' : score >= 10 ? 'info' : 'success';
                        
                        return (
                          <TableRow key={risk.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {risk.riskCode || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {risk.title}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="caption">
                                {risk.department || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{risk.likelihood}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{risk.impact}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight="bold">
                                {score}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={level} 
                                color={color} 
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={risk.status || 'Identified'} 
                                size="small"
                                variant="outlined"
                              />
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

      {/* Schedule Report Dialog */}
      <Dialog 
        open={scheduleDialog} 
        onClose={() => setScheduleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schedule Automated Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={scheduleConfig.frequency}
                  label="Frequency"
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, frequency: e.target.value })}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={scheduleConfig.reportType}
                  label="Report Type"
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, reportType: e.target.value })}
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={scheduleConfig.format}
                  label="Format"
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, format: e.target.value })}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipients (Email)"
                value={scheduleConfig.recipients}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, recipients: e.target.value })}
                placeholder="email1@company.com, email2@company.com"
                helperText="Pisahkan multiple emails dengan koma"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleScheduleReport}>
            Schedule Report
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

  // Helper function untuk template descriptions
  function getTemplateDescription(type) {
    const descriptions = {
      executive_summary: 'High-level overview untuk Direksi dengan key metrics dan trends',
      risk_register: 'Daftar LENGKAP semua risiko dengan semua field dari form input',
      treatment_progress: 'Status dan progress treatment plans',
      incident_report: 'Laporan kejadian risiko yang terjadi',
      comprehensive: 'Laporan komprehensif semua aspek risk management dengan data lengkap'
    };
    return descriptions[type] || 'Standard report template';
  }
};

export default Reporting;