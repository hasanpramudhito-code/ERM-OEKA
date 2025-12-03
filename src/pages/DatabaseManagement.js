import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  CloudDownload,
  CloudUpload,
  Storage,
  Warning,
  CheckCircle,
  Error,
  Info,
  Backup,
  Restore
} from '@mui/icons-material';
import DatabaseService from '../services/databaseService';

const DatabaseManagement = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load database statistics
  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await DatabaseService.getDatabaseStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Failed to load database statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Handle export database
  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      
      const exportData = await DatabaseService.exportDatabase();
      DatabaseService.downloadExportFile(exportData);
      
      // Update last export time
      localStorage.setItem('lastExport', new Date().toISOString());
      
      setSuccess('Database exported successfully!');
      loadStats(); // Refresh stats
    } catch (error) {
      console.error('Export error:', error);
      setError(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Handle file selection for import
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      setError('Please select a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = JSON.parse(e.target.result);
        const validation = DatabaseService.validateImportFile(fileData);
        
        if (validation.valid) {
          setImportFile(validation.data);
          setError(null);
        } else {
          setError(validation.error);
          setImportFile(null);
        }
      } catch (error) {
        setError('Invalid file format');
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  // Handle import database
  const handleImport = async () => {
    if (!importFile) {
      setError('Please select a valid export file first');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      
      const result = await DatabaseService.importDatabase(importFile, {
        clearExisting: clearExisting
      });

      setImportResults(result);
      
      if (result.success) {
        // Update last import time
        localStorage.setItem('lastImport', new Date().toISOString());
        setSuccess(`Successfully imported ${result.totalImported} documents!`);
        setOpenImportDialog(false);
        setImportFile(null);
        loadStats(); // Refresh stats
      } else {
        setError(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      setError(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Reset import state
  const resetImport = () => {
    setImportFile(null);
    setImportResults(null);
    setClearExisting(false);
    setError(null);
  };

  if (loading && !stats) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LinearProgress sx={{ width: '100%' }} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading database information...</Typography>
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
                🗃️ Database Management
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Backup, Restore, and Migrate Your ERM Database
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                Export for backup or import to migrate between environments
              </Typography>
            </Box>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderRadius: 2,
              textAlign: 'center'
            }}>
              <Storage sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">Data Management</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Database Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  📊 Database Overview
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Storage sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h3" fontWeight="bold">
                      {stats.totalDocuments}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Documents
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Last Export:</strong> {stats.lastExport}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Last Import:</strong> {stats.lastImport}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom>
                  Collection Statistics
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Collection</TableCell>
                        <TableCell align="right">Documents</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(stats.collections).map(([collection, count]) => (
                        <TableRow key={collection}>
                          <TableCell>
                            <Typography variant="body2">
                              {collection}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={count} 
                              size="small"
                              color={count > 0 ? "primary" : "default"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Cards */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              {/* Export Card */}
              <Grid item xs={12}>
                <Card sx={{ boxShadow: 2 }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <CloudDownload sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Export Database
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      Download complete database backup as JSON file
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={exporting ? <LinearProgress size={20} /> : <Backup />}
                      onClick={handleExport}
                      disabled={exporting}
                      sx={{ 
                        background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                        px: 4
                      }}
                    >
                      {exporting ? 'Exporting...' : 'Export Database'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Import Card */}
              <Grid item xs={12}>
                <Card sx={{ boxShadow: 2 }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <CloudUpload sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Import Database
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      Restore from backup or migrate from another system
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Restore />}
                      onClick={() => setOpenImportDialog(true)}
                      sx={{ 
                        background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                        px: 4
                      }}
                    >
                      Import Database
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Import Results */}
      {importResults && (
        <Card sx={{ mb: 3, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Import Results
            </Typography>
            {importResults.success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully imported {importResults.totalImported} documents!
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                Import failed: {importResults.error}
              </Alert>
            )}
            
            <List>
              {importResults.results.success.map((result, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${result.collection}`}
                    secondary={`Imported ${result.imported} of ${result.total} documents`}
                  />
                </ListItem>
              ))}
              {importResults.results.errors.map((error, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Error color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={error.collection || 'General Error'}
                    secondary={error.error}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Warning Card */}
      <Card sx={{ boxShadow: 2, border: '2px solid', borderColor: 'warning.main' }}>
        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <Warning sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6" fontWeight="bold" color="warning.main" gutterBottom>
                Important Notes
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Always backup your database before performing imports
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Import will overwrite existing documents with same IDs
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Test imports in a development environment first
              </Typography>
              <Typography variant="body2">
                • Large databases may take several minutes to process
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog 
        open={openImportDialog} 
        onClose={() => {
          setOpenImportDialog(false);
          resetImport();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Import Database
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Select a previously exported JSON file to restore your database
          </Typography>

          {/* File Upload */}
          <Box sx={{ mb: 3 }}>
            <input
              accept=".json"
              style={{ display: 'none' }}
              id="import-file"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="import-file">
              <Button variant="outlined" component="span" fullWidth>
                Select Export File
              </Button>
            </label>
            {importFile && (
              <Alert severity="success" sx={{ mt: 1 }}>
                File selected: {importFile.metadata.exported_at}
              </Alert>
            )}
          </Box>

          {/* Import Options */}
          <FormControlLabel
            control={
              <Checkbox
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                color="warning"
              />
            }
            label="Clear existing data before import (DANGEROUS)"
          />
          <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
            This will delete all existing data before importing. Use with extreme caution!
          </Typography>

          {/* Import Results Preview */}
          {importFile && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Import Preview
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Collection</TableCell>
                      <TableCell align="right">Documents</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(importFile.data).map(([collection, documents]) => (
                      <TableRow key={collection}>
                        <TableCell>{collection}</TableCell>
                        <TableCell align="right">{documents.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenImportDialog(false);
              resetImport();
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleImport}
            disabled={!importFile || importing}
            color="warning"
          >
            {importing ? 'Importing...' : 'Start Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseManagement;