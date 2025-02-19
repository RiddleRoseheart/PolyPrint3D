import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Alert,
  Stack,
  Tooltip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  Delete,
  Add,
  Notifications,
  Settings,
} from '@mui/icons-material';

// Hardcoded printer data
const initialPrinters = [
  {
    id: 'printer-1',
    name: 'Printer 1',
    status: 'idle',
    currentJob: null,
    color: 'black',
    isAvailable: true,
  },
  {
    id: 'printer-2',
    name: 'Printer 2',
    status: 'printing',
    currentJob: 'file1.stl',
    color: 'red',
    isAvailable: false,
  },
  {
    id: 'printer-3',
    name: 'Printer 3',
    status: 'down',
    currentJob: null,
    color: 'blue',
    isAvailable: false,
  },
];

const AdminPanel = () => {
  const [printers, setPrinters] = useState(initialPrinters);
  const [notifications, setNotifications] = useState([]);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterColor, setNewPrinterColor] = useState('black');

  // Add a new printer
  const addPrinter = () => {
    if (!newPrinterName) return;
    const newPrinter = {
      id: `printer-${printers.length + 1}`,
      name: newPrinterName,
      status: 'idle',
      currentJob: null,
      color: newPrinterColor,
      isAvailable: true,
    };
    setPrinters([...printers, newPrinter]);
    setNewPrinterName('');
    setNotifications([`${newPrinterName} added!`, ...notifications]);
  };

  // Remove a printer
  const removePrinter = (id) => {
    const updatedPrinters = printers.filter((printer) => printer.id !== id);
    setPrinters(updatedPrinters);
    setNotifications([`Printer ${id} removed!`, ...notifications]);
  };

  // Force stop a printer
  const forceStopPrinter = (id) => {
    const updatedPrinters = printers.map((printer) =>
      printer.id === id ? { ...printer, status: 'idle', currentJob: null } : printer
    );
    setPrinters(updatedPrinters);
    setNotifications([`Printer ${id} force stopped!`, ...notifications]);
  };

  // Change printer color
  const changePrinterColor = (id, color) => {
    const updatedPrinters = printers.map((printer) =>
      printer.id === id ? { ...printer, color } : printer
    );
    setPrinters(updatedPrinters);
    setNotifications([`Printer ${id} color changed to ${color}!`, ...notifications]);
  };

  // Simulate printer installation
  const installPrinter = (id) => {
    const updatedPrinters = printers.map((printer) =>
      printer.id === id ? { ...printer, isAvailable: true } : printer
    );
    setPrinters(updatedPrinters);
    setNotifications([`Printer ${id} installed!`, ...notifications]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>

      {/* Add Printer Form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add New Printer
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Printer Name"
            value={newPrinterName}
            onChange={(e) => setNewPrinterName(e.target.value)}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Color</InputLabel>
            <Select
              value={newPrinterColor}
              onChange={(e) => setNewPrinterColor(e.target.value)}
              label="Color"
            >
              <MenuItem value="black">Black</MenuItem>
              <MenuItem value="red">Red</MenuItem>
              <MenuItem value="blue">Blue</MenuItem>
              <MenuItem value="green">Green</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={addPrinter} startIcon={<Add />}>
            Add Printer
          </Button>
        </Stack>
      </Paper>

      {/* Printer List */}
      <Grid container spacing={3}>
        {printers.map((printer) => (
          <Grid item xs={12} md={6} lg={4} key={printer.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {printer.name}
                </Typography>
                <Typography color="textSecondary">
                  Status: {printer.status}
                </Typography>
                <Typography color="textSecondary">
                  Current Job: {printer.currentJob || 'None'}
                </Typography>
                <Typography color="textSecondary">
                  Color: {printer.color}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={printer.status === 'printing' ? 50 : 0}
                  />
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Tooltip title="Force Stop">
                    <IconButton
                      onClick={() => forceStopPrinter(printer.id)}
                      disabled={printer.status !== 'printing'}
                    >
                      <StopCircle />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Change Color">
                    <IconButton
                      onClick={() =>
                        changePrinterColor(printer.id, prompt('Enter new color:'))
                      }
                    >
                      <Settings />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove Printer">
                    <IconButton onClick={() => removePrinter(printer.id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                  {!printer.isAvailable && (
                    <Button
                      variant="outlined"
                      onClick={() => installPrinter(printer.id)}
                    >
                      Install
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Notifications */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Notifications
        </Typography>
        <Stack spacing={1}>
          {notifications.slice(0, 5).map((notification, index) => (
            <Alert key={index} severity="info">
              {notification}
            </Alert>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

export default AdminPanel;