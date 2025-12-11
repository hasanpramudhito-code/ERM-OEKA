// src/components/Approval/PendingApprovals.js
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
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
  TablePagination,
  Tooltip,
  Alert,
  LinearProgress,
  Avatar,
  Badge
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Mail as MailIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useApproval } from '../../contexts/ApprovalContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const PendingApprovals = () => {
  const { pendingApprovals, approveRequest, rejectRequest, loading, refreshData } = useApproval();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (requestId) => {
    try {
      await approveRequest(requestId, approvalComment);
      setApprovalComment('');
    } catch (err) {
      console.error('Error approving request:', err);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    
    try {
      await rejectRequest(selectedRequest.id, rejectionReason);
      setRejectionDialog(false);
      setRejectionReason('');
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const getTimeRemaining = (createdAt) => {
    const created = createdAt.toDate();
    const now = new Date();
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return { color: 'error', text: 'Overdue' };
    } else if (hoursDiff > 18) {
      return { color: 'warning', text: 'Urgent' };
    }
    return { color: 'success', text: 'On track' };
  };

  const filteredRequests = pendingApprovals.filter(request => {
    if (filter === 'overdue') {
      const created = request.createdAt.toDate();
      const hoursDiff = (new Date() - created) / (1000 * 60 * 60);
      return hoursDiff > 24;
    }
    return true;
  }).filter(request => 
    request.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.documentTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getDocumentTypeIcon = (type) => {
    switch (type) {
      case 'risk_assessment': return '📋';
      case 'treatment_plan': return '📝';
      case 'incident_report': return '🚨';
      case 'control_test': return '✅';
      default: return '📄';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5">Pending Approvals</Typography>
          <Typography variant="body2" color="textSecondary">
            {filteredRequests.length} requests pending your action
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}
          >
            {filter === 'overdue' ? 'Show All' : 'Show Overdue'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refreshData(user.id)}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {pendingApprovals.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Pending
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {pendingApprovals.filter(r => {
                const created = r.createdAt.toDate();
                const hoursDiff = (new Date() - created) / (1000 * 60 * 60);
                return hoursDiff > 18 && hoursDiff <= 24;
              }).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Urgent
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main">
              {pendingApprovals.filter(r => {
                const created = r.createdAt.toDate();
                const hoursDiff = (new Date() - created) / (1000 * 60 * 60);
                return hoursDiff > 24;
              }).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Overdue
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {pendingApprovals.filter(r => r.currentLevel === 1).length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              First Level
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by document type or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Chip
                label={`Level ${pendingApprovals.filter(r => r.currentLevel === 1).length}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Level ${pendingApprovals.filter(r => r.currentLevel === 2).length}`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`Level ${pendingApprovals.filter(r => r.currentLevel >= 3).length}`}
                color="info"
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Requests Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Document</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Current Level</TableCell>
              <TableCell>Time Remaining</TableCell>
              <TableCell>Submitted</TableCell>
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
                    No pending approvals found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((request) => {
                  const timeRemaining = getTimeRemaining(request.createdAt);
                  
                  return (
                    <TableRow key={request.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                            {getDocumentTypeIcon(request.documentType)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {request.documentTitle || 'Untitled Document'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              ID: {request.documentId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={request.documentType.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {request.requesterName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {request.requesterDepartment}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Badge
                          badgeContent={request.currentLevel}
                          color="primary"
                          sx={{ '& .MuiBadge-badge': { top: -5, right: -5 } }}
                        >
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.200' }}>
                            <Typography variant="caption" color="text.primary">
                              L{request.currentLevel}
                            </Typography>
                          </Avatar>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          icon={timeRemaining.color === 'error' ? <WarningIcon /> : <AccessTimeIcon />}
                          label={timeRemaining.text}
                          color={timeRemaining.color}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" display="block" color="textSecondary">
                          {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        {request.createdAt.toDate().toLocaleDateString()}
                      </TableCell>
                      
                      <TableCell align="right">
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="View History">
                            <IconButton size="small">
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Send Reminder">
                            <IconButton size="small">
                              <MailIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(request.id)}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedRequest(request);
                                setRejectionDialog(true);
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
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

      {/* Approval Comment Dialog */}
      <Dialog
        open={!!selectedRequest && !rejectionDialog}
        onClose={() => setSelectedRequest(null)}
      >
        <DialogTitle>
          Approve Request
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Add a comment for your approval (optional):
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder="Add approval notes..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRequest(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleApprove(selectedRequest?.id)}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectionDialog}
        onClose={() => {
          setRejectionDialog(false);
          setRejectionReason('');
        }}
      >
        <DialogTitle>
          Reject Request
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please provide a reason for rejection. The requester will see this feedback.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRejectionDialog(false);
              setRejectionReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectionReason.trim()}
          >
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingApprovals;