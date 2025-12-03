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
  Card,
  CardContent,
  Grid,
  IconButton
} from '@mui/material';
import { Add, Edit, Delete, AccountTree } from '@mui/icons-material';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const OrganizationStructure = () => {
  const [units, setUnits] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const { userData } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'unit',
    parentId: '',
    riskOwner: '',
    description: ''
  });

  // Load organization units
  const loadOrganization = async () => {
    const querySnapshot = await getDocs(collection(db, 'organization_units'));
    const unitsList = [];
    querySnapshot.forEach((doc) => {
      unitsList.push({ id: doc.id, ...doc.data() });
    });
    setUnits(unitsList);
  };

  useEffect(() => {
    loadOrganization();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        // Update existing unit
        await updateDoc(doc(db, 'organization_units', editingUnit.id), {
          ...formData,
          updatedAt: new Date(),
          updatedBy: userData?.name
        });
      } else {
        // Add new unit
        await addDoc(collection(db, 'organization_units'), {
          ...formData,
          createdAt: new Date(),
          createdBy: userData?.name
        });
      }
      setOpenDialog(false);
      setEditingUnit(null);
      setFormData({ name: '', code: '', type: 'unit', parentId: '', riskOwner: '', description: '' });
      loadOrganization();
    } catch (error) {
      console.error('Error saving unit:', error);
    }
  };

  const handleDelete = async (unitId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus unit ini?')) {
      try {
        await deleteDoc(doc(db, 'organization_units', unitId));
        loadOrganization();
      } catch (error) {
        console.error('Error deleting unit:', error);
      }
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name || '',
      code: unit.code || '',
      type: unit.type || 'unit',
      parentId: unit.parentId || '',
      riskOwner: unit.riskOwner || '',
      description: unit.description || ''
    });
    setOpenDialog(true);
  };

  // Get units by type and parent
  const getUnitsByParent = (parentId = '') => {
    return units.filter(unit => unit.parentId === parentId);
  };

  const renderUnitCard = (unit, level = 0) => {
    const children = getUnitsByParent(unit.id);
    
    return (
      <Box key={unit.id} sx={{ ml: level * 4 }}>
        <Card sx={{ mb: 1, backgroundColor: level === 0 ? '#e3f2fd' : 'white' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{unit.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Kode: {unit.code} • Tipe: {unit.type}
                </Typography>
                {unit.riskOwner && (
                  <Typography variant="body2" color="textSecondary">
                    Risk Owner: {unit.riskOwner}
                  </Typography>
                )}
                {unit.description && (
                  <Typography variant="body2" color="textSecondary">
                    {unit.description}
                  </Typography>
                )}
              </Box>
              <Box>
                <IconButton onClick={() => handleEdit(unit)} color="primary">
                  <Edit />
                </IconButton>
                <IconButton onClick={() => handleDelete(unit.id)} color="error">
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        {/* Render children */}
        {children.map(child => renderUnitCard(child, level + 1))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <AccountTree sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4">Struktur Organisasi</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Kelola unit, sub-unit, dan proses bisnis
            </Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Tambah Unit
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Hierarki Organisasi
        </Typography>
        
        {getUnitsByParent().length === 0 ? (
          <Typography color="textSecondary" textAlign="center" py={4}>
            Belum ada unit organisasi. Klik "Tambah Unit" untuk memulai.
          </Typography>
        ) : (
          getUnitsByParent().map(unit => renderUnitCard(unit))
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUnit ? 'Edit Unit Organisasi' : 'Tambah Unit Organisasi'}
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Nama Unit"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Kode Unit"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipe</InputLabel>
              <Select
                value={formData.type}
                label="Tipe"
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                required
              >
                <MenuItem value="unit">Unit</MenuItem>
                <MenuItem value="sub-unit">Sub Unit</MenuItem>
                <MenuItem value="process">Proses Bisnis</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Unit Induk</InputLabel>
              <Select
                value={formData.parentId}
                label="Unit Induk"
                onChange={(e) => setFormData({...formData, parentId: e.target.value})}
              >
                <MenuItem value="">Tidak Ada (Root)</MenuItem>
                {units
                  .filter(unit => unit.type === 'unit')
                  .map(unit => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Risk Owner"
              value={formData.riskOwner}
              onChange={(e) => setFormData({...formData, riskOwner: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Deskripsi"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
            />
            
            <Box mt={3} display="flex" gap={2} justifyContent="flex-end">
              <Button onClick={() => setOpenDialog(false)}>
                Batal
              </Button>
              <Button type="submit" variant="contained">
                {editingUnit ? 'Update' : 'Simpan'}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default OrganizationStructure;