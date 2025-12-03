import { db } from '../config/firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';

class KRIService {
  // ✅ GET ALL KRIs
  async getAllKRIs(organizationId = null) {
    try {
      let kriQuery;
      if (organizationId) {
        kriQuery = query(
          collection(db, 'kris'),
          where('organization_id', '==', organizationId),
          orderBy('created_at', 'desc')
        );
      } else {
        kriQuery = query(collection(db, 'kris'), orderBy('created_at', 'desc'));
      }
      
      const querySnapshot = await getDocs(kriQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting KRIs:', error);
      throw error;
    }
  }

  // ✅ CREATE NEW KRI
  async createKRI(kriData) {
    try {
      const kriWithMetadata = {
        ...kriData,
        current_value: 0,
        previous_value: 0,
        status: 'inactive',
        trend: 'stable',
        last_updated: Timestamp.now(),
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'kris'), kriWithMetadata);
      return { id: docRef.id, ...kriWithMetadata };
    } catch (error) {
      console.error('Error creating KRI:', error);
      throw error;
    }
  }

  // ✅ UPDATE KRI VALUE (dipanggil oleh scheduled function)
  async updateKRIValue(kriId, newValue) {
    try {
      const kriRef = doc(db, 'kris', kriId);
      const kriDoc = await getDoc(kriRef);
      
      if (!kriDoc.exists()) {
        throw new Error('KRI not found');
      }
      
      const kri = kriDoc.data();
      const previousValue = kri.current_value;
      const newStatus = this.calculateKRIStatus(newValue, kri);
      
      // Check jika ada threshold breach
      const alertTriggered = await this.checkThresholdBreach(
        kriId, kri, previousValue, newValue, newStatus
      );
      
      // Update KRI
      await updateDoc(kriRef, {
        current_value: newValue,
        previous_value: previousValue,
        status: newStatus,
        last_updated: Timestamp.now(),
        updated_at: Timestamp.now(),
        trend: this.calculateTrend(previousValue, newValue)
      });
      
      return {
        success: true,
        alertTriggered,
        newStatus,
        previousValue,
        newValue
      };
    } catch (error) {
      console.error('Error updating KRI value:', error);
      throw error;
    }
  }

  // ✅ CALCULATE KRI STATUS berdasarkan threshold
  calculateKRIStatus(value, kri) {
    const { threshold_green, threshold_yellow, threshold_red, target_direction } = kri;
    
    // Untuk KRI yang lebih rendah lebih baik (risk exposure)
    if (target_direction === 'lower') {
      if (value <= threshold_green) return 'green';
      if (value <= threshold_yellow) return 'yellow';
      return 'red';
    } 
    // Untuk KRI yang lebih tinggi lebih baik (risk control effectiveness)
    else if (target_direction === 'higher') {
      if (value >= threshold_green) return 'green';
      if (value >= threshold_yellow) return 'yellow';
      return 'red';
    }
    
    return 'inactive';
  }

  // ✅ CHECK THRESHOLD BREACH & CREATE ALERT
  async checkThresholdBreach(kriId, kri, previousValue, newValue, newStatus) {
    const previousStatus = this.calculateKRIStatus(previousValue, kri);
    
    if (previousStatus !== newStatus) {
      // Status berubah, create alert
      await this.createKRIAlert({
        kri_id: kriId,
        kri_name: kri.name,
        previous_value: previousValue,
        current_value: newValue,
        previous_status: previousStatus,
        current_status: newStatus,
        threshold_breached: this.getBreachedThreshold(kri, newValue),
        triggered_at: Timestamp.now(),
        status: 'active',
        owner_id: kri.owner_id
      });
      return true;
    }
    return false;
  }

  // ✅ CREATE KRI ALERT
  async createKRIAlert(alertData) {
    try {
      const alertWithMetadata = {
        ...alertData,
        created_at: Timestamp.now(),
        acknowledged: false,
        acknowledged_at: null,
        acknowledged_by: null
      };
      
      const docRef = await addDoc(collection(db, 'kri_alerts'), alertWithMetadata);
      
      // Send notification ke owner
      await this.notifyKRIAlert(alertData.owner_id, alertData);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating KRI alert:', error);
      throw error;
    }
  }

  // ✅ CALCULATE TREND
  calculateTrend(previous, current) {
    const difference = current - previous;
    const percentageChange = previous !== 0 ? (difference / previous) * 100 : 0;
    
    if (Math.abs(percentageChange) < 2) return 'stable';
    return percentageChange > 0 ? 'increasing' : 'decreasing';
  }

  // ✅ GET BREACHED THRESHOLD
  getBreachedThreshold(kri, value) {
    const { threshold_green, threshold_yellow, threshold_red, target_direction } = kri;
    
    if (target_direction === 'lower') {
      if (value > threshold_red) return 'red';
      if (value > threshold_yellow) return 'yellow';
    } else {
      if (value < threshold_red) return 'red';
      if (value < threshold_yellow) return 'yellow';
    }
    
    return 'green';
  }

  // ✅ NOTIFY KRI ALERT (placeholder - integrate dengan notification system)
  async notifyKRIAlert(ownerId, alert) {
    console.log(`Alert notification for owner ${ownerId}:`, alert);
    // Implement email/slack notification di sini
  }
}

export default new KRIService();