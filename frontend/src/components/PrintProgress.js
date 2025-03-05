import React, { useState, useEffect, useCallback } from 'react';
import { getPrintJobDetails, pausePrintJob, resumePrintJob } from '../api/octoprintAPI';
import { 
    Box, 
    Paper, 
    Typography, 
    Grid, 
    Card, 
    CardContent, 
    LinearProgress,
    Stack,
    Alert,
    Button,
    Tooltip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const POLLING_INTERVAL = 5000; // Poll every 5 seconds
const DISPLAY_NOTIFICATIONS = 5; // Number of notifications to show

const PrintingProgress = ({ selectedFiles, onReset }) => {
    const [printJobs, setPrintJobs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Initialize print jobs with settings
    const initializePrintJobs = useCallback(async () => {
        try {
            const jobs = await Promise.all(selectedFiles.map(async (file, index) => {
                // Get the printer IP and API key from the file's printer info
                const printer = file.printer || {};
                const ip = printer.ip_address;
                const apiKey = printer.api_key;
                
                // Only try to get details if we have IP and API key
                let jobDetails = { state: "Unknown", printTime: 0, printTimeLeft: 0, completion: 0 };
                
                if (ip && apiKey) {
                    try {
                        jobDetails = await getPrintJobDetails(ip, apiKey);
                    } catch (error) {
                        console.error(`Error getting job details for ${file.name}:`, error);
                    }
                }
                
                return {
                    id: `print_${Date.now()}_${index}`,
                    fileName: file.name || `Print_${index + 1}.stl`,
                    printer: printer.name || `Printer ${(index % 3) + 1}`,
                    printerIp: ip,
                    printerApiKey: apiKey,
                    status: jobDetails.state,
                    progress: jobDetails.completion || 0,
                    isPaused: false,
                    timeRemaining: jobDetails.printTimeLeft / 60 || 30, // Convert seconds to minutes or default
                    startTime: new Date(),
                    printVariables: {
                        material: file.material || 'PLA',
                        quality: file.quality || '0.2mm',
                        infill: file.infill || '20%',
                        temperature: '200°C',
                        bedTemp: '60°C'
                    }
                };
            }));

            setPrintJobs(jobs);
        } catch (error) {
            console.error('Error initializing print jobs:', error);
        }
    }, [selectedFiles]);

    // Update progress for active prints
    const updateJobProgress = useCallback(async () => {
        try {
            const updatedJobs = await Promise.all(printJobs.map(async (job) => {
                if (job.status === 'COMPLETED' || !job.printerIp || !job.printerApiKey) return job;

                // Skip update if paused to avoid resetting the status
                if (job.isPaused) return job;

                try {
                    const jobDetails = await getPrintJobDetails(job.printerIp, job.printerApiKey);
                    const newProgress = jobDetails.completion || 0;
                    const newStatus = newProgress >= 100 ? 'COMPLETED' : jobDetails.state;
                    const newTimeRemaining = jobDetails.printTimeLeft / 60 || 0; // Convert seconds to minutes

                    if (newProgress >= 100 && job.progress < 100) {
                        addNotification(`Print completed: ${job.fileName}`);
                    }

                    return {
                        ...job,
                        progress: newProgress,
                        status: newStatus,
                        timeRemaining: newTimeRemaining
                    };
                } catch (error) {
                    console.error(`Error updating job ${job.id}:`, error);
                    return job;
                }
            }));

            setPrintJobs(updatedJobs);
        } catch (error) {
            console.error('Error updating job progress:', error);
        }
    }, [printJobs]);

    // Initialize jobs on component mount
    useEffect(() => {
        initializePrintJobs();
    }, [initializePrintJobs]);

    // Progress update interval
    useEffect(() => {
        const interval = setInterval(updateJobProgress, POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, [updateJobProgress]);

    // Handle individual print pause/resume
    const togglePauseJob = async (job) => {
        if (!job.printerIp || !job.printerApiKey) {
            addNotification(`Cannot control ${job.fileName}: No printer connection details`);
            return;
        }

        try {
            if (job.isPaused) {
                await resumePrintJob(job.printerIp, job.printerApiKey);
                addNotification(`Resumed: ${job.fileName}`);
            } else {
                await pausePrintJob(job.printerIp, job.printerApiKey);
                addNotification(`Paused: ${job.fileName}`);
            }

            // Update the local state
            setPrintJobs(prev => prev.map(j => {
                if (j.id === job.id) {
                    return {
                        ...j,
                        isPaused: !j.isPaused
                    };
                }
                return j;
            }));
        } catch (error) {
            console.error(`Failed to ${job.isPaused ? 'resume' : 'pause'} print:`, error);
            addNotification(`Failed to ${job.isPaused ? 'resume' : 'pause'} ${job.fileName}: ${error.message}`);
        }
    };

    // Add notification to queue
    const addNotification = (message) => {
        setNotifications(prev => [{
            id: Date.now(),
            message,
            timestamp: new Date()
        }, ...prev]);
    };

    // Format time display
    const formatTimeRemaining = (minutes) => {
        if (minutes < 1) return 'Less than a minute';
        return `${Math.round(minutes)} minutes`;
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4">
                    Printing Progress
                </Typography>
                <Button
                    variant="outlined"
                    onClick={onReset}
                    startIcon={<RestartAltIcon />}
                >
                    Start Over
                </Button>
            </Stack>

            <Grid container spacing={3}>
                {printJobs.map((job) => (
                    <Grid item xs={12} md={4} key={job.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {job.fileName}
                                </Typography>
                                
                                <Typography color="textSecondary">
                                    {job.printer}
                                </Typography>

                                <Box sx={{ my: 2 }}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={job.progress} 
                                        color={job.status === 'COMPLETED' ? 'success' : 'primary'}
                                    />
                                </Box>

                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Tooltip title={job.status}>
                                        <Typography 
                                            color={job.status === 'COMPLETED' ? 'success.main' : 'primary.main'}
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                        >
                                            {job.status === 'COMPLETED' ? <CheckCircleIcon /> : <PrintIcon />}
                                            {job.status}
                                            {job.isPaused && ' (Paused)'}
                                        </Typography>
                                    </Tooltip>
                                    <Typography>
                                        {Math.round(job.progress)}%
                                    </Typography>
                                </Stack>

                                {job.status !== 'COMPLETED' && job.printerIp && job.printerApiKey && (
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => togglePauseJob(job)}
                                        startIcon={job.isPaused ? <PlayCircleIcon /> : <PauseCircleIcon />}
                                        sx={{ mt: 2 }}
                                    >
                                        {job.isPaused ? 'Resume Print' : 'Pause Print'}
                                    </Button>
                                )}

                                {job.status === 'Printing' && !job.isPaused && (
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Time remaining: {formatTimeRemaining(job.timeRemaining)}
                                    </Typography>
                                )}

                                <Typography variant="body2" sx={{ mt: 2 }}>
                                    Print settings:
                                    {Object.entries(job.printVariables).map(([key, value]) => (
                                        <Box key={key} sx={{ pl: 2 }}>
                                            {key}: {value}
                                        </Box>
                                    ))}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {notifications.length > 0 && (
                <Paper sx={{ mt: 3, p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Notifications
                    </Typography>
                    <Stack spacing={1}>
                        {notifications.slice(0, DISPLAY_NOTIFICATIONS).map(notification => (
                            <Alert 
                                key={notification.id} 
                                severity="success"
                                sx={{ display: 'flex', alignItems: 'center' }}
                            >
                                {notification.message}
                                <Typography variant="caption" sx={{ ml: 2 }}>
                                    {notification.timestamp.toLocaleTimeString()}
                                </Typography>
                            </Alert>
                        ))}
                    </Stack>
                </Paper>
            )}
        </Box>
    );
};

export default PrintingProgress;