// src/pages/ControlTesting/TestingSchedule.js - COMPLETE FIXED VERSION
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
  Schedule, 
  Refresh, 
  PlayArrow,
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon 
} from '@mui/icons-material';
import { controlTestingService } from '../../services/controlTestingService';

const TestingSchedule = () => {
  // STATE
  const [controls, setControls] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedControl, setSelectedControl] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [loadingControls, setLoadingControls] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [error, setError] = useState(null);
  
  const [newSchedule, setNewSchedule] = useState({
    scheduledDate: new Date().toISOString().split('T')[0],
    assignedTo: '',
    testType: 'design',
    notes: ''
  });

  // LOAD CONTROLS
  useEffect(() => {
    loadControls();
    loadAllSchedules();
  }, []);

  const loadControls = async () => {
    setLoadingControls(true);
    try {
      const data = await controlTestingService.getControls('org-001');
      setControls(data || []);
    } catch (err) {
      console.error('Error loading controls:', err);
      // Fallback data
      setControls([
        { id: '1', name: 'Access Control Review', category: 'IT Controls' },
        { id: '2', name: 'Financial Reconciliation', category: 'Finance' },
        { id: '3', name: 'Backup Testing', category: 'IT Controls' }
      ]);
    } finally {
      setLoadingControls(false);
    }
  };

  // LOAD SCHEDULES - SIMPLE VERSION (localStorage)
  const loadAllSchedules = () => {
    setLoadingSchedules(true);
    try {
      // 1. Coba load dari localStorage
      const savedSchedules = JSON.parse(localStorage.getItem('testingSchedules') || '[]');
      
      // 2. Jika ada di localStorage, gunakan itu
      if (savedSchedules.length > 0) {
        setSchedules(savedSchedules);
        console.log('Loaded from localStorage:', savedSchedules.length);
      } else {
        // 3. Jika kosong, set empty array
        setSchedules([]);
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // CREATE SCHEDULE - SIMPLE VERSION (localStorage)
  const handleCreateSchedule = () => {
    if (!selectedControl) {
      alert('Please select a control');
      return;
    }
    
    // Find selected control
    const selectedControlData = controls.find(c => c.id === selectedControl);
    if (!selectedControlData) {
      alert('Control not found');
      return;
    }
    
    try {
      // Create schedule object
      const newScheduleItem = {
        id: Date.now().toString(), // Unique ID
        controlId: selectedControl,
        controlName: selectedControlData.name,
        controlCategory: selectedControlData.category,
        ...newSchedule,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        localSaved: true // Mark as saved locally
      };
      
      console.log('Creating schedule:', newScheduleItem);
      
      // 1. Save to localStorage
      const currentSchedules = JSON.parse(localStorage.getItem('testingSchedules') || '[]');
      const updatedSchedules = [...currentSchedules, newScheduleItem];
      localStorage.setItem('testingSchedules', JSON.stringify(updatedSchedules));
      
      // 2. Try to save to Firebase (optional)
      try {
        controlTestingService.createTestingSchedule(selectedControl, newScheduleItem)
          .then(result => {
            console.log('Also saved to Firebase:', result);
          })
          .catch(firebaseError => {
            console.log('Firebase save failed, but localStorage saved:', firebaseError.message);
          });
      } catch (firebaseError) {
        console.log('Firebase error, but localStorage saved');
      }
      
      // 3. Update state
      setSchedules(updatedSchedules);
      
      // 4. Success message
      alert(`✅ Schedule created!\n\nControl: ${selectedControlData.name}\nDate: ${newSchedule.scheduledDate}\nAssigned To: ${newSchedule.assignedTo}`);
      
      // 5. Reset form
      setOpenDialog(false);
      setSelectedControl('');
      setNewSchedule({
        scheduledDate: new Date().toISOString().split('T')[0],
        assignedTo: '',
        testType: 'design',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // START TEST
  const handleStartTest = (schedule) => {
    alert(`Starting test for: ${schedule.controlName}\nDate: ${schedule.scheduledDate}\nAssigned to: ${schedule.assignedTo}`);
    
    // Update status to in_progress
    const updatedSchedules = schedules.map(s => {
      if (s.id === schedule.id) {
        return { ...s, status: 'in_progress' };
      }
      return s;
    });
    
    setSchedules(updatedSchedules);
    localStorage.setItem('testingSchedules', JSON.stringify(updatedSchedules));
  };

  // UTILITY FUNCTIONS
  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'primary',
      in_progress: 'warning',
      completed: 'success',
      overdue: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      scheduled: <HourglassEmpty fontSize="small" />,
      in_progress: <PlayArrow fontSize="small" />,
      completed: <CheckCircle fontSize="small" />,
      overdue: <ErrorIcon fontSize="small" />
    };
    return icons[status] || <HourglassEmpty fontSize="small" />;
  };

  // Filter upcoming schedules
  const upcomingSchedules = schedules
    .filter(s => s.status === 'scheduled' || s.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  // LOADING STATE
  if (loadingControls) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading controls...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Testing Schedule</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage control testing schedules
          </Typography>
        </Box>
        
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { loadControls(); loadAllSchedules(); }} sx={{ mr: 1 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Schedule />}
            onClick={() => setOpenDialog(true)}
            disabled={controls.length === 0}
          >
            Schedule Test
          </Button>
        </Box>
      </Box>

      {/* ERROR/INFO */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {controls.length === 0 && !loadingControls && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No controls found. Create controls in Control Register first.
        </Alert>
      )}

      {/* DEBUG INFO */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Controls: {controls.length} | Schedules: {schedules.length} | Upcoming: {upcomingSchedules.length}
      </Alert>

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">Total Schedules</Typography>
              <Typography variant="h4">{schedules.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">Upcoming</Typography>
              <Typography variant="h4" color="primary">{upcomingSchedules.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">In Progress</Typography>
              <Typography variant="h4" color="warning.main">
                {schedules.filter(s => s.status === 'in_progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">Completed</Typography>
              <Typography variant="h4" color="success.main">
                {schedules.filter(s => s.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SCHEDULES TABLE */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Upcoming Tests
              {loadingSchedules && <CircularProgress size={20} sx={{ ml: 2 }} />}
            </Typography>
            <Chip label={`${upcomingSchedules.length} tests`} size="small" />
          </Box>
          
          {upcomingSchedules.length === 0 ? (
            <Alert severity="info">
              No upcoming tests scheduled. Create a new schedule.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Control</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{schedule.controlName}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {schedule.controlCategory}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.scheduledDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{schedule.assignedTo}</TableCell>
                      <TableCell>
                        <Chip label={schedule.testType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(schedule.status)}
                          label={schedule.status}
                          color={getStatusColor(schedule.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<PlayArrow />}
                          onClick={() => handleStartTest(schedule)}
                          disabled={schedule.status === 'completed'}
                        >
                          Start
                        </Button>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Control Test</DialogTitle>
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

          <TextField
            fullWidth
            label="Scheduled Date *"
            type="date"
            value={newSchedule.scheduledDate}
            onChange={(e) => setNewSchedule({...newSchedule, scheduledDate: e.target.value})}
            sx={{ mt: 3 }}
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            fullWidth
            label="Assigned To *"
            value={newSchedule.assignedTo}
            onChange={(e) => setNewSchedule({...newSchedule, assignedTo: e.target.value})}
            sx={{ mt: 2 }}
            required
          />

          <FormControl fullWidth sx={{ mt: 2 }} required>
            <InputLabel>Test Type *</InputLabel>
            <Select
              value={newSchedule.testType}
              onChange={(e) => setNewSchedule({...newSchedule, testType: e.target.value})}
              label="Test Type *"
            >
              <MenuItem value="design">Design Effectiveness</MenuItem>
              <MenuItem value="operating">Operating Effectiveness</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Notes"
            value={newSchedule.notes}
            onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})}
            sx={{ mt: 2 }}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateSchedule}
            variant="contained"
            disabled={!selectedControl || !newSchedule.assignedTo}
          >
            Schedule Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestingSchedule;