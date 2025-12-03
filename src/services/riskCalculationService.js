import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

class RiskCalculationService {
  
  // ✅ CALCULATE RISK LEVEL BERDASARKAN KOORDINAT 2D
  calculateRiskLevel(likelihood, impact) {
    // Validasi input
    likelihood = Math.max(1, Math.min(5, parseInt(likelihood) || 1));
    impact = Math.max(1, Math.min(5, parseInt(impact) || 1));
    
    // Koordinat heatmap 2D
    const coordinates = {
      likelihood: likelihood,
      impact: impact,
      x: likelihood,  // X-axis untuk heatmap
      y: impact       // Y-axis untuk heatmap
    };
    
    // Risk matrix configuration (bisa di-customize)
    const riskMatrix = this.getRiskMatrixConfiguration();
    
    // Cari risk level berdasarkan koordinat
    const riskLevel = this.findRiskLevelInMatrix(coordinates, riskMatrix);
    
    return {
      level: riskLevel.level,
      color: riskLevel.color,
      score: riskLevel.score,
      coordinates: coordinates,
      position: this.calculateHeatmapPosition(coordinates),
      description: riskLevel.description
    };
  }
  
  // ✅ RISK MATRIX CONFIGURATION (5x5 Grid)
  getRiskMatrixConfiguration() {
    return {
      // Format: [min_likelihood, max_likelihood, min_impact, max_impact, level, color, score, description]
      zones: [
        // EXTREME RISK (Merah) - Sudut kanan atas
        [4, 5, 4, 5, 'Extreme', '#d32f2f', 25, 'Risiko sangat tinggi, butuh perhatian eksekutif segera'],
        [5, 5, 3, 5, 'Extreme', '#d32f2f', 24, 'Risiko sangat tinggi, butuh perhatian eksekutif segera'],
        [3, 5, 5, 5, 'Extreme', '#d32f2f', 23, 'Risiko sangat tinggi, butuh perhatian eksekutif segera'],
        
        // HIGH RISK (Oranye) - Area tinggi
        [4, 5, 3, 3, 'High', '#f57c00', 20, 'Risiko tinggi, butuh rencana aksi manajemen'],
        [3, 4, 4, 4, 'High', '#f57c00', 19, 'Risiko tinggi, butuh rencana aksi manajemen'],
        [2, 3, 5, 5, 'High', '#f57c00', 18, 'Risiko tinggi, dampak sangat besar'],
        [5, 5, 2, 2, 'High', '#f57c00', 17, 'Risiko tinggi, kemungkinan sangat besar'],
        
        // MEDIUM RISK (Kuning) - Area tengah
        [3, 3, 3, 3, 'Medium', '#fbc02d', 15, 'Risiko medium, perlu monitoring rutin'],
        [2, 3, 4, 4, 'Medium', '#fbc02d', 14, 'Risiko medium, dampak signifikan'],
        [4, 4, 2, 2, 'Medium', '#fbc02d', 13, 'Risiko medium, kemungkinan signifikan'],
        [2, 2, 3, 3, 'Medium', '#fbc02d', 12, 'Risiko medium'],
        
        // LOW RISK (Hijau) - Area kiri bawah
        [1, 2, 1, 2, 'Low', '#388e3c', 8, 'Risiko rendah, monitoring standar'],
        [1, 1, 3, 3, 'Low', '#388e3c', 7, 'Risiko rendah, dampak terbatas'],
        [3, 3, 1, 1, 'Low', '#388e3c', 6, 'Risiko rendah, kemungkinan terbatas'],
        
        // VERY LOW RISK (Biru) - Sudut kiri bawah
        [1, 1, 1, 2, 'Very Low', '#1976d2', 3, 'Risiko sangat rendah'],
        [1, 2, 1, 1, 'Very Low', '#1976d2', 2, 'Risiko sangat rendah'],
        [1, 1, 1, 1, 'Very Low', '#1976d2', 1, 'Risiko dapat diabaikan']
      ]
    };
  }
  
