// File: src/components/Approval/ApprovalWorkflow.js - BUAT FILE BARU

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  Card,
  CardContent,
  Alert,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Pending,
  Schedule,
  Person
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES, APPROVAL_MATRIX, canApproveRisk } from '../../config/roles';

const ApprovalWorkflow = ({ riskData, currentApprovals = [], onApprove, onReject }) => {
  const { currentUser } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  // Get risk level text
  const getRiskLevelText = (level) => {
    const levels = {
      'LOW': 'Rendah',
      'MEDIUM': 'Sedang', 
      'HIGH': 'Tinggi',
      'CRITICAL': 'Kritis'
    };
    return levels[level] || level;
  };

  // Get required approval steps
  const getApprovalSteps = () => {
    return APPROVAL_MATRIX[riskData?.level] || [];
  };

  const approvalSteps = getApprovalSteps();

  // Check if step is completed
  const isStepCompleted = (stepRole) => {
    return currentApprovals.some(approval => approval.role === stepRole && approval.status === 'approved');
  };

  // Check if step is in progress (current user can approve)
  const isStepInProgress = (stepRole) => {
    return currentUser.role === stepRole && 
           canApproveRisk(currentUser.role, riskData.level) &&
           !isStepCompleted(stepRole);
  };

  // Get step status
  const getStepStatus = (stepRole) => {
    if (isStepCompleted(stepRole)) return 'completed';
    if (isStepInProgress(stepRole)) return 'in-progress';
    return 'pending';
  };

  // Handle approve action
  const handleApprove = (stepRole) => {
    if (onApprove) {
      onApprove({
        role: stepRole,
        approvedBy: currentUser.name || currentUser.email,
        userId: currentUser.uid,
        timestamp: new Date().toISOString(),
        riskId: riskData.id,
        riskLevel: riskData.level,
        action: 'approved'
      });
    }
  };

  // Handle reject action
  const handleReject = (stepRole) => {
    if (onReject) {
      onReject({
        role: stepRole,
        rejectedBy: currentUser.name || currentUser.email,
        userId: currentUser.uid,
        timestamp: new Date().toISOString(),
        riskId: riskData.id,
        riskLevel: riskData.level,
        action: 'rejected',
        comments: 'Risk assessment ditolak'
      });
    }
  };

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="primary" />
          Approval Workflow
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          Risk <strong>{getRiskLevelText(riskData.level)}</strong> membutuhkan approval dari:
        </Alert>

        <Stepper activeStep={activeStep} orientation="vertical">
          {approvalSteps.map((step, index) => {
            const stepStatus = getStepStatus(step.role);
            const isCompleted = isStepCompleted(step.role);
            const canApprove = isStepInProgress(step.role);

            return (
              <Step key={step.role} completed={isCompleted}>
                <StepLabel
                  icon={
                    <Box sx={{ position: 'relative' }}>
                      {isCompleted ? (
                        <CheckCircle color="success" />
                      ) : canApprove ? (
                        <Pending color="warning" />
                      ) : (
                        <Schedule color="disabled" />
                      )}
                    </Box>
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {ROLES[step.role]?.name}
                    </Typography>
                    <Chip 
                      label={stepStatus === 'completed' ? 'Approved' : 
                             stepStatus === 'in-progress' ? 'Menunggu' : 'Pending'}
                      color={stepStatus === 'completed' ? 'success' : 
                             stepStatus === 'in-progress' ? 'warning' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {step.action}
                  </Typography>
                </StepLabel>
                
                <StepContent>
                  {stepStatus === 'in-progress' && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Anda sebagai <strong>{ROLES[step.role]?.name}</strong> dapat:
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => handleApprove(step.role)}
                        >
                          Setujui Assessment
                        </Button>
                        
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Person />}
                          onClick={() => handleReject(step.role)}
                        >
                          Tolak & Kembalikan
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {stepStatus === 'completed' && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="success.main">
                        ✅ Telah disetujui oleh:{' '}
                        {currentApprovals
                          .filter(a => a.role === step.role && a.status === 'approved')
                          .map(approval => approval.approvedBy)
                          .join(', ')}
                      </Typography>
                    </Box>
                  )}

                  {stepStatus === 'pending' && !isCompleted && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Menunggu approval dari {ROLES[step.role]?.name}
                    </Typography>
                  )}
                </StepContent>
              </Step>
            );
          })}
        </Stepper>

        {/* Approval History */}
        {currentApprovals.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Riwayat Approval:
            </Typography>
            <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
              {currentApprovals.map((approval, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {approval.status === 'approved' ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <Person fontSize="small" color="error" />
                  )}
                  <Typography variant="caption">
                    <strong>{ROLES[approval.role]?.name}</strong> - {approval.approvedBy || approval.rejectedBy}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ({new Date(approval.timestamp).toLocaleDateString('id-ID')})
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ApprovalWorkflow;