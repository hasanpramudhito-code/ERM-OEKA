import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { userData } = useAuth();

  const userRole = userData?.role || "STAFF";

  const displayRole = getDisplayRole(userRole);

  const permissions = {
    canViewControlTesting: ['ADMIN','DIRECTOR','RISK_MANAGER','RISK_OWNER','STAFF'].includes(userRole),
    canCreateControl: ['ADMIN','DIRECTOR','RISK_MANAGER'].includes(userRole),
    canEditControl: ['ADMIN','DIRECTOR','RISK_MANAGER'].includes(userRole),
    canDeleteControl: ['ADMIN','DIRECTOR'].includes(userRole),

    canViewRiskAssessment: ['ADMIN','DIRECTOR','RISK_MANAGER','RISK_OWNER','STAFF'].includes(userRole),
    canCreateRiskAssessment: ['ADMIN','DIRECTOR','RISK_MANAGER','RISK_OWNER'].includes(userRole),
    canEditRiskAssessment: ['ADMIN','DIRECTOR','RISK_MANAGER','RISK_OWNER'].includes(userRole),
    canApproveRiskAssessment: ['ADMIN','DIRECTOR','RISK_MANAGER'].includes(userRole),

    canViewKRIs: ['ADMIN','DIRECTOR','RISK_MANAGER','RISK_OWNER','STAFF'].includes(userRole),
    canCreateKRI: ['ADMIN','DIRECTOR','RISK_MANAGER'].includes(userRole),
    canEditKRI: ['ADMIN','DIRECTOR','RISK_MANAGER'].includes(userRole),

    canViewRiskAppetite: ['ADMIN','DIRECTOR','RISK_MANAGER','RISK_OWNER'].includes(userRole),
    canEditRiskAppetite: ['ADMIN','DIRECTOR','RISK_MANAGER'].includes(userRole),

    canViewUserManagement: ['ADMIN','DIRECTOR'].includes(userRole),
    canEditUsers: userRole === 'ADMIN',

    canViewSettings: ['ADMIN','DIRECTOR','RISK_MANAGER','RISK_OWNER','STAFF'].includes(userRole),
    canEditSettings: ['ADMIN','DIRECTOR'].includes(userRole)
  };

  return {
    userRole,
    displayRole,   // <-- INI YANG KURANG
    permissions,
    isAdmin: userRole === 'ADMIN',
    isDirector: userRole === 'DIRECTOR',
    isRiskManager: userRole === 'RISK_MANAGER',
    isRiskOwner: userRole === 'RISK_OWNER',
    isStaff: userRole === 'STAFF'
  };
};

const getDisplayRole = (role) => {
  const map = {
    ADMIN: "Administrator",
    DIRECTOR: "Director",
    RISK_MANAGER: "Risk Manager",
    RISK_OWNER: "Risk Owner",
    STAFF: "Staff",
  };
  return map[role] || "Staff";
};
