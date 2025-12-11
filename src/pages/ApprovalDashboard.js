// src/pages/ApprovalDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  PendingActions as PendingActionsIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useApproval } from '../contexts/ApprovalContext';
import { useAuth } from '../contexts/AuthContext';
import PendingApprovals from '../components/Approval/PendingApprovals';
import WorkflowConfig from '../components/Approval/WorkflowConfig';
import ApprovalHistory from '../components/Approval/ApprovalHistory';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ApprovalDashboard = () => {
  const { stats, pendingApprovals, myRequests, refreshData, loading } = useApproval();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      refreshData(user.uid);
      generateChartData();
    }
  }, [user?.uid, refreshData]);

  const generateChartData = () => {
    // Generate mock data for chart
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        approved: Math.floor(Math.random() * 10),
        rejected: Math.floor(Math.random() * 5),
        pending: Math.floor(Math.random() * 15)
      });
    }
    
    setChartData(data);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getDocumentTypeStats = () => {
    const types = {};
    
    myRequests.forEach(request => {
      const type = request.documentType;
      if (!types[type]) {
        types[type] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      types[type].total++;
      types[type][request.status]++;
    });
    
    return Object.entries(types).map(([type, stats]) => ({
      type: type.replace('_', ' '),
      ...stats
    }));
  };

  const documentTypeStats = getDocumentTypeStats();

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <PendingApprovals />;
      case 1:
        return <WorkflowConfig />;
      case 2:
        return <ApprovalHistory />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Approval Workflow Dashboard</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage and track all approval processes
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => user?.uid && refreshData(user.uid)}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button variant="contained">
            New Approval Request
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'warning.light' }}>
                  <PendingActionsIcon color="warning" />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {stats?.pendingCount || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Approvals
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(stats?.pendingCount || 0) / ((stats?.pendingCount || 0) + (stats?.approvedCount || 0) + (stats?.rejectedCount || 0)) * 100}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'success.light' }}>
                  <CheckCircleIcon color="success" />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {stats?.approvedCount || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Approved Requests
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                Avg time: {stats?.totalProcessingTime || 0}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'error.light' }}>
                  <WarningIcon color="error" />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {stats?.rejectedCount || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Rejected Requests
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                {stats?.rejectedCount > 0 ? 'Review required' : 'All good'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'info.light' }}>
                  <TimelineIcon color="info" />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {myRequests?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Requests
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                Your approval history
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Charts */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Approval Trend (Last 7 Days)</Typography>
              <Chip
                icon={<TrendingUpIcon />}
                label="Performance"
                size="small"
                variant="outlined"
              />
            </Box>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="approved" 
                  stroke="#4caf50" 
                  strokeWidth={2}
                  name="Approved"
                />
                <Line 
                  type="monotone" 
                  dataKey="rejected" 
                  stroke="#f44336" 
                  strokeWidth={2}
                  name="Rejected"
                />
                <Line 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="#ff9800" 
                  strokeWidth={2}
                  name="Pending"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Right Column - Quick Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            
            <List>
              <ListItem
                secondaryAction={
                  <IconButton edge="end">
                    <AccessTimeIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar>
                    <PendingActionsIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Review Pending"
                  secondary={`${pendingApprovals?.length || 0} items waiting`}
                />
              </ListItem>
              
              <ListItem
                secondaryAction={
                  <IconButton edge="end">
                    <PeopleIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar>
                    <DescriptionIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="My Requests"
                  secondary={`${myRequests?.length || 0} total submissions`}
                />
              </ListItem>
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Document Types
            </Typography>
            
            <Box>
              {documentTypeStats.map((stat, index) => (
                <Box key={index} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">
                      {stat.type}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {stat.total}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={0.5}>
                    <Box
                      flex={stat.approved}
                      height={8}
                      bgcolor="success.main"
                      borderRadius="4px 0 0 4px"
                    />
                    <Box
                      flex={stat.rejected}
                      height={8}
                      bgcolor="error.main"
                    />
                    <Box
                      flex={stat.pending}
                      height={8}
                      bgcolor="warning.main"
                      borderRadius="0 4px 4px 0"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs for Detailed Views */}
      <Paper sx={{ mt: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={<PendingActionsIcon />} 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                Pending Approvals
                {pendingApprovals?.length > 0 && (
                  <Chip
                    label={pendingApprovals.length}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>
            } 
          />
          <Tab icon={<SettingsIcon />} label="Workflow Configuration" />
          <Tab icon={<HistoryIcon />} label="Approval History" />
        </Tabs>
        
        <Box p={3}>
          {renderTabContent()}
        </Box>
      </Paper>
    </Box>
  );
};

export default ApprovalDashboard;