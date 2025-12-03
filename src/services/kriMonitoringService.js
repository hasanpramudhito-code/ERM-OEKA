import KRIService from './kriService';

class KRIMonitoringService {
  constructor() {
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  // ✅ START MONITORING (panggil di App.js)
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('KRI Monitoring is already running');
      return;
    }

    console.log('Starting KRI Monitoring Service...');
    this.isMonitoring = true;

    // Check every 5 minutes untuk development (bisa diubah ke 1 jam di production)
    this.monitoringInterval = setInterval(() => {
      this.checkAllKRIs();
    }, 5 * 60 * 1000);

    // Check sekali saat start
    this.checkAllKRIs();
  }

  // ✅ STOP MONITORING
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('KRI Monitoring Service stopped');
  }

  // ✅ CHECK ALL ACTIVE KRIs
  async checkAllKRIs() {
    try {
      console.log('🔍 Running KRI monitoring check...');
      
      const allKRIs = await KRIService.getAllKRIs();
      const activeKRIs = allKRIs.filter(kri => kri.status !== 'inactive');
      
      console.log(`Found ${activeKRIs.length} active KRIs to monitor`);

      const updatePromises = activeKRIs.map(async (kri) => {
        try {
          const newValue = await this.fetchKRIData(kri);
          await KRIService.updateKRIValue(kri.id, newValue);
          return { kri: kri.name, success: true, value: newValue };
        } catch (error) {
          console.error(`❌ Error updating KRI ${kri.name}:`, error);
          return { kri: kri.name, success: false, error: error.message };
        }
      });

      const results = await Promise.all(updatePromises);
      const successful = results.filter(r => r.success).length;
      
      console.log(`✅ KRI monitoring completed: ${successful}/${activeKRIs.length} successful`);
      
      return results;
    } catch (error) {
      console.error('❌ Error in KRI monitoring:', error);
      return [];
    }
  }

  // ✅ FETCH KRI DATA - INTEGRASI DENGAN EXISTING SYSTEM
  async fetchKRIData(kri) {
    // Berdasarkan data_source KRI, ambil data dari sistem yang ada
    switch (kri.data_source) {
      case 'risk_count':
        return await this.getRiskCount(kri.metric_parameter);
      
      case 'treatment_progress':
        return await this.getAverageTreatmentProgress(kri.organization_id);
      
      case 'high_risk_count':
        return await this.getHighRiskCount(kri.organization_id);
      
      case 'overdue_treatments':
        return await this.getOverdueTreatmentsCount(kri.organization_id);
      
      case 'incident_count':
        return await this.getIncidentCount(kri.period);
      
      case 'manual':
      default:
        // Untuk KRI manual, return current value atau mock data
        return kri.current_value || this.generateDemoData(kri);
    }
  }

  // ✅ GET RISK COUNT dari existing risks collection
  async getRiskCount(riskLevel = 'all') {
    const { db } = await import('../config/firebase');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    try {
      let riskQuery;
      if (riskLevel === 'all') {
        riskQuery = query(collection(db, 'risks'));
      } else {
        riskQuery = query(
          collection(db, 'risks'), 
          where('risk_level', '==', riskLevel)
        );
      }
      
      const snapshot = await getDocs(riskQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting risk count:', error);
      return 0;
    }
  }

  // ✅ GET HIGH RISK COUNT (Extreme + High)
  async getHighRiskCount(organizationId = null) {
    const { db } = await import('../config/firebase');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    try {
      let riskQuery;
      if (organizationId) {
        riskQuery = query(
          collection(db, 'risks'),
          where('organization_unit_id', '==', organizationId),
          where('risk_level', 'in', ['Extreme', 'High'])
        );
      } else {
        riskQuery = query(
          collection(db, 'risks'),
          where('risk_level', 'in', ['Extreme', 'High'])
        );
      }
      
      const snapshot = await getDocs(riskQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting high risk count:', error);
      return 0;
    }
  }

  // ✅ GET AVERAGE TREATMENT PROGRESS
  async getAverageTreatmentProgress(organizationId = null) {
    const { db } = await import('../config/firebase');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    try {
      let treatmentQuery;
      if (organizationId) {
        treatmentQuery = query(
          collection(db, 'treatment_plans'),
          where('organization_unit_id', '==', organizationId)
        );
      } else {
        treatmentQuery = query(collection(db, 'treatment_plans'));
      }
      
      const snapshot = await getDocs(treatmentQuery);
      
      if (snapshot.empty) return 100; // No treatments = perfect
      
      let totalProgress = 0;
      let count = 0;
      
      snapshot.forEach(doc => {
        const treatment = doc.data();
        if (typeof treatment.progress === 'number') {
          totalProgress += treatment.progress;
          count++;
        }
      });
      
      return count > 0 ? Math.round(totalProgress / count) : 100;
    } catch (error) {
      console.error('Error getting treatment progress:', error);
      return 0;
    }
  }

  // ✅ GET OVERDUE TREATMENTS COUNT
  async getOverdueTreatmentsCount(organizationId = null) {
    const { db } = await import('../config/firebase');
    const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
    
    try {
      const today = Timestamp.now();
      
      let treatmentQuery;
      if (organizationId) {
        treatmentQuery = query(
          collection(db, 'treatment_plans'),
          where('organization_unit_id', '==', organizationId),
          where('due_date', '<', today),
          where('status', '==', 'in_progress')
        );
      } else {
        treatmentQuery = query(
          collection(db, 'treatment_plans'),
          where('due_date', '<', today),
          where('status', '==', 'in_progress')
        );
      }
      
      const snapshot = await getDocs(treatmentQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting overdue treatments:', error);
      return 0;
    }
  }

  // ✅ GET INCIDENT COUNT (dari existing incidents collection)
  async getIncidentCount(period = 'monthly') {
    const { db } = await import('../config/firebase');
    const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
    
    try {
      const now = new Date();
      let startDate;
      
      if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'weekly') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else { // daily
        startDate = new Date(now.setDate(now.getDate() - 1));
      }
      
      const startTimestamp = Timestamp.fromDate(startDate);
      
      const incidentQuery = query(
        collection(db, 'incidents'),
        where('reported_date', '>=', startTimestamp)
      );
      
      const snapshot = await getDocs(incidentQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting incident count:', error);
      return 0;
    }
  }

  // ✅ GENERATE DEMO DATA untuk testing
  generateDemoData(kri) {
    const baseValue = kri.current_value || 50;
    // Random variation ±15%
    const variation = (Math.random() - 0.5) * 30;
    const newValue = Math.max(0, Math.min(100, baseValue + variation));
    
    return Math.round(newValue * 10) / 10; // 1 decimal place
  }

  // ✅ MANUAL TRIGGER (untuk testing)
  async manualTrigger() {
    console.log('🔄 Manual KRI monitoring triggered');
    return await this.checkAllKRIs();
  }
}

export default new KRIMonitoringService();