
// src/pages/Reporting.js
// -------------------------------------------------------------
// Reporting + Export PDF, Excel (.xlsx), Word (.docx), Text (.txt)
// Tipe: executive_summary, risk_register, treatment_progress, incident_report, comprehensive
// - Risk Register: kolom sesuai header Ibu (Inheren & Residual + nilai dampak Rp).
// - Skor mengikuti konfigurasi (coordinate/multiply) via AssessmentConfigContext.
// - FIX: skor SELALU dihitung via konfigurasi (pakai calculateScore jika ada).
// - FIX: PDF Risk Register rapi (grouped header 2 tingkat, wrap teks, lebar kolom).
// - FIX: saveAs di-import sekali di top-level.
// -------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, FormControl, InputLabel, Select, MenuItem,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Snackbar, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { PictureAsPdf, TableChart, Schedule, Warning, Assignment, Analytics } from '@mui/icons-material';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAssessmentConfig } from '../contexts/AssessmentConfigContext';
import { saveAs } from 'file-saver'; // ✅ import sekali

// (opsional) logo perusahaan base64 untuk PDF/Word/Excel
const LOGO_BASE64 = ''; // contoh: 'data:image/png;base64,iVBORw0K...'

const Reporting = () => {
  const { userData } = useAuth();

  // ======== STATE ========
  const [risks, setRisks] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [scheduleDialog, setScheduleDialog] = useState(false);

  const [reportConfig, setReportConfig] = useState({
    reportType: 'executive_summary', // 'executive_summary' | 'risk_register' | 'treatment_progress' | 'incident_report' | 'comprehensive'
    format: 'pdf',                   // 'pdf' | 'excel' | 'word' | 'text'
    dateRange: 'all_time',
    riskLevel: 'all',
  });

  // ======== ASSESSMENT CONFIG (score/level) ========
  const {
    config: assessmentConfig,
    calculateScore,
    calculateRiskLevel,
  } = useAssessmentConfig();

  // ======== HELPERS ========
  const toDate  = (t) => (t?.toDate ? t.toDate() : (t ? new Date(t) : null));
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');

  // ⚠️ Wajib: skor dan level mengikuti konfigurasi koordinat jika fungsi tersedia.
  const scoreByConfig = (L, I) => {
    const l = Number(L);
    const p = Number(I);
    const ln = Number.isFinite(l) ? l : 0;
    const pn = Number.isFinite(p) ? p : 0;

    if (typeof calculateScore === 'function') {
      try {
        const s = calculateScore(ln, pn);
        if (Number.isFinite(Number(s))) return Number(s);
      } catch (e) {
        console.warn('[scoreByConfig] calculateScore error:', e);
      }
    }
    // fallback multiply
    return ln * pn;
  };

  const levelByConfig = (s) => {
    const val = Number(s);
    const sv  = Number.isFinite(val) ? val : 0;

    if (typeof calculateRiskLevel === 'function') {
      try {
        const lvl = calculateRiskLevel(sv);
        // bisa string atau object {level, score, color}
        if (lvl && (typeof lvl === 'string' || lvl.level)) {
          return typeof lvl === 'string' ? { level: lvl, score: sv } : { ...lvl, score: sv };
        }
      } catch (e) {
        console.warn('[levelByConfig] calculateRiskLevel error:', e);
      }
    }
    // fallback sederhana
    return { level: sv >= 20 ? 'Extreme' : sv >= 16 ? 'High' : sv >= 10 ? 'Medium' : 'Low', score: sv };
  };

  const fmtRp = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    const num = Number(v);
    return Number.isFinite(num) ? ('Rp ' + num.toLocaleString('id-ID')) : String(v);
  };

  const showSnackbar = (message, severity) => setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // ======== LOAD DATA ========
  const loadData = async () => {
    try {
      setLoading(true);

      // risks
      const risksSnapshot = await getDocs(query(collection(db, 'risks')));
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        const data = doc.data();
        risksList.push({
          id: doc.id,
          // identitas & deskripsi
          riskCode: data.riskCode ?? '',
          riskType: data.riskType ?? '',
          riskSource: data.riskSource ?? '',
          department: data.department ?? '',
          title: data.title ?? data.riskDescription ?? '',
          riskDescription: data.riskDescription ?? data.title ?? '',
          cause: data.cause ?? '',
          effect: data.effect ?? data.impactText ?? '',        // ✅ normalisasi dampak teks
          riskOwner: data.riskOwner ?? '',
          responsiblePerson: data.responsiblePerson ?? '',
          status: data.status ?? 'Identified',
          comments: data.comments ?? '',
          progress: data.progress ?? 0,

          // preview L/I terkini (kalau ada)
          likelihood: data.likelihood ?? '',
          impact: data.impact ?? '',

          // timeline
          identificationDate: toDate(data.identificationDate),
          targetDate: toDate(data.targetDate),
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),

          // skala awal/inheren
          initialProbability: data.initialProbability ?? '',
          initialImpact: data.initialImpact ?? '',

          // skala residual
          residualProbability: data.residualProbability ?? '',
          residualImpact: data.residualImpact ?? '',

          // KUANTIFIKASI (RUPIAH)
          inherentRiskQuantification: data.inherentRiskQuantification ?? '',
          residualRiskQuantification: data.residualRiskQuantification ?? '',

          // kontrol
          existingControl: data.existingControl ?? data.existingControls ?? '', // ✅ normalisasi agar tidak kosong
          additionalControls: data.additionalControls ?? '',
          controlEffectiveness: data.controlEffectiveness ?? '',
          controlCost: data.controlCost ?? '',
        });
      });
      setRisks(risksList);

      // treatment_plans
      const plansSnapshot = await getDocs(query(collection(db, 'treatment_plans')));
      const plansList = [];
      plansSnapshot.forEach((doc) => {
        const data = doc.data();
        plansList.push({
          id: doc.id,
          progress: data.progress ?? 0,
          status: data.status ?? 'planned',
          responsiblePerson: data.responsiblePerson ?? '',
          treatmentDescription: data.treatmentDescription ?? 'No description',
          treatmentType: data.treatmentType ?? 'mitigation',
          createdAt: toDate(data.createdAt),
        });
      });
      setTreatmentPlans(plansList);

      // incidents
      const incidentsSnapshot = await getDocs(query(collection(db, 'incidents')));
      const incidentsList = [];
      incidentsSnapshot.forEach((doc) => {
        const data = doc.data();
        incidentsList.push({
          id: doc.id,
          severity: data.severity ?? 'medium',
          status: data.status ?? 'reported',
          description: data.description ?? 'No description',
          reportedBy: data.reportedBy ?? '',
          incidentDate: toDate(data.incidentDate),
          createdAt: toDate(data.createdAt),
        });
      });
      setIncidents(incidentsList);

      showSnackbar('Data berhasil dimuat!', 'success');
    } catch (error) {
      console.error(error);
      showSnackbar('Error memuat data laporan: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadData(); }, []);

  // ======== FILTER ========
  const getFilteredData = () => {
    try {
      let filteredRisks = [...risks];
      let filteredTreatments = [...treatmentPlans];
      let filteredIncidents = [...incidents];

      const now = new Date();
      let startDate = new Date(0);
      switch (reportConfig.dateRange) {
        case 'last_week':    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'last_month':   startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
        case 'last_quarter': startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
        case 'last_year':    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
        default:             startDate = new Date(0);
      }

      filteredRisks     = filteredRisks.filter(r => (r.createdAt ? r.createdAt >= startDate : true));
      filteredTreatments= filteredTreatments.filter(t => (t.createdAt ? t.createdAt >= startDate : true));
      filteredIncidents = filteredIncidents.filter(i => (i.incidentDate ? i.incidentDate >= startDate : true));

      if (reportConfig.riskLevel !== 'all') {
        filteredRisks = filteredRisks.filter(r => {
          const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
          if (reportConfig.riskLevel === 'high'   && s >= 16) return true;
          if (reportConfig.riskLevel === 'medium' && s >= 10 && s < 16) return true;
          if (reportConfig.riskLevel === 'low'    && s < 10) return true;
          return false;
        });
      }

      return { filteredRisks, filteredTreatments, filteredIncidents };
    } catch (error) {
      console.error('Error in getFilteredData:', error);
      return { filteredRisks: [], filteredTreatments: [], filteredIncidents: [] };
    }
  };


// ======== EXPORT: RISK REGISTER – PDF (final: huruf kecil, +skala L/I & existing) ========
const exportRiskRegisterPDF = async (filteredRisks) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  // A4 landscape
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };

  const M = 24;             // margin kiri/kanan sedikit diperkecil agar muat
  const headerH = 60;       // tinggi header
  const nowStr = new Date().toLocaleString('id-ID');

  // ===== Header =====
  doc.setFillColor(96, 125, 139);
  doc.rect(0, 0, page.w, headerH, 'F');

  if (LOGO_BASE64) {
    try { doc.addImage(LOGO_BASE64, 'PNG', M, 10, 40, 40); } catch {}
  }

  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11); // ===== Judul 13 pt =====
  doc.text('RISK REGISTER', page.w / 2, 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);  // subjudul perusahaan, kecil
  doc.text('PT Odira Energy Karang Agung', page.w / 2, 46, { align: 'center' });

  // Meta info (6pt sesuai permintaan "kecilkan hurufnya")
  doc.setTextColor(0);
  doc.setFontSize(6);
  doc.text(`Generated: ${nowStr}`, M, headerH + 10);
  doc.text(`Period: ${reportConfig.dateRange}`, M + 160, headerH + 10);
  doc.text(`By: ${userData?.name || userData?.displayName || 'Administrator'}`, M + 320, headerH + 10);

  // ===== Head (2 tingkat) — lengkap + jelas =====
  const head = [
    [
      { content: 'No', rowSpan: 2 },
      { content: 'Kode Risiko', rowSpan: 2 },
      { content: 'Sumber Risiko', rowSpan: 2 },
      { content: 'Jenis Risiko', rowSpan: 2 },
      { content: 'Departemen', rowSpan: 2 },
      { content: 'Nama Risiko', rowSpan: 2 },

      { content: 'Deskripsi', rowSpan: 2 },
      { content: 'Penyebab', rowSpan: 2 },
      { content: 'Dampak', rowSpan: 2 },

      { content: 'Inheren', colSpan: 5 },   // + Likelihood, Impact, Skor, Existing, Rp
      { content: 'Residual', colSpan: 4 },  // + Likelihood, Impact, Skor, Rp

      { content: 'Pengendalian Tambahan', rowSpan: 2 },
      { content: 'Biaya Pengendalian', rowSpan: 2 },
      { content: 'Pemilik Risiko', rowSpan: 2 },
      { content: 'PIC', rowSpan: 2 },
    ],
    [
      'Skala Kemungkinan', 'Skala Dampak', 'Nilai risiko', 'Pengendalian Existing', 'Nilai Dampak (Rp)',
      'Skala Kemungkinan', 'Skala Dampak', 'Nilai risiko', 'Nilai Dampak (Rp)',
    ],
  ];

  // ===== Body =====
  const body = filteredRisks.map((r, i) => {
    const inherentScore = scoreByConfig(r.initialProbability, r.initialImpact);
    const residualScore = scoreByConfig(r.residualProbability, r.residualImpact);

    return [
      i + 1,
      r.riskCode || r.id?.slice(0, 6) || '-',
      r.riskSource || '-',
      r.riskType || '-',
      r.department || '-',
      r.title || r.riskDescription || '-',

      r.riskDescription || '-',
      r.cause || '-',
      r.effect || '-',

      // INHEREN (urutan: L, I, Skor, Existing, Rp)
      r.initialProbability ?? '',
      r.initialImpact ?? '',
      inherentScore,
      r.existingControl || '-',
      fmtRp(r.inherentRiskQuantification),

      // RESIDUAL (urutan: L, I, Skor, Rp)
      r.residualProbability ?? '',
      r.residualImpact ?? '',
      residualScore,
      fmtRp(r.residualRiskQuantification),

      // Tambahan
      r.additionalControls || '-',
      fmtRp(r.controlCost),
      r.riskOwner || '-',
      r.responsiblePerson || '-',
    ];
  });

  // ===== Lebar kolom & skala agar muat halaman =====
  const totalWidth = page.w - 2 * M;

  // Kolom lebar — dibuat sedikit lebih ramping karena font 6pt
  const colW = {
    0: 22,   // No
    1: 60,   // Kode Risiko
    2: 80,   // Sumber Risiko
    3: 80,   // Jenis Risiko
    4: 84,   // Departemen
    5: 120,  // Nama Risiko

    6: 210,  // Deskripsi
    7: 150,  // Penyebab
    8: 150,  // Dampak

    // INHEREN
    9:  80,  // Skala Kemungkinan (Inheren)
    10: 80,  // Skala Dampak (Inheren)
    11: 68,  // Skor Inheren
    12: 180, // Pengendalian Existing (Inheren) — dibuat lebar sesuai permintaan
    13: 96,  // Nilai Dampak (Rp) Inheren

    // RESIDUAL
    14: 80,  // Skala Kemungkinan (Residual)
    15: 80,  // Skala Dampak (Residual)
    16: 68,  // Skor Residual
    17: 96,  // Nilai Dampak (Rp) Residual

    // Tambahan
    18: 170, // Pengendalian Tambahan
    19: 96,  // Biaya Pengendalian
    20: 96,  // Pemilik Risiko
    21: 86,  // PIC
  };

  const sumW = Object.values(colW).reduce((a, b) => a + b, 0);
  const scale = sumW > totalWidth ? (totalWidth / sumW) : 1;

  const columnStyles = Object.fromEntries(
    Object.keys(colW).map((idx) => ([
      Number(idx),
      {
        cellWidth: Math.floor(colW[idx] * scale),
        halign: [0, 11, 16].includes(Number(idx)) ? 'center' : 'left', // center No & skor
      },
    ])),
  );

  // ===== Tabel =====
  autoTable(doc, {
    startY: headerH + 24,
    head,
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 4, // ===== Isi tabel 6 pt =====
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      lineColor: 225,
      textColor: 33,
      valign: 'top',
      overflow: 'linebreak', // wrap teks panjang
    },
    headStyles: {
      fontSize: 4, // ===== Header tabel 6 pt =====
      fontStyle: 'bold',
      fillColor: [245, 247, 250],
      textColor: 33,
      halign: 'center',
    },
    columnStyles,
    margin: { left: M, right: M },
    tableWidth: 'wrap',   // mengikuti cellWidth
    pageBreak: 'auto',

    // Zebra rows + pewarnaan sel skor
    willDrawCell: (data) => {
      const { section, row, column, cell } = data;

      // Zebra untuk body
      if (section === 'body' && row.index % 2 === 1) {
        doc.setFillColor(250, 250, 252);
        doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
      }

      // Pewarnaan skor (Inheren: col 11, Residual: col 16)
      if (section === 'body' && (column.index === 11 || column.index === 16)) {
        const score = Number(cell.raw);
        const lvl = levelByConfig(score).level;
        const map = {
          Extreme: [255, 77, 77],
          High:    [255, 153, 51],
          Medium:  [255, 210, 77],
          Low:     [120, 200, 120],
        };
        const bg = map[lvl] || [230, 230, 230];
        doc.setFillColor(...bg);
        doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
        doc.setTextColor(33);
      }
    },

    didDrawPage: () => {
      // Footer 6 pt
      const str = `Halaman ${doc.getCurrentPageInfo().pageNumber} dari ${doc.internal.getNumberOfPages()} • Generated ${nowStr}`;
      doc.setFontSize(4);
      doc.setTextColor(120);
      doc.text(str, page.w / 2, page.h - 12, { align: 'center' });
    },
  });

  doc.save(`Risk_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
};



  // ======== EXPORT: RISK REGISTER – XLSX (skor via konfigurasi) ========
  const exportRiskRegisterXLSX = async (filteredRisks) => {
    const ExcelJS = (await import('exceljs')).default;

    const wb = new ExcelJS.Workbook();
    wb.creator = userData?.name || 'ERM System'; wb.created = new Date();

    const ws = wb.addWorksheet('Risk Register', { views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }] });

    // (Opsional) logo di A1:C3
    if (LOGO_BASE64) {
      try {
        const imgId = wb.addImage({ base64: LOGO_BASE64, extension: 'png' });
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, br: { col: 3, row: 3 } });
      } catch {}
    }

    // Title
    ws.mergeCells('D1', 'U1');
    const tCell = ws.getCell('D1');
    tCell.value = 'RISK REGISTER';
    tCell.font = { name: 'Calibri', size: 16, bold: true };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;

    ws.mergeCells('D2', 'U2');
    ws.getCell('D2').value = `PT Odira Energy Karang Agung • Generated: ${new Date().toLocaleString('id-ID')}`;
    ws.getCell('D2').alignment = { horizontal: 'center' };
    ws.getRow(2).height = 18;

    // Grup header baris 3 (Inheren & Residual)
    ws.mergeCells('J3', 'M3'); ws.getCell('J3').value = 'Inheren';
    ws.getCell('J3').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('J3').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('N3', 'Q3'); ws.getCell('N3').value = 'Residual';
    ws.getCell('N3').font = { name: 'Calibri', size: 11, bold: true };
    ws.getCell('N3').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 22;

    // Header rinci (baris 4) sesuai urutan Ibu
    const columns = [
      { key: 'no', header: 'No', width: 6 },
      { key: 'riskCode', header: 'Kode Risiko', width: 12 },
      { key: 'riskSource', header: 'Sumber Risiko', width: 14 },
      { key: 'riskType', header: 'Jenis Risiko', width: 14 },
      { key: 'department', header: 'Departemen', width: 14 },
      { key: 'title', header: 'Nama Risiko', width: 24 },

      { key: 'riskDescription', header: 'Deskripsi', width: 56, wrap: true },
      { key: 'cause', header: 'Penyebab', width: 40, wrap: true },
      { key: 'effect', header: 'Dampak', width: 40, wrap: true },

      // INHEREN
      { key: 'inherentRiskQuantification', header: 'Nilai Dampak (Rp)', width: 20 },
      { key: 'initialProbability', header: 'Nilai & Skala Kemungkinan', width: 20 },
      { key: 'initialImpact', header: 'Skala Dampak', width: 16 },
      { key: 'inherentScore', header: 'Nilai risiko', width: 14 },

      { key: 'existingControl', header: 'Pengendalian Existing', width: 40, wrap: true },

      // RESIDUAL
      { key: 'residualRiskQuantification', header: 'Nilai Dampak Residual (Rp)', width: 22 },
      { key: 'residualProbability', header: 'Skala Kemungkinan', width: 18 },
      { key: 'residualImpact', header: 'Skala Dampak', width: 16 },
      { key: 'residualScore', header: 'Nilai risiko', width: 14 },

      // Tambahan
      { key: 'additionalControls', header: 'Pengendalian Tambahan', width: 40, wrap: true },
      { key: 'controlCost', header: 'Biaya Pengendalian', width: 18 },
      { key: 'riskOwner', header: 'Pemilik Risiko', width: 18 },
      { key: 'responsiblePerson', header: 'PIC', width: 16 },
    ];

    ws.columns = columns.map(c => ({
      key: c.key, width: c.width,
      style: { font: { name: 'Calibri', size: 9 }, alignment: { vertical: 'top', wrapText: !!c.wrap } }
    }));

    const headerRow = ws.getRow(4);
    headerRow.values = columns.map(c => c.header);
    headerRow.font = { name: 'Calibri', size: 10, bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;

    // Rows
    let iRow = 5;
    filteredRisks.forEach((r, i) => {
      const inherentScore = scoreByConfig(r.initialProbability, r.initialImpact);
      const residualScore = scoreByConfig(r.residualProbability, r.residualImpact);

      ws.addRow({
        no: i + 1,
        riskCode: r.riskCode || r.id?.slice(0,6) || '-',
        riskSource: r.riskSource || '-',
        riskType: r.riskType || '-',
        department: r.department || '-',
        title: r.title || r.riskDescription || '-',

        riskDescription: r.riskDescription || '-',
        cause: r.cause || '-',
        effect: r.effect || '-',

        // INHEREN
        inherentRiskQuantification: fmtRp(r.inherentRiskQuantification),
        initialProbability: r.initialProbability || '',
        initialImpact: r.initialImpact || '',
        inherentScore,

        existingControl: r.existingControl || '-',

        // RESIDUAL
        residualRiskQuantification: fmtRp(r.residualRiskQuantification),
        residualProbability: r.residualProbability || '',
        residualImpact: r.residualImpact || '',
        residualScore,

        // Tambahan
        additionalControls: r.additionalControls || '-',
        controlCost: fmtRp(r.controlCost),
        riskOwner: r.riskOwner || '-',
        responsiblePerson: r.responsiblePerson || '-',
      });

      // Tinggi baris dinamis untuk teks panjang
      const lens = [
        String(r.riskDescription || r.title || '').length,
        String(r.cause || '').length,
        String(r.effect || '').length,
        String(r.existingControl || '').length,
        String(r.additionalControls || '').length,
      ];
      const longest = Math.max(...lens);
      const estLines = Math.ceil(longest / 60); // ±60 char/baris
      ws.getRow(iRow).height = Math.max(22, 18 * estLines);
      iRow++;
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Risk_Register_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ======== EXPORT: EXECUTIVE SUMMARY – PDF ========
  const exportExecutiveSummaryPDF = async ({ filteredRisks, filteredTreatments, filteredIncidents }) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const M = 32, headerH = 90;
    const nowStr = new Date().toLocaleString('id-ID');

    // Header
    doc.setFillColor(25,118,210);
    doc.rect(0, 0, page.w, headerH, 'F');
    if (LOGO_BASE64) { try { doc.addImage(LOGO_BASE64, 'PNG', M, 20, 50, 50); } catch {} }
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
    doc.text('EXECUTIVE SUMMARY', page.w / 2, 46, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text('PT Odira Energy Karang Agung', page.w / 2, 66, { align: 'center' });

    // Metrics (skor via konfigurasi dengan L/I terkini bila ada)
    const total     = filteredRisks.length;
    const highExtreme = filteredRisks.filter(r => scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact) >= 16).length;
    const plans     = filteredTreatments.length;
    const completed = filteredTreatments.filter(p => p.status === 'completed').length;
    const inci      = filteredIncidents.length;
    const critical  = filteredIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;

    // Cards
    const cards = [
      { label: 'Total Risks', value: total },
      { label: 'High & Extreme', value: highExtreme },
      { label: 'Treatment Plans', value: plans },
      { label: 'Completed Treatments', value: completed },
      { label: 'Incidents', value: inci },
      { label: 'Critical Incidents', value: critical },
    ];
    const cardW = 162, cardH = 70, gap = 12; let cx = M; const cy = headerH + 20;
    cards.slice(0,4).forEach(c => {
      doc.setFillColor(245,247,250);
      doc.roundedRect(cx, cy, cardW, cardH, 8, 8, 'F');
      doc.setDrawColor(230); doc.roundedRect(cx, cy, cardW, cardH, 8, 8, 'S');
      doc.setTextColor(99); doc.setFontSize(10); doc.text(c.label, cx + 12, cy + 24);
      doc.setTextColor(33); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
      doc.text(String(c.value), cx + 12, cy + 48);
      cx += cardW + gap;
    });

    // Distribusi
    const dist = { Extreme: 0, High: 0, Medium: 0, Low: 0 };
    filteredRisks.forEach(r => {
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      dist[levelByConfig(s).level]++; 
    });
    doc.setFont('helvetica', 'bold'); doc.setTextColor(33); doc.setFontSize(12);
    doc.text('Risk Distribution by Level', M, cy + cardH + 24);

    autoTable(doc, {
      startY: cy + cardH + 30,
      head: [['Level', 'Jumlah', 'Persentase']],
      body: Object.entries(dist).map(([lvl,cnt]) => [lvl, cnt, `${Math.round((cnt/(total||1))*100)}%`]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, lineColor: 230, textColor: 33 },
      headStyles: { fillColor: [245,247,250], textColor: 33, fontStyle: 'bold' },
      margin: { left: M, right: M },
    });

    // Top 10 (skor via konfigurasi)
    doc.text('Top 10 Risks by Score', M, (doc.lastAutoTable?.finalY || (cy + cardH + 30)) + 20);
    const top = [...filteredRisks].sort((a,b)=>{
      const sb = scoreByConfig(b.likelihood ?? b.initialProbability, b.impact ?? b.initialImpact);
      const sa = scoreByConfig(a.likelihood ?? a.initialProbability, a.impact ?? a.initialImpact);
      return sb - sa;
    }).slice(0,10).map(r=>{
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      const lvl = levelByConfig(s).level;
      return [r.riskCode || r.id?.slice(0,6) || '-', (r.riskDescription || r.title || '').slice(0,80), r.department || '-', s, lvl, r.status || 'Identified'];
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || (cy + cardH + 30)) + 26,
      head: [['Kode','Deskripsi','Dept','Score','Level','Status']],
      body: top, theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, lineColor: 230, textColor: 33 },
      headStyles: { fillColor: [245,247,250], textColor: 33, fontStyle: 'bold' },
      margin: { left: M, right: M },
    });

    doc.setFontSize(9); doc.setTextColor(120);
    doc.text(`Generated: ${nowStr}`, page.w / 2, page.h - 20, { align: 'center' });
    doc.save(`Executive_Summary_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // ======== EXPORT: EXECUTIVE SUMMARY – XLSX ========
  const exportExecutiveSummaryXLSX = async ({ filteredRisks, filteredTreatments, filteredIncidents }) => {
    const ExcelJS = (await import('exceljs')).default;

    const wb = new ExcelJS.Workbook();
    wb.creator = userData?.name || 'ERM System'; wb.created = new Date();

    const ws = wb.addWorksheet('Executive Summary');

    const total     = filteredRisks.length;
    const highExtreme = filteredRisks.filter(r => scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact) >= 16).length;
    const plans     = filteredTreatments.length;
    const completed = filteredTreatments.filter(p => p.status === 'completed').length;
    const inci      = filteredIncidents.length;
    const critical  = filteredIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;

    ws.addRow(['Executive Summary']); ws.getRow(1).font = { bold: true, size: 16 };
    ws.addRow([]);
    ws.addRow(['Metric', 'Value']);
    ws.addRow(['Total Risks', total]);
    ws.addRow(['High & Extreme', highExtreme]);
    ws.addRow(['Treatment Plans', plans]);
    ws.addRow(['Completed Treatments', completed]);
    ws.addRow(['Incidents', inci]);
    ws.addRow(['Critical Incidents', critical]);
    ws.addRow([]);

    // Distribution
    ws.addRow(['Risk Distribution by Level']); ws.getRow(ws.lastRow.number).font = { bold: true, size: 12 };
    const dist = { Extreme: 0, High: 0, Medium: 0, Low: 0 };
    filteredRisks.forEach(r => {
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      dist[levelByConfig(s).level]++; 
    });
    ws.addRow(['Level','Jumlah','Persentase']);
    Object.entries(dist).forEach(([lvl,cnt])=> ws.addRow([lvl, cnt, `${Math.round((cnt/(total||1))*100)}%`]));

    // Top 10
    ws.addRow([]); ws.addRow(['Top 10 Risks by Score']); ws.getRow(ws.lastRow.number).font = { bold: true, size: 12 };
    ws.addRow(['Kode','Deskripsi','Dept','Score','Level','Status']);
    [...filteredRisks].sort((a,b)=>{
      const sb = scoreByConfig(b.likelihood ?? b.initialProbability, b.impact ?? b.initialImpact);
      const sa = scoreByConfig(a.likelihood ?? a.initialProbability, a.impact ?? a.initialImpact);
      return sb - sa;
    }).slice(0,10).forEach(r=>{
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      const lvl = levelByConfig(s).level;
      ws.addRow([r.riskCode || r.id?.slice(0,6) || '-', r.riskDescription || r.title || '-', r.department || '-', s, lvl, r.status || 'Identified']);
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
           `Executive_Summary_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ======== EXPORT: EXECUTIVE SUMMARY – TEXT (.txt) ========
  const exportExecutiveSummaryTXT = ({ filteredRisks, filteredTreatments, filteredIncidents }) => {
    const total     = filteredRisks.length;
    const highExtreme = filteredRisks.filter(r => scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact) >= 16).length;
    const plans     = filteredTreatments.length;
    const completed = filteredTreatments.filter(p => p.status === 'completed').length;
    const inci      = filteredIncidents.length;
    const critical  = filteredIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;

    const dist = { Extreme: 0, High: 0, Medium: 0, Low: 0 };
    filteredRisks.forEach(r => { 
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      dist[levelByConfig(s).level]++; 
    });

    const top = [...filteredRisks].sort((a,b)=>{
      const sb = scoreByConfig(b.likelihood ?? b.initialProbability, b.impact ?? b.initialImpact);
      const sa = scoreByConfig(a.likelihood ?? a.initialProbability, a.impact ?? a.initialImpact);
      return sb - sa;
    }).slice(0,10);

    const lines = [];
    lines.push('EXECUTIVE SUMMARY');
    lines.push(`Generated: ${new Date().toLocaleString('id-ID')}`);
    lines.push('');
    lines.push('== Key Metrics ==');
    lines.push(`Total Risks: ${total}`);
    lines.push(`High & Extreme: ${highExtreme}`);
    lines.push(`Treatment Plans: ${plans}`);
    lines.push(`Completed Treatments: ${completed}`);
    lines.push(`Incidents: ${inci}`);
    lines.push(`Critical Incidents: ${critical}`);
    lines.push('');
    lines.push('== Risk Distribution ==');
    Object.entries(dist).forEach(([lvl, cnt]) => {
      const pct = Math.round((cnt / (total || 1)) * 100);
      lines.push(`${lvl}: ${cnt} (${pct}%)`);
    });
    lines.push('');
    lines.push('== Top 10 Risks by Score ==');
    top.forEach((r, idx) => {
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      const lvl = levelByConfig(s).level;
      lines.push(
        `${idx + 1}. ${r.riskCode || r.id?.slice(0,6) || '-'} | Score: ${s} (${lvl}) | Dept: ${r.department || '-'} | ${r.riskDescription || r.title || '-'}`
      );
    });

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Executive_Summary_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ======== EXPORT: EXECUTIVE SUMMARY – Word (.docx) ========
  const exportExecutiveSummaryDOCX = async ({ filteredRisks, filteredTreatments, filteredIncidents, logoBase64 }) => {
    const {
      Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
      Table, TableRow, TableCell, WidthType, ImageRun
    } = await import('docx');

    const total     = filteredRisks.length;
    const highExtreme = filteredRisks.filter(r => scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact) >= 16).length;
    const plans     = filteredTreatments.length;
    const completed = filteredTreatments.filter(p => p.status === 'completed').length;
    const inci      = filteredIncidents.length;
    const critical  = filteredIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;

    const distMap = { Extreme: 0, High: 0, Medium: 0, Low: 0 };
    filteredRisks.forEach(r => { 
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      distMap[levelByConfig(s).level]++; 
    });

    const top = [...filteredRisks].sort((a,b)=>{
      const sb = scoreByConfig(b.likelihood ?? b.initialProbability, b.impact ?? b.initialImpact);
      const sa = scoreByConfig(a.likelihood ?? a.initialProbability, a.impact ?? a.initialImpact);
      return sb - sa;
    }).slice(0,10);

    // Header + Logo
    const headerElems = [];
    if (logoBase64) {
      try {
        const base64 = logoBase64.split(',')[1];
        headerElems.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new ImageRun({
                data: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
                transformation: { width: 100, height: 100 },
              }),
            ],
          })
        );
      } catch {}
    }
    headerElems.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'EXECUTIVE SUMMARY', bold: true, size: 48 })],
      }),
    );
    headerElems.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'PT Odira Energy Karang Agung', size: 24 })],
      }),
    );
    headerElems.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Generated: ${new Date().toLocaleString('id-ID')}`, size: 20 })],
      }),
    );

    // Metrics table
    const metricsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
          ],
        }),
        ...[
          ['Total Risks', total],
          ['High & Extreme', highExtreme],
          ['Treatment Plans', plans],
          ['Completed Treatments', completed],
          ['Incidents', inci],
          ['Critical Incidents', critical],
        ].map(([k, v]) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(String(k))] }),
            new TableCell({ children: [new Paragraph(String(v))] }),
          ],
        })),
      ],
    });

    // Distribution table
    const distTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Level', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Jumlah', bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Persentase', bold: true })] })] }),
          ],
        }),
        ...Object.entries(distMap).map(([lvl, cnt]) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(lvl)] }),
            new TableCell({ children: [new Paragraph(String(cnt))] }),
            new TableCell({ children: [new Paragraph(`${Math.round((cnt/(total||1))*100)}%`)] }),
          ],
        })),
      ],
    });

    // Top 10 paragraf
    const topTitle = new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Top 10 Risks by Score', bold: true })] });
    const topParagraphs = top.map((r, idx) => {
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      const lvl = levelByConfig(s).level;
      return new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: `${r.riskCode || r.id?.slice(0,6) || '-'}`, bold: true }),
          new TextRun({ text: ` | Score: ${s} (${lvl}) | Dept: ${r.department || '-'}` }),
          new TextRun({ text: `\n${r.riskDescription || r.title || '-'}` }),
        ],
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          ...headerElems,
          new Paragraph(''),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Key Metrics', bold: true })] }),
          metricsTable,
          new Paragraph(''),
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Risk Distribution', bold: true })] }),
          distTable,
          new Paragraph(''),
          topTitle,
          ...topParagraphs,
        ],
      }],
    });

    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, `Executive_Summary_${new Date().toISOString().slice(0,10)}.docx`);
  };

  // ======== EXPORT: TREATMENT PROGRESS – XLSX ========
  const exportTreatmentProgressXLSX = async (filteredTreatments) => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook(); wb.created = new Date();
    const ws = wb.addWorksheet('Treatment Progress');

    ws.addRow(['Treatment Progress']); ws.getRow(1).font = { bold: true, size: 16 };
    ws.addRow([]);
    ws.addRow(['No','Description','Status','Progress','Responsible Person','Treatment Type','Created']);
    filteredTreatments.forEach((p,i)=>{
      ws.addRow([i+1, p.treatmentDescription || '-', p.status || '-', `${p.progress || 0}%`,
        p.responsiblePerson || '-', p.treatmentType || '-', p.createdAt ? fmtDate(p.createdAt) : '-']);
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Treatment_Progress_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ======== EXPORT: INCIDENT REPORT – XLSX ========
  const exportIncidentReportXLSX = async (filteredIncidents) => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook(); wb.created = new Date();
    const ws = wb.addWorksheet('Incident Report');

    ws.addRow(['Incident Report']); ws.getRow(1).font = { bold: true, size: 16 };
    ws.addRow([]);
    ws.addRow(['No','Description','Severity','Status','Reported By','Incident Date']);
    filteredIncidents.forEach((x,i)=>{
      ws.addRow([i+1, x.description || '-', x.severity || '-', x.status || '-', x.reportedBy || '-', x.incidentDate ? fmtDate(x.incidentDate) : '-']);
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Incident_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ======== EXPORT: COMPREHENSIVE – XLSX (multi-sheet) ========
  const exportComprehensiveXLSX = async ({ filteredRisks, filteredTreatments, filteredIncidents }) => {
    const ExcelJS = (await import('exceljs')).default;

    const wb = new ExcelJS.Workbook();
    wb.creator = userData?.name || 'ERM System'; wb.created = new Date();

    // Sheet 1: Executive Summary
    const ws1 = wb.addWorksheet('Executive Summary');
    const total     = filteredRisks.length;
    const highExtreme = filteredRisks.filter(r => scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact) >= 16).length;
    const plans     = filteredTreatments.length;
    const completed = filteredTreatments.filter(p => p.status === 'completed').length;
    const inci      = filteredIncidents.length;
    const critical  = filteredIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;

    ws1.addRow(['Executive Summary']); ws1.getRow(1).font = { bold: true, size: 16 };
    ws1.addRow([]); ws1.addRow(['Metric','Value']);
    ws1.addRow(['Total Risks', total]);
    ws1.addRow(['High & Extreme', highExtreme]);
    ws1.addRow(['Treatment Plans', plans]);
    ws1.addRow(['Completed Treatments', completed]);
    ws1.addRow(['Incidents', inci]);
    ws1.addRow(['Critical Incidents', critical]);

    ws1.addRow([]); ws1.addRow(['Risk Distribution by Level']); ws1.getRow(ws1.lastRow.number).font = { bold: true, size: 12 };
    const dist = { Extreme: 0, High: 0, Medium: 0, Low: 0 };
    filteredRisks.forEach(r => {
      const s = scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact);
      dist[levelByConfig(s).level]++; 
    });
    ws1.addRow(['Level','Jumlah','Persentase']);
    Object.entries(dist).forEach(([lvl,cnt]) => ws1.addRow([lvl, cnt, `${Math.round((cnt/(total||1))*100)}%`]));

    // Sheet 2: Risk Register
    const ws2 = wb.addWorksheet('Risk Register', { views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] });
    ws2.addRow([
      'No','Kode Risiko','Sumber Risiko','Jenis Risiko','Departemen','Nama Risiko',
      'Deskripsi','Penyebab','Dampak',
      'Nilai Dampak (Rp)','Nilai & Skala Kemungkinan','Skala Dampak','Nilai risiko','Pengendalian Existing',
      'Nilai Dampak Residual (Rp)','Skala Kemungkinan','Skala Dampak','Nilai risiko',
      'Pengendalian Tambahan','Biaya Pengendalian','Pemilik Risiko','PIC'
    ]);
    filteredRisks.forEach((r,i)=>{
      const inherentScore = scoreByConfig(r.initialProbability, r.initialImpact);
      const residualScore = scoreByConfig(r.residualProbability, r.residualImpact);

      ws2.addRow([
        i+1, r.riskCode || r.id?.slice(0,6) || '-', r.riskSource || '-', r.riskType || '-', r.department || '-', r.title || r.riskDescription || '-',
        r.riskDescription || '-', r.cause || '-', r.effect || '-',
        fmtRp(r.inherentRiskQuantification), r.initialProbability || '', r.initialImpact || '', inherentScore, r.existingControl || '-',
        fmtRp(r.residualRiskQuantification), r.residualProbability || '', r.residualImpact || '', residualScore,
        r.additionalControls || '-', fmtRp(r.controlCost), r.riskOwner || '-', r.responsiblePerson || '-',
      ]);
    });

    // Sheet 3: Treatment Progress
    const ws3 = wb.addWorksheet('Treatment Progress');
    ws3.addRow(['No','Description','Status','Progress','Responsible Person','Treatment Type','Created']);
    filteredTreatments.forEach((p,i)=> ws3.addRow([i+1, p.treatmentDescription || '-', p.status || '-', `${p.progress || 0}%`, p.responsiblePerson || '-', p.treatmentType || '-', p.createdAt ? fmtDate(p.createdAt) : '-']));

    // Sheet 4: Incident Report
    const ws4 = wb.addWorksheet('Incident Report');
    ws4.addRow(['No','Description','Severity','Status','Reported By','Incident Date']);
    filteredIncidents.forEach((x,i)=> ws4.addRow([i+1, x.description || '-', x.severity || '-', x.status || '-', x.reportedBy || '-', x.incidentDate ? fmtDate(x.incidentDate) : '-']));

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `ERM_Comprehensive_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ======== HANDLER GENERATE ========
  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const { filteredRisks, filteredTreatments, filteredIncidents } = getFilteredData();
      const t = reportConfig.reportType;
      const f = reportConfig.format;

      // Validasi data per tipe
      if (t === 'risk_register'        && filteredRisks.length      === 0) { showSnackbar('Risk kosong untuk filter ini.', 'warning'); return; }
      if (t === 'treatment_progress'   && filteredTreatments.length === 0) { showSnackbar('Treatment kosong untuk filter ini.', 'warning'); return; }
      if (t === 'incident_report'      && filteredIncidents.length  === 0) { showSnackbar('Incident kosong untuk filter ini.', 'warning'); return; }

      if (t === 'risk_register') {
        if (f === 'pdf')      await exportRiskRegisterPDF(filteredRisks);
        if (f === 'excel')    await exportRiskRegisterXLSX(filteredRisks);
        if (f === 'word')     showSnackbar('Format Word tidak tersedia untuk Risk Register. Gunakan PDF/Excel.', 'info');
        if (f === 'text')     showSnackbar('Format Text tidak tersedia untuk Risk Register. Gunakan PDF/Excel.', 'info');
      } else if (t === 'executive_summary') {
        if (f === 'pdf')      await exportExecutiveSummaryPDF({ filteredRisks, filteredTreatments, filteredIncidents });
        if (f === 'excel')    await exportExecutiveSummaryXLSX({ filteredRisks, filteredTreatments, filteredIncidents });
        if (f === 'word')     await exportExecutiveSummaryDOCX({ filteredRisks, filteredTreatments, filteredIncidents, logoBase64: LOGO_BASE64 });
        if (f === 'text')     exportExecutiveSummaryTXT({ filteredRisks, filteredTreatments, filteredIncidents });
      } else if (t === 'treatment_progress') {
        if (f === 'excel')    await exportTreatmentProgressXLSX(filteredTreatments);
        if (f === 'pdf' || f === 'word' || f === 'text') showSnackbar('Gunakan Excel untuk Treatment Progress.', 'info');
      } else if (t === 'incident_report') {
        if (f === 'excel')    await exportIncidentReportXLSX(filteredIncidents);
        if (f === 'pdf' || f === 'word' || f === 'text') showSnackbar('Gunakan Excel untuk Incident Report.', 'info');
      } else if (t === 'comprehensive') {
        if (f === 'excel')    await exportComprehensiveXLSX({ filteredRisks, filteredTreatments, filteredIncidents });
        if (f === 'pdf' || f === 'word' || f === 'text') showSnackbar('Comprehensive tersedia sebagai Excel multi-sheet.', 'info');
      }

      showSnackbar(`Export ${t.replace('_',' ').toUpperCase()} (${f.toUpperCase()}) berhasil.`, 'success');
    } catch (error) {
      console.error(error);
      showSnackbar('Error saat export: ' + error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ======== UI ========
  const reportTypes = [
    { value: 'executive_summary', label: 'Executive Summary', icon: <Analytics /> },
    { value: 'risk_register',     label: 'Risk Register',     icon: <Warning /> },
    { value: 'treatment_progress',label: 'Treatment Progress',icon: <Assignment /> },
    { value: 'incident_report',   label: 'Incident Report',   icon: <Warning /> },
    { value: 'comprehensive',     label: 'Comprehensive Report', icon: <TableChart /> },
  ];

  const dateRanges = [
    { value: 'last_week',    label: 'Minggu Lalu' },
    { value: 'last_month',   label: 'Bulan Lalu' },
    { value: 'last_quarter', label: 'Kuartal Lalu' },
    { value: 'last_year',    label: 'Tahun Lalu' },
    { value: 'all_time',     label: 'Semua Data' },
  ];

  const { filteredRisks, filteredTreatments, filteredIncidents } = getFilteredData();
  const stats = {
    totalRisks: filteredRisks.length,
    highRisks: filteredRisks.filter(r => scoreByConfig(r.likelihood ?? r.initialProbability, r.impact ?? r.initialImpact) >= 16).length,
    totalTreatments: filteredTreatments.length,
    completedTreatments: filteredTreatments.filter(p => p.status === 'completed').length,
    totalIncidents: filteredIncidents.length,
    criticalIncidents: filteredIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Reporting System...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={3}>
            <Box sx={{ p: 2, backgroundColor: 'primary.main', borderRadius: 2, color: 'white' }}>
              <PictureAsPdf sx={{ fontSize: 40 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">Reporting System</Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Generate laporan risiko untuk Direksi & Dewan Komisaris
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Data terkini: {risks.length} Risks, {treatmentPlans.length} Treatments, {incidents.length} Incidents
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Config */}
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 3, height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Report Configuration</Typography>

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
                          <PictureAsPdf /> PDF Document
                        </Box>
                      </MenuItem>
                      <MenuItem value="excel">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TableChart /> Excel (.xlsx)
                        </Box>
                      </MenuItem>
                      <MenuItem value="word">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Assignment /> Word (.docx)
                        </Box>
                      </MenuItem>
                      <MenuItem value="text">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Assignment /> Text (.txt)
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
                    variant="contained" fullWidth size="large"
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
                    variant="outlined" fullWidth
                    startIcon={<Schedule />}
                    onClick={() => setScheduleDialog(true)}
                  >
                    Schedule Report
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Templates & Data Preview */}
        <Grid item xs={12} md={8}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Available Report Templates</Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {reportTypes.map((template) => (
                  <Grid item xs={12} key={template.value}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2, cursor: 'pointer',
                        border: reportConfig.reportType === template.value ? 2 : 1,
                        borderColor: reportConfig.reportType === template.value ? 'primary.main' : 'divider',
                        backgroundColor: reportConfig.reportType === template.value ? 'primary.light' : 'background.paper',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                      onClick={() => setReportConfig({ ...reportConfig, reportType: template.value })}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ color: 'primary.main' }}>{template.icon}</Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {template.label}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {getTemplateDescription(template.value)}
                          </Typography>
                        </Box>
                        <Chip label="PDF/Excel/Word/Text" size="small" variant="outlined" />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Data Preview (Risks) */}
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
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 420 }}>
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
                        const s = scoreByConfig(risk.likelihood ?? risk.initialProbability, risk.impact ?? risk.initialImpact);
                        const lvl = levelByConfig(s).level;
                        const color = lvl === 'Extreme' || lvl === 'High' ? 'error' : (lvl === 'Medium' ? 'warning' : 'success');
                        return (
                          <TableRow key={risk.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {risk.riskCode || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                              }}>
                                {risk.title}
                              </Typography>
                            </TableCell>
                            <TableCell align="center"><Typography variant="caption">{risk.department || '-'}</Typography></TableCell>
                            <TableCell align="center"><Typography variant="body2">{risk.likelihood ?? risk.initialProbability ?? '-'}</Typography></TableCell>
                            <TableCell align="center"><Typography variant="body2">{risk.impact ?? risk.initialImpact ?? '-'}</Typography></TableCell>
                            <TableCell align="center"><Typography variant="body2" fontWeight="bold">{s}</Typography></TableCell>
                            <TableCell align="center"><Chip label={lvl} color={color} size="small" /></TableCell>
                            <TableCell align="center">
                              <Chip label={risk.status || 'Identified'} size="small" variant="outlined" />
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

      {/* Schedule Dialog */}
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
                <Select value={'monthly'} label="Frequency" onChange={() => {}}>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipients (Email)"
                placeholder="email1@company.com, email2@company.com"
                helperText="Pisahkan multiple emails dengan koma"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setScheduleDialog(false)}>Schedule Report</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );

  function getTemplateDescription(type) {
    const descriptions = {
      executive_summary: 'Ringkasan metrik, distribusi level, dan Top 10—skor taat konfigurasi.',
      risk_register: 'Daftar risiko lengkap dengan grup Inheren & Residual (termasuk nilai dampak Rp).',
      treatment_progress: 'Status dan progress treatment plans.',
      incident_report: 'Laporan kejadian risiko.',
      comprehensive: 'Workbook multi-sheet: Executive, Risk Register, Treatment, Incident.',
    };
    return descriptions[type] || 'Standard report template';
  }
};

export default Reporting;
