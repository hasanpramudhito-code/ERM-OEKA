// components/SettingsPanel.jsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  ExpandMore,
  Edit,
  Delete,
  Add,
  Save,
  Cancel,
  Palette,
  Language,
  Dashboard,
  Security,
  People,
  Business,
  Category
} from '@mui/icons-material';

const SettingsPanel = () => {
  const [activeTab, setActiveTab] = useState('matrix');
  const [settings, setSettings] = useState({
    // Risk Matrix Settings
    matrix: {
      size: 5,
      likelihoodLabels: [
        { level: 1, label: 'Remote', description: 'Sangat jarang terjadi' },
        { level: 2, label: 'Unlikely', description: 'Jarang terjadi' },
        { level: 3, label: 'Possible', description: 'Mungkin terjadi' },
        { level: 4, label: 'Probable', description: 'Sering terjadi' },
        { level: 5, label: 'Highly Probable', description: 'Sangat sering terjadi' }
      ],
      impactLabels: [
        { level: 1, label: 'Insignificant', description: 'Dampak sangat kecil' },
        { level: 2, label: 'Minor', description: 'Dampak kecil' },
        { level: 3, label: 'Moderate', description: 'Dampak sedang' },
        { level: 4, label: 'Major', description: 'Dampak besar' },
        { level: 5, label: 'Catastrophic', description: 'Dampak sangat besar' }
      ],
      riskLevels: [
        { level: 'Extreme', minLikelihood: 4, minImpact: 4, color: '#d32f2f' },
        { level: 'High', minLikelihood: 3, minImpact: 3, color: '#f57c00' },
        { level: 'Medium', minLikelihood: 2, minImpact: 2, color: '#ffeb3b' },
        { level: 'Low', minLikelihood: 2, minImpact: 1, color: '#81c784' },
        { level: 'Very Low', minLikelihood: 1, minImpact: 1, color: '#4caf50' }
      ]
    },
    
    // Categories Settings
    categories: [
      'Strategis', 'Operasional', 'Finansial', 'HSSE', 
      'IT & Teknologi', 'Legal & Kepatuhan', 'Fraud', 'Reputasi', 'Lainnya'
    ],
    
    // UI/UX Settings
    ui: {
      theme: 'light',
      language: 'id',
      dashboardView: 'grid',
      defaultFilters: {
        unit: 'all',
        category: 'all',
        status: 'all'
      }
    }
  });

  const tabs = [
    { id: 'matrix', label: 'Risk Matrix', icon: <Dashboard /> },
    { id: 'categories', label: 'Risk Categories', icon: <Category /> },
    { id: 'organization', label: 'Organization', icon: <Business /> },
    { id: 'ui', label: 'UI/UX', icon: <Palette /> },
    { id: 'users', label: 'User Management', icon: <People /> },
    { id: 'system', label: 'System', icon: <Security /> }
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            ⚙️ System Settings
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Kelola konfigurasi sistem dan preferensi pengguna
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Sidebar Navigation */}
        <Grid item xs={12} md={3}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <List>
                {tabs.map((tab) => (
                  <ListItem 
                    key={tab.id}
                    button 
                    selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      backgroundColor: activeTab === tab.id ? 'primary.light' : 'transparent',
                      color: activeTab === tab.id ? 'white' : 'inherit',
                      '&:hover': {
                        backgroundColor: activeTab === tab.id ? 'primary.main' : 'grey.100'
                      }
                    }}
                  >
                    <Box sx={{ mr: 2, color: 'inherit' }}>
                      {tab.icon}
                    </Box>
                    <ListItemText primary={tab.label} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Content */}
        <Grid item xs={12} md={9}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              {/* Risk Matrix Configuration */}
              {activeTab === 'matrix' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    🎯 Risk Matrix Configuration
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Konfigurasi ukuran matrix dan label likelihood & impact
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Matrix Size</InputLabel>
                        <Select
                          value={settings.matrix.size}
                          label="Matrix Size"
                          onChange={(e) => setSettings({
                            ...settings,
                            matrix: { ...settings.matrix, size: e.target.value }
                          })}
                        >
                          <MenuItem value={3}>3x3 Matrix</MenuItem>
                          <MenuItem value={4}>4x4 Matrix</MenuItem>
                          <MenuItem value={5}>5x5 Matrix</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  {/* Likelihood Labels Editor */}
                  <Typography variant="h6" gutterBottom>
                    Likelihood Labels
                  </Typography>
                  <Grid container spacing={2}>
                    {settings.matrix.likelihoodLabels.map((label, index) => (
                      <Grid item xs={12} key={label.level}>
                        <Card variant="outlined">
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={1}>
                                <Chip label={`L${label.level}`} color="primary" />
                              </Grid>
                              <Grid item xs={4}>
                                <TextField
                                  fullWidth
                                  label="Label"
                                  value={label.label}
                                  onChange={(e) => {
                                    const newLabels = [...settings.matrix.likelihoodLabels];
                                    newLabels[index].label = e.target.value;
                                    setSettings({
                                      ...settings,
                                      matrix: { ...settings.matrix, likelihoodLabels: newLabels }
                                    });
                                  }}
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  label="Description"
                                  value={label.description}
                                  onChange={(e) => {
                                    const newLabels = [...settings.matrix.likelihoodLabels];
                                    newLabels[index].description = e.target.value;
                                    setSettings({
                                      ...settings,
                                      matrix: { ...settings.matrix, likelihoodLabels: newLabels }
                                    });
                                  }}
                                />
                              </Grid>
                              <Grid item xs={1}>
                                <IconButton color="error">
                                  <Delete />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Similar sections for Impact Labels and Risk Levels */}
                </Box>
              )}

              {/* Risk Categories Management */}
              {activeTab === 'categories' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    📊 Risk Categories Management
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Add New Category"
                      variant="outlined"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          setSettings({
                            ...settings,
                            categories: [...settings.categories, e.target.value]
                          });
                          e.target.value = '';
                        }
                      }}
                    />
                  </Box>

                  <Grid container spacing={1}>
                    {settings.categories.map((category, index) => (
                      <Grid item key={category}>
                        <Chip
                          label={category}
                          onDelete={() => {
                            const newCategories = settings.categories.filter((_, i) => i !== index);
                            setSettings({ ...settings, categories: newCategories });
                          }}
                          color="primary"
                          variant="outlined"
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* UI/UX Settings */}
              {activeTab === 'ui' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    🎨 UI/UX Preferences
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Theme</InputLabel>
                        <Select
                          value={settings.ui.theme}
                          label="Theme"
                          onChange={(e) => setSettings({
                            ...settings,
                            ui: { ...settings.ui, theme: e.target.value }
                          })}
                        >
                          <MenuItem value="light">Light Mode</MenuItem>
                          <MenuItem value="dark">Dark Mode</MenuItem>
                          <MenuItem value="auto">Auto (System)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Language</InputLabel>
                        <Select
                          value={settings.ui.language}
                          label="Language"
                          onChange={(e) => setSettings({
                            ...settings,
                            ui: { ...settings.ui, language: e.target.value }
                          })}
                        >
                          <MenuItem value="id">Bahasa Indonesia</MenuItem>
                          <MenuItem value="en">English</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Default Dashboard View</InputLabel>
                        <Select
                          value={settings.ui.dashboardView}
                          label="Default Dashboard View"
                          onChange={(e) => setSettings({
                            ...settings,
                            ui: { ...settings.ui, dashboardView: e.target.value }
                          })}
                        >
                          <MenuItem value="grid">Grid View</MenuItem>
                          <MenuItem value="list">List View</MenuItem>
                          <MenuItem value="compact">Compact View</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Save/Cancel Buttons */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" startIcon={<Cancel />}>
                  Cancel
                </Button>
                <Button variant="contained" startIcon={<Save />}>
                  Save Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPanel;