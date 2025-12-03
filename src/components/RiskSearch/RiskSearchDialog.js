import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress,
  Button,
  Chip
} from '@mui/material';
import { Search, Refresh, Code } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';

const RiskSearchDialog = ({ open, onClose, onRiskSelect, db }) => {
  const [risks, setRisks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRisks = async () => {
    try {
      console.log('🔄 Loading risks from Firestore...');
      setLoading(true);
      setError(null);

      if (!db) {
        throw new Error('Database not connected');
      }

      const risksRef = collection(db, 'risks');
      const risksSnapshot = await getDocs(risksRef);
      
      console.log(`📊 Found ${risksSnapshot.size} documents`);
      
      const risksList = [];
      risksSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 Document ${doc.id}:`, data);
        
        // Extract title from various possible fields
        const possibleTitles = [
          data.title,
          data.riskName,
          data.name,
          data.riskDescription,
          data.description,
          `Risk ${doc.id.substring(0, 8)}`
        ].filter(Boolean);
        
        const title = possibleTitles[0] || 'Untitled Risk';
        
        // Extract risk code
        const possibleCodes = [
          data.riskCode,
          data.code,
          `RISK-${doc.id.substring(0, 6).toUpperCase()}`
        ].filter(Boolean);
        
        const riskCode = possibleCodes[0];
        
        risksList.push({
          id: doc.id,
          title: title,
          riskCode: riskCode,
          category: data.category || data.kategori || 'Umum',
          description: data.riskDescription || data.description || data.deskripsi || '',
          // Include all original data
          ...data
        });
      });

      console.log(`✅ Processed ${risksList.length} risks`);
      console.log('Sample:', risksList[0]);
      setRisks(risksList);

    } catch (error) {
      console.error('❌ Error:', error);
      setError(`Gagal memuat data: ${error.message}`);
      
      // Fallback dummy data dengan format yang benar
      const dummyData = [
        { 
          id: '1', 
          riskCode: 'RISK-001',
          title: 'Kebocoran Data Pelanggan', 
          category: 'Keamanan Data',
          description: 'Data pribadi pelanggan dapat bocor ke pihak tidak berwenang'
        },
        { 
          id: '2', 
          riskCode: 'RISK-002',
          title: 'Server Downtime', 
          category: 'Infrastruktur',
          description: 'Server utama mati lebih dari 4 jam'
        }
      ];
      setRisks(dummyData);
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRisks();
      setSearchTerm('');
    }
  }, [open]);

  // Improved search function
  const filteredRisks = searchTerm
    ? risks.filter(risk => {
        const searchLower = searchTerm.toLowerCase();
        
        // Search in all string fields
        const searchableFields = [
          risk.title,
          risk.riskCode,
          risk.category,
          risk.description,
          risk.riskName,
          risk.name
        ].filter(Boolean).map(field => field.toLowerCase());
        
        return searchableFields.some(field => 
          field.includes(searchLower)
        );
      })
    : risks;

  const handleSelect = (risk) => {
    console.log('✅ Selected:', risk);
    if (onRiskSelect) onRiskSelect(risk);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Search />
            <Typography variant="h6">Cari Risiko</Typography>
            {!loading && (
              <Chip 
                label={`${risks.length} ditemukan`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Button
            startIcon={<Refresh />}
            size="small"
            onClick={loadRisks}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <TextField
          fullWidth
          placeholder="Cari berdasarkan kode, judul, atau kategori..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          disabled={loading}
        />

        {error && !loading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box textAlign="center" py={3}>
            <CircularProgress />
            <Typography variant="body2">Memuat data risiko...</Typography>
          </Box>
        ) : filteredRisks.length === 0 ? (
          <Alert severity="info">
            {searchTerm 
              ? `Tidak ada risiko yang cocok dengan "${searchTerm}"`
              : 'Tidak ada data risiko ditemukan'
            }
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {filteredRisks.length} dari {risks.length} risiko
            </Typography>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredRisks.map((risk) => (
                <ListItem key={risk.id} disablePadding>
                  <ListItemButton 
                    onClick={() => handleSelect(risk)}
                    sx={{ 
                      py: 2,
                      borderBottom: '1px solid #f0f0f0',
                      '&:hover': { bgcolor: '#f9f9f9' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            {risk.riskCode && (
                              <Chip 
                                icon={<Code fontSize="small" />}
                                label={risk.riskCode}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            <Typography variant="subtitle1" fontWeight="bold">
                              {risk.title}
                            </Typography>
                          </Box>
                          {risk.category && risk.category !== 'Umum' && (
                            <Chip 
                              label={risk.category}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        risk.description ? (
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            {risk.description.length > 120 
                              ? risk.description.substring(0, 120) + '...' 
                              : risk.description}
                          </Typography>
                        ) : null
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RiskSearchDialog;