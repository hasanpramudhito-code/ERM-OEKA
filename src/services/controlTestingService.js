// src/services/controlTestingService.js
import { db } from '../config/firebase';
import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, Timestamp 
} from 'firebase/firestore';

export const controlTestingService = {
  // Control Register Management
  async getControls(organizationId) {
    const q = query(
      collection(db, 'controls'),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async createControl(controlData) {
    return await addDoc(collection(db, 'controls'), {
      ...controlData,
      createdAt: Timestamp.now(),
      status: 'active'
    });
  },

  async updateControl(controlId, updates) {
    await updateDoc(doc(db, 'controls', controlId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  },

  // Testing Schedule Management
  async getTestingSchedules(controlId) {
    const q = query(
      collection(db, 'controls', controlId, 'testingSchedules'),
      orderBy('scheduledDate', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async createTestingSchedule(controlId, scheduleData) {
    try {
      console.log('Saving schedule to Firebase...');
      const schedulesRef = collection(db, 'testingSchedules');
      const docRef = await addDoc(schedulesRef, {
        ...scheduleData,
        controlId: controlId,
        createdAt: Timestamp.now(),
        status: 'scheduled',
        organizationId: 'org-001'
      });
      console.log('Schedule saved with ID:', docRef.id);
      return { id: docRef.id, ...scheduleData };
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  },


  // Test Results Management
  async getTestResults(controlId) {
    const q = query(
      collection(db, 'controls', controlId, 'testResults'),
      orderBy('testDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // ADD TEST RESULT  
  async addTestResult(controlId, resultData) {
    try {
      console.log('Saving test result to Firebase...');
      const resultsRef = collection(db, 'testResults');
      const docRef = await addDoc(resultsRef, {
        ...resultData,
        controlId: controlId,
        createdAt: Timestamp.now(),
        organizationId: 'org-001'
      });
      console.log('Test result saved with ID:', docRef.id);
      return { id: docRef.id, ...resultData };
    } catch (error) {
      console.error('Error saving test result:', error);
      throw error;
    }
  },

// TAMBAHKAN fungsi ini di controlTestingService.js:

// DEFICIENCY FUNCTIONS - FIXED
async getDeficiencies(organizationId = 'org-001') {
  try {
    const deficienciesRef = collection(db, 'deficiencies');
    
    // Query SEDERHANA tanpa orderBy (untuk hindari index error)
    const q = query(
      deficienciesRef,
      where('organizationId', '==', organizationId)
      // HAPUS orderBy sementara: orderBy('identifiedDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    // Sort manual di JavaScript
    return data.sort((a, b) => {
      const dateA = new Date(a.identifiedDate || 0);
      const dateB = new Date(b.identifiedDate || 0);
      return dateB - dateA; // Descending
    });
    
  } catch (error) {
    console.error('Error getting deficiencies:', error);
    
    // Fallback data untuk testing
    return [
      {
        id: 'def-1',
        title: 'Access Control Documentation Missing',
        description: 'Access review procedures not properly documented',
        controlId: 'ctrl-001',
        severity: 'medium',
        category: 'Documentation Issue',
        status: 'open',
        assignedTo: 'IT Security',
        identifiedDate: '2024-01-15',
        targetDate: '2024-02-15',
        organizationId: 'org-001'
      },
      {
        id: 'def-2',
        title: 'Financial Reconciliation Delay',
        description: 'Monthly reconciliations delayed by 5 days',
        controlId: 'ctrl-002',
        severity: 'high',
        category: 'Process Gap',
        status: 'in_progress',
        assignedTo: 'Accounting Dept',
        identifiedDate: '2024-01-10',
        targetDate: '2024-01-31',
        organizationId: 'org-001'
      }
    ];
  }
},

    async getDeficiencyStats(organizationId = 'org-001') {
      try {
        const deficiencies = await this.getDeficiencies(organizationId);
        
        // Calculate stats
        const total = deficiencies.length;
        const open = deficiencies.filter(d => d.status === 'open').length;
        const in_progress = deficiencies.filter(d => d.status === 'in_progress').length;
        const resolved = deficiencies.filter(d => d.status === 'resolved').length;
        const closed = deficiencies.filter(d => d.status === 'closed').length;
        
        // Calculate severity counts
        const critical = deficiencies.filter(d => d.severity === 'critical').length;
        const high = deficiencies.filter(d => d.severity === 'high').length;
        const medium = deficiencies.filter(d => d.severity === 'medium').length;
        const low = deficiencies.filter(d => d.severity === 'low').length;
        
        // Calculate average days open
        let averageDaysOpen = 0;
        const openDeficiencies = deficiencies.filter(d => d.status !== 'closed' && d.status !== 'resolved');
        if (openDeficiencies.length > 0) {
          const totalDays = openDeficiencies.reduce((sum, def) => {
            const identified = new Date(def.identifiedDate);
            const today = new Date();
            const diffTime = Math.abs(today - identified);
            return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }, 0);
          averageDaysOpen = Math.round(totalDays / openDeficiencies.length);
        }
        
        return {
          total,
          open,
          in_progress,
          resolved,
          closed,
          critical,
          high,
          medium,
          low,
          averageDaysOpen
        };
        
      } catch (error) {
        console.error('Error getting deficiency stats:', error);
        return {
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          averageDaysOpen: 0
        };
      }
    },

    async createDeficiency(deficiencyData) {
      try {
        const deficienciesRef = collection(db, 'deficiencies');
        const docRef = await addDoc(deficienciesRef, {
          ...deficiencyData,
          organizationId: deficiencyData.organizationId || 'org-001',
          status: 'open',
          daysOpen: 0,
          createdAt: Timestamp.now()
        });
        
        console.log('Deficiency created with ID:', docRef.id);
        return { id: docRef.id, ...deficiencyData };
        
      } catch (error) {
        console.error('Error creating deficiency:', error);
        throw error;
      }
    },

    async updateDeficiency(deficiencyId, updates) {
      try {
        const deficiencyRef = doc(db, 'deficiencies', deficiencyId);
        await updateDoc(deficiencyRef, {
          ...updates,
          updatedAt: Timestamp.now()
        });
        console.log('Deficiency updated:', deficiencyId);
      } catch (error) {
        console.error('Error updating deficiency:', error);
        throw error;
      }
    }
  }