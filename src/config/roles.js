// File: src/config/roles.js - VERSI LENGKAP DIPERBAIKI
export const ROLES = {
  STAFF: {
    code: 'STAFF',
    name: 'Staff',
    permissions: [
      'view_risks', 
      'submit_risks', 
      'view_own_data',
      'view_dashboard'
    ],
    approval_level: 0,
    can_approve: [],
    can_assess: false
  },
  
  RISK_OWNER: {
    code: 'RISK_OWNER',
    name: 'Risk Owner', 
    permissions: [
      'view_risks',
      'submit_risks',
      'assess_risks', 
      'review_risks',
      'view_reports',
      'manage_own_risks',
      'approve_low_risks'
    ],
    approval_level: 1,
    can_approve: ['LOW'],
    can_assess: true
  },
  
  RISK_MANAGER: {
    code: 'RISK_MANAGER',
    name: 'Risk Manager',
    permissions: [
      'view_all',
      'approve_risks',
      'manage_kris',
      'review_high_risks',
      'view_executive_dashboard',
      'manage_treatment_plans',
      'approve_medium_risks',
      'final_approval'
    ],
    approval_level: 2,
    can_approve: ['LOW', 'MEDIUM'],
    can_assess: true
  },
  
  DIRECTOR: {
    code: 'DIRECTOR',
    name: 'Director',
    permissions: [
      'full_access',
      'final_approval', 
      'executive_reports',
      'system_override',
      'approve_critical_risks',
      'view_audit_logs',
      'approve_all_risks'
    ],
    approval_level: 3,
    can_approve: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    can_assess: true
  },
  
  ADMIN: {
    code: 'ADMIN',
    name: 'Administrator',
    permissions: [
      'system_management',
      'user_management', 
      'audit_logs',
      'data_backup',
      'api_management',
      'full_access'
    ],
    approval_level: 4,
    can_approve: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    can_assess: true
  }
};

// ✅ APPROVAL MATRIX YANG LEBIH DETAIL
export const APPROVAL_MATRIX = {
  'LOW': [
    { role: 'RISK_OWNER', action: 'Review & Approve', required: true }
  ],
  'MEDIUM': [
    { role: 'RISK_OWNER', action: 'Review', required: true },
    { role: 'RISK_MANAGER', action: 'Approve', required: true }
  ],
  'HIGH': [
    { role: 'RISK_OWNER', action: 'Review', required: true },
    { role: 'RISK_MANAGER', action: 'Approve', required: true },
    { role: 'DIRECTOR', action: 'Final Approval', required: true }
  ],
  'CRITICAL': [
    { role: 'RISK_OWNER', action: 'Review', required: true },
    { role: 'RISK_MANAGER', action: 'Approve', required: true },
    { role: 'DIRECTOR', action: 'Final Approval', required: true }
  ]
};

// ✅ PERMISSION CHECK UTILITIES - DIPERBAIKI
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  const role = ROLES[userRole];
  if (!role) return false;
  
  // Jika user punya full_access, langsung return true
  if (role.permissions.includes('full_access')) return true;
  
  return role.permissions.includes(permission);
};

// ✅ FUNCTION BARU: Check multiple permissions sekaligus
export const hasAnyPermission = (userRole, permissions = []) => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

export const hasAllPermissions = (userRole, permissions = []) => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

// ✅ FUNCTION BARU: Get user's role object
export const getUserRole = (userRoleCode) => {
  return ROLES[userRoleCode] || null;
};

// ✅ FUNCTION BARU: Check if user has menu access
export const hasMenuAccess = (userRole, menuPermissions) => {
  if (!userRole || !menuPermissions) return false;
  
  const role = getUserRole(userRole);
  if (!role) return false;
  
  // Admin dan Director selalu punya akses penuh
  if (role.permissions.includes('full_access') || role.permissions.includes('system_management')) {
    return true;
  }
  
  // Check berdasarkan permissions yang required untuk menu tersebut
  return menuPermissions.some(permission => hasPermission(userRole, permission));
};

