import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fab,
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  MoreVert as MoreVertIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Visibility as VisibilityIcon,
  ContentCopy as ContentCopyIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  History as HistoryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const WorkflowConfig = () => {
  const { userData } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  const [steps, setSteps] = useState([]);

  // Initial form data with all required fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    module: '',
    triggerType: 'manual',
    isActive: true,
    approvalLevel: 'single',
    timeoutHours: 24,
    notifyOnTimeout: true,
    notifyOnApproval: true,
    autoEscalate: false,
    escalationHours: 48,
    requireAttachments: false,
    maxAttachments: 5,
    allowComments: true,
    allowRejectionReason: true,
    enableRevision: true,
    maxRevisions: 3
  });

  // Available modules
  const modules = [
    { value: 'risk_register', label: 'Risk Register' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'treatment_plan', label: 'Treatment Plan' },
    { value: 'kri_monitoring', label: 'KRI Monitoring' },
    { value: 'incident_report', label: 'Incident Report' },
    { value: 'control_testing', label: 'Control Testing' },
    { value: 'deficiency_tracking', label: 'Deficiency Tracking' },
    { value: 'user_management', label: 'User Management' },
    { value: 'budget_approval', label: 'Budget Approval' },
    { value: 'document_approval', label: 'Document Approval' }
  ];

  const triggerTypes = [
    { value: 'manual', label: 'Manual Submission' },
    { value: 'auto_risk_score', label: 'Auto - Risk Score Threshold' },
    { value: 'auto_kri_breach', label: 'Auto - KRI Breach' },
    { value: 'auto_incident_severity', label: 'Auto - Incident Severity' },
    { value: 'auto_scheduled', label: 'Auto - Scheduled Review' }
  ];

  const approvalLevels = [
    { value: 'single', label: 'Single Level' },
    { value: 'multi', label: 'Multi Level Sequential' },
    { value: 'parallel', label: 'Parallel Approval' },
    { value: 'any', label: 'Any One Approver' },
    { value: 'hierarchical', label: 'Hierarchical' }
  ];

  const availableRoles = [
    'ADMIN',
    'DIRECTOR',
    'RISK_MANAGER',
    'RISK_OWNER',
    'RISK_OFFICER',
    'DEPARTMENT_HEAD',
    'UNIT_MANAGER',
    'SUPERVISOR'
  ];

  // Helper function to clean undefined values
  const cleanDataForFirestore = (data) => {
    const cleaned = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        cleaned[key] = data[key];
      }
    });
    return cleaned;
  };

  // Load workflows
  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const workflowsQuery = query(
        collection(db, 'workflow_configs'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(workflowsQuery);
      const workflowList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkflows(workflowList || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
      showSnackbar('Error loading workflows: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Initialize steps when editing
  useEffect(() => {
    if (editingWorkflow && editingWorkflow.steps) {
      setSteps(editingWorkflow.steps.map(step => ({
        ...step,
        id: step.id || `step-${Date.now()}-${Math.random()}`
      })));
    } else {
      setSteps([]);
    }
  }, [editingWorkflow]);

  // Step management functions
  const addStep = () => {
    const newStep = {
      id: `step-${Date.now()}-${Math.random()}`,
      order: steps.length + 1,
      role: '',
      approverType: 'role_based', // 'role_based', 'specific_user', 'dynamic'
      specificUsers: [],
      approvalType: 'approve_reject', // 'approve_reject', 'review_only', 'inform_only'
      isMandatory: true,
      timeoutHours: 24,
      escalationRole: '',
      canDelegate: false,
      delegationRoles: [],
      requireAttachments: false,
      requireComments: false,
      canRequestRevision: true,
      revisionInstructions: '',
      conditions: [],
      notifications: {
        email: true,
        inApp: true,
        slack: false
      }
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index, field, value) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    setSteps(updatedSteps);
  };

  const removeStep = (index) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    // Reorder steps
    const reorderedSteps = updatedSteps.map((step, i) => ({
      ...step,
      order: i + 1
    }));
    setSteps(reorderedSteps);
  };

  const moveStepUp = (index) => {
    if (index === 0) return;
    const updatedSteps = [...steps];
    [updatedSteps[index], updatedSteps[index - 1]] = 
    [updatedSteps[index - 1], updatedSteps[index]];
    
    // Update order numbers
    const reorderedSteps = updatedSteps.map((step, i) => ({
      ...step,
      order: i + 1
    }));
    setSteps(reorderedSteps);
  };

  const moveStepDown = (index) => {
    if (index === steps.length - 1) return;
    const updatedSteps = [...steps];
    [updatedSteps[index], updatedSteps[index + 1]] = 
    [updatedSteps[index + 1], updatedSteps[index]];
    
    // Update order numbers
    const reorderedSteps = updatedSteps.map((step, i) => ({
      ...step,
      order: i + 1
    }));
    setSteps(reorderedSteps);
  };

  // Add condition to step
  const addCondition = (stepIndex) => {
    const updatedSteps = [...steps];
    const step = updatedSteps[stepIndex];
    
    if (!step.conditions) {
      step.conditions = [];
    }
    
    step.conditions.push({
      id: `condition-${Date.now()}-${Math.random()}`,
      field: '',
      operator: 'equals',
      value: '',
      logicalOperator: 'and'
    });
    
    setSteps(updatedSteps);
  };

  const updateCondition = (stepIndex, conditionIndex, field, value) => {
    const updatedSteps = [...steps];
    updatedSteps[stepIndex].conditions[conditionIndex][field] = value;
    setSteps(updatedSteps);
  };

  const removeCondition = (stepIndex, conditionIndex) => {
    const updatedSteps = [...steps];
    updatedSteps[stepIndex].conditions.splice(conditionIndex, 1);
    setSteps(updatedSteps);
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.name || !formData.module) {
        showSnackbar('Name and module are required!', 'error');
        return;
      }

      if (steps.length === 0) {
        showSnackbar('At least one approval step is required!', 'error');
        return;
      }

      // Validate all steps have roles
      const invalidSteps = steps.filter(step => !step.role);
      if (invalidSteps.length > 0) {
        showSnackbar('All steps must have a role assigned!', 'error');
        return;
      }

      // Prepare workflow data
      const workflowData = {
        name: formData.name || '',
        description: formData.description || '',
        module: formData.module || '',
        triggerType: formData.triggerType || 'manual',
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        approvalLevel: formData.approvalLevel || 'single',
        timeoutHours: formData.timeoutHours || 24,
        notifyOnTimeout: formData.notifyOnTimeout !== undefined ? formData.notifyOnTimeout : true,
        notifyOnApproval: formData.notifyOnApproval !== undefined ? formData.notifyOnApproval : true,
        autoEscalate: formData.autoEscalate || false,
        escalationHours: formData.escalationHours || 48,
        requireAttachments: formData.requireAttachments || false,
        maxAttachments: formData.maxAttachments || 5,
        allowComments: formData.allowComments !== undefined ? formData.allowComments : true,
        allowRejectionReason: formData.allowRejectionReason !== undefined ? formData.allowRejectionReason : true,
        enableRevision: formData.enableRevision !== undefined ? formData.enableRevision : true,
        maxRevisions: formData.maxRevisions || 3,
        steps: steps.map(step => ({
          order: step.order || 0,
          role: step.role || '',
          approverType: step.approverType || 'role_based',
          specificUsers: Array.isArray(step.specificUsers) ? step.specificUsers : [],
          approvalType: step.approvalType || 'approve_reject',
          isMandatory: step.isMandatory !== undefined ? step.isMandatory : true,
          timeoutHours: step.timeoutHours || 24,
          escalationRole: step.escalationRole || '',
          canDelegate: step.canDelegate || false,
          delegationRoles: Array.isArray(step.delegationRoles) ? step.delegationRoles : [],
          requireAttachments: step.requireAttachments || false,
          requireComments: step.requireComments || false,
          canRequestRevision: step.canRequestRevision !== undefined ? step.canRequestRevision : true,
          revisionInstructions: step.revisionInstructions || '',
          conditions: Array.isArray(step.conditions) ? step.conditions.map(cond => ({
            field: cond.field || '',
            operator: cond.operator || 'equals',
            value: cond.value || '',
            logicalOperator: cond.logicalOperator || 'and'
          })) : [],
          notifications: step.notifications || {
            email: true,
            inApp: true,
            slack: false
          }
        })),
        createdAt: editingWorkflow ? editingWorkflow.createdAt : serverTimestamp(),
        createdBy: editingWorkflow ? editingWorkflow.createdBy : userData?.name || 'System',
        updatedAt: serverTimestamp(),
        updatedBy: userData?.name || 'System'
      };

      // Clean undefined values
      const cleanedWorkflowData = cleanDataForFirestore(workflowData);

      console.log('Saving workflow data:', cleanedWorkflowData);

      if (editingWorkflow) {
        await updateDoc(doc(db, 'workflow_configs', editingWorkflow.id), cleanedWorkflowData);
        showSnackbar('Workflow updated successfully!', 'success');
      } else {
        await addDoc(collection(db, 'workflow_configs'), cleanedWorkflowData);
        showSnackbar('Workflow created successfully!', 'success');
      }

      setOpenDialog(false);
      setEditingWorkflow(null);
      resetForm();
      loadWorkflows();
      
    } catch (error) {
      console.error('Error saving workflow:', error);
      console.error('Error details:', error.message);
      showSnackbar('Error saving workflow: ' + error.message, 'error');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      module: '',
      triggerType: 'manual',
      isActive: true,
      approvalLevel: 'single',
      timeoutHours: 24,
      notifyOnTimeout: true,
      notifyOnApproval: true,
      autoEscalate: false,
      escalationHours: 48,
      requireAttachments: false,
      maxAttachments: 5,
      allowComments: true,
      allowRejectionReason: true,
      enableRevision: true,
      maxRevisions: 3
    });
    setSteps([]);
    setActiveTab(0);
  };

  // Handle edit
  const handleEdit = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name || '',
      description: workflow.description || '',
      module: workflow.module || '',
      triggerType: workflow.triggerType || 'manual',
      isActive: workflow.isActive !== undefined ? workflow.isActive : true,
      approvalLevel: workflow.approvalLevel || 'single',
      timeoutHours: workflow.timeoutHours || 24,
      notifyOnTimeout: workflow.notifyOnTimeout !== undefined ? workflow.notifyOnTimeout : true,
      notifyOnApproval: workflow.notifyOnApproval !== undefined ? workflow.notifyOnApproval : true,
      autoEscalate: workflow.autoEscalate || false,
      escalationHours: workflow.escalationHours || 48,
      requireAttachments: workflow.requireAttachments || false,
      maxAttachments: workflow.maxAttachments || 5,
      allowComments: workflow.allowComments !== undefined ? workflow.allowComments : true,
      allowRejectionReason: workflow.allowRejectionReason !== undefined ? workflow.allowRejectionReason : true,
      enableRevision: workflow.enableRevision !== undefined ? workflow.enableRevision : true,
      maxRevisions: workflow.maxRevisions || 3
    });
    setOpenDialog(true);
  };

  // Handle delete
  const handleDelete = async (workflowId) => {
    if (window.confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'workflow_configs', workflowId));
        showSnackbar('Workflow deleted successfully!', 'success');
        loadWorkflows();
      } catch (error) {
        console.error('Error deleting workflow:', error);
        showSnackbar('Error deleting workflow: ' + error.message, 'error');
      }
    }
  };

  // Clone workflow
  const handleClone = async (workflow) => {
    try {
      const clonedData = cleanDataForFirestore({
        ...workflow,
        name: `${workflow.name} (Copy)`,
        isActive: false,
        createdAt: serverTimestamp(),
        createdBy: userData?.name || 'System',
        updatedAt: serverTimestamp(),
        updatedBy: userData?.name || 'System',
        id: undefined // Remove ID for new document
      });
      
      await addDoc(collection(db, 'workflow_configs'), clonedData);
      showSnackbar('Workflow cloned successfully!', 'success');
      loadWorkflows();
    } catch (error) {
      console.error('Error cloning workflow:', error);
      showSnackbar('Error cloning workflow: ' + error.message, 'error');
    }
  };

  // Toggle workflow status
  const toggleWorkflowStatus = async (workflow) => {
    try {
      await updateDoc(doc(db, 'workflow_configs', workflow.id), {
        isActive: !workflow.isActive,
        updatedAt: serverTimestamp(),
        updatedBy: userData?.name || 'System'
      });
      
      showSnackbar(`Workflow ${!workflow.isActive ? 'activated' : 'deactivated'}!`, 'success');
      loadWorkflows();
    } catch (error) {
      console.error('Error toggling workflow status:', error);
      showSnackbar('Error updating workflow: ' + error.message, 'error');
    }
  };

  // Snackbar handler
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Table pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Render step content with safe mapping
  const renderStepContent = (step, index) => {
    // Ensure conditions is an array
    const conditions = Array.isArray(step.conditions) ? step.conditions : [];
    
    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={step.role || ''}
                onChange={(e) => updateStep(index, 'role', e.target.value)}
                label="Role"
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Approval Type</InputLabel>
              <Select
                value={step.approvalType || 'approve_reject'}
                onChange={(e) => updateStep(index, 'approvalType', e.target.value)}
                label="Approval Type"
              >
                <MenuItem value="approve_reject">Approve/Reject</MenuItem>
                <MenuItem value="review_only">Review Only</MenuItem>
                <MenuItem value="inform_only">Inform Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Timeout (Hours)"
              type="number"
              size="small"
              value={step.timeoutHours || 24}
              onChange={(e) => updateStep(index, 'timeoutHours', parseInt(e.target.value) || 24)}
              InputProps={{ inputProps: { min: 1, max: 720 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Escalation Role</InputLabel>
              <Select
                value={step.escalationRole || ''}
                onChange={(e) => updateStep(index, 'escalationRole', e.target.value || '')}
                label="Escalation Role"
              >
                <MenuItem value="">None</MenuItem>
                {availableRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={step.isMandatory !== false}
                    onChange={(e) => updateStep(index, 'isMandatory', e.target.checked)}
                  />
                }
                label="Mandatory"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={step.canDelegate || false}
                    onChange={(e) => updateStep(index, 'canDelegate', e.target.checked)}
                  />
                }
                label="Allow Delegation"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={step.requireComments || false}
                    onChange={(e) => updateStep(index, 'requireComments', e.target.checked)}
                  />
                }
                label="Require Comments"
              />
            </Box>
          </Grid>
          
          {/* Conditions Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Conditions
            </Typography>
            {conditions.map((condition, condIndex) => (
              <Box key={condition.id || condIndex} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Field"
                      size="small"
                      value={condition.field || ''}
                      onChange={(e) => updateCondition(index, condIndex, 'field', e.target.value || '')}
                      placeholder="e.g., risk_score"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={condition.operator || 'equals'}
                        onChange={(e) => updateCondition(index, condIndex, 'operator', e.target.value || 'equals')}
                        label="Operator"
                      >
                        <MenuItem value="equals">Equals</MenuItem>
                        <MenuItem value="not_equals">Not Equals</MenuItem>
                        <MenuItem value="greater_than">Greater Than</MenuItem>
                        <MenuItem value="less_than">Less Than</MenuItem>
                        <MenuItem value="contains">Contains</MenuItem>
                        <MenuItem value="not_contains">Not Contains</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Value"
                      size="small"
                      value={condition.value || ''}
                      onChange={(e) => updateCondition(index, condIndex, 'value', e.target.value || '')}
                      placeholder="e.g., 10"
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Logic</InputLabel>
                      <Select
                        value={condition.logicalOperator || 'and'}
                        onChange={(e) => updateCondition(index, condIndex, 'logicalOperator', e.target.value || 'and')}
                        label="Logic"
                      >
                        <MenuItem value="and">AND</MenuItem>
                        <MenuItem value="or">OR</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeCondition(index, condIndex)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addCondition(index)}
              sx={{ mt: 1 }}
            >
              Add Condition
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Paginated workflows
  const paginatedWorkflows = Array.isArray(workflows) 
    ? workflows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={3}>
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'primary.main', 
                borderRadius: 2,
                color: 'white'
              }}>
                <SettingsIcon sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Workflow Configuration
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Configure approval workflows for various modules
                </Typography>
                <Typography variant="caption" color="primary">
                  {workflows.length} workflows configured • {workflows.filter(w => w.isActive).length} active
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="large"
              sx={{ borderRadius: 2 }}
              onClick={() => {
                setEditingWorkflow(null);
                resetForm();
                setOpenDialog(true);
              }}
            >
              New Workflow
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Workflows Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Configured Workflows
            </Typography>
          </Box>
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="textSecondary">
                Loading workflows...
              </Typography>
            </Box>
          ) : !Array.isArray(workflows) || workflows.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No workflows configured yet. Create your first workflow!
            </Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Module</strong></TableCell>
                      <TableCell><strong>Trigger</strong></TableCell>
                      <TableCell><strong>Approval Level</strong></TableCell>
                      <TableCell><strong>Steps</strong></TableCell>
                      <TableCell><strong>Created By</strong></TableCell>
                      <TableCell><strong>Last Updated</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedWorkflows.map((workflow) => (
                      <TableRow key={workflow.id} hover>
                        <TableCell>
                          <Chip 
                            label={workflow.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={workflow.isActive ? 'success' : 'default'}
                            onClick={() => toggleWorkflowStatus(workflow)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {workflow.name}
                          </Typography>
                          {workflow.description && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                              {workflow.description.substring(0, 50)}...
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={modules.find(m => m.value === workflow.module)?.label || workflow.module} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">
                            {triggerTypes.find(t => t.value === workflow.triggerType)?.label || workflow.triggerType}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">
                            {approvalLevels.find(l => l.value === workflow.approvalLevel)?.label || workflow.approvalLevel}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">
                            {Array.isArray(workflow.steps) ? workflow.steps.length : 0} steps
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">
                            {workflow.createdBy}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">
                            {workflow.updatedAt?.toDate 
                              ? workflow.updatedAt.toDate().toLocaleDateString() 
                              : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="Edit">
                              <IconButton 
                                color="primary"
                                size="small"
                                onClick={() => handleEdit(workflow)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Clone">
                              <IconButton 
                                color="info"
                                size="small"
                                onClick={() => handleClone(workflow)}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton 
                                color="error" 
                                size="small"
                                onClick={() => handleDelete(workflow.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={Array.isArray(workflows) ? workflows.length : 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Rows per page:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} of ${count} workflows`
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setEditingWorkflow(null);
          resetForm();
        }}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { minHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon />
            {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
              <Tab label="Basic Info" />
              <Tab label="Approval Steps" />
              <Tab label="Advanced Settings" />
            </Tabs>

            {/* Tab 1: Basic Info */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Workflow Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value || '' })}
                    placeholder="e.g., High Risk Assessment Approval"
                    required
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Module *</InputLabel>
                    <Select
                      value={formData.module}
                      label="Module *"
                      onChange={(e) => setFormData({ ...formData, module: e.target.value || '' })}
                      required
                    >
                      {modules.map((module) => (
                        <MenuItem key={module.value} value={module.value}>
                          {module.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value || '' })}
                    placeholder="Describe what this workflow does..."
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Trigger Type</InputLabel>
                    <Select
                      value={formData.triggerType}
                      label="Trigger Type"
                      onChange={(e) => setFormData({ ...formData, triggerType: e.target.value || 'manual' })}
                    >
                      {triggerTypes.map((trigger) => (
                        <MenuItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Approval Level</InputLabel>
                    <Select
                      value={formData.approvalLevel}
                      label="Approval Level"
                      onChange={(e) => setFormData({ ...formData, approvalLevel: e.target.value || 'single' })}
                    >
                      {approvalLevels.map((level) => (
                        <MenuItem key={level.value} value={level.value}>
                          {level.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Grid>
              </Grid>
            )}

            {/* Tab 2: Approval Steps */}
            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Approval Steps ({steps.length})
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addStep}
                  >
                    Add Step
                  </Button>
                </Box>
                
                {steps.length === 0 ? (
                  <Alert severity="info">
                    No approval steps defined. Add at least one step to create the workflow.
                  </Alert>
                ) : (
                  <Stepper orientation="vertical">
                    {steps.map((step, index) => (
                      <Step key={step.id} active>
                        <StepLabel>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography fontWeight="medium">
                              Step {step.order}: {step.role ? step.role.replace('_', ' ') : 'Select Role'}
                            </Typography>
                            <Box display="flex" gap={0.5}>
                              <Tooltip title="Move Up">
                                <IconButton 
                                  size="small" 
                                  onClick={() => moveStepUp(index)}
                                  disabled={index === 0}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Move Down">
                                <IconButton 
                                  size="small" 
                                  onClick={() => moveStepDown(index)}
                                  disabled={index === steps.length - 1}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Step">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => removeStep(index)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </StepLabel>
                        <StepContent>
                          {renderStepContent(step, index)}
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                )}
              </Box>
            )}

            {/* Tab 3: Advanced Settings */}
            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Timeout & Escalation
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Default Timeout (Hours)"
                    type="number"
                    value={formData.timeoutHours}
                    onChange={(e) => setFormData({ ...formData, timeoutHours: parseInt(e.target.value) || 24 })}
                    InputProps={{ inputProps: { min: 1, max: 720 } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.notifyOnTimeout}
                        onChange={(e) => setFormData({ ...formData, notifyOnTimeout: e.target.checked })}
                      />
                    }
                    label="Notify on Timeout"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.autoEscalate}
                        onChange={(e) => setFormData({ ...formData, autoEscalate: e.target.checked })}
                      />
                    }
                    label="Auto Escalate"
                  />
                </Grid>
                
                {formData.autoEscalate && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Escalation After (Hours)"
                      type="number"
                      value={formData.escalationHours}
                      onChange={(e) => setFormData({ ...formData, escalationHours: parseInt(e.target.value) || 48 })}
                      InputProps={{ inputProps: { min: 1, max: 720 } }}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Notification Settings
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.notifyOnApproval}
                        onChange={(e) => setFormData({ ...formData, notifyOnApproval: e.target.checked })}
                      />
                    }
                    label="Notify on Approval"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Submission Settings
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requireAttachments}
                        onChange={(e) => setFormData({ ...formData, requireAttachments: e.target.checked })}
                      />
                    }
                    label="Require Attachments"
                  />
                </Grid>
                
                {formData.requireAttachments && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Attachments"
                      type="number"
                      value={formData.maxAttachments}
                      onChange={(e) => setFormData({ ...formData, maxAttachments: parseInt(e.target.value) || 5 })}
                      InputProps={{ inputProps: { min: 1, max: 20 } }}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allowComments}
                        onChange={(e) => setFormData({ ...formData, allowComments: e.target.checked })}
                      />
                    }
                    label="Allow Comments"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allowRejectionReason}
                        onChange={(e) => setFormData({ ...formData, allowRejectionReason: e.target.checked })}
                      />
                    }
                    label="Require Rejection Reason"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enableRevision}
                        onChange={(e) => setFormData({ ...formData, enableRevision: e.target.checked })}
                      />
                    }
                    label="Enable Revision Requests"
                  />
                </Grid>
                
                {formData.enableRevision && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Revisions"
                      type="number"
                      value={formData.maxRevisions}
                      onChange={(e) => setFormData({ ...formData, maxRevisions: parseInt(e.target.value) || 3 })}
                      InputProps={{ inputProps: { min: 1, max: 10 } }}
                    />
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setEditingWorkflow(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.module || steps.length === 0}
          >
            {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkflowConfig;