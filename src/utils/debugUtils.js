// src/utils/debugUtils.js
export const debugAuth = (userData, currentUser, location = 'Unknown') => {
  console.log(`🔐 AUTH DEBUG [${location}]:`);
  console.log('📍 Current User:', currentUser);
  console.log('📍 User Data:', userData);
  console.log('📍 Raw Role:', userData?.role);
  console.log('📍 User ID:', currentUser?.uid);
  console.log('📍 Location:', location);
  console.log('---');
};