// File: src/components/EnhancedNavigation.js
import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Box,
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  Toolbar
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Dashboard,
  Assessment,
  Warning,
  People,
  Business,
  Settings,
  TrackChanges,
  Description,
  Assignment,
  Report,
  AccountTree,
  Logout,
  Security,
  Schedule,
  BugReport,
  CheckCircle
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navigation } from 'lucide-react';

const EnhancedNavigation = ({ mobileOpen, onDrawerToggle }) => {
  const { currentUser, logout, userData, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [openMenus, setOpenMenus] = useState({});

  // Auto-expand menu based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const newOpenMenus = { ...openMenus };

    // Auto-expand parent menus when child is active
    Object.keys(navigationStructure).forEach(role => {
      navigationStructure[role].forEach(section => {
        section.items.forEach(item => {
          if (item.hasChildren && item.children) {
            const isChildActive = item.children.some(child => 
              child.path === currentPath
            );
            if (isChildActive) {
              newOpenMenus[item.text] = true;
            }
          }
        });
      });
    });

    setOpenMenus(newOpenMenus);
  }, [location.pathname]);

  const userRole = userData?.role || "STAFF";

  const handleMenuClick = (menu) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Role-based access with better organization - DASHBOARD DIPINDAH KE ATAS
  const navigationStructure = {
    ADMIN: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <Dashboard />,
            path: '/dashboard',
            badge: 'home'
          },
          {
            text: 'Executive Dashboard',
            icon: <Assessment />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'CORE RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <Warning />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <Assessment />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <Assignment />,
            path: '/treatment-plans'
          }
        ]
      },
      {
        section: 'ADVANCED RISK MANAGEMENT',
        items: [
          {
            text: 'KRI Monitoring',
            icon: <TrackChanges />,
            path: '/kri-monitoring'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <Security />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <Security />,
                path: '/control-register'
              },
              {
                text: 'Testing Schedule',
                icon: <Schedule />,
                path: '/testing-schedule'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <BugReport />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Lapor Kejadian',
            icon: <Report />,
            path: '/incident-reporting'
          },
          {
            text: 'Reporting',
            icon: <Description />,
            path: '/reporting'
          }
        ]
      },
      {
        section: 'ADMINISTRATION',
        items: [
          {
            text: 'User Management',
            icon: <People />,
            path: '/user-management'
          },
          {
            text: 'Organization',
            icon: <Business />,
            hasChildren: true,
            children: [
              {
                text: 'Struktur Organisasi',
                icon: <AccountTree />,
                path: '/organization'
              },
              {
                text: 'Risk Parameter Setting',
                icon: <Settings />,
                path: '/risk-parameters'
              }
            ]
          },
          {
            text: 'System Settings',
            icon: <Settings />,
            path: '/settings'
          }
        ]
      }
    ],
    DIRECTOR: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <Dashboard />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <Assessment />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK OVERSIGHT',
        items: [
          {
            text: 'Risk Register',
            icon: <Warning />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <Assessment />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <Assignment />,
            path: '/treatment-plans'
          },
          {
            text: 'KRI Monitoring',
            icon: <TrackChanges />,
            path: '/kri-monitoring'
          }
        ]
      },
      {
        section: 'CONTROL MONITORING',
        items: [
          {
            text: 'Control Testing',
            icon: <Security />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <Security />,
                path: '/control-register'
              },
              {
                text: 'Testing Schedule',
                icon: <Schedule />,
                path: '/testing-schedule'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <BugReport />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Lapor Kejadian',
            icon: <Report />,
            path: '/incident-reporting'
          },
          {
            text: 'Reporting',
            icon: <Description />,
            path: '/reporting'
          }
        ]
      },
      {
        section: 'ORGANIZATION',
        items: [
          {
            text: 'Organization',
            icon: <Business />,
            hasChildren: true,
            children: [
              {
                text: 'Struktur Organisasi',
                icon: <AccountTree />,
                path: '/organization'
              },
              {
                text: 'Risk Parameter Setting',
                icon: <Settings />,
                path: '/risk-parameters'
              }
            ]
          }
        ]
      }
    ],
    RISK_MANAGER: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <Dashboard />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <Assessment />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <Warning />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <Assessment />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <Assignment />,
            path: '/treatment-plans'
          },
          {
            text: 'KRI Monitoring',
            icon: <TrackChanges />,
            path: '/kri-monitoring'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <Security />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <Security />,
                path: '/control-register'
              },
              {
                text: 'Testing Schedule',
                icon: <Schedule />,
                path: '/testing-schedule'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <BugReport />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Lapor Kejadian',
            icon: <Report />,
            path: '/incident-reporting'
          },
          {
            text: 'Reporting',
            icon: <Description />,
            path: '/reporting'
          }
        ]
      },
      {
        section: 'SETTINGS',
        items: [
          {
            text: 'Risk Parameters',
            icon: <Settings />,
            path: '/risk-parameters'
          }
        ]
      }
    ],
    RISK_OWNER: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <Dashboard />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <Assessment />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <Warning />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <Assessment />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <Assignment />,
            path: '/treatment-plans'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <Security />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <Security />,
                path: '/control-register'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <BugReport />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Lapor Kejadian',
            icon: <Report />,
            path: '/incident-reporting'
          }
        ]
      }
    ],
    RISK_OFFICER: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <Dashboard />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <Assessment />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <Warning />,
            path: '/risk-register'
          },
          {
            text: 'Risk Assessment',
            icon: <Assessment />,
            path: '/risk-assessment'
          },
          {
            text: 'Treatment Plans',
            icon: <Assignment />,
            path: '/treatment-plans'
          }
        ]
      },
      {
        section: 'CONTROL TESTING',
        items: [
          {
            text: 'Control Testing',
            icon: <Security />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <Security />,
                path: '/control-register'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle />,
                path: '/test-results'
              },
              {
                text: 'Deficiency Tracking',
                icon: <BugReport />,
                path: '/deficiency-tracking'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Lapor Kejadian',
            icon: <Report />,
            path: '/incident-reporting'
          }
        ]
      }
    ],
    STAFF: [
      {
        section: 'MAIN',
        items: [
          {
            text: 'Dashboard',
            icon: <Dashboard />,
            path: '/dashboard'
          },
          {
            text: 'Executive Dashboard',
            icon: <Assessment />,
            path: '/executive-dashboard'
          }
        ]
      },
      {
        section: 'RISK MANAGEMENT',
        items: [
          {
            text: 'Risk Register',
            icon: <Warning />,
            path: '/risk-register'
          }
        ]
      },
      {
        section: 'CONTROLS',
        items: [
          {
            text: 'Control Testing',
            icon: <Security />,
            hasChildren: true,
            children: [
              {
                text: 'Control Register',
                icon: <Security />,
                path: '/control-register'
              },
              {
                text: 'Test Results',
                icon: <CheckCircle />,
                path: '/test-results'
              }
            ]
          }
        ]
      },
      {
        section: 'OPERATIONAL',
        items: [
          {
            text: 'Lapor Kejadian',
            icon: <Report />,
            path: '/incident-reporting'
          }
        ]
      }
    ]
  };

  // Fallback to STAFF if role not found
  const menuSections = navigationStructure[userRole] || navigationStructure.STAFF;

  const renderMenuItem = (item, level = 0) => {
    const isActive = location.pathname === item.path;
    const hasChildren = item.hasChildren && item.children;
    const isExpanded = openMenus[item.text];

    if (hasChildren) {
      return (
        <React.Fragment key={item.text}>
          <ListItem
            button
            onClick={() => handleMenuClick(item.text)}
            sx={{
              pl: 2 + level * 2,
              backgroundColor: isActive ? theme.palette.primary.light : 'transparent',
              color: isActive ? theme.palette.primary.main : 'text.primary',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              py: 1.5
            }}
          >
            <ListItemIcon 
              sx={{ 
                color: isActive ? theme.palette.primary.main : 'text.secondary',
                minWidth: 40
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography 
                  variant="body2" 
                  fontWeight={isActive ? 600 : 400}
                  fontSize="0.9rem"
                >
                  {item.text}
                </Typography>
              } 
            />
            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </ListItem>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ ml: 1 }}>
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <ListItem
        key={item.text}
        component={Link}
        to={item.path}
        button
        sx={{
          pl: 2 + level * 2,
          color: isActive ? theme.palette.primary.main : 'text.primary',
          backgroundColor: isActive ? theme.palette.action.selected : 'transparent',
          borderLeft: isActive ? 4 : 0,
          borderColor: 'primary.main',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          py: 1.5,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <ListItemIcon 
          sx={{ 
            color: isActive ? theme.palette.primary.main : 'text.secondary',
            minWidth: 40
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText 
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography 
                variant="body2" 
                fontWeight={isActive ? 600 : 400}
                fontSize="0.9rem"
              >
                {item.text}
              </Typography>
              {item.badge && (
                <Chip 
                  label={item.badge} 
                  size="small" 
                  color={item.badge === 'home' ? 'primary' : 'secondary'}
                  sx={{ height: 20, fontSize: '0.6rem' }}
                />
              )}
            </Box>
          } 
        />
      </ListItem>
    );
  };

  const renderSection = (section) => (
    <Box key={section.section} sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        sx={{
          px: 2,
          py: 1,
          color: 'text.secondary',
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'block'
        }}
      >
        {section.section}
      </Typography>
      <List component="div" disablePadding>
        {section.items.map(item => renderMenuItem(item))}
      </List>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading navigation...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return null;
  }

  const drawerContent = (
    <>
      {/* Header */}
      <Toolbar sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-start',
        py: 2,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box display="flex" alignItems="center" width="100%" mb={2}>
          <Avatar 
            sx={{ 
              bgcolor: theme.palette.primary.main,
              width: 32,
              height: 32,
              mr: 1
            }}
          >
            {userData?.name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {userData?.name || currentUser.email}
            </Typography>
            <Chip 
              label={userRole.replace('_', ' ')} 
              size="small" 
              color="primary"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.6rem' }}
            />
          </Box>
        </Box>
        
        {/* Quick Actions */}
        <Box display="flex" gap={1} width="100%">
          <IconButton 
            size="small" 
            color="primary"
            onClick={() => navigate('/incident-reporting')}
          >
            <Report fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            color="primary"
            onClick={() => navigate('/risk-register')}
          >
            <Warning fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            color="primary"
            onClick={() => navigate('/dashboard')}
          >
            <Dashboard fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>

      {/* Navigation Sections */}
      <Box sx={{ overflowY: 'auto', flex: 1, py: 1 }}>
        {menuSections.map(section => renderSection(section))}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            color: 'error.main',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary={
              <Typography variant="body2" fontWeight={500}>
                Logout
              </Typography>
            } 
            secondary={
              <Typography variant="caption" color="inherit">
                {userData?.name || currentUser.email}
              </Typography>
            }
          />
        </ListItem>
      </Box>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: 280,
              background: theme.palette.background.default
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              background: theme.palette.background.paper,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default EnhancedNavigation;