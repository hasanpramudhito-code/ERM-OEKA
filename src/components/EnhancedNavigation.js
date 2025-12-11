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
  Toolbar,
  alpha
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
  CheckCircle,
  Tune, // Untuk Risk Parameters
  Build, // Untuk Risk Assessment Config
  CorporateFare, // Untuk Organization
  DataThresholding, // Untuk KRI Monitoring
  Menu as MenuIcon,
  Approval as ApprovalIcon,
  Dashboard as DashboardIcon,
  PendingActions as PendingActionsIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
              child.path === currentPath || currentPath.startsWith(child.path + '/')
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
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Role-based access dengan struktur terbaru
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
            path: '/risk-register',
            badge: 'core'
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
            icon: <DataThresholding />,
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
            path: '/incident-reporting',
            badge: 'hot'
          },
          {
            text: 'Reporting',
            icon: <Description />,
            path: '/reporting'
          },
          {
            text: 'Approval Workflow',
            icon: <ApprovalIcon />,
            hasChildren: true,
            badge: 'new',
            children: [
              {
                text: 'Dashboard',
                icon: <DashboardIcon />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <PendingActionsIcon />,
                path: '/approval/pending'
              },
              {
                text: 'Workflow Configuration',
                icon: <SettingsIcon />,
                path: '/approval/workflows'
              },
              {
                text: 'Approval History',
                icon: <HistoryIcon />,
                path: '/approval/history'
              }
            ]
          }
        ]
      },
      {
        section: 'ADMINISTRATION',
        items: [
          {
            text: 'User Management',
            icon: <People />,
            path: '/user-management',
            badge: 'admin'
          },
          {
            text: 'Organization',
            icon: <CorporateFare />,
            hasChildren: true,
            children: [
              {
                text: 'Struktur Organisasi',
                icon: <AccountTree />,
                path: '/organization',
                tab: 'structure' // Parameter tab
              },
              {
                text: 'Risk Parameters',
                icon: <Tune />,
                path: '/organization',
                tab: 'risk-params', // Parameter tab
                badge: 'comprehensive'
              },
              {
                text: 'Risk Assessment Config',
                icon: <Build />,
                path: '/organization',
                tab: 'assessment-config', // Parameter tab
                badge: 'config'
              },
              {
                text: 'System Settings',
                icon: <Settings />,
                path: '/organization',
                tab: 'system-settings', // Parameter tab
                badge: 'admin'
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
            icon: <DataThresholding />,
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
          },
          {
            text: 'Approval Workflow',
            icon: <ApprovalIcon />,
            hasChildren: true,
            badge: 'new',
            children: [
              {
                text: 'Dashboard',
                icon: <DashboardIcon />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <PendingActionsIcon />,
                path: '/approval/pending'
              },
              {
                text: 'Approval History',
                icon: <HistoryIcon />,
                path: '/approval/history'
              }
            ]
          }
        ]
      },
      {
        section: 'ORGANIZATION',
        items: [
          {
            text: 'Organization',
            icon: <CorporateFare />,
            hasChildren: true,
            children: [
              {
                text: 'Struktur Organisasi',
                icon: <AccountTree />,
                path: '/organization',
                tab: 'structure'
              },
              {
                text: 'Risk Parameters',
                icon: <Tune />,
                path: '/organization',
                tab: 'risk-params'
              },
              {
                text: 'Risk Assessment Config',
                icon: <Build />,
                path: '/organization',
                tab: 'assessment-config'
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
            icon: <DataThresholding />,
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
          },
          {
            text: 'Approval Workflow',
            icon: <ApprovalIcon />,
            hasChildren: true,
            badge: 'new',
            children: [
              {
                text: 'Dashboard',
                icon: <DashboardIcon />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <PendingActionsIcon />,
                path: '/approval/pending'
              },
              {
                text: 'Workflow Configuration',
                icon: <SettingsIcon />,
                path: '/approval/workflows'
              },
              {
                text: 'Approval History',
                icon: <HistoryIcon />,
                path: '/approval/history'
              }
            ]
          }
        ]
      },
      {
        section: 'SETTINGS',
        items: [
          {
            text: 'Organization',
            icon: <CorporateFare />,
            hasChildren: true,
            children: [
              {
                text: 'Risk Parameters',
                icon: <Tune />,
                path: '/organization',
                tab: 'risk-params'
              },
              {
                text: 'Risk Assessment Config',
                icon: <Build />,
                path: '/organization',
                tab: 'assessment-config'
              }
            ]
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
          },
          {
            text: 'Approval Workflow',
            icon: <ApprovalIcon />,
            hasChildren: true,
            children: [
              {
                text: 'Dashboard',
                icon: <DashboardIcon />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <PendingActionsIcon />,
                path: '/approval/pending'
              },
              {
                text: 'Approval History',
                icon: <HistoryIcon />,
                path: '/approval/history'
              }
            ]
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
          },
          {
            text: 'Approval Workflow',
            icon: <ApprovalIcon />,
            hasChildren: true,
            children: [
              {
                text: 'Dashboard',
                icon: <DashboardIcon />,
                path: '/approval'
              },
              {
                text: 'Pending Approvals',
                icon: <PendingActionsIcon />,
                path: '/approval/pending'
              },
              {
                text: 'Approval History',
                icon: <HistoryIcon />,
                path: '/approval/history'
              }
            ]
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
          },
          {
            text: 'Approval Workflow',
            icon: <ApprovalIcon />,
            hasChildren: true,
            children: [
              {
                text: 'Dashboard',
                icon: <DashboardIcon />,
                path: '/approval'
              },
              {
                text: 'Approval History',
                icon: <HistoryIcon />,
                path: '/approval/history'
              }
            ]
          }
        ]
      }
    ]
  };

  // Fallback to STAFF if role not found
  const menuSections = navigationStructure[userRole] || navigationStructure.STAFF;

  const renderMenuItem = (item, level = 0) => {
    const isActive = location.pathname === item.path || 
                    (item.path === '/organization' && location.pathname.startsWith('/organization'));
    const hasChildren = item.hasChildren && item.children;
    const isExpanded = openMenus[item.text];

    // Handle organization tabs
    const getOrganizationLink = () => {
      if (item.path === '/organization' && item.tab) {
        return `${item.path}?tab=${item.tab}`;
      }
      return item.path;
    };

    if (hasChildren) {
      return (
        <React.Fragment key={item.text}>
          <ListItem
            button
            onClick={() => handleMenuClick(item.text)}
            sx={{
              pl: 2 + level * 2,
              backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              py: 1.5,
              transition: 'all 0.2s ease',
            }}
          >
            <ListItemIcon 
              sx={{ 
                color: isActive ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.7),
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
                    sx={{
                      color: isActive ? theme.palette.primary.main : theme.palette.common.white,
                    }}
                  >
                    {item.text}
                  </Typography>
                  {item.badge && (
                    <Chip 
                      label={item.badge} 
                      size="small" 
                      color={
                        item.badge === 'home' ? 'primary' : 
                        item.badge === 'core' ? 'success' :
                        item.badge === 'hot' ? 'error' :
                        item.badge === 'admin' ? 'warning' :
                        item.badge === 'new' ? 'info' :
                        item.badge === 'config' ? 'secondary' : 'default'
                      }
                      sx={{ 
                        height: 18, 
                        fontSize: '0.55rem',
                        fontWeight: 'bold',
                        bgcolor: 'background.paper',
                        color: 'text.primary'
                      }}
                    />
                  )}
                </Box>
              } 
            />
            {isExpanded ? (
              <ExpandLess fontSize="small" sx={{ color: alpha(theme.palette.common.white, 0.7) }} />
            ) : (
              <ExpandMore fontSize="small" sx={{ color: alpha(theme.palette.common.white, 0.7) }} />
            )}
          </ListItem>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ 
              ml: 1,
              backgroundColor: alpha(theme.palette.primary.dark, 0.3),
              borderRadius: 1,
              py: 0.5,
              mx: 1
            }}>
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
        to={getOrganizationLink()}
        button
        sx={{
          pl: 2 + level * 2,
          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
          backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
          borderLeft: isActive ? 4 : 0,
          borderColor: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
          },
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          py: 1.5,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <ListItemIcon 
          sx={{ 
            color: isActive ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.7),
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
                sx={{
                  color: isActive ? theme.palette.primary.main : theme.palette.common.white,
                }}
              >
                {item.text}
              </Typography>
              {item.badge && (
                <Chip 
                  label={item.badge} 
                  size="small" 
                  color={
                    item.badge === 'home' ? 'primary' : 
                    item.badge === 'core' ? 'success' :
                    item.badge === 'hot' ? 'error' :
                    item.badge === 'admin' ? 'warning' :
                    item.badge === 'new' ? 'info' :
                    item.badge === 'config' ? 'secondary' : 'default'
                  }
                  sx={{ 
                    height: 18, 
                    fontSize: '0.55rem',
                    fontWeight: 'bold',
                    bgcolor: 'background.paper',
                    color: 'text.primary'
                  }}
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
          color: alpha(theme.palette.common.white, 0.5),
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'block',
          bgcolor: alpha(theme.palette.primary.dark, 0.3),
          borderRadius: 1,
          mx: 1,
          mt: 1
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
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading navigation...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    console.log('No currentUser found, but continuing to show navigation');
    // return null; // ← COMMENT LINE INI
  }
  const sidebarGradient = 'linear-gradient(195deg, #1a237e 0%, #283593 25%, #303f9f 50%, #3949ab 75%, #5c6bc0 100%)';

  const drawerContent = (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <Toolbar sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
          py: 1,
          background: alpha(theme.palette.primary.dark, 0.8),
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar 
              sx={{ 
                bgcolor: theme.palette.secondary.main,
                width: 36,
                height: 36,
                border: `2px solid ${theme.palette.common.white}`,
              }}
            >
              {userData?.name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography 
                variant="subtitle2" 
                fontWeight="bold" 
                noWrap
                sx={{ color: theme.palette.common.white }}
              >
                {userData?.name || currentUser.email?.split('@')[0]}
              </Typography>
              <Chip 
                label={userRole.replace('_', ' ')} 
                size="small" 
                color="secondary"
                sx={{ 
                  height: 18, 
                  fontSize: '0.6rem',
                  color: theme.palette.common.white,
                  bgcolor: alpha(theme.palette.secondary.main, 0.8),
                }}
              />
            </Box>
          </Box>
          <IconButton 
            onClick={onDrawerToggle}
            sx={{ color: theme.palette.common.white }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <Toolbar sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start',
          py: 2,
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
          background: alpha(theme.palette.primary.dark, 0.8),
        }}>
          <Box display="flex" alignItems="center" width="100%" mb={2}>
            <Avatar 
              sx={{ 
                bgcolor: theme.palette.secondary.main,
                width: 44,
                height: 44,
                mr: 2,
                fontSize: '1.2rem',
                border: `3px solid ${theme.palette.common.white}`,
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              }}
            >
              {userData?.name?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography 
                variant="subtitle1" 
                fontWeight="bold" 
                noWrap 
                sx={{ 
                  maxWidth: 180,
                  color: theme.palette.common.white,
                }}
              >
                {userData?.name || currentUser.email?.split('@')[0]}
              </Typography>
              <Chip 
                label={userRole.replace('_', ' ')} 
                size="small" 
                color="secondary"
                sx={{ 
                  height: 20, 
                  fontSize: '0.6rem', 
                  mt: 0.5,
                  color: theme.palette.common.white,
                  bgcolor: alpha(theme.palette.secondary.main, 0.8),
                }}
              />
            </Box>
          </Box>
          
          {/* Quick Actions */}
          <Box display="flex" gap={1} width="100%" flexWrap="wrap">
            <IconButton 
              size="small" 
              onClick={() => navigate('/risk-register')}
              sx={{ 
                p: 1,
                bgcolor: alpha(theme.palette.common.white, 0.1),
                borderRadius: 2,
                flex: 1,
                minWidth: 70,
                color: theme.palette.common.white,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                }
              }}
            >
              <Warning fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem' }}>
                Risks
              </Typography>
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => navigate('/incident-reporting')}
              sx={{ 
                p: 1,
                bgcolor: alpha(theme.palette.error.main, 0.2),
                borderRadius: 2,
                flex: 1,
                minWidth: 70,
                color: theme.palette.common.white,
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.3),
                }
              }}
            >
              <Report fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem' }}>
                Report
              </Typography>
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => navigate('/organization')}
              sx={{ 
                p: 1,
                bgcolor: alpha(theme.palette.info.main, 0.2),
                borderRadius: 2,
                flex: 1,
                minWidth: 70,
                color: theme.palette.common.white,
                '&:hover': {
                  bgcolor: alpha(theme.palette.info.main, 0.3),
                }
              }}
            >
              <Settings fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem' }}>
                Config
              </Typography>
            </IconButton>
          </Box>
        </Toolbar>
      )}

      {/* Navigation Sections */}
      <Box sx={{ 
        overflowY: 'auto', 
        flex: 1, 
        py: 1,
        background: sidebarGradient,
        '&::-webkit-scrollbar': {
          width: 6,
        },
        '&::-webkit-scrollbar-track': {
          background: alpha(theme.palette.primary.dark, 0.3),
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.common.white, 0.3),
          borderRadius: 3,
          '&:hover': {
            background: alpha(theme.palette.common.white, 0.5),
          }
        },
      }}>
        {menuSections.map(section => renderSection(section))}
      </Box>

      {/* Footer */}
      <Box sx={{ 
        p: 2, 
        borderTop: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        backgroundColor: alpha(theme.palette.primary.dark, 0.8),
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
            System Status
          </Typography>
          <Chip 
            label="Online" 
            size="small" 
            color="success"
            sx={{ 
              height: 20, 
              fontSize: '0.6rem',
              color: theme.palette.common.white,
            }}
          />
        </Box>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            color: theme.palette.common.white,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.error.main, 0.2),
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.3),
            },
            py: 1,
            px: 2,
            transition: 'all 0.2s ease',
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary={
              <Typography variant="body2" fontWeight={500}>
                Logout
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
              width: 300,
              background: sidebarGradient,
              boxShadow: '0 0 30px rgba(0,0,0,0.3)',
              border: 'none',
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
              background: sidebarGradient,
              borderRight: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              boxShadow: '0 0 25px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              border: 'none',
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