import { Timestamp } from 'firebase/firestore';

export const mockDataService = {
  // Mock Controls Data
  getMockControls: () => [
    {
      id: 'control-1',
      name: 'User Access Review',
      description: 'Quarterly review of user access rights and permissions',
      category: 'IT General Controls',
      controlType: 'detective',
      frequency: 'quarterly',
      owner: 'IT Security Manager',
      objective: 'Ensure appropriate user access rights are maintained',
      testProcedure: 'Sample 25 users and verify access matches job responsibilities',
      designEffectiveness: 'effective',
      operatingEffectiveness: 'partially_effective',
      isActive: true,
      organizationId: 'org-001',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'control-2',
      name: 'System Backup Verification',
      description: 'Monthly verification of system backups completeness and restorability',
      category: 'IT Operations',
      controlType: 'preventive',
      frequency: 'monthly',
      owner: 'IT Operations Manager',
      objective: 'Ensure business continuity through reliable backups',
      testProcedure: 'Perform test restore of critical systems and verify data integrity',
      designEffectiveness: 'effective',
      operatingEffectiveness: 'effective',
      isActive: true,
      organizationId: 'org-001',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'control-3',
      name: 'Vendor Risk Assessment',
      description: 'Annual assessment of third-party vendor risks',
      category: 'Third Party Risk',
      controlType: 'preventive',
      frequency: 'annually',
      owner: 'Procurement Manager',
      objective: 'Manage risks associated with third-party vendors',
      testProcedure: 'Review vendor contracts, security assessments, and performance reports',
      designEffectiveness: 'partially_effective',
      operatingEffectiveness: 'not_effective',
      isActive: true,
      organizationId: 'org-001',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'control-4',
      name: 'Financial Reconciliation',
      description: 'Monthly reconciliation of financial accounts',
      category: 'Financial Controls',
      controlType: 'detective',
      frequency: 'monthly',
      owner: 'Finance Manager',
      objective: 'Ensure accuracy of financial reporting',
      testProcedure: 'Verify reconciliation documents and follow up on discrepancies',
      designEffectiveness: 'effective',
      operatingEffectiveness: 'effective',
      isActive: true,
      organizationId: 'org-001',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ],

  // Mock Testing Schedules
  getMockTestingSchedules: () => [
    {
      id: 'schedule-1',
      controlId: 'control-1',
      controlName: 'User Access Review',
      scheduledDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 1 week from now
      assignedTo: 'Internal Audit Team',
      testType: 'operating',
      status: 'scheduled',
      notes: 'Q4 2024 access review',
      createdAt: Timestamp.now()
    },
    {
      id: 'schedule-2',
      controlId: 'control-2',
      controlName: 'System Backup Verification',
      scheduledDate: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3 days from now
      assignedTo: 'IT Operations Team',
      testType: 'both',
      status: 'in_progress',
      notes: 'Monthly backup test for critical systems',
      createdAt: Timestamp.now()
    }
  ],

  // Mock Test Results
  getMockTestResults: () => [
    {
      id: 'result-1',
      controlId: 'control-1',
      controlName: 'User Access Review',
      testDate: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
      testedBy: 'Auditor John Doe',
      testType: 'design',
      result: 'effective',
      effectivenessRating: 4,
      sampleSize: '25 users',
      exceptionsFound: 2,
      notes: 'Control design is adequate, minor exceptions found in user documentation',
      evidence: 'Access review reports Q3 2024',
      status: 'completed',
      createdAt: Timestamp.now()
    },
    {
      id: 'result-2',
      controlId: 'control-3',
      controlName: 'Vendor Risk Assessment',
      testDate: Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)), // 15 days ago
      testedBy: 'Risk Manager Jane Smith',
      testType: 'operating',
      result: 'not_effective',
      effectivenessRating: 2,
      sampleSize: '10 vendors',
      exceptionsFound: 5,
      notes: 'Vendor assessment process not consistently followed across departments',
      evidence: 'Vendor assessment files 2024',
      status: 'completed',
      createdAt: Timestamp.now()
    }
  ],

  // Mock Deficiencies
  getMockDeficiencies: () => [
    {
      id: 'def-1',
      title: 'Inconsistent Vendor Risk Assessment',
      description: 'Vendor risk assessment process not consistently applied across all departments, leading to unassessed third-party risks',
      controlId: 'control-3',
      controlName: 'Vendor Risk Assessment',
      testResultId: 'result-2',
      severity: 'high',
      category: 'Process Gap',
      riskImpact: 'Potential third-party security breaches and compliance violations',
      rootCause: 'Lack of centralized process and accountability',
      recommendation: 'Implement standardized vendor assessment framework with clear ownership',
      status: 'open',
      assignedTo: 'Procurement Manager',
      identifiedDate: Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
      targetDate: Timestamp.fromDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)),
      daysOpen: 15,
      organizationId: 'org-001',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'def-2',
      title: 'Inadequate User Access Documentation',
      description: 'User access approval documentation incomplete for 8% of sampled users',
      controlId: 'control-1',
      controlName: 'User Access Review',
      testResultId: 'result-1',
      severity: 'medium',
      category: 'Documentation Issue',
      riskImpact: 'Difficulty in auditing and potential unauthorized access',
      rootCause: 'Manual process prone to human error',
      recommendation: 'Implement automated access request and approval workflow',
      status: 'in_progress',
      assignedTo: 'IT Security Manager',
      identifiedDate: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      targetDate: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
      daysOpen: 30,
      organizationId: 'org-001',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ],

  // Mock KRI Data
  getMockKRIs: () => [
    {
      id: 'kri-1',
      name: 'IT Security Incident Rate',
      description: 'Number of security incidents per month',
      category: 'Cybersecurity',
      unit: 'Count',
      frequency: 'monthly',
      targetValue: 0,
      currentValue: 3,
      thresholds: {
        low: 2,
        medium: 5,
        high: 10,
        critical: 15
      },
      status: 'medium',
      trend: 'stable',
      organizationId: 'org-001',
      isActive: true,
      createdAt: Timestamp.now()
    },
    {
      id: 'kri-2',
      name: 'Budget Variance',
      description: 'Percentage variance from approved budget',
      category: 'Financial',
      unit: 'Percentage',
      frequency: 'monthly',
      targetValue: 0,
      currentValue: -4.5,
      thresholds: {
        low: -5,
        medium: -10,
        high: -15,
        critical: -20
      },
      status: 'low',
      trend: 'improving',
      organizationId: 'org-001',
      isActive: true,
      createdAt: Timestamp.now()
    }
  ],

  // Mock Risk Appetite Statements
  getMockRiskAppetite: () => [
    {
      id: 'appetite-1',
      riskCategory: 'Cybersecurity Risk',
      statement: 'We maintain zero tolerance for cybersecurity breaches that could compromise customer data or critical systems. We accept minimal risk in well-controlled environments with robust monitoring.',
      toleranceLevels: {
        low: { min: 0, max: 2 },
        medium: { min: 2, max: 3 },
        high: { min: 3, max: 5 }
      },
      escalationProcess: 'Immediate reporting to CISO and Risk Committee for any high-risk findings',
      organizationId: 'org-001',
      isActive: true,
      createdAt: Timestamp.now()
    },
    {
      id: 'appetite-2',
      riskCategory: 'Financial Risk',
      statement: 'We maintain conservative financial risk appetite with strict controls over budget variances and financial reporting accuracy.',
      toleranceLevels: {
        low: { min: 0, max: 1 },
        medium: { min: 1, max: 3 },
        high: { min: 3, max: 5 }
      },
      escalationProcess: 'Monthly reporting to CFO, immediate escalation for variances >10%',
      organizationId: 'org-001',
      isActive: true,
      createdAt: Timestamp.now()
    }
  ]
};