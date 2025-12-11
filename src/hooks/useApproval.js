// src/hooks/useApproval.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  arrayUnion 
} from 'firebase/firestore';
import { db } from '../config/firebase'; // Pastikan path ini benar
import { useState, useCallback } from 'react';
import ApprovalService from '../services/approvalService';

export const useApprovalActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitForApproval = useCallback(async (documentData) => {
    try {
      setLoading(true);
      setError(null);
      
      const workflow = await ApprovalService.getWorkflow(documentData.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const firstApprover = workflow.config.approvers[0];
      
      const requestData = {
        ...documentData,
        currentApproverId: firstApprover.id,
        currentApproverName: firstApprover.name,
        workflowName: workflow.name,
        status: 'pending',
        currentLevel: 1
      };

      const result = await ApprovalService.createApprovalRequest(requestData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const batchSubmitForApproval = useCallback(async (documents) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await Promise.all(
        documents.map(doc => submitForApproval(doc))
      );
      
      return results;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [submitForApproval]);

  const checkApprovalStatus = useCallback(async (documentType, documentId) => {
    try {
      setLoading(true);
      setError(null);
      
      const requestsRef = collection(db, 'approvalRequests');
      const q = query(
        requestsRef,
        where('documentType', '==', documentType),
        where('documentId', '==', documentId)
      );
      
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => doc.data());
      
      return requests;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getApprovalMatrix = useCallback(async (workflowId) => {
    try {
      setLoading(true);
      setError(null);
      
      const workflow = await ApprovalService.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Get statistics for each approver
      const matrixData = await Promise.all(
        workflow.config.approvers.map(async (approver, level) => {
          const requestsRef = collection(db, 'approvalRequests');
          const q = query(
            requestsRef,
            where('workflowId', '==', workflowId),
            where('currentLevel', '==', level + 1)
          );
          
          const snapshot = await getDocs(q);
          const requests = snapshot.docs.map(doc => doc.data());
          
          return {
            level: level + 1,
            approver,
            pendingCount: requests.filter(r => r.status === 'pending').length,
            approvedCount: requests.filter(r => r.status === 'approved').length,
            rejectedCount: requests.filter(r => r.status === 'rejected').length,
            avgProcessingTime: calculateAverageTime(requests)
          };
        })
      );
      
      return matrixData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateAverageTime = (requests) => {
    const approvedRequests = requests.filter(r => r.status === 'approved' && r.approvedAt);
    if (approvedRequests.length === 0) return 0;
    
    const totalTime = approvedRequests.reduce((sum, request) => {
      const created = request.createdAt.toDate();
      const approved = request.approvedAt.toDate();
      return sum + (approved - created);
    }, 0);
    
    return Math.round(totalTime / approvedRequests.length / (1000 * 60 * 60)); // hours
  };

  const sendReminder = useCallback(async (requestId, approverId) => {
    try {
      setLoading(true);
      setError(null);
      
      const request = await ApprovalService.getApprovalRequest(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      // Send reminder notification
      await ApprovalService.sendNotification(request, 'reminder');
      
      // Log reminder in history
      const requestRef = doc(db, 'approvalRequests', requestId);
      const historyEntry = {
        action: 'reminder_sent',
        timestamp: Timestamp.now(),
        comment: 'Reminder sent to approver'
      };
      
      await updateDoc(requestRef, {
        history: arrayUnion(historyEntry),
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const delegateApproval = useCallback(async (requestId, fromUserId, toUserId) => {
    try {
      setLoading(true);
      setError(null);
      
      const requestRef = doc(db, 'approvalRequests', requestId);
      const request = await ApprovalService.getApprovalRequest(requestId);
      
      if (!request || request.currentApproverId !== fromUserId) {
        throw new Error('Cannot delegate this request');
      }

      // Get user info for delegate
      const userRef = doc(db, 'users', toUserId);
      const userSnap = await getDoc(userRef);
      const delegateUser = userSnap.data();
      
      if (!delegateUser) {
        throw new Error('Delegate user not found');
      }

      const historyEntry = {
        action: 'delegated',
        approverId: fromUserId,
        delegateId: toUserId,
        comment: `Delegated to ${delegateUser.name}`,
        timestamp: Timestamp.now()
      };
      
      await updateDoc(requestRef, {
        currentApproverId: toUserId,
        currentApproverName: delegateUser.name,
        history: arrayUnion(historyEntry),
        updatedAt: Timestamp.now()
      });
      
      // Send notification to delegate
      await ApprovalService.sendNotification(request, 'delegated', delegateUser);
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    submitForApproval,
    batchSubmitForApproval,
    checkApprovalStatus,
    getApprovalMatrix,
    sendReminder,
    delegateApproval
  };
};