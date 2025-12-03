import { db } from '../config/firebase';
import { 
  collection, getDocs, addDoc, writeBatch, doc 
} from 'firebase/firestore';

class DatabaseService {
  
  // ✅ EKSPOR SEMUA DATA DARI FIRESTORE
  async exportDatabase() {
    try {
      console.log('Starting database export...');
      
      // Daftar semua collections yang akan di-export
      const collections = [
        'users',
        'risks', 
        'treatment_plans',
        'incidents',
        'kris',
        'kri_alerts',
        'composite_scores',
        'risk_culture_surveys',
        'risk_culture_responses',
        'organization_units'
      ];

      const exportData = {
        metadata: {
          exported_at: new Date().toISOString(),
          version: '1.0',
          collections: collections
        },
        data: {}
      };

      // Export setiap collection
      for (const collectionName of collections) {
        try {
          const querySnapshot = await getDocs(collection(db, collectionName));
          exportData.data[collectionName] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`Exported ${exportData.data[collectionName].length} documents from ${collectionName}`);
        } catch (error) {
          console.warn(`Could not export collection ${collectionName}:`, error);
          exportData.data[collectionName] = [];
        }
      }

      console.log('Database export completed successfully');
      return exportData;
    } catch (error) {
      console.error('Error exporting database:', error);
      throw error;
    }
  }

  // ✅ IMPORT DATA KE FIRESTORE
  async importDatabase(importData, options = { clearExisting: false }) {
    try {
      console.log('Starting database import...', options);
      
      const batch = writeBatch(db);
      let totalImported = 0;
      const results = {
        success: [],
        errors: []
      };

      // Validasi import data structure
      if (!importData.metadata || !importData.data) {
        throw new Error('Invalid import file format');
      }

      // Import setiap collection
      for (const [collectionName, documents] of Object.entries(importData.data)) {
        try {
          console.log(`Importing ${documents.length} documents to ${collectionName}...`);
          
          let importedCount = 0;
          for (const document of documents) {
            try {
              const docRef = doc(collection(db, collectionName), document.id);
              batch.set(docRef, this.sanitizeDocumentData(document));
              importedCount++;
            } catch (docError) {
              console.error(`Error importing document ${document.id} in ${collectionName}:`, docError);
              results.errors.push({
                collection: collectionName,
                documentId: document.id,
                error: docError.message
              });
            }
          }
          
          totalImported += importedCount;
          results.success.push({
            collection: collectionName,
            imported: importedCount,
            total: documents.length
          });
          
          console.log(`Imported ${importedCount}/${documents.length} documents to ${collectionName}`);
        } catch (collectionError) {
          console.error(`Error importing collection ${collectionName}:`, collectionError);
          results.errors.push({
            collection: collectionName,
            error: collectionError.message
          });
        }
      }

      // Commit batch
      await batch.commit();
      console.log(`Database import completed: ${totalImported} documents imported`);
      
      return {
        success: true,
        totalImported,
        results
      };
    } catch (error) {
      console.error('Error importing database:', error);
      return {
        success: false,
        error: error.message,
        results: { errors: [{ error: error.message }] }
      };
    }
  }

  // ✅ SANITIZE DOCUMENT DATA (remove id field sebelum disimpan)
  sanitizeDocumentData(document) {
    const { id, ...data } = document;
    
    // Convert string dates back to Timestamp jika diperlukan
    return this.convertDates(data);
  }

  // ✅ CONVERT STRING DATES TO TIMESTAMP
  convertDates(data) {
    if (typeof data !== 'object' || data === null) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.convertDates(item));
    }

    const converted = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && this.isIsoDateString(value)) {
        // Untuk Firestore, biarkan sebagai string atau convert ke Date object
        converted[key] = value; // Tetap sebagai string untuk simplicity
      } else if (typeof value === 'object' && value !== null) {
        converted[key] = this.convertDates(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }

  // ✅ CHECK IF STRING IS ISO DATE
  isIsoDateString(value) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }

  // ✅ DOWNLOAD EXPORT FILE
  downloadExportFile(exportData) {
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erm-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ✅ VALIDATE IMPORT FILE
  validateImportFile(fileData) {
    try {
      if (typeof fileData === 'string') {
        fileData = JSON.parse(fileData);
      }

      if (!fileData.metadata || !fileData.data) {
        return { valid: false, error: 'Invalid file format: missing metadata or data' };
      }

      if (!fileData.metadata.exported_at) {
        return { valid: false, error: 'Invalid file: missing export timestamp' };
      }

      // Check required collections
      const requiredCollections = ['users', 'risks', 'kris'];
      const missingCollections = requiredCollections.filter(col => !fileData.data[col]);
      
      if (missingCollections.length > 0) {
        return { 
          valid: false, 
          error: `Missing required collections: ${missingCollections.join(', ')}` 
        };
      }

      return { valid: true, data: fileData };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }

  // ✅ GET DATABASE STATISTICS
  async getDatabaseStats() {
    try {
      const collections = [
        'users', 'risks', 'treatment_plans', 'incidents', 
        'kris', 'kri_alerts', 'composite_scores',
        'risk_culture_surveys', 'risk_culture_responses'
      ];

      const stats = {};
      let totalDocuments = 0;

      for (const collectionName of collections) {
        try {
          const querySnapshot = await getDocs(collection(db, collectionName));
          stats[collectionName] = querySnapshot.size;
          totalDocuments += querySnapshot.size;
        } catch (error) {
          stats[collectionName] = 0;
          console.warn(`Could not get stats for ${collectionName}:`, error);
        }
      }

      return {
        totalDocuments,
        collections: stats,
        lastExport: localStorage.getItem('lastExport') || 'Never',
        lastImport: localStorage.getItem('lastImport') || 'Never'
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  // ✅ CLEAR ALL DATA (HATI-HATI!)
  async clearAllData() {
    try {
      const collections = [
        'risks', 'treatment_plans', 'incidents', 'kris', 
        'kri_alerts', 'composite_scores', 'risk_culture_surveys', 
        'risk_culture_responses'
      ];

      const batch = writeBatch(db);
      let totalDeleted = 0;

      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        querySnapshot.docs.forEach(docSnapshot => {
          batch.delete(docSnapshot.ref);
          totalDeleted++;
        });
      }

      await batch.commit();
      console.log(`Cleared ${totalDeleted} documents from database`);
      
      return { success: true, totalDeleted };
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }
}

export default new DatabaseService();