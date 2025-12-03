// File: src/utils/permissionDebug.js
import { 
  debugUserPermissions, 
  debugMenuAccess, 
  compareRoles,
  getAccessibleMenus,
  hasPermission 
} from '../config/roles';

export const debugCurrentUserPermissions = (userData) => {
  if (!userData) {
    console.log('❌ No user data found');
    return;
  }

  console.log('🔐 === USER PERMISSION DEBUG ===');
  console.log('👤 User:', userData.name, `(${userData.email})`);
  console.log('🏷️ Role from userData:', userData.role);
  console.log('📝 Full userData:', userData);

  // Debug permissions
  const roleInfo = debugUserPermissions(userData.role);
  
  // Debug menu access
  const menus = getAccessibleMenus(userData.role);
  console.log('📋 ACCESSIBLE MENUS:');
  Object.keys(menus).forEach(menu => {
    console.log(`${menus[menu] ? '✅' : '❌'} ${menu}: ${menus[menu]}`);
  });

  // Check specific permissions
  console.log('🎯 SPECIFIC PERMISSION CHECKS:');
  const permissionsToCheck = [
    'full_access',
    'system_management', 
    'user_management',
    'view_all',
    'manage_kris'
  ];
  
  permissionsToCheck.forEach(permission => {
    console.log(`   ${hasPermission(userData.role, permission) ? '✅' : '❌'} ${permission}`);
  });

  return { roleInfo, menus };
};

export const compareWithAdmin = (userRole) => {
  console.log('🔄 === COMPARISON WITH ADMIN ===');
  return compareRoles(userRole, 'ADMIN');
};