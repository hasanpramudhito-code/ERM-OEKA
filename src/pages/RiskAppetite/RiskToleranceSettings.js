// src/pages/RiskAppetite/RiskToleranceSettings.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import { Save, Warning, Add } from '@mui/icons-material';
import { riskAppetiteService } from '../../services/riskAppetiteService';

const RiskToleranceSettings = () => {
  const [toleranceSettings, setToleranceSettings] = useState({});
  const [newStatement, setNewStatement] = useState({
    riskCategory: '',
    statement: '',
    toleranceLevels: {
      low: { min: 0, max: 2 },
      medium: { min: 2, max: 4 },
      high: { min: 4, max: 5 }
    },
    escalationProcess: ''
  });

  useEffect(() => {
    loadToleranceSettings();
  }, []);

  const loadToleranceSettings = async () => {
    try {
      const statements = await riskAppetiteService.getAppetiteStatements('org-001');
      const settings = {};
      statements.forEach(stmt => {
        settings[stmt.riskCategory] = stmt;
      });
      setToleranceSettings(settings);
    } catch (error) {
      console.error('Error loading tolerance settings:', error);
    }
  };

  const handleSaveTolerance = async (category, levels) => {
    try {
      await riskAppetiteService.setToleranceLevels(category, levels);
      loadToleranceSettings();
    } catch (error) {
      console.error('Error saving tolerance levels:', error);
    }
  };

  const handleCreateStatement = async () => {
    try {
      await riskAppetiteService.createAppetiteStatement({
        ...newStatement,
        organizationId: 'org-001'
      });
      setNewStatement({
        riskCategory: '',
        statement: '',
        toleranceLevels: {
          low: { min: 0, max: 2 },
          medium: { min: 2, max: 4 },
          high: { min: 4, max: 5 }
        },
        escalationProcess: ''
      });
      loadToleranceSettings();
    } catch (error) {
      console.error('Error creating appetite statement:', error);
    }
  };

  const riskCategories = [
    'Financial Risk',
    'Operational Risk',
    'Strategic Risk',
    'Compliance Risk',
    'Reputational Risk',
    'Cybersecurity Risk',
    'Project Risk'
  ];

  const marks = [
    { value: 0, label: '0' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Risk Tolerance Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Create New Appetite Statement */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Risk Appetite Statement
              </Typography>

              <FormControl fullWidth margin="normal">
                <InputLabel>Risk Category</InputLabel>
                <Select
                  value={newStatement.riskCategory}
                  onChange={(e) => setNewStatement({...newStatement, riskCategory: e.target.value})}
                >
                  {riskCategories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Appetite Statement"
                value={newStatement.statement}
                onChange={(e) => setNewStatement({...newStatement, statement: e.target.value})}
                margin="normal"
                multiline
                rows={3}
                placeholder="e.g., We have zero tolerance for compliance violations..."
              />

              <TextField
                fullWidth
                label="Escalation Process"
                value={newStatement.escalationProcess}
                onChange={(e) => setNewStatement({...newStatement, escalationProcess: e.target.value})}
                margin="normal"
                multiline
                rows={2}
                placeholder="Describe the escalation process when tolerance is exceeded..."
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Tolerance Levels (Risk Score 0-5)
              </Typography>

              {['low', 'medium', 'high'].map(level => (
                <Box key={level} mb={2}>
                  <Typography variant="body2" gutterBottom>
                    {level.toUpperCase()} Tolerance: {newStatement.toleranceLevels[level].min} - {newStatement.toleranceLevels[level].max}
                  </Typography>
                  <Slider
                    value={[newStatement.toleranceLevels[level].min, newStatement.toleranceLevels[level].max]}
                    onChange={(e, newValue) => setNewStatement({
                      ...newStatement,
                      toleranceLevels: {
                        ...newStatement.toleranceLevels,
                        [level]: { min: newValue[0], max: newValue[1] }
                      }
                    })}
                    valueLabelDisplay="auto"
                    marks={marks}
                    min={0}
                    max={5}
                    step={1}
                  />
                </Box>
              ))}

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateStatement}
                fullWidth
                sx={{ mt: 2 }}
              >
                Create Appetite Statement
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Manage Existing Tolerance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Tolerance Settings
              </Typography>

              {Object.keys(toleranceSettings).length === 0 ? (
                <Alert severity="info">
                  No risk appetite statements configured yet.
                </Alert>
              ) : (
                <Box>
                  {Object.entries(toleranceSettings).map(([category, settings]) => (
                    <Card key={category} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {category}
                      </Typography>
                      
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {settings.statement}
                      </Typography>

                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Chip 
                            label={`Low: ${settings.toleranceLevels?.low?.min}-${settings.toleranceLevels?.low?.max}`}
                            color="success" 
                            size="small" 
                            variant="outlined"
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <Chip 
                            label={`Medium: ${settings.toleranceLevels?.medium?.min}-${settings.toleranceLevels?.medium?.max}`}
                            color="warning" 
                            size="small" 
                            variant="outlined"
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <Chip 
                            label={`High: ${settings.toleranceLevels?.high?.min}-${settings.toleranceLevels?.high?.max}`}
                            color="error" 
                            size="small" 
                            variant="outlined"
                          />
                        </Grid>
                      </Grid>

                      <Button
                        size="small"
                        startIcon={<Save />}
                        onClick={() => handleSaveTolerance(category, settings.toleranceLevels)}
                        sx={{ mt: 1 }}
                      >
                        Update Tolerance
                      </Button>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Matrix Visualization */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Risk Tolerance Matrix Visualization
          </Typography>
          <Alert severity="info">
            This section will show a visual representation of risk tolerance levels across different categories.
            Implementation pending design specifications.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RiskToleranceSettings;