// src/contexts/ApprovalContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';
import ApprovalService from '../services/approvalService';

const ApprovalContext = createContext();

export const useApproval = () => {
  const context = useContext(ApprovalContext);
  if (!context) {
    throw new Error('useApproval must be used within ApprovalProvider');
  }
  return context;
};

export const ApprovalProvider = ({ children }) => {
  const [workflows, setWorkflows] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [stats, setStats] = useState({
    pendingCount: 0,
    myPendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalProcessingTime: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshData = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const [workflowsData, pendingData, myRequestsData, statsData] = await Promise.all([
        ApprovalService.getAllWorkflows(),
        ApprovalService.getPendingApprovals(userId),
        ApprovalService.getMyRequests(userId),
        ApprovalService.getApprovalStats(userId)
      ]);
      
      setWorkflows(workflowsData);
      setPendingApprovals(pendingData);
      setMyRequests(myRequestsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
      console.error('Error refreshing approval data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflow = async (workflowData) => {
    try {
      setLoading(true);
      const result = await ApprovalService.createWorkflow(workflowData);
      setWorkflows(prev => [result, ...prev]);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitForApproval = async (requestData) => {
    try {
      setLoading(true);
      const result = await ApprovalService.createApprovalRequest(requestData);
      setMyRequests(prev => [result, ...prev]);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId, comment = '') => {
    try {
      setLoading(true);
      const result = await ApprovalService.approveRequest(requestId, comment);
      
      // Update local state
      setPendingApprovals(prev => prev.filter(req => req.id !== requestId));
      setMyRequests(prev => prev.map(req => 
        req.id === requestId ? result : req
      ));
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (requestId, reason) => {
    try {
      setLoading(true);
      const result = await ApprovalService.rejectRequest(requestId, reason);
      
      // Update local state
      setPendingApprovals(prev => prev.filter(req => req.id !== requestId));
      setMyRequests(prev => prev.map(req => 
        req.id === requestId ? result : req
      ));
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resubmitRequest = async (requestId, updates) => {
    try {
      setLoading(true);
      const result = await ApprovalService.resubmitRequest(requestId, updates);
      
      // Update local state
      setMyRequests(prev => prev.map(req => 
        req.id === requestId ? result : req
      ));
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkEscalations = async () => {
    try {
      return await ApprovalService.checkForEscalations();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    workflows,
    pendingApprovals,
    myRequests,
    stats,
    loading,
    error,
    refreshData,
    createWorkflow,
    submitForApproval,
    approveRequest,
    rejectRequest,
    resubmitRequest,
    checkEscalations
  };

  return (
    <ApprovalContext.Provider value={value}>
      {children}
    </ApprovalContext.Provider>
  );
};