import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add,
  Sync,
  PlayArrow,
  Stop,
  Edit,
  Delete,
  CheckCircle,
  Error,
  Warning,
  Api,
  Storage,
  Timeline
} from '@mui/icons-material';
import APIIntegrationService from '../services/apiIntegrationService';

const APIIntegration = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTestDialog, setOpenTestDialog] = useState(false);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'rest',
    base_url: '',
    auth_type: 'none',
    username: '',
    password: '',
    auth_token: '',
    api_key: '',
    api_key_header: 'X-API-Key',
    data_type: 'risks',
    sync_endpoint: '',
    push_endpoint: '',
    sync_frequency: 'manual',
    status: 'inactive'
  });

  // API types
  const apiTypes = [
    { value: 'rest', label: 'REST API' },
    { value: 'soap', label: 'SOAP Web Service' },
    { value: 'graphql', label: 'GraphQL' }
  ];

  // Auth types
  const authTypes = [
    { value: 'none', label: 'No Authentication' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'api_key', label: 'API Key' }
  ];

  // Data types
  const dataTypes = [
    { value: 'risks', label: 'Risk Data' },
    { value: 'incidents', label: 'Incident Data' },
    { value: 'kri', label: 'KRI Data' },
    { value: 'composite', label: 'Composite Scores' }
  ];

  // Sync frequencies
  const syncFrequencies = [
    { value: 'manual', label: 'Manual' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  // Load connections and stats
  const loadData = async () => {
    try {
      setLoading(true);
      const connectionsData = await APIIntegrationService.getAllConnections();
      setConnections(connectionsData);
      
      const statsData = await APIIntegrationService.getSyncStatistics();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle create/update connection
  const handleSaveConnection = async () => {
    try {
      if (currentConnection) {
        await APIIntegrationService.updateConnection(currentConnection.id, formData);
      } else {
        await APIIntegrationService.createConnection(formData);
      }
      
      setOpenDialog(false);
      setCurrentConnection(null);
      setFormData({
        name: '',
        description: '',
        type: 'rest',
        base_url: '',
        auth_type: 'none',
        username: '',
        password: '',
        auth_token: '',
        api_key: '',
        api_key_header: 'X-API-Key',
        data_type: 'risks',
        sync_endpoint: '',
        push_endpoint: '',
        sync_frequency: 'manual',
        status: 'inactive'
      });
      
      loadData();
    } catch (error) {
      console.error('Error saving connection:', error);
    }
  };

  // Handle test connection
  const handleTestConnection = async (connection) => {
    try {
      setTesting(true);
      setTestResult(null);
      
      const result = await APIIntegrationService.testConnection(connection);
      setTestResult(result);
      
      if (result.success) {
        loadData(); // Refresh to update status
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test failed',
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  // Handle sync data
  const handleSyncConnection = async (connection) => {
    try {
      setSyncing(true);
      setSyncResult(null);
      
      const result = await APIIntegrationService.syncFromExternal(connection);
      setSyncResult(result);
      
      if (result.success) {
        loadData(); // Refresh to update stats
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: 'Sync failed',
        error: error.message
      });
    } finally {
      setSyncing(false);
    }
  };

  // Handle edit connection
  const handleEditConnection = (connection) => {
    setCurrentConnection(connection);
    setFormData({
      name: connection.name,
      description: connection.description,
      type: connection.type,
      base_url: connection.base_url,
      auth_type: connection.auth_type,
      username: connection.username,
      password: connection.password,
      auth_token: connection.auth_token,
      api_key: connection.api_key,
      api_key_header: connection.api_key_header,
      data_type: connection.data_type,
      sync_endpoint: connection.sync_endpoint,
      push_endpoint: connection.push_endpoint,
      sync_frequency: connection.sync_frequency,
      status: connection.status
    });
    setOpenDialog(true);
  };

  // Get connection status info
  const getConnectionStatus = (connection) => {
    return APIIntegrationService.getConnectionStatus(connection);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading API Integrations...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                🔌 API Integration
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Connect and Sync with External Systems
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Integrate risk data from other systems and platforms
              </Typography>
            </Box>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderRadius: 2,
              textAlign: 'center'
            }}>
              <Api sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">API Gateway</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Api sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {stats.totalConnections}
                </Typography>
                <Typography variant="h6" color="textSecondary">
                  Total Connections
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {stats.activeConnections}
                </Typography>
                <Typography variant="h6" color="textSecondary">
                  Active Connections
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Sync sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="info.main">
                  {stats.totalSyncs}
                </Typography>
                <Typography variant="h6" color="textSecondary">
                  Total Syncs
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Timeline sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {stats.lastSync ? new Date(stats.lastSync).toLocaleDateString() : 'Never'}
                </Typography>
                <Typography variant="h6" color="textSecondary">
                  Last Sync
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Action Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          API Connections
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          New Connection
        </Button>
      </Box>

      {/* Connections Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          {connections.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No API connections configured. Create your first connection to start integrating with external systems.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell>Connection Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Data Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Sync</TableCell>
                    <TableCell>Sync Count</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {connections.map((connection) => {
                    const status = getConnectionStatus(connection);
                    
                    return (
                      <TableRow key={connection.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {connection.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {connection.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {connection.base_url}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={apiTypes.find(t => t.value === connection.type)?.label || connection.type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={dataTypes.find(t => t.value === connection.data_type)?.label || connection.data_type}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={status.label}
                            color={status.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {connection.last_sync ? 
                              connection.last_sync.toDate().toLocaleString() : 'Never'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {connection.sync_count || 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton 
                              color="primary"
                              size="small"
                              onClick={() => handleTestConnection(connection)}
                              disabled={testing}
                            >
                              <PlayArrow />
                            </IconButton>
                            <IconButton 
                              color="info"
                              size="small"
                              onClick={() => handleSyncConnection(connection)}
                              disabled={syncing}
                            >
                              <Sync />
                            </IconButton>
                            <IconButton 
                              color="warning"
                              size="small"
                              onClick={() => handleEditConnection(connection)}
                            >
                              <Edit />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card sx={{ mt: 3, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Connection Test Results
            </Typography>
            <Alert 
              severity={testResult.success ? "success" : "error"}
              onClose={() => setTestResult(null)}
            >
              {testResult.message}
              {testResult.error && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Error: {testResult.error}
                </Typography>
              )}
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Sync Results */}
      {syncResult && (
        <Card sx={{ mt: 3, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Sync Results
            </Typography>
            <Alert 
              severity={syncResult.success ? "success" : "error"}
              onClose={() => setSyncResult(null)}
            >
              {syncResult.message}
              {syncResult.data && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Records processed: {syncResult.data.recordsProcessed}
                </Typography>
              )}
              {syncResult.error && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Error: {syncResult.error}
                </Typography>
              )}
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Connection Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setCurrentConnection(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            {currentConnection ? 'Edit API Connection' : 'New API Connection'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Connection Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>API Type</InputLabel>
                <Select
                  value={formData.type}
                  label="API Type"
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  {apiTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL"
                value={formData.base_url}
                onChange={(e) => handleInputChange('base_url', e.target.value)}
                placeholder="https://api.example.com/v1"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Authentication Type</InputLabel>
                <Select
                  value={formData.auth_type}
                  label="Authentication Type"
                  onChange={(e) => handleInputChange('auth_type', e.target.value)}
                >
                  {authTypes.map(auth => (
                    <MenuItem key={auth.value} value={auth.value}>
                      {auth.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={formData.data_type}
                  label="Data Type"
                  onChange={(e) => handleInputChange('data_type', e.target.value)}
                >
                  {dataTypes.map(dataType => (
                    <MenuItem key={dataType.value} value={dataType.value}>
                      {dataType.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Authentication Fields */}
            {formData.auth_type === 'basic' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                </Grid>
              </>
            )}

            {formData.auth_type === 'bearer' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bearer Token"
                  type="password"
                  value={formData.auth_token}
                  onChange={(e) => handleInputChange('auth_token', e.target.value)}
                />
              </Grid>
            )}

            {formData.auth_type === 'api_key' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="API Key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => handleInputChange('api_key', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="API Key Header"
                    value={formData.api_key_header}
                    onChange={(e) => handleInputChange('api_key_header', e.target.value)}
                    placeholder="X-API-Key"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sync Endpoint"
                value={formData.sync_endpoint}
                onChange={(e) => handleInputChange('sync_endpoint', e.target.value)}
                placeholder="/risks"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Push Endpoint"
                value={formData.push_endpoint}
                onChange={(e) => handleInputChange('push_endpoint', e.target.value)}
                placeholder="/risks/push"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Sync Frequency</InputLabel>
                <Select
                  value={formData.sync_frequency}
                  label="Sync Frequency"
                  onChange={(e) => handleInputChange('sync_frequency', e.target.value)}
                >
                  {syncFrequencies.map(freq => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setCurrentConnection(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveConnection}
            disabled={!formData.name || !formData.base_url}
          >
            {currentConnection ? 'Update Connection' : 'Create Connection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default APIIntegration;