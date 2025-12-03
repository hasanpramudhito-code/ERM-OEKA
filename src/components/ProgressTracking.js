import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Slider // ✅ TAMBAHKAN SLIDER DI IMPORT
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  CheckCircle,
  Schedule,
  Update,
  TrendingUp,
  Assignment,
  Warning,
  Add,
  Edit,
  Delete,
  Person,
  CalendarToday
} from '@mui/icons-material';
import { Timestamp } from 'firebase/firestore';

const ProgressTracking = ({ treatmentPlan, onUpdate }) => {
  const [progressHistory, setProgressHistory] = useState([]);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    progress: 0,
    status: 'in_progress',
    notes: '',
    evidence: ''
  });

  // Progress milestones
  const progressMilestones = [
    { value: 0, label: 'Not Started', color: 'default' },
    { value: 25, label: 'Planning', color: 'info' },
    { value: 50, label: 'In Progress', color: 'warning' },
    { value: 75, label: 'Testing', color: 'primary' },
    { value: 100, label: 'Completed', color: 'success' }
  ];

  // Status options
  const statusOptions = [
    { value: 'planned', label: 'Planned', color: 'default' },
    { value: 'in_progress', label: 'In Progress', color: 'primary' },
    { value: 'on_hold', label: 'On Hold', color: 'warning' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'error' }
  ];

  // Load progress history from treatment plan
  useEffect(() => {
    if (treatmentPlan?.progressHistory) {
      setProgressHistory(treatmentPlan.progressHistory);
    }
  }, [treatmentPlan]);

  // Get current milestone
  const getCurrentMilestone = () => {
    const currentProgress = treatmentPlan?.progress || 0;
    return progressMilestones
      .slice()
      .reverse()
      .find(milestone => currentProgress >= milestone.value) || progressMilestones[0];
  };

  // Handle progress update
  const handleProgressUpdate = async () => {
    try {
      const newProgressHistory = [
        ...progressHistory,
        {
          progress: updateData.progress,
          status: updateData.status,
          notes: updateData.notes,
          evidence: updateData.evidence,
          updatedBy: 'Current User', // Ini akan diganti dengan user data
          updatedAt: new Date(),
          timestamp: Timestamp.now()
        }
      ];

      const updatedData = {
        progress: updateData.progress,
        status: updateData.status,
        progressHistory: newProgressHistory,
        lastUpdated: new Date(),
        updatedAt: Timestamp.now()
      };

      await onUpdate(updatedData);
      setOpenUpdateDialog(false);
      setUpdateData({
        progress: treatmentPlan?.progress || 0,
        status: treatmentPlan?.status || 'planned',
        notes: '',
        evidence: ''
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Quick action buttons
  const handleQuickAction = async (action) => {
    let newProgress = treatmentPlan?.progress || 0;
    let newStatus = treatmentPlan?.status || 'planned';

    switch (action) {
      case 'start':
        newProgress = 25;
        newStatus = 'in_progress';
        break;
      case 'pause':
        newStatus = 'on_hold';
        break;
      case 'resume':
        newStatus = 'in_progress';
        break;
      case 'complete':
        newProgress = 100;
        newStatus = 'completed';
        break;
      default:
        break;
    }

    const newProgressHistory = [
      ...progressHistory,
      {
        progress: newProgress,
        status: newStatus,
        notes: `Action: ${action}`,
        updatedBy: 'Current User',
        updatedAt: new Date(),
        timestamp: Timestamp.now()
      }
    ];

    await onUpdate({
      progress: newProgress,
      status: newStatus,
      progressHistory: newProgressHistory,
      lastUpdated: new Date(),
      updatedAt: Timestamp.now()
    });
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusInfo = statusOptions.find(s => s.value === status);
    return statusInfo ? statusInfo.color : 'default';
  };

  // Get progress color
  const getProgressColor = (progress) => {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'primary';
    if (progress >= 50) return 'warning';
    if (progress >= 25) return 'info';
    return 'default';
  };

  const currentMilestone = getCurrentMilestone();
  const currentProgress = treatmentPlan?.progress || 0;
  const currentStatus = treatmentPlan?.status || 'planned';

  return (
    <Box sx={{ mb: 4 }}>
      {/* Progress Overview Card */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progress Tracking
          </Typography>
          
          {/* Current Progress */}
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="textSecondary">
                Current Progress
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {currentProgress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={currentProgress}
              sx={{ height: 10, borderRadius: 5 }}
              color={getProgressColor(currentProgress)}
            />
            <Box display="flex" justifyContent="space-between" mt={1}>
              {progressMilestones.map((milestone, index) => (
                <Tooltip key={index} title={milestone.label}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: currentProgress >= milestone.value ? 
                        milestone.color === 'default' ? 'grey.400' : `${milestone.color}.main` : 'grey.300',
                      border: currentMilestone.value === milestone.value ? 2 : 0,
                      borderColor: 'primary.main'
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>

          {/* Status and Milestone */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                Current Status
              </Typography>
              <Chip 
                label={statusOptions.find(s => s.value === currentStatus)?.label || currentStatus}
                color={getStatusColor(currentStatus)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                Current Milestone
              </Typography>
              <Chip 
                label={currentMilestone.label}
                color={currentMilestone.color}
                size="small"
                variant="outlined"
              />
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {currentStatus === 'planned' && (
                <Button
                  size="small"
                  startIcon={<PlayArrow />}
                  onClick={() => handleQuickAction('start')}
                  variant="outlined"
                  color="success"
                >
                  Start Progress
                </Button>
              )}
              
              {currentStatus === 'in_progress' && currentProgress < 100 && (
                <>
                  <Button
                    size="small"
                    startIcon={<Pause />}
                    onClick={() => handleQuickAction('pause')}
                    variant="outlined"
                    color="warning"
                  >
                    Pause
                  </Button>
                  <Button
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={() => handleQuickAction('complete')}
                    variant="outlined"
                    color="success"
                  >
                    Mark Complete
                  </Button>
                </>
              )}
              
              {currentStatus === 'on_hold' && (
                <Button
                  size="small"
                  startIcon={<PlayArrow />}
                  onClick={() => handleQuickAction('resume')}
                  variant="outlined"
                  color="primary"
                >
                  Resume
                </Button>
              )}
              
              <Button
                size="small"
                startIcon={<Update />}
                onClick={() => {
                  setUpdateData({
                    progress: currentProgress,
                    status: currentStatus,
                    notes: '',
                    evidence: ''
                  });
                  setOpenUpdateDialog(true);
                }}
                variant="contained"
                color="primary"
              >
                Update Progress
              </Button>
            </Box>
          </Box>

          {/* Last Updated */}
          {treatmentPlan?.lastUpdated && (
            <Typography variant="caption" color="textSecondary">
              Last updated: {formatDate(treatmentPlan.lastUpdated)}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Progress History */}
      <Card sx={{ boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progress History
          </Typography>
          
          {progressHistory.length === 0 ? (
            <Alert severity="info">
              No progress updates yet. Use the update button to add the first progress update.
            </Alert>
          ) : (
            <List>
              {progressHistory
                .slice()
                .reverse()
                .map((update, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <Update color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">
                              Progress updated to {update.progress}%
                            </Typography>
                            <Chip 
                              label={update.status}
                              color={getStatusColor(update.status)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {update.notes && (
                              <Typography variant="body2" color="text.primary" paragraph>
                                {update.notes}
                              </Typography>
                            )}
                            <Box display="flex" gap={2} alignItems="center">
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Person fontSize="small" color="action" />
                                <Typography variant="caption" color="textSecondary">
                                  {update.updatedBy}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <CalendarToday fontSize="small" color="action" />
                                <Typography variant="caption" color="textSecondary">
                                  {formatDate(update.updatedAt)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < progressHistory.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Update Progress Dialog */}
      <Dialog 
        open={openUpdateDialog} 
        onClose={() => setOpenUpdateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Progress
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <Typography variant="body2" gutterBottom>
                  Progress: {updateData.progress}%
                </Typography>
                <Slider
                  value={updateData.progress}
                  onChange={(e, newValue) => setUpdateData({ ...updateData, progress: newValue })}
                  min={0}
                  max={100}
                  step={5}
                  valueLabelDisplay="auto"
                  marks={progressMilestones}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={updateData.status}
                  label="Status"
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Progress Notes"
                value={updateData.notes}
                onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                placeholder="Describe what has been accomplished, challenges faced, next steps..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Evidence/Reference"
                value={updateData.evidence}
                onChange={(e) => setUpdateData({ ...updateData, evidence: e.target.value })}
                placeholder="Link to document, screenshot, or reference number..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpdateDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleProgressUpdate}
            disabled={!updateData.notes}
          >
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgressTracking;