// src/pages/RiskAppetite/RiskAppetiteDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip
} from '@mui/material';
import { riskAppetiteService } from '../../services/riskAppetiteService';

const RiskAppetiteDashboard = () => {
  const [appetiteStatements, setAppetiteStatements] = useState([]);
  const [compliance, setCompliance] = useState({});

  useEffect(() => {
    loadAppetiteData();
  }, []);

  const loadAppetiteData = async () => {
    try {
      const statements = await riskAppetiteService.getAppetiteStatements('org-001');
      setAppetiteStatements(statements);
    } catch (error) {
      console.error('Error loading appetite data:', error);
    }
  };

  const getComplianceColor = (level) => {
    const colors = {
      within_appetite: 'success',
      approaching_limit: 'warning',
      exceeded_appetite: 'error'
    };
    return colors[level] || 'default';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Risk Appetite Framework
      </Typography>

      <Grid container spacing={3}>
        {appetiteStatements.map((statement) => (
          <Grid item xs={12} md={6} key={statement.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {statement.riskCategory}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {statement.statement}
                </Typography>

                {/* Tolerance Levels */}
                <Box mb={2}>
                  <Typography variant="body2" gutterBottom>
                    Tolerance Levels:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip 
                      label={`Low: ${statement.toleranceLevels?.low}`} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`Medium: ${statement.toleranceLevels?.medium}`} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`High: ${statement.toleranceLevels?.high}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                </Box>

                {/* Compliance Status */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Current Compliance:
                  </Typography>
                  <Chip 
                    label={statement.compliance?.toUpperCase()} 
                    color={getComplianceColor(statement.compliance)}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Overall Appetite Compliance */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Risk Appetite Compliance
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={75} 
            color="success"
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="body2">75% Within Appetite</Typography>
            <Typography variant="body2">25% Requires Attention</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RiskAppetiteDashboard;