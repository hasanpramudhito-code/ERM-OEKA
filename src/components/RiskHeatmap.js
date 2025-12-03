import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
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
  Tooltip,
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components untuk professional look
const HeatmapTableCell = styled(TableCell)(({ theme, risklevel, hasdata }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  cursor: hasdata ? 'pointer' : 'default',
  transition: 'all 0.3s ease',
  border: '2px solid white',
  fontWeight: 'bold',
  fontSize: '1.1rem',
  position: 'relative',
  minWidth: 100,
  height: 80,
  '&:hover': {
    transform: hasdata ? 'scale(1.05)' : 'none',
    zIndex: hasdata ? 10 : 1,
    boxShadow: hasdata ? theme.shadows[8] : 'none'
  },
  // Risk level colors
  ...(risklevel === 'extreme' && {
    backgroundColor: '#FF5252',
    color: 'white',
    border: hasdata ? '3px solid #D32F2F' : '2px solid white'
  }),
  ...(risklevel === 'high' && {
    backgroundColor: '#FF9800',
    color: 'white',
    border: hasdata ? '3px solid #F57C00' : '2px solid white'
  }),
  ...(risklevel === 'medium' && {
    backgroundColor: '#FFEB3B',
    color: '#333333',
    border: hasdata ? '3px solid #FBC02D' : '2px solid white'
  }),
  ...(risklevel === 'low' && {
    backgroundColor: '#8BC34A',
    color: 'white',
    border: hasdata ? '3px solid #689F38' : '2px solid white'
  }),
  ...(risklevel === 'very_low' && {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: hasdata ? '3px solid #388E3C' : '2px solid white'
  }),
}));

const ImpactLabelCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: '#f8f9fa',
  fontWeight: 'bold',
  fontSize: '1rem',
  border: '2px solid #dee2e6',
  textAlign: 'center',
  verticalAlign: 'middle',
  minWidth: 120
}));

const LikelihoodHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: '#e9ecef',
  fontWeight: 'bold',
  fontSize: '1rem',
  border: '2px solid #dee2e6',
  textAlign: 'center',
  padding: theme.spacing(2),
  minWidth: 100
}));

const RiskChip = styled(Chip)(({ theme, risktype }) => ({
  margin: '2px',
  fontSize: '0.75rem',
  height: 24,
  backgroundColor: risktype === 'inherent' 
    ? theme.palette.primary.main 
    : theme.palette.secondary.main,
  color: 'white',
  fontWeight: 'bold'
}));

