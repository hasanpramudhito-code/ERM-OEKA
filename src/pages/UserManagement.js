import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Email,
  Business,
  Badge
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { db, auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../config/roles';

const normalizeRole = (role) => role?.toUpperCase() || '';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { userData } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    position: '',
    unitId: '',
    phone: '',
    status: 'active'
  });

  // Load users and organization units
  const loadData = async () => {
    try {
      setLoading(true);

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = [];
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        
        const userObj = {
          id: doc.id,
          uid: data.uid || doc.id,
          ...data,
          role: normalizeRole(data.role)
        };
        
        usersList.push(userObj);
      });
      
      setUsers(usersList);
      
      // Load organization units
      try {
        const unitsSnapshot = await getDocs(collection(db, 'organizationUnits'));
        const unitsList = [];
        unitsSnapshot.forEach((doc) => {
          unitsList.push({ id: doc.id, ...doc.data() });
        });
        setOrganizationUnits(unitsList);
      } catch (unitsError) {
        console.warn('Could not load organization units:', unitsError);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ========== SIMPLE FRONTEND SOLUTION ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const upperRole = normalizeRole(formData.role);

      if (editingUser) {
        // UPDATE USER (Firestore only)
        await updateDoc(doc(db, 'users', editingUser.id), {
          name: formData.name,
          role: upperRole,
          department: formData.department,
          position: formData.position,
          unitId: formData.unitId,
          phone: formData.phone,
          status: formData.status,
          updatedAt: new Date(),
          updatedBy: userData?.name || 'System'
        });
        
        setSuccess('User berhasil diupdate!');
        
      } else {
        // CREATE NEW USER (SIMPLE VERSION)
        
        // Tampilkan warning bahwa admin akan logout
        const confirmCreate = window.confirm(
          'PERHATIAN: Setelah membuat user baru, Anda akan logout sementara.\n' +
          'Silakan login kembali sebagai admin setelah proses selesai.\n\n' +
          'Lanjutkan membuat user?'
        );
        
        if (!confirmCreate) {
          setLoading(false);
          return;
        }

        // 1. Simpan admin email untuk info
        const adminEmail = userData?.email;
        
        // 2. Create user (akan auto-login sebagai user baru)
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        
        // 3. Save to Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          role: upperRole,
          department: formData.department,
          position: formData.position,
          unitId: formData.unitId,
          phone: formData.phone,
          status: 'active',
          createdAt: new Date(),
          createdBy: userData?.name || 'System'
        });
        
        // 4. Logout user baru
        await signOut(auth);
        
        // 5. Show success message with instructions
        alert(
          `User "${formData.name}" berhasil dibuat!\n\n` +
          `Email: ${formData.email}\n` +
          `Password: ${formData.password}\n\n` +
          'Silakan login kembali sebagai admin.\n' +
          `Email admin: ${adminEmail}`
        );
        
        // 6. Redirect to login page
        window.location.href = '/login';
        
        return; // Stop execution
      }

      // Cleanup untuk update case
      setOpenDialog(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        department: '',
        position: '',
        unitId: '',
        phone: '',
        status: 'active'
      });

      // Refresh data
      loadData();
      
    } catch (error) {
      console.error('Error saving user:', error);
      
      // Handle common Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setError('Email sudah digunakan oleh user lain');
      } else if (error.code === 'auth/weak-password') {
        setError('Password terlalu lemah (minimal 6 karakter)');
      } else if (error.code === 'auth/invalid-email') {
        setError('Format email tidak valid');
      } else {
        setError('Gagal menyimpan user: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== HANDLE DELETE (Nonaktifkan saja) ==========
  const handleDelete = async (user) => {
    if (!window.confirm(`Nonaktifkan user ${user.name}? User tidak akan bisa login.`)) {
      return;
    }

    try {
      // Hanya nonaktifkan, jangan hapus dari auth
      await updateDoc(doc(db, 'users', user.id), {
        status: 'inactive',
        updatedAt: new Date(),
        updatedBy: userData?.name || 'System'
      });
      
      setSuccess('User dinonaktifkan!');
      loadData();
      
    } catch (error) {
      console.error('Error deactivating user:', error);
      setError('Gagal menonaktifkan user: ' + error.message);
    }
  };

  // ========== HANDLE EDIT ==========
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Kosongkan password untuk edit
      role: user.role || '',
      department: user.department || '',
      position: user.position || '',
      unitId: user.unitId || '',
      phone: user.phone || '',
      status: user.status || 'active'
    });
    setOpenDialog(true);
  };

  // ========== HELPER FUNCTIONS ==========
  const getRoleColor = (role) => {
    const r = normalizeRole(role);
    switch (r) {
      case 'ADMIN': return 'error';
      case 'RISK_OFFICER': return 'primary';
      case 'RISK_OWNER': return 'warning';
      case 'DIRECTOR': return 'success';
      case 'DK/DEWAS': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getUnitName = (unitId) => {
    const unit = organizationUnits.find(u => u.id === unitId);
    return unit ? unit.name : 'Tidak ada';
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      department: '',
      position: '',
      unitId: '',
      phone: '',
      status: 'active'
    });
  };

  // ========== STATISTICS ==========
  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admin: users.filter(u => normalizeRole(u.role) === 'ADMIN').length,
    riskOwners: users.filter(u => normalizeRole(u.role) === 'RISK_OWNER').length,
  };

  const isAdmin = normalizeRole(userData?.role) === 'ADMIN';

  // ========== RENDER ==========
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Person sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4">User Management</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Kelola user dan hak akses sistem
            </Typography>
            <Typography variant="caption" color="warning.main">
              Catatan: Untuk tambah user baru, Anda akan logout sementara
            </Typography>
          </Box>
        </Box>
        
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          disabled={!isAdmin}
          sx={{ 
            minWidth: 140, 
            opacity: isAdmin ? 1 : 0.6,
            position: 'relative'
          }}
        >
          Tambah User
          {!isAdmin && (
            <Typography 
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: -20,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'text.secondary',
                whiteSpace: 'nowrap'
              }}
            >
              (Hanya Admin)
            </Typography>
          )}
        </Button>
      </Box>

      {/* Notifications */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4">{userStats.total}</Typography>
                </Box>
                <Person sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Users
                  </Typography>
                  <Typography variant="h4" color="success.main">{userStats.active}</Typography>
                </Box>
                <Badge sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Admin Users
                  </Typography>
                  <Typography variant="h4" color="error.main">{userStats.admin}</Typography>
                </Box>
                <Business sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Risk Owners
                  </Typography>
                  <Typography variant="h4" color="warning.main">{userStats.riskOwners}</Typography>
                </Box>
                <Person sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Daftar Users ({users.length})
        </Typography>
        
        {loading ? (
          <Box textAlign="center" py={4}>
            <Typography>Memuat data user...</Typography>
          </Box>
        ) : users.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              Belum ada user. Klik "Tambah User" untuk menambahkan.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nama</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Person color="action" />
                        <Typography fontWeight="medium">{user.name}</Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {user.position}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Email fontSize="small" color="action" />
                        {user.email}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip 
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>{getUnitName(user.unitId)}</TableCell>

                    <TableCell>
                      <Chip 
                        label={user.status === 'active' ? 'Aktif' : 'Non-aktif'} 
                        color={getStatusColor(user.status)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <IconButton 
                        onClick={() => handleEdit(user)} 
                        color="primary"
                        size="small"
                        disabled={!isAdmin}
                        title="Edit User"
                      >
                        <Edit />
                      </IconButton>

                      <IconButton 
                        onClick={() => handleDelete(user)} 
                        color="error"
                        size="small"
                        disabled={!isAdmin}
                        title="Nonaktifkan User"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Tambah User Baru'}
        </DialogTitle>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nama Lengkap"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  margin="normal"
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  margin="normal"
                  required
                  disabled={!!editingUser}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  margin="normal"
                  required={!editingUser}
                  helperText={editingUser ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 6 karakter'}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nomor Telepon"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role}
                    label="Role"
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {Object.keys(ROLES).map((roleKey) => (
                      <MenuItem key={roleKey} value={roleKey}>
                        {ROLES[roleKey].name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Unit Organisasi</InputLabel>
                  <Select
                    value={formData.unitId}
                    label="Unit Organisasi"
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                  >
                    <MenuItem value="">Tidak Ada</MenuItem>
                    {organizationUnits.map((unit) => (
                      <MenuItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Jabatan"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  margin="normal"
                />
              </Grid>

              {editingUser && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <MenuItem value="active">Aktif</MenuItem>
                      <MenuItem value="inactive">Non-aktif</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button onClick={handleCloseDialog} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? 'Menyimpan...' : (editingUser ? 'Update' : 'Simpan')}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default UserManagement;