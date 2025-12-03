// src/contexts/SettingsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

// Default settings dengan values yang PRIMITIVE
const defaultSettings = {
  matrix: JSON.stringify({
    size: 5,
    likelihoodLabels: [
      { level: 1, label: 'Remote', description: 'Sangat jarang terjadi' },
      { level: 2, label: 'Unlikely', description: 'Jarang terjadi' },
      { level: 3, label: 'Possible', description: 'Mungkin terjadi' },
      { level: 4, label: 'Probable', description: 'Sering terjadi' },
      { level: 5, label: 'Highly Probable', description: 'Sangat sering terjadi' }
    ],
    impactLabels: [
      { level: 1, label: 'Insignificant', description: 'Dampak sangat kecil' },
      { level: 2, label: 'Minor', description: 'Dampak kecil' },
      { level: 3, label: 'Moderate', description: 'Dampak sedang' },
      { level: 4, label: 'Major', description: 'Dampak besar' },
      { level: 5, label: 'Catastrophic', description: 'Dampak sangat besar' }
    ]
  }),
  categories: JSON.stringify([
    'Strategis', 'Operasional', 'Finansial', 'HSSE', 
    'IT & Teknologi', 'Legal & Kepatuhan', 'Fraud', 'Reputasi', 'Lainnya'
  ]),
  ui: JSON.stringify({
    theme: 'light',
    language: 'id',
    dashboardView: 'grid',
    defaultFilters: {
      unit: 'all',
      category: 'all',
      status: 'all'
    }
  })
};

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  
  if (!context) {
    console.warn('useSettings used outside SettingsProvider, returning defaults');
    // Return parsed defaults jika context tidak tersedia
    return {
      settings: {
        matrix: JSON.parse(defaultSettings.matrix),
        categories: JSON.parse(defaultSettings.categories),
        ui: JSON.parse(defaultSettings.ui)
      },
      saveSettings: async () => false,
      resetSettings: async () => false,
      loading: false
    };
  }
  
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => ({
    matrix: JSON.parse(defaultSettings.matrix),
    categories: JSON.parse(defaultSettings.categories),
    ui: JSON.parse(defaultSettings.ui)
  }));
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load settings from Firebase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          const firebaseSettings = settingsSnap.data();
          console.log('Loaded settings from Firebase:', firebaseSettings);
          
          // Parse stringified data safely
          const parsedSettings = {
            matrix: tryParseJSON(firebaseSettings.matrix) || JSON.parse(defaultSettings.matrix),
            categories: tryParseJSON(firebaseSettings.categories) || JSON.parse(defaultSettings.categories),
            ui: tryParseJSON(firebaseSettings.ui) || JSON.parse(defaultSettings.ui)
          };
          
          setSettings(parsedSettings);
        } else {
          // Initialize with default settings (stringified)
          await setDoc(settingsRef, defaultSettings);
          console.log('Initialized default settings in Firebase');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Real-time listener
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const firebaseSettings = doc.data();
        const parsedSettings = {
          matrix: tryParseJSON(firebaseSettings.matrix) || JSON.parse(defaultSettings.matrix),
          categories: tryParseJSON(firebaseSettings.categories) || JSON.parse(defaultSettings.categories),
          ui: tryParseJSON(firebaseSettings.ui) || JSON.parse(defaultSettings.ui)
        };
        setSettings(parsedSettings);
      }
    }, (error) => {
      console.error('Error in settings listener:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Safe JSON parse function
  const tryParseJSON = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return null;
    }
  };

  // Save settings to Firebase
  const saveSettings = async (newSettings) => {
    try {
      const settingsRef = doc(db, 'settings', 'global');
      
      // Stringify complex objects before saving
      const settingsToSave = {
        matrix: JSON.stringify(newSettings.matrix),
        categories: JSON.stringify(newSettings.categories),
        ui: JSON.stringify(newSettings.ui)
      };
      
      await setDoc(settingsRef, settingsToSave, { merge: true });
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  };

  // Reset to default settings
  const resetSettings = async () => {
    const defaultParsed = {
      matrix: JSON.parse(defaultSettings.matrix),
      categories: JSON.parse(defaultSettings.categories),
      ui: JSON.parse(defaultSettings.ui)
    };
    return await saveSettings(defaultParsed);
  };

  const value = {
    settings,
    saveSettings,
    resetSettings,
    loading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};