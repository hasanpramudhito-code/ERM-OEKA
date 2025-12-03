import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Edit,
  PlayArrow,
  CheckCircle,
  Schedule,
  Warning
} from '@mui/icons-material';

const ProgressTracking = ({ treatmentPlan, onUpdate }) => {
  const [editDialog, setEditDialog] = useState(false);
  const [progressData, setProgressData] = useState({
    progress: treatmentPlan?.progress || 0,
    status: treatmentPlan?.status || 'not_started',
    notes: treatmentPlan?.notes || ''
  });

  // Status options dengan color coding
  const statusOptions = [
    { value: 'planned', label: 'Terencana', color: 'default', icon: <Schedule /> },
    { value: 'in_progress', label: 'Dalam Proses', color: 'primary', icon: <PlayArrow /> },
    { value: 'completed', label: 'Selesai', color: 'success', icon: <CheckCircle /> },
    { value: 'delayed', label: 'Terlambat', color: 'warning', icon: <Warning /> },
    { value: 'cancelled', label: 'Dibatalkan', color: 'error', icon: <Warning /> }
  ];

  const getStatusInfo = (statusValue) => {
    return statusOptions.find(opt => opt.value === statusValue) || statusOptions[0];
  };

  const handleProgressUpdate = () => {
    setEditDialog(true);
    // Initialize form data dengan current treatment plan data
    setProgressData({
      progress: treatmentPlan?.progress || 0,
      status: treatmentPlan?.status || 'planned',
      notes: treatmentPlan?.notes || ''
    });
  };

  const handleSaveProgress = () => {
    onUpdate(progressData);
    setEditDialog(false);
  };

  const handleProgressChange = (event) => {
    const newProgress = parseInt(event.target.value);
    setProgressData(prev => ({
      ...prev,
      progress: newProgress,
      // Auto-update status berdasarkan progress
      status: newProgress === 0 ? 'planned' : 
              newProgress === 100 ? 'completed' : 
              newProgress < 100 ? 'in_progress' : prev.status
    }));
  };

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    setProgressData(prev => ({
      ...prev,
      status: newStatus,
      // Auto-update progress berdasarkan status
      progress: newStatus === 'completed' ? 100 : 
               newStatus === 'planned' ? 0 : 
               prev.progress
    }));
  };

  const getProgressColor = () => {
    const status = progressData.status;
    if (status === 'completed') return 'success';
    if (status === 'delayed') return 'warning';
    if (status === 'in_progress') return 'primary';
    return 'inherit';
  };

  const currentStatus = getStatusInfo(progressData.status);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Progress Monitoring
          </Typography>
          <Button
            startIcon={<Edit />}
            variant="outlined"
            size="small"
            onClick={handleProgressUpdate}
          >
            Update Progress
          </Button>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Progress: {treatmentPlan?.progress || 0}%
            </Typography>
            <Chip
              icon={currentStatus.icon}
              label={currentStatus.label}
              color={currentStatus.color}
              size="small"
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={treatmentPlan?.progress || 0}
            color={getProgressColor()}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Timeline Info */}
        <Grid container spacing={2}>
          <Grid size={{xs: 12, sm: 6}}>
            <Typography variant="body2" color="textSecondary">
              Target Selesai:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {treatmentPlan?.deadline ? new Date(treatmentPlan.deadline).toLocaleDateString('id-ID') : '-'}
            </Typography>
          </Grid>
          <Grid size={{xs: 12, sm: 6}}>
            <Typography variant="body2" color="textSecondary">
              PIC:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {treatmentPlan?.responsiblePerson || '-'}
            </Typography>
          </Grid>
        </Grid>

        {/* Notes Preview */}
        {treatmentPlan?.notes && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Catatan Terakhir:
            </Typography>
            <Typography variant="body2">
              {treatmentPlan.notes}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Edit Progress Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Progress Treatment Plan</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Progress Slider */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Progress: {progressData.progress}%
              </Typography>
              <TextField
                type="range"
                value={progressData.progress}
                onChange={handleProgressChange}
                inputProps={{
                  min: 0,
                  max: 100,
                  step: 5
                }}
                sx={{
                  '& input[type="range"]': {
                    width: '100%',
                    height: '8px',
                    borderRadius: '5px',
                    background: `linear-gradient(90deg, #f0f0f0 0%, #1976d2 ${progressData.progress}%, #f0f0f0 ${progressData.progress}%)`
                  }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">0%</Typography>
                <Typography variant="caption">100%</Typography>
              </Box>
            </FormControl>

            {/* Status Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={progressData.status}
                label="Status"
                onChange={handleStatusChange}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon}
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Notes */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Catatan Progress"
              value={progressData.notes}
              onChange={(e) => setProgressData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Tambahkan catatan mengenai progress yang telah dicapai..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Batal</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveProgress}
            disabled={!progressData.status}
          >
            Simpan Progress
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ProgressTracking;