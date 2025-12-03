// src/services/kriAdvancedService.js
import { db } from '../config/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

export const kriAdvancedService = {
  // KRI Management
  async getAllKRIs(organizationId) {
    const q = query(
      collection(db, 'kris'),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async createKRI(kriData) {
    return await addDoc(collection(db, 'kris'), {
      ...kriData,
      createdAt: new Date(),
      status: 'active'
    });
  },

  async updateKRI(kriId, updates) {
    await updateDoc(doc(db, 'kris', kriId), {
      ...updates,
      updatedAt: new Date()
    });
  },

  // KRI Thresholds & Alerts
  async setKRIThresholds(kriId, thresholds) {
    await updateDoc(doc(db, 'kris', kriId), {
      thresholds,
      updatedAt: new Date()
    });
  },

  // KRI Measurements
  async addKRIMeasurement(kriId, measurement) {
    const measurementRef = collection(db, 'kris', kriId, 'measurements');
    return await addDoc(measurementRef, {
      ...measurement,
      timestamp: new Date(),
      status: this.calculateStatus(measurement.value, measurement.thresholds)
    });
  },

  calculateStatus(value, thresholds) {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.high) return 'high';
    if (value >= thresholds.medium) return 'medium';
    return 'low';
  }
};