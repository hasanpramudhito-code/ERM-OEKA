// src/pages/SettingsPanel.js - HANYA TEXT UNTUK DEBUG
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  CircularProgress
} from '@mui/material';
import { useSettings } from '../contexts/SettingsContext';
import { Tune, Settings } from '@mui/icons-material';

const SettingsPanel = () => {
  const { settings, loading } = useSettings();

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading settings...</Typography>
      </Box>
    );
  }

<Card sx={{ mb: 3, boxShadow: 2 }}>
  <CardContent>
    <Typography variant="h6" fontWeight="bold" gutterBottom>
      Risk Management Settings
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Tune sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Risk Parameters
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Kelola skala likelihood, impact, dan risk appetite organisasi
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Tune />}
            onClick={() => window.location.href = '/risk-parameters'}
          >
            Configure Parameters
          </Button>
        </Box>
      </Grid>
    </Grid>
  </CardContent>
</Card>

  return (

    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Settings Debug
          </Typography>
          <Typography variant="body1">
            Settings loaded successfully!
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Categories count: {Array.isArray(settings.categories) ? settings.categories.length : 'N/A'}
          </Typography>
          <Typography variant="body2">
            Matrix size: {settings.matrix?.size || 'N/A'}
          </Typography>
          <Typography variant="body2">
            UI Theme: {settings.ui?.theme || 'N/A'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPanel;