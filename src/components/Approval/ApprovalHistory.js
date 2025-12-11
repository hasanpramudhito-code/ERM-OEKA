// src/components/Approval/ApprovalHistory.js
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Avatar,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Button,
  Devider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon, // Tambahkan ini
  Refresh as RefreshIcon // Tambahkan ini
} from '@mui/icons-material';
import { useApproval } from '../../contexts/ApprovalContext';
import { format } from 'date-fns';

const ApprovalHistory = () => {
  const { myRequests, loading } = useApproval();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const filteredRequests = myRequests.filter(request => {
    // Status filter
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        request.documentType.toLowerCase().includes(searchLower) ||
        request.documentTitle?.toLowerCase().includes(searchLower) ||
        request.id.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon color="success" />;
      case 'rejected':
        return <CancelIcon color="error" />;
      case 'pending':
        return <AccessTimeIcon color="warning" />;
      default:
        return null;
    }
  };

  const getProcessingTime = (request) => {
    if (request.status !== 'approved') return 'N/A';
    
    const created = request.createdAt.toDate();
    const approved = request.approvedAt.toDate();
    const diffHours = Math.round((approved - created) / (1000 * 60 * 60));
    
    return `${diffHours} hours`;
  };

  const handleExportHistory = () => {
    // Implement export functionality
    console.log('Exporting history...');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const StatusChip = ({ status }) => {
    const config = {
      approved: { label: 'Approved', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      pending: { label: 'Pending', color: 'warning' }
    };
    
    const { label, color } = config[status] || { label: 'Unknown', color: 'default' };
    
    return (
      <Chip
        icon={getStatusIcon(status)}
        label={label}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5">Approval History</Typography>
          <Typography variant="body2" color="textSecondary">
            Track all your approval requests and their status
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportHistory}
          >
            Export History
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'success.light' }}>
                <CheckCircleIcon />
              </Avatar>
              <Box>
                <Typography variant="h4">
                  {myRequests.filter(r => r.status === 'approved').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Approved
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'error.light' }}>
                <CancelIcon />
              </Avatar>
              <Box>
                <Typography variant="h4">
                  {myRequests.filter(r => r.status === 'rejected').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Rejected
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'warning.light' }}>
                <AccessTimeIcon />
              </Avatar>
              <Box>
                <Typography variant="h4">
                  {myRequests.filter(r => r.status === 'pending').length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Pending
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'info.light' }}>
                <HistoryIcon />
              </Avatar>
              <Box>
                <Typography variant="h4">
                  {myRequests.length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Total Requests
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Chip
                label={`All (${myRequests.length})`}
                onClick={() => setStatusFilter('all')}
                color={statusFilter === 'all' ? 'primary' : 'default'}
                variant={statusFilter === 'all' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`Approved (${myRequests.filter(r => r.status === 'approved').length})`}
                onClick={() => setStatusFilter('approved')}
                color={statusFilter === 'approved' ? 'success' : 'default'}
                variant={statusFilter === 'approved' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`Rejected (${myRequests.filter(r => r.status === 'rejected').length})`}
                onClick={() => setStatusFilter('rejected')}
                color={statusFilter === 'rejected' ? 'error' : 'default'}
                variant={statusFilter === 'rejected' ? 'filled' : 'outlined'}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Requests" />
          <Tab label="Recent Activity" />
          <Tab label="Pending Actions" />
        </Tabs>
      </Paper>

      {/* History Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Document</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Processing Time</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary" py={3}>
                    No approval history found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((request) => (
                  <React.Fragment key={request.id}>
                    <TableRow hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {request.documentTitle || 'Untitled Document'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {request.documentType.replace('_', ' ')} • ID: {request.documentId}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {request.workflowName || 'Standard Workflow'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Level {request.currentLevel || 1}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <StatusChip status={request.status} />
                        {request.rejectionReason && (
                          <Tooltip title={request.rejectionReason}>
                            <Typography variant="caption" display="block" color="error">
                              Reason: {request.rejectionReason.substring(0, 30)}...
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {format(request.createdAt.toDate(), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      
                      <TableCell>
                        {request.approvedAt 
                          ? format(request.approvedAt.toDate(), 'dd MMM yyyy HH:mm')
                          : request.rejectedAt
                          ? format(request.rejectedAt.toDate(), 'dd MMM yyyy HH:mm')
                          : 'Pending'
                        }
                      </TableCell>
                      
                      <TableCell>
                        {getProcessingTime(request)}
                      </TableCell>
                      
                      <TableCell align="right">
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setExpandedRequest(
                                expandedRequest === request.id ? null : request.id
                              )}
                            >
                              <ExpandMoreIcon
                                fontSize="small"
                                sx={{
                                  transform: expandedRequest === request.id 
                                    ? 'rotate(180deg)' 
                                    : 'rotate(0deg)',
                                  transition: 'transform 0.2s'
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="View Document">
                            <IconButton size="small">
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {request.status === 'rejected' && (
                            <Tooltip title="Resubmit">
                              <IconButton size="small" color="primary">
                                <RefreshIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Details */}
                    {expandedRequest === request.id && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ p: 0 }}>
                          <Accordion expanded={true} sx={{ boxShadow: 'none' }}>
                            <AccordionDetails>
                              <Box p={2} bgcolor="grey.50" borderRadius={1}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Approval History
                                </Typography>
                                
                                {request.history && request.history.length > 0 ? (
                                  <Box>
                                    {request.history.map((entry, index) => (
                                      <Box
                                        key={index}
                                        display="flex"
                                        alignItems="flex-start"
                                        gap={2}
                                        mb={2}
                                        pb={2}
                                        borderBottom={index < request.history.length - 1 ? '1px solid' : 'none'}
                                        borderColor="divider"
                                      >
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.200' }}>
                                          <Typography variant="caption">
                                            L{entry.level}
                                          </Typography>
                                        </Avatar>
                                        
                                        <Box flex={1}>
                                          <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" fontWeight="medium">
                                              {entry.action === 'approved' ? 'Approved' : 
                                               entry.action === 'rejected' ? 'Rejected' : 
                                               entry.action}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                              {format(entry.timestamp.toDate(), 'dd MMM HH:mm')}
                                            </Typography>
                                          </Box>
                                          
                                          <Typography variant="body2" color="textSecondary">
                                            by {entry.approverName || 'System'}
                                          </Typography>
                                          
                                          {entry.comment && (
                                            <Paper 
                                              variant="outlined" 
                                              sx={{ 
                                                p: 1, 
                                                mt: 1,
                                                bgcolor: entry.action === 'rejected' ? 'error.50' : 'grey.50'
                                              }}
                                            >
                                              <Typography variant="caption">
                                                {entry.comment}
                                              </Typography>
                                            </Paper>
                                          )}
                                        </Box>
                                        
                                        <Chip
                                          label={entry.action}
                                          size="small"
                                          color={
                                            entry.action === 'approved' ? 'success' :
                                            entry.action === 'rejected' ? 'error' : 'default'
                                          }
                                          variant="outlined"
                                        />
                                      </Box>
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="textSecondary">
                                    No history available
                                  </Typography>
                                )}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRequests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default ApprovalHistory;