// src/pages/ControlTesting/TestResults.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Rating,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Add, 
  Refresh,
  CheckCircle,
  Warning,
  Error as ErrorIcon 
} from '@mui/icons-material';
import { controlTestingService } from '../../services/controlTestingService';

const TestResults = () => {
  // STATE
  const [controls, setControls] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [selectedControl, setSelectedControl] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [newResult, setNewResult] = useState({
    testDate: new Date().toISOString().split('T')[0],
    testedBy: '',
    testType: 'design',
    result: 'effective',
    effectivenessRating: 3,
    sampleSize: '',
    exceptionsFound: 0,
    notes: ''
  });

  // LOAD DATA
  useEffect(() => {
    loadControls();
    loadAllTestResults();
  }, []);

  const loadControls = async () => {
    setLoading(true);
    try {
      const data = await controlTestingService.getControls('org-001');
      setControls(data || []);
    } catch (err) {
      console.error('Error loading controls:', err);
      // Fallback data
      setControls([
        { id: '1', name: 'Access Control Review', category: 'IT Controls' },
        { id: '2', name: 'Financial Reconciliation', category: 'Finance' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // LOAD TEST RESULTS - SIMPLE (localStorage)
  const loadAllTestResults = () => {
    try {
      const savedResults = JSON.parse(localStorage.getItem('testResults') || '[]');
      setTestResults(savedResults);
    } catch (err) {
      console.error('Error loading test results:', err);
      setTestResults([]);
    }
  };

  // ADD TEST RESULT - SIMPLE (localStorage)
  const handleAddTestResult = () => {
    if (!selectedControl) {
      alert('Please select a control');
      return;
    }
    
    const selectedControlData = controls.find(c => c.id === selectedControl);
    if (!selectedControlData) {
      alert('Control not found');
      return;
    }
    
    try {
      // Create test result object
      const newResultItem = {
        id: Date.now().toString(),
        controlId: selectedControl,
        controlName: selectedControlData.name,
        controlCategory: selectedControlData.category,
        ...newResult,
        createdAt: new Date().toISOString(),
        localSaved: true
      };
      
      console.log('Creating test result:', newResultItem);
      
      // 1. Save to localStorage
      const currentResults = JSON.parse(localStorage.getItem('testResults') || '[]');
      const updatedResults = [...currentResults, newResultItem];
      localStorage.setItem('testResults', JSON.stringify(updatedResults));
      
      // 2. Try Firebase (optional)
      try {
        controlTestingService.addTestResult(selectedControl, newResultItem)
          .then(result => {
            console.log('Also saved to Firebase:', result);
          })
          .catch(firebaseError => {
            console.log('Firebase save failed:', firebaseError.message);
          });
      } catch (firebaseError) {
        console.log('Firebase error');
      }
      
      // 3. Update state
      setTestResults(updatedResults);
      
      // 4. Success
      alert(`✅ Test result added!\n\nControl: ${selectedControlData.name}\nResult: ${newResult.result}\nTested By: ${newResult.testedBy}`);
      
      // 5. Reset form
      setOpenDialog(false);
      setSelectedControl('');
      setNewResult({
        testDate: new Date().toISOString().split('T')[0],
        testedBy: '',
        testType: 'design',
        result: 'effective',
        effectivenessRating: 3,
        sampleSize: '',
        exceptionsFound: 0,
        notes: ''
      });
      
    } catch (error) {
      console.error('Error adding test result:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // UTILITY FUNCTIONS
  const getResultColor = (result) => {
    const colors = {
      effective: 'success',
      partially_effective: 'warning',
      not_effective: 'error'
    };
    return colors[result] || 'default';
  };

  const getResultIcon = (result) => {
    const icons = {
      effective: <CheckCircle fontSize="small" />,
      partially_effective: <Warning fontSize="small" />,
      not_effective: <ErrorIcon fontSize="small" />
    };
    return icons[result] || <ErrorIcon fontSize="small" />;
  };

  // Calculate stats
  const stats = {
    totalTests: testResults.length,
    effective: testResults.filter(r => r.result === 'effective').length,
    issues: testResults.filter(r => r.result !== 'effective').length,
    avgRating: testResults.length > 0 
      ? (testResults.reduce((sum, r) => sum + (r.effectivenessRating || 0), 0) / testResults.length).toFixed(1)
      : 0
  };

  // LOADING STATE
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Test Results</Typography>
          <Typography variant="body2" color="textSecondary">
            View and manage test results
          </Typography>
        </Box>
        
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { loadControls(); loadAllTestResults(); }} sx={{ mr: 1 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
            disabled={controls.length === 0}
          >
            Add Test Result
          </Button>
        </Box>
      </Box>

      {/* INFO */}
      {controls.length === 0 && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No controls found. Create controls first.
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        Controls: {controls.length} | Test Results: {testResults.length}
      </Alert>

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">Total Tests</Typography>
              <Typography variant="h4">{stats.totalTests}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">Effective</Typography>
              <Typography variant="h4" color="success.main">{stats.effective}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">Issues</Typography>
              <Typography variant="h4" color="warning.main">{stats.issues}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">Avg. Rating</Typography>
              <Typography variant="h4">{stats.avgRating}</Typography>
              <Rating value={parseFloat(stats.avgRating)} readOnly size="small" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* RECENT RESULTS */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Recent Test Results</Typography>
          
          {testResults.length === 0 ? (
            <Alert severity="info">
              No test results yet. Add your first test result.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Control</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Tested By</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testResults.slice(0, 10).map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{result.controlName}</Typography>
                        <Typography variant="caption">{result.controlCategory}</Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(result.testDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{result.testedBy}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getResultIcon(result.result)}
                          label={result.result}
                          color={getResultColor(result.result)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Rating value={result.effectivenessRating || 0} readOnly size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={result.testType} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Test Result</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }} required>
            <InputLabel>Select Control *</InputLabel>
            <Select
              value={selectedControl}
              onChange={(e) => setSelectedControl(e.target.value)}
              label="Select Control *"
              disabled={controls.length === 0}
            >
              <MenuItem value="" disabled>
                {controls.length === 0 ? 'No controls available' : 'Choose a control'}
              </MenuItem>
              {controls.map(control => (
                <MenuItem key={control.id} value={control.id}>
                  {control.name} - {control.category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedControl && (
            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
              Selected: {controls.find(c => c.id === selectedControl)?.name}
            </Alert>
          )}

          <Box display="flex" gap={2} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Test Date *"
              type="date"
              value={newResult.testDate}
              onChange={(e) => setNewResult({...newResult, testDate: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Tested By *"
              value={newResult.testedBy}
              onChange={(e) => setNewResult({...newResult, testedBy: e.target.value})}
            />
          </Box>

          <Box display="flex" gap={2} sx={{ mt: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Test Type *</InputLabel>
              <Select
                value={newResult.testType}
                onChange={(e) => setNewResult({...newResult, testType: e.target.value})}
                label="Test Type *"
              >
                <MenuItem value="design">Design Effectiveness</MenuItem>
                <MenuItem value="operating">Operating Effectiveness</MenuItem>
                <MenuItem value="both">Both</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Result *</InputLabel>
              <Select
                value={newResult.result}
                onChange={(e) => setNewResult({...newResult, result: e.target.value})}
                label="Result *"
              >
                <MenuItem value="effective">Effective</MenuItem>
                <MenuItem value="partially_effective">Partially Effective</MenuItem>
                <MenuItem value="not_effective">Not Effective</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography>Effectiveness Rating:</Typography>
            <Rating
              value={newResult.effectivenessRating}
              onChange={(e, value) => setNewResult({...newResult, effectivenessRating: value})}
              size="large"
            />
          </Box>

          <TextField
            fullWidth
            label="Notes"
            value={newResult.notes}
            onChange={(e) => setNewResult({...newResult, notes: e.target.value})}
            sx={{ mt: 3 }}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddTestResult}
            variant="contained"
            disabled={!selectedControl || !newResult.testedBy}
          >
            Save Test Result
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestResults;