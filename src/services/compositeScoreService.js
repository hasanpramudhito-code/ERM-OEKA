import { db } from '../config/firebase';
import { collection, doc, getDocs, addDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

class CompositeScoreService {
  
  // ✅ MANUAL CALCULATE - DIPERBAIKI untuk data yang ADA
  async manualCalculate(organizationUnitId = 'default') {
    try {
      console.log('🔄 Manual calculate dengan data REAL dari Firestore...');
      
      // 1. LOAD SEMUA DATA YANG ADA (tanpa filter strict)
      const risksQuery = query(collection(db, 'risks'));
      const treatmentsQuery = query(collection(db, 'treatment_plans'));
      const incidentsQuery = query(collection(db, 'incidents'));
      
      const [risksSnapshot, treatmentsSnapshot, incidentsSnapshot] = await Promise.all([
        getDocs(risksQuery),
        getDocs(treatmentsQuery),
        getDocs(incidentsQuery)
      ]);
      
      const risks = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const treatments = treatmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const incidents = incidentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log(`📊 Data ditemukan: ${risks.length} risks, ${treatments.length} treatments, ${incidents.length} incidents`);
      
      // 2. HITUNG DARI DATA YANG ADA (FLEXIBLE field names)
      
      // A. INHERENT RISK SCORE (dari likelihood & impact yang ada)
      let inherentScore = this.calculateInherentRiskFromExistingData(risks);
      
      // B. RESIDUAL RISK SCORE (sama seperti inherent untuk sekarang)
      let residualScore = inherentScore * 0.8; // Simplified
      
      // C. TREATMENT PROGRESS SCORE
      let treatmentScore = this.calculateTreatmentProgressFromExistingData(treatments);
      
      // D. KRI/INCIDENT SCORE
      let kriScore = this.calculateIncidentScoreFromExistingData(incidents);
      
      // 3. HITUNG COMPOSITE SCORE (weighted)
      const compositeScore = Math.round(
        (inherentScore * 0.30) +
        (residualScore * 0.25) +
        (kriScore * 0.25) + 
        (treatmentScore * 0.20)
      );
      
      // 4. BUAT RESULT
      const result = {
        score: compositeScore,
        risk_level: this.getRiskLevel(compositeScore),
        trend: await this.getTrendFromHistory(),
        components: {
          inherent_risk: Math.round(inherentScore),
          residual_risk: Math.round(residualScore),
          kri_performance: Math.round(kriScore),
          treatment_progress: Math.round(treatmentScore)
        },
        metadata: {
          total_risks: risks.length,
          total_treatments: treatments.length,
          total_incidents: incidents.length,
          assessed_risks: risks.filter(r => r.likelihood && r.impact).length,
          critical_incidents: incidents.filter(i => i.severity === 'critical').length,
          data_source: 'Firestore Real Data'
        },
        calculated_at: Timestamp.now()
      };
      
      console.log('✅ Composite Score REAL:', result);
      
      // Save ke history
      await this.saveToHistory(result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in manual calculate:', error);
      
      // Return fallback score
      return this.getFallbackScore();
    }
  }
  
  // ✅ HITUNG INHERENT RISK DARI DATA YANG ADA
  calculateInherentRiskFromExistingData(risks) {
    if (risks.length === 0) return 50; // Default jika tidak ada data
    
    let totalScore = 0;
    let count = 0;
    
    risks.forEach(risk => {
      // COBA SEMUA KEMUNGKINAN FIELD NAMES
      const likelihood = risk.likelihood || 
                        risk.initialProbability || 
                        risk.probability || 
                        risk.likelihoodScore || 
                        1;
      
      const impact = risk.impact || 
                    risk.initialImpact || 
                    risk.consequence || 
                    risk.impactScore || 
                    1;
      
      // Pastikan numeric
      const numLikelihood = Number(likelihood) || 1;
      const numImpact = Number(impact) || 1;
      
      const riskScore = numLikelihood * numImpact; // 1-25 scale
      totalScore += riskScore;
      count++;
    });
    
    const averageScore = totalScore / count;
    
    // Convert to 0-100 scale (inverse: higher risk = lower score)
    const convertedScore = Math.max(0, 100 - (averageScore * 4));
    
    console.log(`📈 Inherent Risk: avg=${averageScore.toFixed(2)}, converted=${convertedScore.toFixed(0)}`);
    return convertedScore;
  }
  
  // ✅ HITUNG TREATMENT PROGRESS DARI DATA YANG ADA
  calculateTreatmentProgressFromExistingData(treatments) {
    if (treatments.length === 0) return 50; // Default
    
    let totalProgress = 0;
    let count = 0;
    
    treatments.forEach(treatment => {
      // COBA SEMUA KEMUNGKINAN FIELD NAMES
      const progress = treatment.progress || 
                      treatment.progressPercentage || 
                      treatment.completion || 
                      0;
      
      const numProgress = Number(progress) || 0;
      totalProgress += numProgress;
      count++;
    });
    
    const averageProgress = count > 0 ? totalProgress / count : 50;
    
    console.log(`📊 Treatment Progress: avg=${averageProgress.toFixed(1)}%`);
    return averageProgress;
  }
  
  // ✅ HITUNG INCIDENT/KRI SCORE DARI DATA YANG ADA
  calculateIncidentScoreFromExistingData(incidents) {
    if (incidents.length === 0) return 80; // Good score jika tidak ada incidents
    
    let totalScore = 0;
    let count = 0;
    
    incidents.forEach(incident => {
      let incidentScore = 50; // Default
      
      // Tentukan score berdasarkan severity
      const severity = (incident.severity || '').toLowerCase();
      if (severity.includes('critical') || severity.includes('high')) {
        incidentScore = 20; // Bad
      } else if (severity.includes('medium') || severity.includes('moderate')) {
        incidentScore = 50; // Neutral
      } else if (severity.includes('low') || severity.includes('minor')) {
        incidentScore = 80; // Good
      } else if (severity.includes('resolved') || severity.includes('closed')) {
        incidentScore = 90; // Very good
      }
      
      totalScore += incidentScore;
      count++;
    });
    
    const averageScore = count > 0 ? totalScore / count : 80;
    
    console.log(`🚨 Incident Score: avg=${averageScore.toFixed(0)} (${incidents.length} incidents)`);
    return averageScore;
  }
  
  // ✅ GET RISK LEVEL dari score
  getRiskLevel(score) {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Moderate Risk';
    if (score >= 40) return 'Medium Risk';
    if (score >= 20) return 'High Risk';
    return 'Critical Risk';
  }
  
  // ✅ GET TREND dari history
  async getTrendFromHistory() {
    try {
      const historyQuery = query(
        collection(db, 'composite_scores'),
        orderBy('calculated_at', 'desc'),
        limit(2)
      );
      
      const historySnapshot = await getDocs(historyQuery);
      const history = historySnapshot.docs.map(doc => doc.data());
      
      if (history.length < 2) return 'stable';
      
      const latest = history[0].score || 50;
      const previous = history[1].score || 50;
      
      if (latest > previous + 5) return 'improving';
      if (latest < previous - 5) return 'deteriorating';
      return 'stable';
      
    } catch (error) {
      console.log('No history found, using stable trend');
      return 'stable';
    }
  }
  
  // ✅ SAVE TO HISTORY
  async saveToHistory(scoreData) {
    try {
      await addDoc(collection(db, 'composite_scores'), scoreData);
      console.log('✅ Score saved to history');
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  }
  
  // ✅ GET SCORE HISTORY
  async getScoreHistory(limitCount = 10) {
    try {
      console.log('Getting score history...');
      
      const scoresRef = collection(db, 'composite_scores');
      const q = query(scoresRef, orderBy('calculated_at', 'desc'), limit(limitCount));
      
      const querySnapshot = await getDocs(q);
      const scores = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scores.push({
          id: doc.id,
          ...data,
          calculated_at: data.calculated_at?.toDate?.() || new Date()
        });
      });
      
      console.log(`✅ Retrieved ${scores.length} score records`);
      return scores;
      
    } catch (error) {
      console.error('Error getting score history:', error);
      return [];
    }
  }
  
  // ✅ FALLBACK SCORE jika error
  getFallbackScore() {
    return {
      score: 65,
      risk_level: 'Medium Risk',
      trend: 'stable',
      components: {
        inherent_risk: 60,
        residual_risk: 70,
        kri_performance: 50,
        treatment_progress: 80
      },
      metadata: {
        total_risks: 0,
        total_treatments: 0,
        total_incidents: 0,
        data_source: 'Fallback (error)'
      },
      calculated_at: Timestamp.now()
    };
  }
  
  // ✅ FUNGSI LAMA (untuk kompatibilitas)
  async calculateCompositeScore(organizationUnitId = 'default', period = 'monthly') {
    // Panggil manualCalculate untuk backward compatibility
    return this.manualCalculate(organizationUnitId);
  }
}

export default new CompositeScoreService();