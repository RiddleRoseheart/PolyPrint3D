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
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrinterIcon from '@mui/icons-material/Print';
import { 
  getAllPrintersAdmin, 
  addPrinter, 
  updatePrinter, 
  deletePrinter, 
  getPrinterStatusAdmin 
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

  // Load printers on component mount
  useEffect(() => {
    fetchPrinters();
  }, []);

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
    try {
      const response = await getPrinterStatusAdmin(printerId);
      if (response?.data) {
        setPrinters(prev => prev.map(p => 
          p.id === printerId ? { ...p, ...response.data } : p
        ));
      }
    } catch (error) {
      setError('Failed to refresh printer status');
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

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Printer Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddPrinter}
        >
          Add Printer
        </Button>
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
            <Grid item xs={12} md={6} lg={4} key={printer.id}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" gutterBottom>
                      {printer.name}
                    </Typography>
                    <Chip 
                      label={printer.status || 'Unknown'} 
                      color={getStatusColor(printer.status)}
                      size="small"
                    />
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary">
                    IP: {printer.ip_address}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Material: {printer.material || 'Not set'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Color: {printer.color || 'Not set'}
                  </Typography>
                  
                  {printer.active_print_request && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="subtitle2">
                        Active Print:
                      </Typography>
                      <Typography variant="body2" noWrap>
                        User: {printer.active_print_request.user_name}
                      </Typography>
                      <Typography variant="body2" noWrap>
                        File: {printer.active_print_request.file_path.split('/').pop()}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  <Tooltip title="Refresh Status">
                    <IconButton 
                      size="small" 
                      onClick={() => handleRefreshPrinter(printer.id)}
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
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
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