// ✅ FUNCTION BARU: Check menu access dengan multiple options
export const hasMenuAccessAdvanced = (userRole, menuConfig) => {
  if (!userRole || !menuConfig) return false;
  
  const role = getUserRole(userRole);
  if (!role) return false;
  
  // Jika menu membutuhkan full_access dan user punya full_access
  if (menuConfig.requiresFullAccess && role.permissions.includes('full_access')) {
    return true;
  }
  
  // Jika menu membutuhkan system_management dan user punya system_management
  if (menuConfig.requiresSystemManagement && role.permissions.includes('system_management')) {
    return true;
  }
  
  // Check permissions biasa
  if (menuConfig.requiredPermissions && menuConfig.requiredPermissions.length > 0) {
    return hasAnyPermission(userRole, menuConfig.requiredPermissions);
  }
  
  // Check any of permissions
  if (menuConfig.anyOfPermissions && menuConfig.anyOfPermissions.length > 0) {
    return hasAnyPermission(userRole, menuConfig.anyOfPermissions);
  }
  
  return false;
};

// ✅ PERBAIKI function canApproveRisk dengan handling yang lebih baik
export const canApproveRisk = (userRole, riskLevel) => {
  const role = getUserRole(userRole);
  if (!role) return false;
  
  // Admin dan Director bisa approve semua level risiko
  if (role.permissions.includes('full_access') || role.permissions.includes('approve_all_risks')) {
    return true;
  }
  
  return role.can_approve.includes(riskLevel);
};

export const canAssessRisks = (userRole) => {
  return ROLES[userRole]?.can_assess || false;
};

export const getRequiredApprovers = (riskLevel) => {
  return APPROVAL_MATRIX[riskLevel] || [];
};

// ✅ FUNCTION BARU: Get next approval step dalam workflow
export const getNextApprovalStep = (riskData, currentUser) => {
  const requiredApprovers = getRequiredApprovers(riskData.level);
  const userApprovalLevel = ROLES[currentUser?.role]?.approval_level || 0;
  
  return requiredApprovers.find(step => 
    ROLES[step.role]?.approval_level > userApprovalLevel
  );
};

// ✅ FUNCTION BARU: Untuk debugging permission issues
export const debugUserPermissions = (userRole) => {
  const role = getUserRole(userRole);
  if (!role) {
    console.warn(`❌ Role '${userRole}' tidak ditemukan dalam sistem`);
    return null;
  }
  
  console.log(`🔍 Debug Permissions untuk: ${role.name} (${userRole})`);
  console.log('📋 Permissions:', role.permissions);
  console.log('✅ Can Approve:', role.can_approve);
  console.log('📊 Approval Level:', role.approval_level);
  console.log('🎯 Can Assess:', role.can_assess);
  
  return role;
};

// ✅ FUNCTION BARU: Compare two roles
export const compareRoles = (role1, role2) => {
  const roleObj1 = getUserRole(role1);
  const roleObj2 = getUserRole(role2);
  
  return {
    samePermissions: JSON.stringify(roleObj1?.permissions) === JSON.stringify(roleObj2?.permissions),
    sameApprovalLevel: roleObj1?.approval_level === roleObj2?.approval_level,
    sameCanApprove: JSON.stringify(roleObj1?.can_approve) === JSON.stringify(roleObj2?.can_approve),
    role1: roleObj1,
    role2: roleObj2
  };
};

// ✅ FUNCTION BARU: Get all permissions for a role
export const getRolePermissions = (userRole) => {
  const role = getUserRole(userRole);
  return role ? role.permissions : [];
};

// ✅ FUNCTION BARU: Check if user can manage users
export const canManageUsers = (userRole) => {
  return hasPermission(userRole, 'user_management') || 
         hasPermission(userRole, 'system_management') || 
         hasPermission(userRole, 'full_access');
};

// ✅ FUNCTION BARU: Check if user can view audit logs
export const canViewAuditLogs = (userRole) => {
  return hasPermission(userRole, 'audit_logs') || 
         hasPermission(userRole, 'system_management') || 
         hasPermission(userRole, 'full_access');
};

// ✅ FUNCTION BARU: Check if user can manage system settings
export const canManageSystem = (userRole) => {
  return hasPermission(userRole, 'system_management') || 
         hasPermission(userRole, 'full_access');
};

