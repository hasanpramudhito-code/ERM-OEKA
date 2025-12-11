// src/components/Approval/ApprovalNotification.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const ApprovalNotification = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', user.id),
      where('type', '==', 'approval')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setNotifications(notificationList.sort((a, b) => 
        b.createdAt.toDate() - a.createdAt.toDate()
      ));
      
      setUnreadCount(notificationList.filter(n => !n.isRead).length);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(n => 
          updateDoc(doc(db, 'notifications', n.id), { isRead: true })
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (message) => {
    if (message.includes('approved')) return <CheckIcon color="success" />;
    if (message.includes('rejected')) return <ErrorIcon color="error" />;
    if (message.includes('Urgent') || message.includes('Overdue')) return <WarningIcon color="warning" />;
    return <InfoIcon color="info" />;
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = timestamp.toDate();
    const diffMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <Box>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        sx={{ position: 'relative' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500
          }
        }}
      >
        <Box px={2} py={1} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight="bold">
            Notifications
          </Typography>
          
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              disabled={notifications.length === 0}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {notifications.length === 0 ? (
          <Box p={2} textAlign="center">
            <Typography color="textSecondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.slice(0, 10).map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                  secondaryAction={
                    <Typography variant="caption" color="textSecondary">
                      {getTimeAgo(notification.createdAt)}
                    </Typography>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'background.paper' }}>
                      {getNotificationIcon(notification.message)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={notification.isRead ? 'normal' : 'bold'}>
                        {notification.message}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Chip
                          label={notification.documentType?.replace('_', ' ') || 'Document'}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                        {!notification.isRead && (
                          <Button
                            size="small"
                            sx={{ ml: 1 }}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
        
        {notifications.length > 10 && (
          <Box p={2} textAlign="center">
            <Button fullWidth>
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default ApprovalNotification;