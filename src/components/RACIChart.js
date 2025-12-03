import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Person,
  Assignment,
  AccountTree,
  Add,
  Delete,
  Visibility
} from '@mui/icons-material';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc,
  deleteDoc,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const RACIChart = () => {
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState([]);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [raciMatrix, setRaciMatrix] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [editMode, setEditMode] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ riskId: '', userId: '', role: 'R' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editingCell, setEditingCell] = useState(null); // {riskId: 'xxx', role: 'R'}

  // RACI Roles dengan warna
  const raciRoles = [
    { value: 'R', label: 'Responsible', color: '#4caf50', description: 'Melakukan pekerjaan' },
    { value: 'A', label: 'Accountable', color: '#2196f3', description: 'Bertanggung jawab akhir' },
    { value: 'C', label: 'Consulted', color: '#ff9800', description: 'Dikonsultasikan' },
    { value: 'I', label: 'Informed', color: '#9c27b0', description: 'Diberi informasi' },
    { value: 'S', label: 'Support', color: '#607d8b', description: 'Memberi dukungan' }
  ];

  // Load data dari Firebase
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load risks
      const risksQuery = query(collection(db, 'risks'));
      const risksSnapshot = await getDocs(risksQuery);
      const risksData = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRisks(risksData);

      // Load users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);

      // Load organization units
      const orgQuery = query(collection(db, 'organization_units'));
      const orgSnapshot = await getDocs(orgQuery);
      const orgData = orgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrganizations(orgData);

      // Load RACI assignments
      await loadRACIAssignments(risksData, usersData);

    } catch (error) {
      console.error('Error loading RACI data:', error);
      showSnackbar('Error loading RACI data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRACIAssignments = async (risksData, usersData) => {
    try {
      const raciQuery = query(collection(db, 'raci_assignments'));
      const raciSnapshot = await getDocs(raciQuery);
      
      // Initialize matrix
      const matrix = [];
      
      risksData.forEach(risk => {
        const row = {
          riskId: risk.id,
          riskTitle: risk.title || risk.riskDescription,
          riskCode: risk.riskCode,
          department: risk.department,
          assignments: {}
        };
        
        usersData.forEach(user => {
          row.assignments[user.id] = '';
        });
        
        matrix.push(row);
      });


      // MODIFIKASI di loadRACIAssignments (sekitar line 80-120)
      raciSnapshot.forEach(doc => {
        const assignment = doc.data();
        const rowIndex = matrix.findIndex(row => row.riskId === assignment.riskId);
        if (rowIndex !== -1) {
          // Simpan picName di assignment sesuai role
          matrix[rowIndex].assignments[assignment.role] = assignment.picName || '';
        }
      });

      setRaciMatrix(matrix);
      
    } catch (error) {
      console.error('Error loading RACI assignments:', error);
      // Initialize empty matrix
      const emptyMatrix = risksData.map(risk => ({
        riskId: risk.id,
        riskTitle: risk.title || risk.riskDescription,
        riskCode: risk.riskCode,
        department: risk.department,
        assignments: usersData.reduce((acc, user) => ({ ...acc, [user.id]: '' }), {})
      }));
      setRaciMatrix(emptyMatrix);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter matrix by department
  const filteredMatrix = selectedDepartment === 'all' 
    ? raciMatrix 
    : raciMatrix.filter(row => row.department === selectedDepartment);

  // Handle cell click for editing
  const handleCellClick = (riskId, userId) => {
    if (editMode) {
      setEditingCell({ riskId, userId });
    }
  };

  // Handle role change
  const handleRoleChange = (role) => {
    if (!editingCell) return;

    const { riskId, userId } = editingCell;
    const newMatrix = [...raciMatrix];
    const rowIndex = newMatrix.findIndex(row => row.riskId === riskId);
    
    if (rowIndex !== -1) {
      newMatrix[rowIndex].assignments[userId] = role;
      setRaciMatrix(newMatrix);
      setEditingCell(null);
      
      // Save to Firebase
      saveAssignment(riskId, userId, role);
    }
  };

    // GANTI fungsi saveAssignment yang ada (sekitar line 130-170)
    const saveAssignment = async (riskId, role, picName) => {
      try {
        // Cek apakah assignment sudah ada
        const existingQuery = query(
          collection(db, 'raci_assignments'),
          where('riskId', '==', riskId),
          where('role', '==', role)
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        
        if (!picName || picName.trim() === '') {
          // Delete jika kosong
          if (!existingSnapshot.empty) {
            await deleteDoc(doc(db, 'raci_assignments', existingSnapshot.docs[0].id));
          }
        } else {
          if (!existingSnapshot.empty) {
            // Update existing
            await updateDoc(doc(db, 'raci_assignments', existingSnapshot.docs[0].id), {
              picName: picName.trim(),
              updatedAt: new Date()
            });
          } else {
            // Create new
            await addDoc(collection(db, 'raci_assignments'), {
              riskId,
              role,
              picName: picName.trim(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
        
        // Refresh data
        await loadRACIAssignments(risks, users);
        
      } catch (error) {
        console.error('Error saving RACI assignment:', error);
        showSnackbar('Error saving assignment: ' + error.message, 'error');
      }
    };

  // Add new assignment
  const handleAddAssignment = async () => {
    try {
      if (!newAssignment.riskId || !newAssignment.userId || !newAssignment.role) {
        showSnackbar('Please select risk, user, and role', 'error');
        return;
      }

      await saveAssignment(newAssignment.riskId, newAssignment.userId, newAssignment.role);
      
      // Refresh data
      await loadData();
      
      setNewAssignment({ riskId: '', userId: '', role: 'R' });
      setDialogOpen(false);
      
    } catch (error) {
      console.error('Error adding assignment:', error);
      showSnackbar('Error adding assignment: ' + error.message, 'error');
    }
  };

  // Get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  // Get risk title by ID
  const getRiskTitle = (riskId) => {
    const risk = risks.find(r => r.id === riskId);
    return risk ? risk.title || risk.riskDescription : 'Unknown Risk';
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading RACI Chart...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                RACI Chart (Responsibility Assignment Matrix)
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Define clear roles and responsibilities for risk management
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant={editMode ? "contained" : "outlined"}
                startIcon={<Edit />}
                onClick={() => setEditMode(!editMode)}
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { borderColor: 'white' }
                }}
              >
                {editMode ? 'Editing Mode ON' : 'Edit Mode'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setDialogOpen(true)}
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                }}
              >
                Add Assignment
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Legend */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>RACI Legend</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {raciRoles.map(role => (
                <Box key={role.value} display="flex" alignItems="center" gap={1}>
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    backgroundColor: role.color,
                    borderRadius: '4px'
                  }} />
                  <Typography variant="body2">
                    <strong>{role.value}</strong> = {role.label} ({role.description})
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Filter by Department</InputLabel>
            <Select
              value={selectedDepartment}
              label="Filter by Department"
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <MenuItem value="all">All Departments</MenuItem>
              {organizations.map(org => (
                <MenuItem key={org.id} value={org.name}>{org.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" color="textSecondary">
            Showing {filteredMatrix.length} risks, {users.length} users
            {editMode && ' - Click cells to edit'}
          </Typography>
        </Grid>
      </Grid>

      {/* RACI Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600, boxShadow: 3, mt: 3 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                backgroundColor: '#f5f5f5', 
                fontWeight: 'bold', 
                minWidth: 300,
                position: 'sticky',
                left: 0,
                zIndex: 2
              }}>
                Risk Description
              </TableCell>
              
              {/* RACI Column Headers */}
              {raciRoles.map(role => (
                <TableCell 
                  key={role.value} 
                  align="center"
                  sx={{ 
                    backgroundColor: role.color,
                    color: 'white',
                    fontWeight: 'bold',
                    minWidth: 150,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {role.value}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                      {role.label}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {filteredMatrix.map((row) => (
              <TableRow key={row.riskId} hover>
                {/* Risk Description - Sticky column */}
                <TableCell sx={{ 
                  minWidth: 300,
                  backgroundColor: '#fafafa',
                  position: 'sticky',
                  left: 0,
                  zIndex: 1
                }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {row.riskTitle}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {row.riskCode} | {row.department}
                    </Typography>
                  </Box>
                </TableCell>
                
                {/* RACI Cells - Input fields untuk nama PIC */}
                {raciRoles.map(role => {
                  const currentPIC = row.assignments[role.value] || '';
                  
                  return (
                    <TableCell 
                      key={`${row.riskId}-${role.value}`}
                      align="center"
                      sx={{ 
                        backgroundColor: role.color + '08',
                        border: '1px solid rgba(224, 224, 224, 1)',
                        padding: '4px 8px',
                        cursor: editMode ? 'pointer' : 'default',
                        '&:hover': editMode ? {
                          backgroundColor: role.color + '20'
                        } : {}
                      }}
                      onClick={() => {
                        if (editMode) {
                          setEditingCell({ riskId: row.riskId, role: role.value });
                        }
                      }}
                    >
                      {editMode && editingCell?.riskId === row.riskId && editingCell?.role === role.value ? (
                        <TextField
                          size="small"
                          placeholder="Nama/Jabatan PIC..."
                          defaultValue={currentPIC}
                          autoFocus
                          onBlur={(e) => {
                            if (e.target.value !== currentPIC) {
                              saveAssignment(row.riskId, role.value, e.target.value);
                            }
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveAssignment(row.riskId, role.value, e.target.value);
                              setEditingCell(null);
                            }
                            if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          sx={{ 
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-root': {
                              height: 32,
                              fontSize: '0.875rem'
                            }
                          }}
                          fullWidth
                        />
                      ) : (
                        <Box
                          sx={{
                            minHeight: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 8px',
                            borderRadius: 1,
                            backgroundColor: currentPIC ? role.color + '15' : 'transparent',
                            border: editMode && !currentPIC ? '1px dashed rgba(0,0,0,0.2)' : 'none',
                            '&:hover': editMode ? {
                              backgroundColor: role.color + '20',
                              border: '1px dashed ' + role.color
                            } : {}
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: currentPIC ? 'inherit' : 'text.secondary',
                              fontStyle: currentPIC ? 'normal' : 'italic'
                            }}
                          >
                            {currentPIC || (editMode ? 'Klik untuk isi...' : '-')}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Grid container spacing={2}>
                {raciRoles.map(role => {
                  const count = raciMatrix.reduce((total, row) => {
                    return total + Object.values(row.assignments).filter(val => val === role.value).length;
                  }, 0);
                  
                  return (
                    <Grid item xs={6} key={role.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          backgroundColor: role.color,
                          borderRadius: '2px'
                        }} />
                        <Typography variant="body2">
                          {role.label}:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {count}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Instructions</Typography>
              <Typography variant="body2" paragraph>
                • <strong>R (Responsible)</strong>: Person who performs the task
              </Typography>
              <Typography variant="body2" paragraph>
                • <strong>A (Accountable)</strong>: Person ultimately accountable
              </Typography>
              <Typography variant="body2" paragraph>
                • <strong>C (Consulted)</strong>: Person who provides input
              </Typography>
              <Typography variant="body2" paragraph>
                • <strong>I (Informed)</strong>: Person who needs to be informed
              </Typography>
              <Typography variant="body2">
                • <strong>S (Support)</strong>: Person who provides resources/support
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Assignment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New RACI Assignment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Risk</InputLabel>
                <Select
                  value={newAssignment.riskId}
                  label="Select Risk"
                  onChange={(e) => setNewAssignment({ ...newAssignment, riskId: e.target.value })}
                >
                  <MenuItem value="">Select a risk</MenuItem>
                  {risks.map(risk => (
                    <MenuItem key={risk.id} value={risk.id}>
                      {risk.title || risk.riskDescription} ({risk.riskCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select User</InputLabel>
                <Select
                  value={newAssignment.userId}
                  label="Select User"
                  onChange={(e) => setNewAssignment({ ...newAssignment, userId: e.target.value })}
                >
                  <MenuItem value="">Select a user</MenuItem>
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Role</InputLabel>
                <Select
                  value={newAssignment.role}
                  label="Select Role"
                  onChange={(e) => setNewAssignment({ ...newAssignment, role: e.target.value })}
                >
                  {raciRoles.map(role => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.value} - {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAssignment}>
            Save Assignment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RACIChart;