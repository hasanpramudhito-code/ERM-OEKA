// src/pages/KRIMonitoring/KRISettings.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip
} from '@mui/material';
import { Save, Add, Delete } from '@mui/icons-material';
import { kriAdvancedService } from '../../services/kriAdvancedService';

const KRISettings = () => {
  const [kris, setKris] = useState([]);
  const [newKRI, setNewKRI] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    frequency: 'monthly',
    targetValue: 0,
    thresholds: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    isActive: true
  });
  const [editingKRI, setEditingKRI] = useState(null);

  useEffect(() => {
    loadKRIs();
  }, []);

  const loadKRIs = async () => {
    try {
      const kriData = await kriAdvancedService.getAllKRIs('org-001');
      setKris(kriData);
    } catch (error) {
      console.error('Error loading KRIs:', error);
    }
  };

  const handleCreateKRI = async () => {
    try {
      await kriAdvancedService.createKRI({
        ...newKRI,
        organizationId: 'org-001',
        currentValue: 0,
        trend: 'stable'
      });
      setNewKRI({
        name: '',
        description: '',
        category: '',
        unit: '',
        frequency: 'monthly',
        targetValue: 0,
        thresholds: { low: 0, medium: 0, high: 0, critical: 0 },
        isActive: true
      });
      loadKRIs();
    } catch (error) {
      console.error('Error creating KRI:', error);
    }
  };

  const handleUpdateKRI = async (kriId, updates) => {
    try {
      await kriAdvancedService.updateKRI(kriId, updates);
      loadKRIs();
      setEditingKRI(null);
    } catch (error) {
      console.error('Error updating KRI:', error);
    }
  };

  const handleSetThresholds = async (kriId, thresholds) => {
    try {
      await kriAdvancedService.setKRIThresholds(kriId, thresholds);
      loadKRIs();
    } catch (error) {
      console.error('Error setting thresholds:', error);
    }
  };

  const categories = [
    'Financial',
    'Operational',
    'Strategic',
    'Compliance',
    'Reputational',
    'Cybersecurity'
  ];

  const frequencies = [
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'annually'
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        KRI Settings & Configuration
      </Typography>

      <Grid container spacing={3}>
        {/* Create New KRI */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create New KRI
              </Typography>

              <TextField
                fullWidth
                label="KRI Name"
                value={newKRI.name}
                onChange={(e) => setNewKRI({...newKRI, name: e.target.value})}
                margin="normal"
              />

              <TextField
                fullWidth
                label="Description"
                value={newKRI.description}
                onChange={(e) => setNewKRI({...newKRI, description: e.target.value})}
                margin="normal"
                multiline
                rows={2}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  value={newKRI.category}
                  onChange={(e) => setNewKRI({...newKRI, category: e.target.value})}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Grid container spacing={2} margin="normal">
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Unit"
                    value={newKRI.unit}
                    onChange={(e) => setNewKRI({...newKRI, unit: e.target.value})}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={newKRI.frequency}
                      onChange={(e) => setNewKRI({...newKRI, frequency: e.target.value})}
                    >
                      {frequencies.map(freq => (
                        <MenuItem key={freq} value={freq}>{freq}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Target Value"
                type="number"
                value={newKRI.targetValue}
                onChange={(e) => setNewKRI({...newKRI, targetValue: parseFloat(e.target.value)})}
                margin="normal"
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Threshold Settings
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Low Threshold"
                    type="number"
                    value={newKRI.thresholds.low}
                    onChange={(e) => setNewKRI({
                      ...newKRI, 
                      thresholds: {...newKRI.thresholds, low: parseFloat(e.target.value)}
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Medium Threshold"
                    type="number"
                    value={newKRI.thresholds.medium}
                    onChange={(e) => setNewKRI({
                      ...newKRI, 
                      thresholds: {...newKRI.thresholds, medium: parseFloat(e.target.value)}
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="High Threshold"
                    type="number"
                    value={newKRI.thresholds.high}
                    onChange={(e) => setNewKRI({
                      ...newKRI, 
                      thresholds: {...newKRI.thresholds, high: parseFloat(e.target.value)}
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Critical Threshold"
                    type="number"
                    value={newKRI.thresholds.critical}
                    onChange={(e) => setNewKRI({
                      ...newKRI, 
                      thresholds: {...newKRI.thresholds, critical: parseFloat(e.target.value)}
                    })}
                  />
                </Grid>
              </Grid>

              <FormControlLabel
                control={
                  <Switch
                    checked={newKRI.isActive}
                    onChange={(e) => setNewKRI({...newKRI, isActive: e.target.checked})}
                  />
                }
                label="Active KRI"
                sx={{ mt: 2 }}
              />

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateKRI}
                sx={{ mt: 2 }}
                fullWidth
              >
                Create KRI
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Existing KRIs Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Manage Existing KRIs
              </Typography>

              {kris.length === 0 ? (
                <Alert severity="info">
                  No KRIs configured yet. Create your first KRI above.
                </Alert>
              ) : (
                <Box>
                  {kris.map((kri) => (
                    <Card key={kri.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1">
                            {kri.name}
                            <Chip 
                              label={kri.isActive ? 'Active' : 'Inactive'} 
                              size="small" 
                              color={kri.isActive ? 'success' : 'default'}
                              sx={{ ml: 1 }}
                            />
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {kri.category} • {kri.frequency}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Button
                            size="small"
                            onClick={() => setEditingKRI(editingKRI === kri.id ? null : kri.id)}
                          >
                            {editingKRI === kri.id ? 'Cancel' : 'Edit'}
                          </Button>
                        </Box>
                      </Box>

                      {editingKRI === kri.id && (
                        <Box mt={2}>
                          <TextField
                            fullWidth
                            label="Target Value"
                            type="number"
                            value={kri.targetValue}
                            onChange={(e) => handleUpdateKRI(kri.id, {
                              targetValue: parseFloat(e.target.value)
                            })}
                            margin="dense"
                          />
                          
                          <FormControlLabel
                            control={
                              <Switch
                                checked={kri.isActive}
                                onChange={(e) => handleUpdateKRI(kri.id, {
                                  isActive: e.target.checked
                                })}
                              />
                            }
                            label="Active"
                          />

                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSetThresholds(kri.id, kri.thresholds)}
                            sx={{ mt: 1 }}
                          >
                            Update Thresholds
                          </Button>
                        </Box>
                      )}
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default KRISettings;