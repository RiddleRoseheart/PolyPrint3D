import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  Chip, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
  Avatar
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrinterIcon from '@mui/icons-material/Print';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import BuildIcon from '@mui/icons-material/Build';
import { 
  getAllPrintersAdmin, 
  addPrinter, 
  updatePrinter, 
  deletePrinter, 
  getPrinterStatusAdmin,
  pausePrintJob,
  resumePrintJob,
  cancelPrintJob 
} from '../../api/endpoints/adminEndpoints';

const PrinterAdmin = () => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    api_key: '',
    material: '',
    color: '',
    build_volume: ''
  });
  const [refreshTimers, setRefreshTimers] = useState({});

  // Load printers on component mount
  useEffect(() => {
    fetchPrinters();
    
    // Set up auto-refresh for active printers
    const interval = setInterval(() => {
      refreshActivePrinters();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Refresh only printers that are currently printing
  const refreshActivePrinters = async () => {
    printers.forEach(printer => {
      if (printer.status === 'Printing') {
        handleRefreshPrinter(printer.id);
      }
    });
  };

  // Fetch all printers with status
  const fetchPrinters = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllPrintersAdmin();
      if (response?.data?.printers) {
        setPrinters(response.data.printers);
      }
    } catch (error) {
      setError('Failed to load printers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Open dialog for adding a new printer
  const handleAddPrinter = () => {
    setEditingPrinter(null);
    setFormData({
      name: '',
      ip_address: '',
      api_key: '',
      material: 'PLA',
      color: 'White',
      build_volume: '250,210,210'
    });
    setOpenDialog(true);
  };

  // Open dialog for editing an existing printer
  const handleEditPrinter = (printer) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      ip_address: printer.ip_address,
      api_key: printer.api_key || '',
      material: printer.material || 'PLA',
      color: printer.color || 'White',
      build_volume: printer.build_volume || '250,210,210',
      is_available: printer.is_available
    });
    setOpenDialog(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit form to add or update printer
  const handleSubmit = async () => {
    try {
      if (editingPrinter) {
        await updatePrinter(editingPrinter.id, formData);
      } else {
        await addPrinter(formData);
      }
      setOpenDialog(false);
      fetchPrinters();
    } catch (error) {
      setError(error.message || 'Failed to save printer');
    }
  };

  // Delete a printer
  const handleDeletePrinter = async (printerId) => {
    if (window.confirm('Are you sure you want to delete this printer?')) {
      try {
        await deletePrinter(printerId);
        fetchPrinters();
      } catch (error) {
        setError(error.message || 'Failed to delete printer');
      }
    }
  };

  // Refresh status of a specific printer
  const handleRefreshPrinter = async (printerId) => {
    // Visual feedback for refresh
    setRefreshTimers(prev => ({
      ...prev,
      [printerId]: true
    }));
    
    try {
      const response = await getPrinterStatusAdmin(printerId);
      if (response?.data) {
        setPrinters(prev => prev.map(p => 
          p.id === printerId ? { ...p, ...response.data } : p
        ));
      }
    } catch (error) {
      setError('Failed to refresh printer status');
    } finally {
      // Clear refresh visual after 1 second
      setTimeout(() => {
        setRefreshTimers(prev => ({
          ...prev,
          [printerId]: false
        }));
      }, 1000);
    }
  };

  // Get status color based on printer status
  const getStatusColor = (status) => {
    switch (status) {
      case 'Operational':
        return 'success';
      case 'Printing':
        return 'info';
      case 'Paused':
      case 'Pausing':
        return 'warning';
      case 'Error':
      case 'Offline':
        return 'error';
      default:
        return 'default';
    }
  };

  // Format the filename to be more readable
  const formatFileName = (filePath) => {
    if (!filePath) return 'Unknown';
    
    // Extract just the filename from the path
    const fileName = filePath.split(/[\\\/]/).pop();
    
    // If it's a job file, extract better information
    if (fileName.includes('group_')) {
      // Extract material and color from group_pla_white.stl format
      const parts = fileName.replace('.stl', '').split('_');
      if (parts.length >= 3) {
        const material = parts[1].toUpperCase();
        const color = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
        return `${color} ${material} Print`;
      }
    }
    
    return fileName;
  };

  // Format date for better readability
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Calculate estimated completion time
  const getEstimatedCompletion = (jobInfo) => {
    if (!jobInfo || !jobInfo.progress || jobInfo.progress.completion === null) {
      return 'Unknown';
    }
    
    const completion = jobInfo.progress.completion;
    const printTimeLeft = jobInfo.progress.printTimeLeft || 0;
    
    if (completion >= 100) {
      return 'Complete';
    }
    
    if (printTimeLeft === 0) {
      return 'Calculating...';
    }
    
    // Calculate estimated completion time
    const now = new Date();
    const completionTime = new Date(now.getTime() + printTimeLeft * 1000);
    return completionTime.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Pause the current print job
  const handlePausePrint = async (printerId, printerIP, apiKey) => {
    try {
      await pausePrintJob(printerId);
      handleRefreshPrinter(printerId);
    } catch (error) {
      setError('Failed to pause print');
    }
  };

  // Resume the current print job
  const handleResumePrint = async (printerId, printerIP, apiKey) => {
    try {
      await resumePrintJob(printerId);
      handleRefreshPrinter(printerId);
    } catch (error) {
      setError('Failed to resume print');
    }
  };

  // Cancel the current print job
  const handleCancelPrint = async (printerId, printerIP, apiKey) => {
    if (window.confirm('Are you sure you want to cancel this print job?')) {
      try {
        await cancelPrintJob(printerId);
        handleRefreshPrinter(printerId);
      } catch (error) {
        setError('Failed to cancel print');
      }
    }
  };

  // Get the temperature information as a formatted string
  const getTemperatureInfo = (jobInfo) => {
    if (!jobInfo || !jobInfo.temps) return null;
    
    const temps = jobInfo.temps;
    let tempInfo = [];
    
    if (temps.tool0) {
      tempInfo.push(`Nozzle: ${temps.tool0.actual}°C / ${temps.tool0.target}°C`);
    }
    
    if (temps.bed) {
      tempInfo.push(`Bed: ${temps.bed.actual}°C / ${temps.bed.target}°C`);
    }
    
    return tempInfo.join(' • ');
  };

  //formateer seconds into hours/minutes
  const formatTimeHoursMinutes = (seconds) => {
    if (!seconds || seconds <= 0) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Printer Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchPrinters}
          >
            Refresh All
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddPrinter}
          >
            Add Printer
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {printers.map(printer => (
            <Grid item xs={12} md={6} key={printer.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  position: 'relative',
                  borderColor: printer.status === 'Printing' ? 'info.main' : 'inherit',
                  borderWidth: printer.status === 'Printing' ? 2 : 1
                }}
              >
                {refreshTimers[printer.id] && (
                  <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
                )}
                
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar 
                        sx={{ 
                          bgcolor: getStatusColor(printer.status) + '.light',
                          color: getStatusColor(printer.status) + '.dark',
                          width: 32,
                          height: 32
                        }}
                      >
                        <PrinterIcon />
                      </Avatar>
                      <Typography variant="h6">
                        {printer.name}
                      </Typography>
                    </Stack>
                    <Chip 
                      label={printer.status || 'Unknown'} 
                      color={getStatusColor(printer.status)}
                      size="small"
                    />
                  </Stack>
                  
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip 
                      size="small" 
                      label={`IP: ${printer.ip_address}`}
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`Material: ${printer.material || 'Not set'}`}
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`Color: ${printer.color || 'Not set'}`}
                      variant="outlined"
                      sx={{
                        bgcolor: printer.color === 'White' ? '#f5f5f5' : 
                                printer.color === 'Black' ? '#212121' :
                                printer.color === 'Red' ? '#f44336' :
                                printer.color === 'Blue' ? '#2196f3' :
                                printer.color === 'Green' ? '#4caf50' : 'inherit',
                        color: printer.color === 'White' ? '#212121' :
                                printer.color === 'Black' ? '#ffffff' : '#ffffff',
                      }}
                    />
                  </Box>
                  
                  {printer.job_info && printer.job_info.progress && (
  <Box sx={{ mt: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
      <Typography variant="body2">
        {Math.round(printer.job_info.progress.completion)}%
      </Typography>
      <Typography variant="body2">
        Est. completion: {getEstimatedCompletion(printer.job_info)}
      </Typography>
    </Stack>
    <LinearProgress 
      variant="determinate" 
      value={printer.job_info.progress.completion || 0} 
      sx={{ height: 8, borderRadius: 1 }}
    />
    
    <Grid container spacing={1} sx={{ mt: 1 }}>
      <Grid item xs={6}>
        <Typography variant="caption" color="text.secondary">
          Time Remaining
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {formatTimeHoursMinutes(printer.job_info.progress.printTimeLeft)}
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="caption" color="text.secondary">
          Elapsed Time
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {formatTimeHoursMinutes(printer.job_info.progress.printTime)}
        </Typography>
      </Grid>
    </Grid>
    
    {getTemperatureInfo(printer.job_info) && (
      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        {getTemperatureInfo(printer.job_info)}
      </Typography>
    )}
  </Box>
)}
                  
                  {printer.active_print_request && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Active Print Job
                      </Typography>
                      
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            File
                          </Typography>
                          <Typography variant="body2" fontWeight="medium" noWrap>
                            {formatFileName(printer.active_print_request.file_path)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            User
                          </Typography>
                          <Typography variant="body2" noWrap>
                            {printer.active_print_request.user_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Started
                          </Typography>
                          <Typography variant="body2" noWrap>
                            {formatDate(printer.active_print_request.created_at)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}>
                  <Box>
                    <Tooltip title="Refresh Status">
                      <IconButton 
                        size="small" 
                        onClick={() => handleRefreshPrinter(printer.id)}
                        disabled={refreshTimers[printer.id]}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Edit Printer">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditPrinter(printer)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Delete Printer">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeletePrinter(printer.id)}
                        disabled={printer.status === 'Printing'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {printer.status === 'Printing' && (
                    <Box>
                      <Tooltip title="Pause Print">
                        <IconButton 
                          size="small" 
                          color="warning"
                          onClick={() => handlePausePrint(printer.id, printer.ip_address, printer.api_key)}
                        >
                          <PauseIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Cancel Print">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleCancelPrint(printer.id, printer.ip_address, printer.api_key)}
                        >
                          <StopIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  
                  {printer.status === 'Paused' && (
                    <Box>
                      <Tooltip title="Resume Print">
                        <IconButton 
                          size="small" 
                          color="info"
                          onClick={() => handleResumePrint(printer.id, printer.ip_address, printer.api_key)}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Cancel Print">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleCancelPrint(printer.id, printer.ip_address, printer.api_key)}
                        >
                          <StopIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
          
          {printers.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <PrinterIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No printers found
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddPrinter}
                  sx={{ mt: 2 }}
                >
                  Add Your First Printer
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Add/Edit Printer Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPrinter ? 'Edit Printer' : 'Add New Printer'}
        </DialogTitle>
        
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Printer Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="IP Address"
              name="ip_address"
              value={formData.ip_address}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="API Key"
              name="api_key"
              value={formData.api_key}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Material"
              name="material"
              value={formData.material}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Build Volume (X,Y,Z)"
              name="build_volume"
              value={formData.build_volume}
              onChange={handleInputChange}
              helperText="Format: width,depth,height in mm (e.g., 250,210,210)"
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingPrinter ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrinterAdmin;