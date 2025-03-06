import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Chip,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import PrinterIcon from '@mui/icons-material/Print';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import { getAlerts, markAlertAsRead } from '../../api/endpoints/alertEndpoints';

const AlertSection = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    source: 'all',
    timeRange: 'all',
    search: ''
  });

  useEffect(() => {
    fetchAlerts();
    
    // Poll for new alerts every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await getAlerts({ limit: 50 });
      if (response?.data?.alerts) {
        setAlerts(response.data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const toggleFilterPanel = () => {
    setFilterVisible(!filterVisible);
  };

  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value
    });
  };

  // Get icon based on alert type
  const getAlertIcon = (type) => {
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

  // Get source icon
  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'printer':
        return <PrinterIcon fontSize="small" />;
      case 'system':
        return <SettingsIcon fontSize="small" />;
      case 'user':
        return <PersonIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Filter alerts based on current tab and filters
  const filteredAlerts = alerts.filter(alert => {
    // Filter by tab
    if (activeTab !== 'all' && alert.type !== activeTab) {
      return false;
    }
    
    // Filter by source
    if (filters.source !== 'all' && alert.source !== filters.source) {
      return false;
    }
    
    // Filter by time range
    if (filters.timeRange !== 'all') {
      const alertTime = new Date(alert.timestamp);
      const now = new Date();
      const hours = (now - alertTime) / (1000 * 60 * 60);
      
      if (filters.timeRange === 'today' && hours > 24) {
        return false;
      } else if (filters.timeRange === 'week' && hours > 168) {
        return false;
      }
    }
    
    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        alert.title.toLowerCase().includes(searchTerm) ||
        alert.message.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });

  // Get unique source values for filter dropdown
  const sourceOptions = ['all', ...new Set(alerts.map(alert => alert.source).filter(Boolean))];

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Alerts & Activity
        </Typography>
        <Box>
          <Tooltip title="Filter alerts">
            <IconButton size="small" onClick={toggleFilterPanel}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh alerts">
            <IconButton size="small" onClick={fetchAlerts}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Tabs for alert categories */}
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="scrollable" 
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="All" value="all" />
        <Tab 
          label="Errors" 
          value="error" 
          icon={<ErrorIcon color="error" fontSize="small" />} 
          iconPosition="start"
        />
        <Tab 
          label="Warnings" 
          value="warning" 
          icon={<WarningIcon color="warning" fontSize="small" />} 
          iconPosition="start"
        />
        <Tab 
          label="Success" 
          value="success" 
          icon={<CheckCircleIcon color="success" fontSize="small" />} 
          iconPosition="start"
        />
        <Tab 
          label="Info" 
          value="info" 
          icon={<InfoIcon color="info" fontSize="small" />} 
          iconPosition="start"
        />
      </Tabs>
      
      {/* Filter panel */}
      {filterVisible && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter Alerts
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Source</InputLabel>
              <Select
                value={filters.source}
                label="Source"
                onChange={(e) => handleFilterChange('source', e.target.value)}
              >
                <MenuItem value="all">All Sources</MenuItem>
                {sourceOptions.filter(src => src !== 'all').map(source => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={filters.timeRange}
                label="Time Range"
                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Last 24 Hours</MenuItem>
                <MenuItem value="week">Last Week</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              size="small"
              label="Search"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              fullWidth
            />
          </Stack>
        </Box>
      )}
      
      {/* Alert count badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'} found
        </Typography>
        {filteredAlerts.length > 0 && (
          <Button 
            size="small" 
            variant="text" 
            onClick={() => {
              // Mark all displayed alerts as read
              filteredAlerts.forEach(alert => {
                if (!alert.is_read) handleMarkAsRead(alert.id);
              });
            }}
          >
            Mark all as read
          </Button>
        )}
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Alerts list */}
      {loading ? (
        <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />
      ) : filteredAlerts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          No alerts to display
        </Typography>
      ) : (
        <List sx={{ width: '100%', maxHeight: 400, overflow: 'auto' }}>
          {filteredAlerts.map((alert) => (
            <ListItem 
              key={alert.id}
              disablePadding
              secondaryAction={
                !alert.is_read && (
                  <Button 
                    size="small" 
                    onClick={() => handleMarkAsRead(alert.id)}
                  >
                    Mark as read
                  </Button>
                )
              }
            >
              <ListItemButton 
                sx={{ 
                  opacity: alert.is_read ? 0.7 : 1,
                  borderLeft: alert.is_read ? 'none' : `4px solid ${
                    alert.type === 'error' ? '#f44336' : 
                    alert.type === 'warning' ? '#ff9800' : 
                    alert.type === 'success' ? '#4caf50' : 
                    '#2196f3'
                  }`,
                  pl: alert.is_read ? 2 : 1
                }}
              >
                <ListItemIcon>
                  {getAlertIcon(alert.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {alert.title}
                      {alert.source && (
                        <Chip 
                          size="small" 
                          label={alert.source} 
                          icon={getSourceIcon(alert.source)}
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {alert.message}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatDate(alert.timestamp)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default AlertSection;