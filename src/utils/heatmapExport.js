// utils/heatmapExport.js
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Export heatmap as PNG image
 */
export const exportHeatmapAsPNG = async (elementId, fileName = 'risk-heatmap.png') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas to Blob conversion failed'));
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        resolve({ success: true, fileName });
      }, 'image/png', 1.0);
    });
  } catch (error) {
    console.error('Error exporting PNG:', error);
    throw error;
  }
};

/**
 * Export heatmap data as PDF
 */
export const exportHeatmapAsPDF = async (
  heatmapData,
  filters,
  viewMode,
  fileName = 'risk-heatmap-report.pdf'
) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(20);
    doc.setTextColor(25, 118, 210);
    doc.text('Risk Heat Map Report', 105, 20, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      20,
      30
    );

    // View Mode and Filters
    doc.setFontSize(10);
    doc.text(`View Mode: ${viewMode === 'inherent' ? 'Inherent Risk' : 'Residual Risk'}`, 20, 40);
    
    const filterText = Object.entries(filters)
      .filter(([key, value]) => value !== 'all' && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
    
    if (filterText) {
      doc.text(`Filters: ${filterText}`, 20, 45);
    }

    // Summary Table
    doc.autoTable({
      startY: 55,
      head: [['Position', 'Likelihood', 'Impact', 'Risk Count', 'Risk Level']],
      body: heatmapData.map(cell => [
        `L${cell.likelihood}-I${cell.impact}`,
        getLikelihoodLabel(cell.likelihood),
        getImpactLabel(cell.impact),
        cell.riskCount.toString(),
        cell.riskLevel
      ]),
      theme: 'striped',
      headStyles: { fillColor: [25, 118, 210] },
      margin: { left: 20, right: 20 }
    });

    // Statistics
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(25, 118, 210);
    doc.text('Statistics Summary', 20, finalY);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const totalRisks = heatmapData.reduce((sum, cell) => sum + cell.riskCount, 0);
    const highRiskCells = heatmapData.filter(cell => 
      cell.riskLevel.includes('High') || cell.riskLevel.includes('Extreme')
    ).length;

    const stats = [
      ['Total Cells', heatmapData.length.toString()],
      ['Total Risks', totalRisks.toString()],
      ['High Risk Cells', highRiskCells.toString()],
      ['Average Risks per Cell', (totalRisks / heatmapData.length).toFixed(1)]
    ];

    doc.autoTable({
      startY: finalY + 5,
      body: stats,
      theme: 'plain',
      margin: { left: 20 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 40 }
      }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | ERM System - Risk Assessment Report`,
        105,
        200,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};

/**
 * Export heatmap data as CSV
 */
export const exportHeatmapAsCSV = (heatmapData, fileName = 'risk-heatmap-data.csv') => {
  try {
    // Create CSV content
    const headers = ['Position', 'Likelihood', 'Impact', 'Risk_Count', 'Risk_Level', 'Score'];
    
    const csvRows = [
      headers.join(','),
      ...heatmapData.map(cell => [
        `L${cell.likelihood}-I${cell.impact}`,
        cell.likelihood,
        cell.impact,
        cell.riskCount,
        cell.riskLevel,
        cell.score
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Create Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
};

/**
 * Export cell details as text report
 */
export const exportCellDetailsAsText = (cellData, fileName = 'risk-cell-details.txt') => {
  try {
    const { likelihood, impact, risks, score, riskLevel } = cellData;
    
    const textContent = `
RISK HEATMAP CELL DETAIL REPORT
================================

Cell Position: L${likelihood}-I${impact}
Risk Score: ${score}
Risk Level: ${riskLevel}
Total Risks: ${risks.length}
Report Date: ${new Date().toLocaleString()}

RISK LIST:
${risks.map((risk, index) => `
${index + 1}. ${risk.riskCode || risk.id}
    Description: ${risk.riskDescription || risk.riskTitle || 'N/A'}
    Category: ${risk.category || 'Uncategorized'}
    Owner: ${risk.riskOwner || 'Unassigned'}
    Status: ${risk.status || 'identified'}
    Inherent Score: ${risk.inherentScore || 'N/A'}
    Residual Score: ${risk.residualScore || 'N/A'}
`).join('\n')}

SUMMARY:
- High Risk Items: ${risks.filter(r => r.inherentLevel?.includes('High') || r.inherentLevel?.includes('Extreme')).length}
- With Treatment Plans: ${risks.filter(r => r.treatmentPlan).length}
- Average Risk Score: ${risks.reduce((sum, r) => sum + (r.inherentScore || 0), 0) / risks.length}

RECOMMENDATIONS:
1. Review high-risk items immediately
2. Ensure treatment plans are effective
3. Monitor risk reduction progress

---
Generated by ERM System
`;

    // Create Blob and download
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting text:', error);
    throw error;
  }
};

// Helper functions
const getLikelihoodLabel = (level) => {
  const labels = {
    1: 'Remote',
    2: 'Unlikely',
    3: 'Possible',
    4: 'Probable',
    5: 'Highly Probable'
  };
  return labels[level] || `Level ${level}`;
};

const getImpactLabel = (level) => {
  const labels = {
    1: 'Insignificant',
    2: 'Minor',
    3: 'Moderate',
    4: 'Major',
    5: 'Catastrophic'
  };
  return labels[level] || `Level ${level}`;
};

// Batch export function
export const exportBatchHeatmap = async (exportType, data, options = {}) => {
  switch (exportType) {
    case 'png':
      return await exportHeatmapAsPNG(options.elementId, options.fileName);
    case 'pdf':
      return await exportHeatmapAsPDF(data, options.filters, options.viewMode, options.fileName);
    case 'csv':
      return exportHeatmapAsCSV(data, options.fileName);
    case 'text':
      return exportCellDetailsAsText(data, options.fileName);
    default:
      throw new Error(`Unsupported export type: ${exportType}`);
  }
};