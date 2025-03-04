// onyl simulation of print progress // todo 
import React, { useState, useEffect, useCallback } from 'react';
import { getPrintJobDetails } from './tempDivider';
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

const PRINT_SPEED = 1000; // 1 second per percent
const DISPLAY_NOTIFICATIONS = 5; // Number of notifications to show

const PrintingProgress = ({ selectedFiles, onReset }) => {
    const [printJobs, setPrintJobs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Initialize print jobs with settings
    const initializePrintJobs = useCallback(async () => {
        try {
            const jobs = await Promise.all(selectedFiles.map(async (file, index) => {
                const jobDetails = await getPrintJobDetails(ip, apiKey);
                return {
                    id: `print_${Date.now()}_${Math.random()}`,
                    fileName: file.name || `Print_${index + 1}.stl`,
                    printer: `Printer ${(index % 3) + 1}`,
                    status: jobDetails.state,
                    progress: jobDetails.completion,
                    isPaused: false,
                    estimatedTime: 30 + (Math.random() * 30),
                    timeRemaining: jobDetails.printTimeLeft / 60, // Convert seconds to minutes
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
    }, [selectedFiles, ip, apiKey]);

    // Update progress for active prints
    const updateJobProgress = useCallback(async () => {
        try {
            const updatedJobs = await Promise.all(printJobs.map(async (job) => {
                if (job.status === 'COMPLETED' || job.isPaused) return job;

                const jobDetails = await getPrintJobDetails(ip, apiKey);
                const newProgress = jobDetails.completion;
                const newStatus = newProgress === 100 ? 'COMPLETED' : jobDetails.state;
                const newTimeRemaining = jobDetails.printTimeLeft / 60; // Convert seconds to minutes

                if (newProgress === 100) {
                    addNotification(`Print completed: ${job.fileName}`);
                }

                return {
                    ...job,
                    progress: newProgress,
                    status: newStatus,
                    timeRemaining: newTimeRemaining
                };
            }));

            setPrintJobs(updatedJobs);
        } catch (error) {
            console.error('Error updating job progress:', error);
        }
    }, [printJobs, ip, apiKey]);

    // Initialize jobs on component mount
    useEffect(() => {
        initializePrintJobs();
    }, [initializePrintJobs]);

    // Progress update interval
    useEffect(() => {
        const interval = setInterval(updateJobProgress, PRINT_SPEED);
        return () => clearInterval(interval);
    }, [updateJobProgress]);

    // Handle individual print pause/resume
    const togglePauseJob = (jobId) => {
        setPrintJobs(prev => prev.map(job => {
            if (job.id === jobId) {
                const newIsPaused = !job.isPaused;
                addNotification(`${job.fileName} ${newIsPaused ? 'paused' : 'resumed'}`);
                return {
                    ...job,
                    isPaused: newIsPaused
                };
            }
            return job;
        }));
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
                                        {job.progress}%
                                    </Typography>
                                </Stack>

                                {job.status !== 'COMPLETED' && (
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => togglePauseJob(job.id)}
                                        startIcon={job.isPaused ? <PlayCircleIcon /> : <PauseCircleIcon />}
                                        sx={{ mt: 2 }}
                                    >
                                        {job.isPaused ? 'Resume Print' : 'Pause Print'}
                                    </Button>
                                )}

                                {job.status === 'PRINTING' && !job.isPaused && (
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