  // ✅ FIND RISK LEVEL BERDASARKAN KOORDINAT
  findRiskLevelInMatrix(coordinates, riskMatrix) {
    const { likelihood, impact } = coordinates;
    
    for (const zone of riskMatrix.zones) {
      const [minLikelihood, maxLikelihood, minImpact, maxImpact, level, color, score, description] = zone;
      
      if (likelihood >= minLikelihood && likelihood <= maxLikelihood &&
          impact >= minImpact && impact <= maxImpact) {
        return { level, color, score, description };
      }
    }
    
    // Fallback ke default
    const fallbackScore = likelihood * impact;
    let fallbackLevel = 'Medium';
    let fallbackColor = '#fbc02d';
    
    if (fallbackScore >= 20) {
      fallbackLevel = 'Extreme';
      fallbackColor = '#d32f2f';
    } else if (fallbackScore >= 15) {
      fallbackLevel = 'High';
      fallbackColor = '#f57c00';
    } else if (fallbackScore >= 10) {
      fallbackLevel = 'Medium';
      fallbackColor = '#fbc02d';
    } else if (fallbackScore >= 5) {
      fallbackLevel = 'Low';
      fallbackColor = '#388e3c';
    } else {
      fallbackLevel = 'Very Low';
      fallbackColor = '#1976d2';
    }
    
    return { 
      level: fallbackLevel, 
      color: fallbackColor, 
      score: fallbackScore,
      description: 'Risiko perlu assessment lebih lanjut' 
    };
  }
  
  // ✅ CALCULATE HEATMAP POSITION (untuk visualisasi)
  calculateHeatmapPosition(coordinates) {
    const { likelihood, impact } = coordinates;
    
    // Convert ke position dalam grid 5x5 (0-100%)
    const x = ((likelihood - 1) / 4) * 100; // 0% sampai 100%
    const y = 100 - ((impact - 1) / 4) * 100; // 100% sampai 0% (invert Y-axis)
    
    return { x, y };
  }
  
  // ✅ GET ALL RISKS WITH HEATMAP COORDINATES
  async getAllRisksWithHeatmap(organizationId = null) {
    try {
      let risksQuery;
      if (organizationId) {
        risksQuery = query(
          collection(db, 'risks'),
          where('organization_unit_id', '==', organizationId),
          where('status', 'in', ['active', 'monitoring'])
        );
      } else {
        risksQuery = query(collection(db, 'risks'));
      }
      
      const querySnapshot = await getDocs(risksQuery);
      const risks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Add heatmap data untuk setiap risk
      return risks.map(risk => {
        const likelihood = risk.likelihood || 1;
        const impact = risk.impact || 1;
        const heatmapData = this.calculateRiskLevel(likelihood, impact);
        
        return {
          ...risk,
          heatmap: heatmapData,
          // Legacy score untuk compatibility
          riskScore: likelihood * impact,
          riskLevel: heatmapData.level
        };
      });
    } catch (error) {
      console.error('Error getting risks with heatmap:', error);
      return [];
    }
  }
  
  // ✅ GET HEATMAP DATA UNTUK VISUALISASI
  async getHeatmapData(organizationId = null) {
    const risks = await this.getAllRisksWithHeatmap(organizationId);
    
    // Group risks by coordinates
    const heatmapData = {};
    
    risks.forEach(risk => {
      const key = `${risk.heatmap.coordinates.likelihood}-${risk.heatmap.coordinates.impact}`;
      
      if (!heatmapData[key]) {
        heatmapData[key] = {
          coordinates: risk.heatmap.coordinates,
          position: risk.heatmap.position,
          count: 0,
          risks: [],
          level: risk.heatmap.level,
          color: risk.heatmap.color
        };
      }
      
      heatmapData[key].count++;
      heatmapData[key].risks.push({
        id: risk.id,
        title: risk.title,
        description: risk.description
      });
    });
    
    return {
      risks: risks,
      heatmap: Object.values(heatmapData),
      statistics: this.calculateHeatmapStatistics(risks)
    };
  }
  
