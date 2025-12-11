import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
  Chip
} from '@mui/material';
import { Menu } from '@mui/icons-material';
import EnhancedNavigation from './EnhancedNavigation'; // ✅ GANTI DI SINI SAJA

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - 280px)` },
          ml: { md: `280px` },
          display: { xs: 'flex', md: 'none' },
          backgroundColor: 'white',
          color: theme.palette.primary.main,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" fontWeight="600">
            ERM System
          </Typography>
        </Toolbar>
      </AppBar>

      {/* EnhancedNavigation Drawer */}
      <EnhancedNavigation 
        mobileOpen={mobileOpen} 
        onDrawerToggle={handleDrawerToggle} 
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0, // Remove padding here, let pages handle their own padding
          width: { md: `calc(100% - 280px)` },
          marginTop: { xs: '64px', md: 0 },
          minHeight: '100vh',
          backgroundColor: '#f8f9fa'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;