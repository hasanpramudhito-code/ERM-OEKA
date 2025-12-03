// src/pages/ControlTesting/ControlRegister.js
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
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import { Add, Edit, Delete, Visibility, PlayArrow } from '@mui/icons-material';

import { controlTestingService } from '../../services/controlTestingService';
import { mockDataService } from '../../services/mockDataService';
import { validationSchemas } from '../../utils/validationSchemas';
import { debugAuth } from '../../utils/debugUtils';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';


// --------------------------------------------------------------
// COMPONENT START
// --------------------------------------------------------------
const ControlRegister = () => {

  const { currentUser, userData } = useAuth();
  const { permissions, userRole, displayRole } = usePermissions();

  // Debug utama
  console.log('🎯 === ControlRegister REAL-TIME DEBUG ===');
  console.log('UserData:', userData);
  console.log('UserRole:', userRole);
  console.log('DisplayRole:', displayRole);
  console.log('Permissions:', permissions);
  console.log('⚙ canCreateControl:', permissions.canCreateControl);
  console.log('⚙ canEditControl:', permissions.canEditControl);
  console.log('⚙ canDeleteControl:', permissions.canDeleteControl);
  console.log('=== END DEBUG ===');


  // --------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------
  const [controls, setControls] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingControl, setEditingControl] = useState(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [newControl, setNewControl] = useState({
    name: '',
    description: '',
    category: '',
    controlType: 'preventive',
    frequency: 'quarterly',
    owner: '',
    objective: '',
    testProcedure: '',
    isActive: true
  });


  // --------------------------------------------------------------
  // DEBUG AUTH
  // --------------------------------------------------------------
  useEffect(() => {
    debugAuth(userData, currentUser, 'ControlRegister');

    console.log('🎯 CONTROL REGISTER PERMISSIONS DEBUG:');
    console.log('UserRole:', userRole);
    console.log('DisplayRole:', displayRole);
    console.log('permissions:', permissions);

    console.log('- canCreateControl:', permissions.canCreateControl);
    console.log('- canEditControl:', permissions.canEditControl);
    console.log('- canDeleteControl:', permissions.canDeleteControl);
    console.log('---------------------------------------------');
  }, [userData, currentUser, permissions, userRole, displayRole]);



  // --------------------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------------------
  useEffect(() => { loadControls(); }, []);

  const loadControls = async () => {
    try {
      setLoading(true);

      let data;
      try {
        data = await controlTestingService.getControls('org-001');
        if (!data || data.length === 0) throw new Error("No Firebase data");
      } catch (e) {
        console.log('⚠ Using mock data for controls');
        data = mockDataService.getMockControls();
      }

      setControls(data);
      setLoading(false);

    } catch (err) {
      console.error("Error loading controls:", err);
      setError('Failed to load controls');
      setLoading(false);
    }
  };


  // --------------------------------------------------------------
  // FORM VALIDATION
  // --------------------------------------------------------------
  const validateForm = (controlData) => {
    const errors = validationSchemas.control(controlData);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  // --------------------------------------------------------------
  // CRUD ACTIONS
  // --------------------------------------------------------------
  const handleCreate = async () => {
    if (!validateForm(newControl)) {
      setError('Please fix validation errors.');
      return;
    }

    try {
      await controlTestingService.createControl({
        ...newControl,
        organizationId: 'org-001',
        designEffectiveness: 'not_tested',
        operatingEffectiveness: 'not_tested'
      });

      setOpenDialog(false);
      setNewControl({
        name: '',
        description: '',
        category: '',
        controlType: 'preventive',
        frequency: 'quarterly',
        owner: '',
        objective: '',
        testProcedure: '',
        isActive: true
      });

      setSuccess('Control created successfully.');
      loadControls();

    } catch (err) {
      console.error(err);
      setError('Failed to create control');
    }
  };

      // TAMBAHKAN fungsi ini setelah handleCreate:

    const handleUpdate = async () => {
      if (!validateForm(newControl) || !editingControl) {
        setError('Please fix validation errors.');
        return;
      }

      try {
        await controlTestingService.updateControl(editingControl.id, newControl);
        
        setOpenDialog(false);
        setEditingControl(null);
        setNewControl({
          name: '',
          description: '',
          category: '',
          controlType: 'preventive',
          frequency: 'quarterly',
          owner: '',
          objective: '',
          testProcedure: '',
          isActive: true
        });
        
        setSuccess('Control updated successfully.');
        loadControls();
        
      } catch (err) {
        console.error(err);
        setError('Failed to update control');
      }
    };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this control?")) return;

    try {
      await controlTestingService.deleteControl(id);
      setSuccess("Control deleted.");
      loadControls();
    } catch (err) {
      setError("Failed to delete control.");
    }
  };


  const handleField = (field, value) => {
    setNewControl(prev => ({ ...prev, [field]: value }));
  };


  const getEffectivenessColor = (effectiveness) => {
    const colors = {
      effective: 'success',
      partially_effective: 'warning',
      not_effective: 'error',
      not_tested: 'default'
    };
    return colors[effectiveness] || 'default';
  };


  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };


  // --------------------------------------------------------------
  // CATEGORY OPTIONS
  // --------------------------------------------------------------
  const categories = [
    'Financial Controls',
    'IT General Controls',
    'Operational Controls',
    'Compliance Controls',
    'Security Controls'
  ];

  const controlTypes = [
    'preventive',
    'detective',
    'corrective',
    'compensating'
  ];

  const frequencies = [
    'daily', 'weekly', 'monthly', 'quarterly', 'annually'
  ];


  // --------------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------------
  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Control Register</Typography>
        <Typography>Loading controls...</Typography>
      </Box>
    );
  }


  // --------------------------------------------------------------
  // RENDER UI
  // --------------------------------------------------------------
  return (
    <Box>

      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Control Register</Typography>

        {permissions.canCreateControl && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Add Control
          </Button>
        )}
      </Box>


      {/* PERMISSIONS ALERT */}
      {!permissions.canCreateControl && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access. Contact administrator for editing permissions.
        </Alert>
      )}


      {/* DEBUG */}
      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Debug Info:</strong><br />
        Role: {displayRole} | UserRole: {userRole} <br />
        Create: {permissions.canCreateControl ? '✅' : '❌'} |
        Edit: {permissions.canEditControl ? '✅' : '❌'} |
        Delete: {permissions.canDeleteControl ? '✅' : '❌'}
      </Alert>


      {/* TABLE */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Design</TableCell>
                  <TableCell>Operating</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {controls.map(ctrl => (
                  <TableRow key={ctrl.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{ctrl.name}</Typography>
                      <Typography variant="body2" color="textSecondary">{ctrl.owner}</Typography>
                    </TableCell>

                    <TableCell><Chip label={ctrl.category} size="small" /></TableCell>
                    <TableCell><Chip label={ctrl.controlType} size="small" /></TableCell>
                    <TableCell>{ctrl.frequency}</TableCell>

                    <TableCell>
                      <Chip
                        label={ctrl.designEffectiveness}
                        size="small"
                        color={getEffectivenessColor(ctrl.designEffectiveness)}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={ctrl.operatingEffectiveness}
                        size="small"
                        color={getEffectivenessColor(ctrl.operatingEffectiveness)}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={ctrl.isActive ? 'Active' : 'Inactive'}
                        color={ctrl.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>

          <TableCell>

            {permissions.canEditControl && (
              <IconButton 
                size="small" 
                color="primary"
                onClick={() => {
                  // EDIT: Buka form edit
                  setEditingControl(ctrl);
                  setNewControl({
                    name: ctrl.name,
                    description: ctrl.description || '',
                    category: ctrl.category,
                    controlType: ctrl.controlType || 'preventive',
                    frequency: ctrl.frequency || 'quarterly',
                    owner: ctrl.owner || '',
                    objective: ctrl.objective || '',
                    testProcedure: ctrl.testProcedure || '',
                    isActive: ctrl.isActive !== false
                  });
                  setOpenDialog(true);
                }}
              >
                <Edit />
              </IconButton>
            )}

            <IconButton 
              size="small" 
              color="info"
              onClick={() => {
                // VIEW: Tampilkan alert dengan detail
                alert(
                  `CONTROL DETAILS:\n\n` +
                  `Name: ${ctrl.name}\n` +
                  `Category: ${ctrl.category}\n` + 
                  `Owner: ${ctrl.owner}\n` +
                  `Type: ${ctrl.controlType}\n` +
                  `Frequency: ${ctrl.frequency}\n` +
                  `Status: ${ctrl.isActive ? 'Active' : 'Inactive'}`
                );
              }}
            >
              <Visibility />
            </IconButton>

            <IconButton 
              size="small" 
              color="secondary"
              onClick={() => {
                // PLAY ARROW: Pilih untuk testing
                alert(`Control "${ctrl.name}" selected for testing.\n\nGo to Testing Schedule page.`);
                // Simpan ke localStorage untuk digunakan di Testing Schedule
                localStorage.setItem('selectedControlId', ctrl.id);
                localStorage.setItem('selectedControlName', ctrl.name);
              }}
            >
              <PlayArrow />
            </IconButton>

            {permissions.canDeleteControl && (
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(ctrl.id)}
              >
                <Delete />
              </IconButton>
            )}

          </TableCell>

                  </TableRow>
                ))}
              </TableBody>

            </Table>
          </TableContainer>
        </CardContent>
      </Card>


      {/* ADD/EDIT DIALOG */}
      <Dialog open={openDialog} onClose={() => {
          setOpenDialog(false);
          setEditingControl(null);
          setNewControl({
            name: '',
            description: '',
            category: '',
            controlType: 'preventive',
            frequency: 'quarterly',
            owner: '',
            objective: '',
            testProcedure: '',
            isActive: true
          });
        }} maxWidth="md" fullWidth>
        <DialogTitle>{editingControl ? 'Edit Control' : 'Add New Control'}</DialogTitle>

        <DialogContent>
          <Grid container spacing={2} mt={1}>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Control Name"
                value={newControl.name}
                onChange={(e) => handleField('name', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={newControl.description}
                onChange={(e) => handleField('description', e.target.value)}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newControl.category}
                  label="Category"
                  onChange={(e) => handleField('category', e.target.value)}
                >
                  {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Control Type</InputLabel>
                <Select
                  value={newControl.controlType}
                  label="Control Type"
                  onChange={(e) => handleField('controlType', e.target.value)}
                >
                  {controlTypes.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={newControl.frequency}
                  label="Frequency"
                  onChange={(e) => handleField('frequency', e.target.value)}
                >
                  {frequencies.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Owner"
                value={newControl.owner}
                onChange={(e) => handleField('owner', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Control Objective"
                value={newControl.objective}
                onChange={(e) => handleField('objective', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Test Procedure"
                value={newControl.testProcedure}
                onChange={(e) => handleField('testProcedure', e.target.value)}
                placeholder="Describe test steps..."
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newControl.isActive}
                    onChange={(e) => handleField('isActive', e.target.checked)}
                  />
                }
                label="Active Control"
              />
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={editingControl ? handleUpdate : handleCreate}>
            {editingControl ? 'Update Control' : 'Create Control'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* TOASTS */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert severity="error" onClose={handleCloseSnackbar}>{error}</Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert severity="success" onClose={handleCloseSnackbar}>{success}</Alert>
      </Snackbar>

    </Box>
  );
};

export default ControlRegister;