  // ✅ CALCULATE HEATMAP STATISTICS
  calculateHeatmapStatistics(risks) {
    const stats = {
      total: risks.length,
      byLevel: {
        'Extreme': 0,
        'High': 0,
        'Medium': 0,
        'Low': 0,
        'Very Low': 0
      },
      byCoordinate: {},
      highestRisk: null
    };
    
    let maxScore = 0;
    
    risks.forEach(risk => {
      // Count by level
      stats.byLevel[risk.heatmap.level] = (stats.byLevel[risk.heatmap.level] || 0) + 1;
      
      // Count by coordinate
      const coordKey = `${risk.heatmap.coordinates.likelihood},${risk.heatmap.coordinates.impact}`;
      stats.byCoordinate[coordKey] = (stats.byCoordinate[coordKey] || 0) + 1;
      
      // Find highest risk
      if (risk.heatmap.score > maxScore) {
        maxScore = risk.heatmap.score;
        stats.highestRisk = risk;
      }
    });
    
    return stats;
  }
  
  // ✅ COMPARE TWO RISK POSITIONS
  compareRiskPositions(risk1, risk2) {
    const pos1 = risk1.heatmap.position;
    const pos2 = risk2.heatmap.position;
    
    // Calculate Euclidean distance dalam heatmap space
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
    
    return {
      distance: distance,
      risk1Position: `L${risk1.heatmap.coordinates.likelihood}-I${risk1.heatmap.coordinates.impact}`,
      risk2Position: `L${risk2.heatmap.coordinates.likelihood}-I${risk2.heatmap.coordinates.impact}`,
      similarity: Math.max(0, 100 - (distance * 10)) // 0-100% similarity
    };
  }
  
  // ✅ GET RISK CLUSTERS (group risks dengan posisi similar)
  getRiskClusters(risks, maxDistance = 20) {
    const clusters = [];
    const processed = new Set();
    
    risks.forEach((risk, index) => {
      if (processed.has(risk.id)) return;
      
      const cluster = {
        center: risk.heatmap.position,
        risks: [risk],
        level: risk.heatmap.level,
        color: risk.heatmap.color
      };
      
      // Find similar risks
      risks.forEach((otherRisk, otherIndex) => {
        if (index === otherIndex || processed.has(otherRisk.id)) return;
        
        const comparison = this.compareRiskPositions(risk, otherRisk);
        if (comparison.distance <= maxDistance) {
          cluster.risks.push(otherRisk);
          processed.add(otherRisk.id);
        }
      });
      
      clusters.push(cluster);
      processed.add(risk.id);
    });
    
    return clusters;
  }

  // ✅ GET RISK MATRIX FOR DISPLAY (untuk table view)
  getRiskMatrixForDisplay() {
    const matrix = [];
    
    for (let impact = 5; impact >= 1; impact--) {
      const row = [];
      for (let likelihood = 1; likelihood <= 5; likelihood++) {
        const riskData = this.calculateRiskLevel(likelihood, impact);
        row.push({
          likelihood,
          impact,
          level: riskData.level,
          color: riskData.color,
          description: riskData.description,
          score: riskData.score
        });
      }
      matrix.push(row);
    }
    
    return matrix;
  }

  // ✅ VALIDATE RISK COORDINATES
  validateRiskCoordinates(likelihood, impact) {
    const errors = [];
    
    if (likelihood < 1 || likelihood > 5) {
      errors.push('Likelihood harus antara 1-5');
    }
    
    if (impact < 1 || impact > 5) {
      errors.push('Impact harus antara 1-5');
    }
    
    if (isNaN(likelihood) || isNaN(impact)) {
      errors.push('Likelihood dan Impact harus angka');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

export default new RiskCalculationService();