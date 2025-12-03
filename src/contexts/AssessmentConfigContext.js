import React, { createContext, useState, useContext, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const AssessmentConfigContext = createContext();

export const useAssessmentConfig = () => {
  const context = useContext(AssessmentConfigContext);
  if (!context) {
    throw new Error('useAssessmentConfig must be used within AssessmentConfigProvider');
  }
  return context;
};

export const AssessmentConfigProvider = ({ children }) => {
  const [assessmentConfig, setAssessmentConfig] = useState({
    assessmentMethod: 'multiplication',
    riskLevels: [
      { min: 1, max: 3, label: 'Sangat Rendah', color: '#4caf50' },
      { min: 4, max: 6, label: 'Rendah', color: '#81c784' },
      { min: 7, max: 10, label: 'Sedang', color: '#ffeb3b' },
      { min: 11, max: 15, label: 'Tinggi', color: '#f57c00' },
      { min: 16, max: 20, label: 'Sangat Tinggi', color: '#d32f2f' },
      { min: 21, max: 25, label: 'Ekstrim', color: '#7b1fa2' }
    ]
  });

  const [loading, setLoading] = useState(true);

  // REAL-TIME LISTENER untuk config changes
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'risk_assessment_config', 'default'),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const configData = docSnapshot.data();
          setAssessmentConfig(configData);
          console.log('🔄 Config updated real-time:', configData);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to config:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fungsi calculate score yang konsisten di semua modul
  const calculateScore = (likelihood, impact) => {
    if (assessmentConfig.assessmentMethod === 'coordinate') {
      const entry = COORDINATE_MATRIX.find(
        ([l, i]) => l === likelihood && i === impact
      );
      return entry ? entry[2] : likelihood * impact;
    } else {
      return likelihood * impact;
    }
  };

  // Fungsi risk level yang konsisten
  const calculateRiskLevel = (score) => {
    const riskLevel = assessmentConfig.riskLevels.find(level => 
      score >= level.min && score <= level.max
    );
    
    if (riskLevel) {
      return { 
        level: riskLevel.label, 
        color: 'primary',
        customColor: riskLevel.color,
        score: score
      };
    }
    
    // Fallback
    if (score >= 20) return { level: 'Extreme', color: 'error', score };
    if (score >= 16) return { level: 'High', color: 'warning', score };
    if (score >= 10) return { level: 'Medium', color: 'info', score };
    if (score >= 5) return { level: 'Low', color: 'success', score };
    return { level: 'Very Low', color: 'success', score };
  };

  const value = {
    assessmentConfig,
    loading,
    calculateScore,
    calculateRiskLevel
  };

  return (
    <AssessmentConfigContext.Provider value={value}>
      {children}
    </AssessmentConfigContext.Provider>
  );
};

// Matriks koordinat (sama di semua modul)
const COORDINATE_MATRIX = [
  [1, 1, 1], [1, 2, 3], [1, 3, 5], [1, 4, 8], [1, 5, 20],
  [2, 1, 2], [2, 2, 7], [2, 3, 11], [2, 4, 13], [2, 5, 21],
  [3, 1, 4], [3, 2, 10], [3, 3, 14], [3, 4, 17], [3, 5, 22],
  [4, 1, 6], [4, 2, 12], [4, 3, 16], [4, 4, 19], [4, 5, 24],
  [5, 1, 9], [5, 2, 15], [5, 3, 18], [5, 4, 23], [5, 5, 25]
];