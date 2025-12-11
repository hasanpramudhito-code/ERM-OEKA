import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Save, Restore, Backup } from '@mui/icons-material';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    autoSave: true,
    notifications: true,
    auditLog: true,
    dataRetention: '1year',
    language: 'id',
    timezone: 'Asia/Jakarta',
    dateFormat: 'DD/MM/YYYY'
  });

  const handleChange = (key, value) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };

  const handleSave = () => {
    alert('Settings saved!');
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('Restore all settings to default values?')) {
      setSettings({
        autoSave: true,
        notifications: true,
        auditLog: true,
        dataRetention: '1year',
        language: 'id',
        timezone: 'Asia/Jakarta',
        dateFormat: 'DD/MM/YYYY'
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        System Settings
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        Hanya user dengan role ADMIN yang dapat mengakses pengaturan sistem ini.
      </Alert>

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.autoSave}
                  onChange={(e) => handleChange('autoSave', e.target.checked)}
                />
              }
              label="Auto Save"
              sx={{ mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.notifications}
                  onChange={(e) => handleChange('notifications', e.target.checked)}
                />
              }
              label="Email Notifications"
              sx={{ mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.auditLog}
                  onChange={(e) => handleChange('auditLog', e.target.checked)}
                />
              }
              label="Audit Log"
              sx={{ mb: 3 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Data Retention</InputLabel>
              <Select
                value={settings.dataRetention}
                label="Data Retention"
                onChange={(e) => handleChange('dataRetention', e.target.value)}
              >
                <MenuItem value="6months">6 Months</MenuItem>
                <MenuItem value="1year">1 Year</MenuItem>
                <MenuItem value="2years">2 Years</MenuItem>
                <MenuItem value="5years">5 Years</MenuItem>
                <MenuItem value="forever">Forever</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        {/* Regional Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Regional Settings
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Language</InputLabel>
              <Select
                value={settings.language}
                label="Language"
                onChange={(e) => handleChange('language', e.target.value)}
              >
                <MenuItem value="id">Bahasa Indonesia</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Timezone</InputLabel>
              <Select
                value={settings.timezone}
                label="Timezone"
                onChange={(e) => handleChange('timezone', e.target.value)}
              >
                <MenuItem value="Asia/Jakarta">Asia/Jakarta (WIB)</MenuItem>
                <MenuItem value="Asia/Makassar">Asia/Makassar (WITA)</MenuItem>
                <MenuItem value="Asia/Jayapura">Asia/Jayapura (WIT)</MenuItem>
                <MenuItem value="UTC">UTC</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Date Format</InputLabel>
              <Select
                value={settings.dateFormat}
                label="Date Format"
                onChange={(e) => handleChange('dateFormat', e.target.value)}
              >
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Backup & Restore */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Backup & Restore
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              startIcon={<Backup />}
              fullWidth
              sx={{ py: 1.5 }}
            >
              Backup Configuration
            </Button>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Download semua konfigurasi sebagai file JSON
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Restore />}
              fullWidth
              sx={{ py: 1.5 }}
              onClick={handleRestoreDefaults}
            >
              Restore Defaults
            </Button>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Kembalikan semua setting ke nilai default
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Save Button */}
      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Button 
          variant="contained" 
          startIcon={<Save />}
          size="large"
          onClick={handleSave}
        >
          Save System Settings
        </Button>
      </Box>
    </Box>
  );
};

export default SystemSettings;