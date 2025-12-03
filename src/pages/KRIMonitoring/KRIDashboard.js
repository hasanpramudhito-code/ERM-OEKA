// src/pages/KRIMonitoring/KRIDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert
} from '@mui/material';
import { Add, Warning, TrendingUp } from '@mui/icons-material';
import { kriAdvancedService } from '../../services/kriAdvancedService';

const KRIDashboard = () => {
  const [kris, setKris] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadKRIs();
  }, []);

  const loadKRIs = async () => {
    try {
      const kriData = await kriAdvancedService.getAllKRIs('org-001');
      setKris(kriData);
      
      // Filter critical alerts
      const criticalAlerts = kriData.filter(kri => 
        kri.status === 'critical' || kri.status === 'high'
      );
      setAlerts(criticalAlerts);
    } catch (error) {
      console.error('Error loading KRIs:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'success'
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Key Risk Indicators Monitoring
      </Typography>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {alerts.length} KRIs require immediate attention
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* KRI Summary Cards */}
        {kris.map((kri) => (
          <Grid item xs={12} md={6} lg={4} key={kri.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Typography variant="h6" gutterBottom>
                    {kri.name}
                  </Typography>
                  <Chip 
                    label={kri.status} 
                    color={getStatusColor(kri.status)}
                    size="small"
                  />
                </Box>
                
                <Typography color="textSecondary" gutterBottom>
                  {kri.description}
                </Typography>

                <Box mt={2}>
                  <Typography variant="h4">
                    {kri.currentValue} {kri.unit}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Target: {kri.targetValue} {kri.unit}
                  </Typography>
                </Box>

                {/* Threshold Indicators */}
                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    Thresholds: 
                    <Chip size="small" label={`Low < ${kri.thresholds?.medium}`} />
                    <Chip size="small" label={`Med < ${kri.thresholds?.high}`} />
                    <Chip size="small" label={`High < ${kri.thresholds?.critical}`} />
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Button 
        variant="contained" 
        startIcon={<Add />}
        sx={{ mt: 3 }}
      >
        Add New KRI
      </Button>
    </Box>
  );
};

export default KRIDashboard;