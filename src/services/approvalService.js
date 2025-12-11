// src/services/approvalService.js
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';

class ApprovalService {
  // ========== WORKFLOW CONFIGURATION ==========
  async createWorkflow(workflowData) {
    try {
      const workflowRef = doc(collection(db, 'workflows'));
      const workflow = {
        id: workflowRef.id,
        ...workflowData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true
      };
      await setDoc(workflowRef, workflow);
      return workflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  async getWorkflow(workflowId) {
    try {
      const workflowRef = doc(db, 'workflows', workflowId);
      const snapshot = await getDoc(workflowRef);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      console.error('Error getting workflow:', error);
      throw error;
    }
  }

  async getAllWorkflows() {
    try {
      const workflowsRef = collection(db, 'workflows');
      const q = query(workflowsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting workflows:', error);
      throw error;
    }
  }

  async updateWorkflow(workflowId, updates) {
    try {
      const workflowRef = doc(db, 'workflows', workflowId);
      await updateDoc(workflowRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      return await this.getWorkflow(workflowId);
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }

  // ========== APPROVAL REQUESTS ==========
  async createApprovalRequest(requestData) {
    try {
      const requestRef = doc(collection(db, 'approvalRequests'));
      const request = {
        id: requestRef.id,
        ...requestData,
        status: 'pending',
        currentLevel: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        history: []
      };
      await setDoc(requestRef, request);
      
      // Send notification to first approver
      await this.sendNotification(request, 'new_request');
      
      return request;
    } catch (error) {
      console.error('Error creating approval request:', error);
      throw error;
    }
  }

  async getApprovalRequest(requestId) {
    try {
      const requestRef = doc(db, 'approvalRequests', requestId);
      const snapshot = await getDoc(requestRef);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      console.error('Error getting approval request:', error);
      throw error;
    }
  }

  async getPendingApprovals(userId) {
    try {
      const requestsRef = collection(db, 'approvalRequests');
      const q = query(
        requestsRef,
        where('status', '==', 'pending'),
        where('currentApproverId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  async getMyRequests(userId) {
    try {
      const requestsRef = collection(db, 'approvalRequests');
      const q = query(
        requestsRef,
        where('requesterId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting my requests:', error);
      throw error;
    }
  }

  // ========== APPROVAL ACTIONS ==========
  async approveRequest(requestId, approverId, comment = '') {
    try {
      const requestRef = doc(db, 'approvalRequests', requestId);
      const request = await this.getApprovalRequest(requestId);
      
      if (!request) throw new Error('Request not found');
      
      const workflow = await this.getWorkflow(request.workflowId);
      const historyEntry = {
        action: 'approved',
        approverId,
        comment,
        timestamp: Timestamp.now(),
        level: request.currentLevel
      };
      
      // Check if this is the final approval
      if (request.currentLevel >= workflow.config.totalLevels) {
        // Final approval
        await updateDoc(requestRef, {
          status: 'approved',
          approvedAt: Timestamp.now(),
          history: arrayUnion(historyEntry),
          updatedAt: Timestamp.now()
        });
        
        // Update document status in respective collection
        await this.updateDocumentStatus(request.documentType, request.documentId, 'approved');
        
        // Send notification to requester
        await this.sendNotification(request, 'approved');
      } else {
        // Move to next level
        const nextApprover = workflow.config.approvers[request.currentLevel];
        await updateDoc(requestRef, {
          currentLevel: request.currentLevel + 1,
          currentApproverId: nextApprover.id,
          currentApproverName: nextApprover.name,
          history: arrayUnion(historyEntry),
          updatedAt: Timestamp.now()
        });
        
        // Send notification to next approver
        await this.sendNotification(request, 'next_level', nextApprover);
      }
      
      return await this.getApprovalRequest(requestId);
    } catch (error) {
      console.error('Error approving request:', error);
      throw error;
    }
  }

  async rejectRequest(requestId, approverId, reason) {
    try {
      const requestRef = doc(db, 'approvalRequests', requestId);
      const historyEntry = {
        action: 'rejected',
        approverId,
        comment: reason,
        timestamp: Timestamp.now(),
        level: request.currentLevel
      };
      
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: Timestamp.now(),
        history: arrayUnion(historyEntry),
        updatedAt: Timestamp.now()
      });
      
      const request = await this.getApprovalRequest(requestId);
      // Send notification to requester
      await this.sendNotification(request, 'rejected');
      
      return request;
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  }

  async resubmitRequest(requestId, updates) {
    try {
      const requestRef = doc(db, 'approvalRequests', requestId);
      const request = await this.getApprovalRequest(requestId);
      const workflow = await this.getWorkflow(request.workflowId);
      
      const historyEntry = {
        action: 'resubmitted',
        timestamp: Timestamp.now(),
        comment: updates.resubmissionNotes || 'Request resubmitted'
      };
      
      await updateDoc(requestRef, {
        status: 'pending',
        currentLevel: 1,
        currentApproverId: workflow.config.approvers[0].id,
        currentApproverName: workflow.config.approvers[0].name,
        history: arrayUnion(historyEntry),
        ...updates,
        updatedAt: Timestamp.now()
      });
      
      // Send notification to first approver
      await this.sendNotification(request, 'resubmitted');
      
      return await this.getApprovalRequest(requestId);
    } catch (error) {
      console.error('Error resubmitting request:', error);
      throw error;
    }
  }

  // ========== NOTIFICATIONS ==========
  async sendNotification(request, type, nextApprover = null) {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      let message = '';
      let recipientId = '';
      
      switch (type) {
        case 'new_request':
          message = `New approval request for ${request.documentType}`;
          recipientId = request.currentApproverId;
          break;
        case 'approved':
          message = `Your ${request.documentType} has been approved`;
          recipientId = request.requesterId;
          break;
        case 'rejected':
          message = `Your ${request.documentType} has been rejected`;
          recipientId = request.requesterId;
          break;
        case 'next_level':
          message = `Approval request requires your attention`;
          recipientId = nextApprover.id;
          break;
        case 'escalation':
          message = `Escalation: Approval request is pending`;
          recipientId = request.escalationApproverId;
          break;
      }
      
      const notification = {
        id: notificationRef.id,
        type: 'approval',
        recipientId,
        message,
        requestId: request.id,
        documentType: request.documentType,
        documentId: request.documentId,
        isRead: false,
        createdAt: Timestamp.now()
      };
      
      await setDoc(notificationRef, notification);
      
      // TODO: Send email notification
      await this.sendEmailNotification(recipientId, message);
      
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async sendEmailNotification(userId, message) {
    // Implement email sending logic here
    // Could use Nodemailer, SendGrid, etc.
    console.log(`Email sent to ${userId}: ${message}`);
  }

  // ========== ESCALATION ==========
  async checkForEscalations() {
    try {
      const requestsRef = collection(db, 'approvalRequests');
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const q = query(
        requestsRef,
        where('status', '==', 'pending'),
        where('updatedAt', '<=', Timestamp.fromDate(twentyFourHoursAgo))
      );
      
      const snapshot = await getDocs(q);
      const overdueRequests = snapshot.docs.map(doc => doc.data());
      
      // Escalate each overdue request
      for (const request of overdueRequests) {
        await this.escalateRequest(request.id);
      }
      
      return overdueRequests.length;
    } catch (error) {
      console.error('Error checking for escalations:', error);
      throw error;
    }
  }

  async escalateRequest(requestId) {
    try {
      const requestRef = doc(db, 'approvalRequests', requestId);
      const request = await this.getApprovalRequest(requestId);
      const workflow = await this.getWorkflow(request.workflowId);
      
      if (!workflow.config.escalation) return;
      
      const historyEntry = {
        action: 'escalated',
        timestamp: Timestamp.now(),
        comment: 'Request escalated due to pending approval'
      };
      
      await updateDoc(requestRef, {
        escalationApproverId: workflow.config.escalation.approverId,
        escalationApproverName: workflow.config.escalation.approverName,
        history: arrayUnion(historyEntry),
        updatedAt: Timestamp.now()
      });
      
      // Send notification to escalation approver
      await this.sendNotification(request, 'escalation');
      
      return request;
    } catch (error) {
      console.error('Error escalating request:', error);
      throw error;
    }
  }

  // ========== DOCUMENT STATUS UPDATE ==========
  async updateDocumentStatus(documentType, documentId, status) {
    try {
      let collectionName = '';
      
      switch (documentType) {
        case 'risk_assessment':
          collectionName = 'riskAssessments';
          break;
        case 'treatment_plan':
          collectionName = 'treatmentPlans';
          break;
        case 'incident_report':
          collectionName = 'incidentReports';
          break;
        case 'control_test':
          collectionName = 'controlTests';
          break;
        default:
          collectionName = documentType + 's';
      }
      
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, {
        approvalStatus: status,
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  // ========== DASHBOARD DATA ==========
  async getApprovalStats(userId) {
    try {
      const [pending, myRequests, approvalsHistory] = await Promise.all([
        this.getPendingApprovals(userId),
        this.getMyRequests(userId),
        this.getApprovalHistory(userId)
      ]);
      
      const stats = {
        pendingCount: pending.length,
        myPendingCount: myRequests.filter(r => r.status === 'pending').length,
        approvedCount: approvalsHistory.filter(r => r.status === 'approved').length,
        rejectedCount: approvalsHistory.filter(r => r.status === 'rejected').length,
        totalProcessingTime: this.calculateAverageProcessingTime(approvalsHistory)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting approval stats:', error);
      throw error;
    }
  }

  async getApprovalHistory(userId) {
    try {
      const requestsRef = collection(db, 'approvalRequests');
      const q = query(
        requestsRef,
        where('requesterId', '==', userId),
        orderBy('createdAt', 'desc'),
        where('status', 'in', ['approved', 'rejected'])
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting approval history:', error);
      throw error;
    }
  }

  calculateAverageProcessingTime(requests) {
    if (requests.length === 0) return 0;
    
    const totalTime = requests.reduce((sum, request) => {
      if (request.approvedAt && request.createdAt) {
        const created = request.createdAt.toDate();
        const approved = request.approvedAt.toDate();
        return sum + (approved - created);
      }
      return sum;
    }, 0);
    
    return Math.round(totalTime / requests.length / (1000 * 60 * 60)); // Convert to hours
  }
}

export default new ApprovalService();