// ✅ FUNCTION BARU: Get menu configuration untuk navigation
export const getMenuConfig = () => {
  return {
    dashboard: {
      label: 'Dashboard',
      requiredPermissions: ['view_dashboard', 'view_executive_dashboard', 'full_access'],
      anyOfPermissions: ['view_dashboard', 'view_executive_dashboard', 'full_access']
    },
    riskRegister: {
      label: 'Risk Register',
      requiredPermissions: ['view_risks', 'view_all', 'full_access'],
      anyOfPermissions: ['view_risks', 'view_all', 'full_access']
    },
    riskAssessment: {
      label: 'Risk Assessment',
      requiredPermissions: ['assess_risks', 'review_risks', 'full_access'],
      anyOfPermissions: ['assess_risks', 'review_risks', 'full_access']
    },
    treatmentPlans: {
      label: 'Treatment Plans',
      requiredPermissions: ['manage_treatment_plans', 'full_access'],
      anyOfPermissions: ['manage_treatment_plans', 'full_access']
    },
    reporting: {
      label: 'Reporting',
      requiredPermissions: ['view_reports', 'executive_reports', 'full_access'],
      anyOfPermissions: ['view_reports', 'executive_reports', 'full_access']
    },
    riskParameters: {
      label: 'Risk Parameters',
      requiredPermissions: ['system_management', 'full_access'],
      requiresSystemManagement: true
    },
    userManagement: {
      label: 'User Management',
      requiredPermissions: ['user_management', 'system_management', 'full_access'],
      requiresSystemManagement: true
    },
    systemSettings: {
      label: 'System Settings',
      requiredPermissions: ['system_management', 'full_access'],
      requiresSystemManagement: true
    },
    auditLogs: {
      label: 'Audit Logs',
      requiredPermissions: ['audit_logs', 'system_management', 'full_access'],
      requiresSystemManagement: true
    }
  };
};

// ✅ FUNCTION BARU: Check access untuk specific menu
export const canAccessMenu = (userRole, menuKey) => {
  const menuConfig = getMenuConfig();
  const config = menuConfig[menuKey];
  
  if (!config) {
    console.warn(`❌ Menu config untuk '${menuKey}' tidak ditemukan`);
    return false;
  }
  
  return hasMenuAccessAdvanced(userRole, config);
};

// ✅ FUNCTION BARU: Get accessible menus untuk user
export const getAccessibleMenus = (userRole) => {
  const menuConfig = getMenuConfig();
  const accessibleMenus = {};
  
  Object.keys(menuConfig).forEach(menuKey => {
    accessibleMenus[menuKey] = canAccessMenu(userRole, menuKey);
  });
  
  return accessibleMenus;
};

// ✅ FUNCTION BARU: Debug semua menu access untuk user
export const debugMenuAccess = (userRole) => {
  const accessibleMenus = getAccessibleMenus(userRole);
  const menuConfig = getMenuConfig();
  
  console.log(`🔍 Debug Menu Access untuk: ${userRole}`);
  console.log('📋 Available Menus:');
  
  Object.keys(accessibleMenus).forEach(menuKey => {
    const hasAccess = accessibleMenus[menuKey];
    const menu = menuConfig[menuKey];
    
    console.log(
      `${hasAccess ? '✅' : '❌'} ${menu.label}: ${hasAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'}`,
      `| Permissions: ${menu.requiredPermissions?.join(', ') || 'N/A'}`
    );
  });
  
  return accessibleMenus;
};

// ✅ EXPORT DEFAULT untuk compatibility
export default {
  ROLES,
  APPROVAL_MATRIX,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserRole,
  hasMenuAccess,
  hasMenuAccessAdvanced,
  canApproveRisk,
  canAssessRisks,
  getRequiredApprovers,
  getNextApprovalStep,
  debugUserPermissions,
  compareRoles,
  getRolePermissions,
  canManageUsers,
  canViewAuditLogs,
  canManageSystem,
  getMenuConfig,
  canAccessMenu,
  getAccessibleMenus,
  debugMenuAccess
};