const RiskHeatmap = () => {
  const [riskData, setRiskData] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [riskType, setRiskType] = useState('residual');
  const [selectedCell, setSelectedCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Konfigurasi sesuai kebutuhan Anda
  const impactLevels = [
    { level: 5, label: 'Catastrophic', class: 'Catastrophic' },
    { level: 4, label: 'Major', class: 'Major' },
    { level: 3, label: 'Moderate', class: 'Moderate' },
    { level: 2, label: 'Minor', class: 'Minor' },
    { level: 1, label: 'Insignificant', class: 'Insignificant' }
  ];

  const likelihoodLevels = [
    { level: 1, label: 'Remote', class: 'Remote' },
    { level: 2, label: 'Unlikely', class: 'Unlikely' },
    { level: 3, label: 'Possible', class: 'Possible' },
    { level: 4, label: 'Probable', class: 'Probable' },
    { level: 5, label: 'Highly Probable', class: 'Highly Probable' }
  ];

  // Fetch risk data
  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // GANTI dengan implementasi Firestore Anda
        const risks = await fetchRisksFromFirestore();
        
        console.log('Fetched risks:', risks);
        
        if (risks && risks.length > 0) {
          setRiskData(risks);
          setFilteredRisks(risks);
        } else {
          // Fallback data untuk demo
          setRiskData(getDemoData());
          setFilteredRisks(getDemoData());
        }
      } catch (err) {
        console.error('Error fetching risk data:', err);
        setError('Gagal memuat data risiko: ' + err.message);
        // Fallback ke demo data
        setRiskData(getDemoData());
        setFilteredRisks(getDemoData());
      } finally {
        setLoading(false);
      }
    };

    fetchRiskData();
  }, []);

  // Filter risks berdasarkan tipe
  useEffect(() => {
    if (riskData.length === 0) return;

    const filtered = riskData.filter(risk => {
      if (riskType === 'inherent') {
        return risk.inherentScore !== undefined && risk.inherentScore !== null;
      } else {
        return risk.residualScore !== undefined && risk.residualScore !== null;
      }
    });
    
    setFilteredRisks(filtered);
    setSelectedCell(null);
  }, [riskType, riskData]);

  // Fungsi untuk mendapatkan risks di cell tertentu
  const getRisksInCell = (likelihood, impact) => {
    return filteredRisks.filter(risk => {
      const riskLikelihood = risk.likelihood;
      const riskImpact = risk.impact;
      return riskLikelihood === likelihood && riskImpact === impact;
    });
  };

  // Fungsi untuk menentukan risk level
  const calculateRiskLevel = (likelihood, impact) => {
    const score = likelihood * impact;
    if (score >= 20) return 'extreme';
    if (score >= 16) return 'high';
    if (score >= 10) return 'medium';
    if (score >= 5) return 'low';
    return 'very_low';
  };

  // Data demo sesuai dengan contoh Anda
  const getDemoData = () => {
    return [
      // Major (Impact 4) risks
      { id: '1', likelihood: 2, impact: 4, riskCode: 'RISK-001', riskDescription: 'Major Risk 1' },
      { id: '2', likelihood: 2, impact: 4, riskCode: 'RISK-002', riskDescription: 'Major Risk 2' },
      { id: '3', likelihood: 3, impact: 4, riskCode: 'RISK-003', riskDescription: 'Major Risk 3' },
      { id: '4', likelihood: 3, impact: 4, riskCode: 'RISK-004', riskDescription: 'Major Risk 4' },
      { id: '5', likelihood: 3, impact: 4, riskCode: 'RISK-005', riskDescription: 'Major Risk 5' },
      { id: '6', likelihood: 3, impact: 4, riskCode: 'RISK-006', riskDescription: 'Major Risk 6' },
      
      // Moderate (Impact 3) risks - 11 risks
      ...Array.from({ length: 11 }, (_, i) => ({
        id: `mod-${i + 1}`,
        likelihood: 2,
        impact: 3,
        riskCode: `RISK-MOD-${i + 1}`,
        riskDescription: `Moderate Risk ${i + 1}`
      })),
      
      // Moderate (Impact 3) risks - 20 risks
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `mod-high-${i + 1}`,
        likelihood: 3,
        impact: 3,
        riskCode: `RISK-MOD-H-${i + 1}`,
        riskDescription: `Moderate High Risk ${i + 1}`
      })),
      
      // Sisanya sesuai dengan tabel Anda...
    ];
  };

  // Placeholder untuk Firestore implementation
  const fetchRisksFromFirestore = async () => {
    // Implementasi Firestore Anda di sini
    return getDemoData();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Memuat data heatmap...
        </Typography>
      </Box>
    );
  }

  return (
    <Card elevation={3} sx={{ mt: 2 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2" fontWeight="bold" color="primary">
            {riskType === 'inherent' ? 'Inherent' : 'Residual'} Risk Heat Map
          </Typography>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Tipe Risiko</InputLabel>
            <Select
              value={riskType}
              label="Tipe Risiko"
              onChange={(e) => setRiskType(e.target.value)}
            >
              <MenuItem value="inherent">Inherent Risk</MenuItem>
              <MenuItem value="residual">Residual Risk</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Heatmap Table */}
        <TableContainer component={Paper} elevation={2}>
          <Table sx={{ minWidth: 650 }} aria-label="risk heatmap table">
            <TableHead>
              <TableRow>
                <TableCell 
                  rowSpan={2}
                  sx={{ 
                    backgroundColor: '#f8f9fa', 
                    border: '2px solid #dee2e6',
                    minWidth: 120
                  }}
                ></TableCell>
                <TableCell 
                  colSpan={6}
                  align="center"
                  sx={{ 
                    backgroundColor: '#e9ecef', 
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    border: '2px solid #dee2e6'
                  }}
                >
                  Likelihood
                </TableCell>
              </TableRow>
              <TableRow>
                <LikelihoodHeaderCell></LikelihoodHeaderCell>
                {likelihoodLevels.map((likelihood) => (
                  <LikelihoodHeaderCell key={likelihood.level}>
                    {likelihood.label}
                  </LikelihoodHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {impactLevels.map((impact) => (
                <TableRow key={impact.level}>
                  <ImpactLabelCell>
                    {impact.label}
                  </ImpactLabelCell>
                  
                  <LikelihoodHeaderCell>
                    {impact.level}
                  </LikelihoodHeaderCell>
                  
                  {likelihoodLevels.map((likelihood) => {
                    const risksInCell = getRisksInCell(likelihood.level, impact.level);
                    const riskLevel = calculateRiskLevel(likelihood.level, impact.level);
                    const hasData = risksInCell.length > 0;
                    const cellKey = `${likelihood.level}-${impact.level}`;
                    
                    return (
                      <Tooltip
                        key={cellKey}
                        title={
                          hasData 
                            ? `${risksInCell.length} risks - ${impact.label} Impact, ${likelihood.label} Likelihood`
                            : 'No risks'
                        }
                        arrow
                      >
                        <HeatmapTableCell
                          risklevel={riskLevel}
                          hasdata={hasData}
                          onClick={() => hasData && setSelectedCell(cellKey)}
                        >
                          {hasData ? risksInCell.length : 0}
                        </HeatmapTableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Legend */}
        <Box display="flex" justifyContent="center" gap={2} mt={3} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={20} height={20} bgcolor="#4CAF50" borderRadius="4px" />
            <Typography variant="body2">Very Low</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={20} height={20} bgcolor="#8BC34A" borderRadius="4px" />
            <Typography variant="body2">Low</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={20} height={20} bgcolor="#FFEB3B" borderRadius="4px" />
            <Typography variant="body2">Medium</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={20} height={20} bgcolor="#FF9800" borderRadius="4px" />
            <Typography variant="body2">High</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={20} height={20} bgcolor="#FF5252" borderRadius="4px" />
            <Typography variant="body2">Extreme</Typography>
          </Box>
        </Box>

        {/* Selected Cell Details */}
        {selectedCell && (
          <Card elevation={2} sx={{ mt: 3, backgroundColor: '#f8f9fa' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Risk Details - {selectedCell}
              </Typography>
              {(() => {
                const [likelihood, impact] = selectedCell.split('-');
                const risks = getRisksInCell(parseInt(likelihood), parseInt(impact));
                
                if (risks.length === 0) {
                  return <Typography>No risks in this cell</Typography>;
                }
                
                return (
                  <Grid container spacing={2}>
                    {risks.slice(0, 6).map(risk => (
                      <Grid item xs={12} md={6} key={risk.id}>
                        <Paper sx={{ p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="start">
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {risk.riskCode}
                              </Typography>
                              <Typography variant="body2">
                                {risk.riskDescription}
                              </Typography>
                            </Box>
                            <RiskChip 
                              label={riskType.toUpperCase()} 
                              risktype={riskType}
                              size="small"
                            />
                          </Box>
                          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                            <Chip 
                              label={`Impact: ${impactLevels.find(i => i.level === risk.impact)?.label}`} 
                              size="small" 
                              variant="outlined" 
                            />
                            <Chip 
                              label={`Likelihood: ${likelihoodLevels.find(l => l.level === risk.likelihood)?.label}`} 
                              size="small" 
                              variant="outlined" 
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                    {risks.length > 6 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          ... and {risks.length - 6} more risks
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
          <Typography variant="body2" textAlign="center">
            Total <strong>{filteredRisks.length}</strong> risks displayed • 
            Impact Scale: 1 (Insignificant) - 5 (Catastrophic) • 
            Likelihood Scale: 1 (Remote) - 5 (Highly Probable)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiskHeatmap;