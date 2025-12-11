import React, { createContext, useState, useContext, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const AssessmentConfigContext = createContext();

export const useAssessmentConfig = () => useContext(AssessmentConfigContext);

export const AssessmentConfigProvider = ({ children }) => {
  const [assessmentConfig, setAssessmentConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load configuration
  const loadConfig = async () => {
    try {
      setLoading(true);
      const configDoc = await getDoc(doc(db, 'risk_assessment_config', 'default'));
      
      if (configDoc.exists()) {
        setAssessmentConfig(configDoc.data());
      } else {
        // Create default config if doesn't exist
        const defaultConfig = {
          assessmentMethod: 'multiplication',
          likelihoodOptions: [
            { value: 1, label: '1 - Sangat Rendah' },
            { value: 2, label: '2 - Rendah' },
            { value: 3, label: '3 - Sedang' },
            { value: 4, label: '4 - Tinggi' },
            { value: 5, label: '5 - Sangat Tinggi' }
          ],
          impactOptions: [
            { value: 1, label: '1 - Tidak Signifikan' },
            { value: 2, label: '2 - Terbatas' },
            { value: 3, label: '3 - Signifikan' },
            { value: 4, label: '4 - Kritis' },
            { value: 5, label: '5 - Katastropik' }
          ],
          riskLevels: [
            { label: 'Sangat Rendah', min: 1, max: 3, color: 'success' },
            { label: 'Rendah', min: 4, max: 6, color: 'success' },
            { label: 'Sedang', min: 7, max: 10, color: 'warning' },
            { label: 'Tinggi', min: 11, max: 15, color: 'error' },
            { label: 'Sangat Tinggi', min: 16, max: 20, color: 'error' },
            { label: 'Ekstrim', min: 21, max: 25, color: 'error' }
          ],
          createdAt: new Date()
        };
        
        await setDoc(doc(db, 'risk_assessment_config', 'default'), defaultConfig);
        setAssessmentConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading assessment config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Helper function untuk mendapatkan rating options
  const getRatingOptions = (type = 'likelihood') => {
    if (!assessmentConfig) return [1, 2, 3, 4, 5];
    
    if (type === 'likelihood') {
      return assessmentConfig.likelihoodOptions?.map(opt => opt.value) || [1, 2, 3, 4, 5];
    } else {
      return assessmentConfig.impactOptions?.map(opt => opt.value) || [1, 2, 3, 4, 5];
    }
  };

  // Helper function untuk mendapatkan rating label
  const getRatingLabel = (value, type = 'likelihood') => {
    if (!assessmentConfig) {
      // Default labels
      if (type === 'likelihood') {
        const labels = { 1: '1 - Sangat Rendah', 2: '2 - Rendah', 3: '3 - Sedang', 4: '4 - Tinggi', 5: '5 - Sangat Tinggi' };
        return labels[value] || `${value}`;
      } else {
        const labels = { 1: '1 - Tidak Signifikan', 2: '2 - Terbatas', 3: '3 - Signifikan', 4: '4 - Kritis', 5: '5 - Katastropik' };
        return labels[value] || `${value}`;
      }
    }
    
    if (type === 'likelihood') {
      const option = assessmentConfig.likelihoodOptions?.find(opt => opt.value === value);
      return option?.label || `${value}`;
    } else {
      const option = assessmentConfig.impactOptions?.find(opt => opt.value === value);
      return option?.label || `${value}`;
    }
  };

  // Helper function untuk mendapatkan risk level options
  const getRiskLevelOptions = () => {
    if (!assessmentConfig?.riskLevels) {
      return [
        { value: 'very_low', label: 'Sangat Rendah', min: 1, max: 3, color: 'success' },
        { value: 'low', label: 'Rendah', min: 4, max: 6, color: 'success' },
        { value: 'medium', label: 'Sedang', min: 7, max: 10, color: 'warning' },
        { value: 'high', label: 'Tinggi', min: 11, max: 15, color: 'error' },
        { value: 'very_high', label: 'Sangat Tinggi', min: 16, max: 20, color: 'error' },
        { value: 'extreme', label: 'Ekstrim', min: 21, max: 25, color: 'error' }
      ];
    }
    
    return assessmentConfig.riskLevels.map(level => ({
      value: level.label.toLowerCase().replace(/ /g, '_'),
      label: level.label,
      min: level.min,
      max: level.max,
      color: level.color
    }));
  };

  // Helper function untuk mendapatkan warna berdasarkan level label
  const getRiskLevelColor = (levelLabel) => {
    if (!assessmentConfig?.riskLevels) {
      const colors = {
        'Sangat Rendah': 'success',
        'Rendah': 'success',
        'Sedang': 'warning',
        'Tinggi': 'error',
        'Sangat Tinggi': 'error',
        'Ekstrim': 'error'
      };
      return colors[levelLabel] || 'default';
    }
    
    const level = assessmentConfig.riskLevels.find(l => l.label === levelLabel);
    return level?.color || 'default';
  };

  // Helper function untuk mendapatkan label level risiko
  const getRiskLevelLabel = (levelValue) => {
    const options = getRiskLevelOptions();
    const level = options.find(opt => opt.value === levelValue);
    return level?.label || levelValue;
  };

  // Calculate risk score berdasarkan metode
  const calculateScore = (likelihood, impact) => {
    if (!assessmentConfig) return likelihood * impact;
    
    if (assessmentConfig.assessmentMethod === 'coordinate') {
      // Matriks koordinat 5x5
      const matrix = [
        [1, 2, 3, 4, 5],
        [2, 4, 6, 8, 10],
        [3, 6, 9, 12, 15],
        [4, 8, 12, 16, 20],
        [5, 10, 15, 20, 25]
      ];
      
      const lIndex = Math.min(Math.max(likelihood - 1, 0), 4);
      const iIndex = Math.min(Math.max(impact - 1, 0), 4);
      return matrix[lIndex][iIndex];
    }
    
    // Default: multiplication
    return likelihood * impact;
  };

  // Calculate risk level berdasarkan score
  const calculateRiskLevel = (score) => {
    const options = getRiskLevelOptions();
    const riskLevel = options.find(level => 
      score >= level.min && score <= level.max
    ) || options[0];
    
    return {
      score,
      level: riskLevel.label,
      color: riskLevel.color
    };
  };

  const value = {
    assessmentConfig,
    loading,
    calculateScore,
    calculateRiskLevel,
    getRatingOptions,
    getRatingLabel,
    getRiskLevelOptions,
    getRiskLevelColor,
    getRiskLevelLabel,
    refreshConfig: loadConfig
  };

  return (
    <AssessmentConfigContext.Provider value={value}>
      {children}
    </AssessmentConfigContext.Provider>
  );
};