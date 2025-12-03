// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const getEffectiveRole = () => {
    if (userData?.role) {
      return userData.role;
    }
    
    if (currentUser?.email === 'hasan.pramudhito@gmail.com') {
      return 'ADMIN';
    }
    
    return 'STAFF';
  };

  const userRole = getEffectiveRole();
  const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
        flexDirection="column"
      >
        <Typography variant="h5" color="error" gutterBottom>
          Access Denied
        </Typography>

        <Typography variant="body1">
          Your role ({userRole}) does not have permission to access this page.
        </Typography>

        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ mt: 1 }}
        >
          Required roles: {allowedRoles.join(", ")}
        </Typography>
        
        {!userData && (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ mt: 2 }}
          >
            Warning: Using fallback permissions. Firestore data not loaded.
          </Typography>
        )}
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;