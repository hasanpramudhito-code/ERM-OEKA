import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Close,
  Download,
  Visibility,
  Edit,
  Warning,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Timeline,
  CompareArrows,
  PictureAsPdf,
  TableChart,
  TextFields
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const RiskCellDetailModal = ({ 
  open, 
  onClose, 
  cellData,
  viewMode,
  assessmentMethod,
  riskLevels,
  onExport
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [exporting, setExporting] = useState(false);

  if (!cellData || !cellData.risks || cellData.risks.length === 0) {
    return null;
  }

  const { 
    likelihood, 
    impact, 
    risks,
    score,
    riskLevel,
    cellColor
  } = cellData;

  // Likelihood and impact labels
  const likelihoodLabels = {
    1: 'Remote',
    2: 'Unlikely', 
    3: 'Possible',
    4: 'Probable',
    5: 'Highly Probable'
  };

  const impactLabels = {
    1: 'Insignificant',
    2: 'Minor',
    3: 'Moderate',
    4: 'Major',
    5: 'Catastrophic'
  };

  // Tab configuration
  const tabs = [
    { label: 'Daftar Risiko', icon: <TableChart /> },
    { label: 'Analisis', icon: <Timeline /> },
    { label: 'Comparison', icon: <CompareArrows /> },
    { label: 'Export', icon: <Download /> }
  ];

  // Calculate statistics
  const stats = {
    total: risks.length,
    inherent: risks.filter(r => r.inherentScore).length,
    residual: risks.filter(r => r.residualScore).length,
    withTreatment: risks.filter(r => r.treatmentPlan).length,
    highRisk: risks.filter(r => 
      (viewMode === 'inherent' ? r.inherentLevel : r.residualLevel)?.includes('Tinggi') ||
      (viewMode === 'inherent' ? r.inherentLevel : r.residualLevel)?.includes('High') ||
      (viewMode === 'inherent' ? r.inherentLevel : r.residualLevel)?.includes('Ekstrim')
    ).length
  };

  // Handle risk click
  const handleRiskClick = (riskId) => {
    navigate(`/risk-register/${riskId}`);
    onClose();
  };

  // Handle export
  const handleExport = async (format) => {
    setExporting(true);
    try {
      if (onExport) {
        await onExport(format, cellData);
      }
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        backgroundColor: cellColor || '#f5f5f5',
        color: riskLevel?.includes('Medium') ? '#333' : 'white',
        py: 2,
        position: 'relative'
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Cell Detail: L{likelihood}-I{impact}
            </Typography>
            <Typography variant="subtitle1">
              {likelihoodLabels[likelihood]} Likelihood × {impactLabels[impact]} Impact
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
            <Close />
          </IconButton>
        </Box>
        
        {/* Score Badge */}
        <Box sx={{ 
          position: 'absolute', 
          right: 60, 
          top: 16,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 2,
          px: 2,
          py: 0.5
        }}>
          <Typography variant="h6" fontWeight="bold">
            Score: {score} | Risks: {risks.length}
          </Typography>
        </Box>
      </DialogTitle>

      {/* Stats Bar */}
      <Box sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">Total Risks</Typography>
              <Typography variant="h6" fontWeight="bold">{stats.total}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">High Risk</Typography>
              <Typography variant="h6" fontWeight="bold" color="error">
                {stats.highRisk}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">With Treatment</Typography>
              <Typography variant="h6" fontWeight="bold" color="success">
                {stats.withTreatment}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">View Mode</Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {viewMode === 'inherent' ? 'Inherent' : 'Residual'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 3, maxHeight: 500, overflow: 'auto' }}>
        {/* Tab 1: Risk List */}
        {activeTab === 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell width="15%">Risk Code</TableCell>
                  <TableCell width="30%">Description</TableCell>
                  <TableCell width="15%">Category</TableCell>
                  <TableCell width="15%">Owner</TableCell>
                  <TableCell width="15%">Status</TableCell>
                  <TableCell width="10%">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {risks.map((risk) => (
                  <TableRow 
                    key={risk.id}
                    hover
                    sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {risk.riskCode || risk.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {risk.riskDescription || risk.riskTitle}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {risk.department || 'No department'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={risk.category || 'Uncategorized'} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {risk.riskOwner || 'Unassigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={risk.status || 'identified'}
                        size="small"
                        color={
                          risk.status === 'closed' ? 'success' :
                          risk.status === 'treated' ? 'warning' :
                          risk.status === 'monitored' ? 'info' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => handleRiskClick(risk.id)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small">
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Tab 2: Analysis */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Risk Distribution
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {['highRisk', 'withTreatment', 'inherent', 'residual'].map((stat, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">
                          {stat === 'highRisk' ? 'High Risk Items' :
                           stat === 'withTreatment' ? 'With Treatment Plan' :
                           stat === 'inherent' ? 'Inherent Risks' : 'Residual Risks'}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {stats[stat]} / {stats.total}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(stats[stat] / stats.total) * 100}
                        color={
                          stat === 'highRisk' ? 'error' :
                          stat === 'withTreatment' ? 'success' : 'primary'
                        }
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Risk Level Comparison
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Warning color="error" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="High/Extreme Risks"
                      secondary={`${stats.highRisk} items need immediate attention`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="With Treatment Plans"
                      secondary={`${stats.withTreatment} items are being mitigated`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <TrendingUp color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Risk Trend"
                      secondary="Most risks in this cell are medium to high"
                    />
                  </ListItem>
                </List>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    <strong>Recommendation:</strong> Focus on the {stats.highRisk} high-risk items first.
                    Consider risk treatment optimization for this cell.
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Tab 3: Comparison */}
        {activeTab === 2 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Inherent vs Residual Comparison
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {risks.slice(0, 3).map((risk) => (
                <Grid item xs={12} key={risk.id}>
                  <Paper sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight="bold">
                        {risk.riskCode}
                      </Typography>
                      <Chip 
                        label={risk.category}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1.5, backgroundColor: '#e3f2fd' }}>
                          <Typography variant="caption" color="primary" fontWeight="bold">
                            INHERENT
                          </Typography>
                          <Typography variant="body2">
                            Score: {risk.inherentScore || 'N/A'}
                          </Typography>
                          <Typography variant="body2">
                            Level: {risk.inherentLevel || 'N/A'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1.5, backgroundColor: '#e8f5e9' }}>
                          <Typography variant="caption" color="success" fontWeight="bold">
                            RESIDUAL
                          </Typography>
                          <Typography variant="body2">
                            Score: {risk.residualScore || 'N/A'}
                          </Typography>
                          <Typography variant="body2">
                            Level: {risk.residualLevel || 'N/A'}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {risk.inherentScore && risk.residualScore && (
                      <Box sx={{ mt: 1, p: 1, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                        <Typography variant="caption" fontWeight="bold">
                          Risk Reduction: {risk.inherentScore - risk.residualScore} points
                          {risk.inherentScore > risk.residualScore ? (
                            <span style={{ color: '#2e7d32' }}> ✓ Effective</span>
                          ) : (
                            <span style={{ color: '#d32f2f' }}> ✗ Needs Improvement</span>
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Tab 4: Export */}
        {activeTab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                onClick={() => handleExport('pdf')}
              >
                <PictureAsPdf sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Export PDF
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Format dokumen profesional dengan tabel dan analisis
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  disabled={exporting}
                  startIcon={<PictureAsPdf />}
                >
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                onClick={() => handleExport('csv')}
              >
                <TableChart sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Export CSV
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Data spreadsheet untuk analisis lebih lanjut
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  disabled={exporting}
                  startIcon={<TableChart />}
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                onClick={() => handleExport('text')}
              >
                <TextFields sx={{ fontSize: 48, color: '#388e3c', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Export Text
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Format teks sederhana untuk laporan cepat
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  disabled={exporting}
                  startIcon={<TextFields />}
                >
                  {exporting ? 'Exporting...' : 'Export Text'}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Note:</strong> Export will include {risks.length} risks from this cell.
                  Data includes risk codes, descriptions, categories, owners, and scores.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button 
          variant="contained" 
          onClick={() => handleRiskClick(risks[0]?.id)}
          startIcon={<Visibility />}
        >
          Open First Risk
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RiskCellDetailModal;