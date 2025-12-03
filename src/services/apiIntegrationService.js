import { db } from '../config/firebase';
import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp 
} from 'firebase/firestore';

class APIIntegrationService {
  
  // ✅ GET ALL API CONNECTIONS
  async getAllConnections(organizationId = 'default') {
    try {
      const connectionsQuery = query(
        collection(db, 'api_connections'),
        where('organization_id', '==', organizationId),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(connectionsQuery);
      const connections = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Retrieved ${connections.length} API connections`);
      return connections;
    } catch (error) {
      console.error('Error getting API connections:', error);
      
      // Fallback query
      if (error.code === 'failed-precondition') {
        const fallbackQuery = query(collection(db, 'api_connections'));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        return fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      throw error;
    }
  }

  // ✅ CREATE NEW API CONNECTION
  async createConnection(connectionData) {
    try {
      const connectionWithMetadata = {
        ...connectionData,
        status: 'inactive',
        last_sync: null,
        sync_count: 0,
        error_count: 0,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'api_connections'), connectionWithMetadata);
      console.log('API connection created with ID:', docRef.id);
      return { id: docRef.id, ...connectionWithMetadata };
    } catch (error) {
      console.error('Error creating API connection:', error);
      throw error;
    }
  }

  // ✅ UPDATE API CONNECTION
  async updateConnection(connectionId, updateData) {
    try {
      const connectionRef = doc(db, 'api_connections', connectionId);
      await updateDoc(connectionRef, {
        ...updateData,
        updated_at: Timestamp.now()
      });
      console.log('API connection updated:', connectionId);
    } catch (error) {
      console.error('Error updating API connection:', error);
      throw error;
    }
  }

  // ✅ TEST API CONNECTION
  async testConnection(connection) {
    try {
      console.log(`Testing connection to ${connection.name}...`);
      
      const testPayload = this.buildTestPayload(connection);
      const response = await this.makeAPICall(connection, testPayload);
      
      // Update connection status
      await this.updateConnection(connection.id, {
        status: 'active',
        last_test: Timestamp.now(),
        test_status: 'success'
      });
      
      return {
        success: true,
        message: 'Connection test successful',
        response: response
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // Update connection status
      await this.updateConnection(connection.id, {
        status: 'error',
        last_test: Timestamp.now(),
        test_status: 'failed',
        last_error: error.message
      });
      
      return {
        success: false,
        message: 'Connection test failed',
        error: error.message
      };
    }
  }

  // ✅ SYNC DATA FROM EXTERNAL API
  async syncFromExternal(connection) {
    try {
      console.log(`Syncing data from ${connection.name}...`);
      
      const syncPayload = this.buildSyncPayload(connection);
      const response = await this.makeAPICall(connection, syncPayload);
      
      // Process the response based on connection type
      const processedData = await this.processSyncResponse(connection, response);
      
      // Update sync statistics
      await this.updateConnection(connection.id, {
        last_sync: Timestamp.now(),
        sync_count: (connection.sync_count || 0) + 1,
        last_sync_count: processedData.recordsProcessed || 0,
        status: 'active'
      });
      
      return {
        success: true,
        message: `Sync completed: ${processedData.recordsProcessed} records processed`,
        data: processedData
      };
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Update error statistics
      await this.updateConnection(connection.id, {
        status: 'error',
        error_count: (connection.error_count || 0) + 1,
        last_error: error.message,
        last_sync: Timestamp.now()
      });
      
      return {
        success: false,
        message: 'Sync failed',
        error: error.message
      };
    }
  }

  // ✅ PUSH DATA TO EXTERNAL API
  async pushToExternal(connection, data) {
    try {
      console.log(`Pushing data to ${connection.name}...`);
      
      const pushPayload = this.buildPushPayload(connection, data);
      const response = await this.makeAPICall(connection, pushPayload);
      
      // Update push statistics
      await this.updateConnection(connection.id, {
        last_push: Timestamp.now(),
        push_count: (connection.push_count || 0) + 1
      });
      
      return {
        success: true,
        message: 'Data pushed successfully',
        response: response
      };
    } catch (error) {
      console.error('Push failed:', error);
      
      // Update error statistics
      await this.updateConnection(connection.id, {
        error_count: (connection.error_count || 0) + 1,
        last_error: error.message
      });
      
      return {
        success: false,
        message: 'Push failed',
        error: error.message
      };
    }
  }

  // ✅ BUILD TEST PAYLOAD
  buildTestPayload(connection) {
    switch (connection.type) {
      case 'rest':
        return {
          method: 'GET',
          url: `${connection.base_url}${connection.test_endpoint || ''}`,
          headers: this.buildHeaders(connection),
          timeout: 10000
        };
      
      case 'soap':
        return {
          method: 'POST',
          url: connection.base_url,
          headers: {
            'Content-Type': 'text/xml',
            ...this.buildHeaders(connection)
          },
          body: connection.test_soap_body || '<test>ping</test>'
        };
      
      default:
        throw new Error(`Unsupported API type: ${connection.type}`);
    }
  }

  // ✅ BUILD SYNC PAYLOAD
  buildSyncPayload(connection) {
    switch (connection.type) {
      case 'rest':
        return {
          method: 'GET',
          url: `${connection.base_url}${connection.sync_endpoint}`,
          headers: this.buildHeaders(connection),
          params: connection.sync_params || {}
        };
      
      case 'soap':
        return {
          method: 'POST',
          url: connection.base_url,
          headers: {
            'Content-Type': 'text/xml',
            ...this.buildHeaders(connection)
          },
          body: connection.sync_soap_body
        };
      
      default:
        throw new Error(`Unsupported API type: ${connection.type}`);
    }
  }

  // ✅ BUILD PUSH PAYLOAD
  buildPushPayload(connection, data) {
    switch (connection.type) {
      case 'rest':
        return {
          method: 'POST',
          url: `${connection.base_url}${connection.push_endpoint}`,
          headers: this.buildHeaders(connection),
          body: JSON.stringify(data)
        };
      
      case 'soap':
        return {
          method: 'POST',
          url: connection.base_url,
          headers: {
            'Content-Type': 'text/xml',
            ...this.buildHeaders(connection)
          },
          body: this.convertToSOAP(data, connection.push_soap_template)
        };
      
      default:
        throw new Error(`Unsupported API type: ${connection.type}`);
    }
  }

  // ✅ BUILD HEADERS WITH AUTH
  buildHeaders(connection) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'ERM-System/1.0'
    };

    // Add authentication
    if (connection.auth_type === 'bearer') {
      headers['Authorization'] = `Bearer ${connection.auth_token}`;
    } else if (connection.auth_type === 'basic') {
      const credentials = btoa(`${connection.username}:${connection.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (connection.auth_type === 'api_key') {
      headers[connection.api_key_header || 'X-API-Key'] = connection.api_key;
    }

    // Add custom headers
    if (connection.custom_headers) {
      Object.assign(headers, connection.custom_headers);
    }

    return headers;
  }

  // ✅ MAKE API CALL
  async makeAPICall(connection, payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), payload.timeout || 30000);

    try {
      const fetchOptions = {
        method: payload.method,
        headers: payload.headers,
        signal: controller.signal
      };

      if (payload.body) {
        fetchOptions.body = payload.body;
      }

      const response = await fetch(payload.url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType && contentType.includes('text/xml')) {
        return await response.text();
      } else {
        return await response.text();
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ✅ PROCESS SYNC RESPONSE
  async processSyncResponse(connection, response) {
    let records = [];
    
    switch (connection.data_type) {
      case 'risks':
        records = this.processRiskData(response, connection.data_mapping);
        await this.saveRisks(records);
        break;
      
      case 'incidents':
        records = this.processIncidentData(response, connection.data_mapping);
        await this.saveIncidents(records);
        break;
      
      case 'kri':
        records = this.processKRIData(response, connection.data_mapping);
        await this.saveKRIs(records);
        break;
      
      default:
        console.warn(`Unknown data type: ${connection.data_type}`);
    }

    return {
      recordsProcessed: records.length,
      records: records
    };
  }

  // ✅ PROCESS RISK DATA
  processRiskData(response, mapping = {}) {
    // Extract data based on mapping or default structure
    const risks = mapping.data_path ? 
      this.getNestedValue(response, mapping.data_path) : 
      (Array.isArray(response) ? response : response.data || response.risks || []);
    
    return risks.map(item => ({
      title: item[mapping.title || 'title'] || item.riskDescription,
      description: item[mapping.description || 'description'] || '',
      likelihood: item[mapping.likelihood || 'likelihood'] || 3,
      impact: item[mapping.impact || 'impact'] || 3,
      classification: item[mapping.classification || 'category'] || 'Operational',
      risk_owner: item[mapping.risk_owner || 'owner'] || '',
      status: 'active',
      source: 'api_import',
      imported_at: new Date()
    })).filter(risk => risk.title); // Filter out risks without title
  }

  // ✅ PROCESS INCIDENT DATA
  processIncidentData(response, mapping = {}) {
    const incidents = mapping.data_path ? 
      this.getNestedValue(response, mapping.data_path) : 
      (Array.isArray(response) ? response : response.data || response.incidents || []);
    
    return incidents.map(item => ({
      title: item[mapping.title || 'title'] || item.incidentDescription,
      description: item[mapping.description || 'description'] || '',
      severity: item[mapping.severity || 'severity'] || 'medium',
      status: item[mapping.status || 'status'] || 'reported',
      reported_date: new Date(item[mapping.reported_date || 'reportedDate'] || new Date()),
      source: 'api_import',
      imported_at: new Date()
    })).filter(incident => incident.title);
  }

  // ✅ PROCESS KRI DATA
  processKRIData(response, mapping = {}) {
    const kris = mapping.data_path ? 
      this.getNestedValue(response, mapping.data_path) : 
      (Array.isArray(response) ? response : response.data || response.kris || []);
    
    return kris.map(item => ({
      name: item[mapping.name || 'name'] || item.kriName,
      description: item[mapping.description || 'description'] || '',
      current_value: item[mapping.current_value || 'currentValue'] || 0,
      threshold_green: item[mapping.threshold_green || 'greenThreshold'] || 70,
      threshold_yellow: item[mapping.threshold_yellow || 'yellowThreshold'] || 85,
      threshold_red: item[mapping.threshold_red || 'redThreshold'] || 95,
      data_source: 'api_import',
      status: 'active',
      imported_at: new Date()
    })).filter(kri => kri.name);
  }

  // ✅ SAVE RISKS TO FIRESTORE
  async saveRisks(risks) {
    const batch = [];
    
    for (const risk of risks) {
      try {
        const riskWithMetadata = {
          ...risk,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        await addDoc(collection(db, 'risks'), riskWithMetadata);
      } catch (error) {
        console.error('Error saving risk:', error);
      }
    }
    
    console.log(`Saved ${risks.length} risks from API`);
  }

  // ✅ SAVE INCIDENTS TO FIRESTORE
  async saveIncidents(incidents) {
    for (const incident of incidents) {
      try {
        const incidentWithMetadata = {
          ...incident,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        await addDoc(collection(db, 'incidents'), incidentWithMetadata);
      } catch (error) {
        console.error('Error saving incident:', error);
      }
    }
    
    console.log(`Saved ${incidents.length} incidents from API`);
  }

  // ✅ SAVE KRIs TO FIRESTORE
  async saveKRIs(kris) {
    for (const kri of kris) {
      try {
        const kriWithMetadata = {
          ...kri,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        await addDoc(collection(db, 'kris'), kriWithMetadata);
      } catch (error) {
        console.error('Error saving KRI:', error);
      }
    }
    
    console.log(`Saved ${kris.length} KRIs from API`);
  }

  // ✅ GET NESTED VALUE FROM OBJECT
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj) || [];
  }

  // ✅ CONVERT TO SOAP
  convertToSOAP(data, template) {
    // Simple template replacement
    let soapBody = template || '<soap:Envelope><soap:Body>{{data}}</soap:Body></soap:Envelope>';
    return soapBody.replace('{{data}}', JSON.stringify(data));
  }

  // ✅ GET CONNECTION STATUS
  getConnectionStatus(connection) {
    if (connection.status === 'error') return { status: 'error', color: 'error', label: 'Error' };
    if (connection.status === 'active') return { status: 'active', color: 'success', label: 'Active' };
    if (connection.status === 'syncing') return { status: 'syncing', color: 'warning', label: 'Syncing' };
    return { status: 'inactive', color: 'default', label: 'Inactive' };
  }

  // ✅ GET SYNC STATISTICS
  async getSyncStatistics() {
    const connections = await this.getAllConnections();
    
    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.status === 'active').length,
      totalSyncs: connections.reduce((sum, c) => sum + (c.sync_count || 0), 0),
      totalErrors: connections.reduce((sum, c) => sum + (c.error_count || 0), 0),
      lastSync: connections.reduce((latest, c) => {
        if (!c.last_sync) return latest;
        const syncTime = c.last_sync.toDate();
        return !latest || syncTime > latest ? syncTime : latest;
      }, null)
    };
  }
}

export default new APIIntegrationService();