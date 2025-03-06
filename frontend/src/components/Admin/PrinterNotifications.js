import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  IconButton,
  Badge,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { getPrinterNotifications } from '../../api/endpoints/adminEndpoints';

const PrinterNotifications = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Count unread notifications
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await getPrinterNotifications();
      if (response?.data?.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    // Implementation would call API to mark all as read
    // For now, just update local state
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // Format relative time
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    return notification.type === filter;
  });

  return (
    <>
      {/* Notification Button */}
      <Tooltip title="Printer Notifications">
        <IconButton 
          color="inherit" 
          onClick={() => setOpen(true)}
          sx={{ position: 'relative' }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
      >
        <Box sx={{ width: 350, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Printer Notifications</Typography>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="notification-filter-label">Filter</InputLabel>
              <Select
                labelId="notification-filter-label"
                value={filter}
                label="Filter"
                onChange={(e) => setFilter(e.target.value)}
                startAdornment={<FilterListIcon fontSize="small" sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">All Events</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>
            
            <Tooltip title="Mark all as read">
              <Typography 
                variant="body2" 
                color="primary" 
                sx={{ cursor: 'pointer', fontWeight: 'medium' }}
                onClick={markAllAsRead}
              >
                Mark all as read
              </Typography>
            </Tooltip>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Typography variant="body2" align="center" sx={{ py: 4 }}>
              Loading notifications...
            </Typography>
          ) : (
            <>
              {filteredNotifications.length === 0 ? (
                <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 4 }}>
                  No notifications to display
                </Typography>
              ) : (
                <List sx={{ 
                  maxHeight: 'calc(100vh - 200px)', 
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '3px',
                  },
                }}>
                  {filteredNotifications.map((notification) => (
                    <React.Fragment key={notification.id}>
                      <ListItem 
                        alignItems="flex-start"
                        sx={{ 
                          bgcolor: notification.read ? 'inherit' : 'action.hover',
                          borderLeft: notification.read ? 'none' : '3px solid',
                          borderLeftColor: `${notification.type}.main`,
                          py: 1.5
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {getNotificationIcon(notification.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2">
                              {notification.message}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" color="text.secondary">
                                  Printer: {notification.printerName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {getRelativeTime(notification.timestamp)}
                                </Typography>
                              </Stack>
                              {notification.details && (
                                <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {notification.details}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default PrinterNotifications;