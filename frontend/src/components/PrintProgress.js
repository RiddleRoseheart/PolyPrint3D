//TODO te testen PLUS FROTNEND ADAPTEREN
import React, { useState, useEffect, useCallback } from 'react';
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
    Tooltip,
    IconButton,
    Avatar,
    Divider,
    Chip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import { 
    getJobStatus, 
    pausePrintJob, 
    resumePrintJob, 
    cancelPrintJob 
} from '../api/endpoints/printerEndpoints';
import axiosInstance from '../api/axiosConfig';

const POLLING_INTERVAL = 10000; // Poll every 10 seconds
const DISPLAY_NOTIFICATIONS = 5; // Number of notifications to show

const PrintMonitor = () => {
    const [printJobs, setPrintJobs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshTimers, setRefreshTimers] = useState({});

    // Fetch user's active print jobs
    const fetchUserPrintJobs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/api/user/print-jobs');
            
            if (response?.data?.data) {
                const jobsWithDetails = await Promise.all(
                    response.data.data.map(async (job) => {
                        try {
                            // Get detailed status if job is printing
                            if (job.state === 'printing') {
                                const statusData = await getJobStatus(job.id);
                                return {
                                    ...job,
                                    jobInfo: statusData.data,
                                    isPaused: job.state === 'paused'
                                };
                            }
                            return {
                                ...job,
                                isPaused: job.state === 'paused'
                            };
                        } catch (error) {
                            console.error(`Error getting details for job ${job.id}:`, error);
                            return job;
                        }
                    })
                );
                
                setPrintJobs(jobsWithDetails);
            }
        } catch (error) {
            console.error('Error fetching print jobs:', error);
            setError('Unable to load your print jobs. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize on component mount
    useEffect(() => {
        fetchUserPrintJobs();
        
        // Set up polling interval
        const interval = setInterval(() => {
            fetchUserPrintJobs();
        }, POLLING_INTERVAL);
        
        return () => clearInterval(interval);
    }, [fetchUserPrintJobs]);

    // Refresh specific job
    const handleRefreshJob = async (jobId) => {
        // Show refresh indicator
        setRefreshTimers(prev => ({
            ...prev,
            [jobId]: true
        }));
        
        try {
            const statusData = await getJobStatus(jobId);
            
            // Update this specific job
            setPrintJobs(prev => prev.map(job => 
                job.id === jobId ? { 
                    ...job, 
                    jobInfo: statusData.data,
                    status: statusData.data?.status || job.status
                } : job
            ));
            
            addNotification(`Refreshed status for print job`);
        } catch (error) {
            console.error('Error refreshing job:', error);
        } finally {
            // Clear refresh indicator after 1 second
            setTimeout(() => {
                setRefreshTimers(prev => ({
                    ...prev,
                    [jobId]: false
                }));
            }, 1000);
        }
    };

    // Pause a print job
    const handlePauseJob = async (jobId) => {
        try {
            await pausePrintJob(jobId);
            
            // Update job in state
            setPrintJobs(prev => prev.map(job => 
                job.id === jobId ? { ...job, isPaused: true, state: 'paused' } : job
            ));
            
            addNotification('Print job paused successfully');
            
            // Refresh job after a brief delay to get updated status
            setTimeout(() => handleRefreshJob(jobId), 1000);
        } catch (error) {
            console.error('Error pausing job:', error);
            setError('Failed to pause print job. Please try again.');
        }
    };

    // Resume a print job
    const handleResumeJob = async (jobId) => {
        try {
            await resumePrintJob(jobId);
            
            // Update job in state
            setPrintJobs(prev => prev.map(job => 
                job.id === jobId ? { ...job, isPaused: false, state: 'printing' } : job
            ));
            
            addNotification('Print job resumed successfully');
            
            // Refresh job after a brief delay to get updated status
            setTimeout(() => handleRefreshJob(jobId), 1000);
        } catch (error) {
            console.error('Error resuming job:', error);
            setError('Failed to resume print job. Please try again.');
        }
    };

    // Cancel a print job
    const handleCancelJob = async (jobId) => {
        if (window.confirm('Are you sure you want to cancel this print job? This action cannot be undone.')) {
            try {
                await cancelPrintJob(jobId);
                
                // Update job in state
                setPrintJobs(prev => prev.map(job => 
                    job.id === jobId ? { ...job, state: 'cancelled' } : job
                ));
                
                addNotification('Print job cancelled successfully');
                
                // Refresh all jobs to get latest status
                fetchUserPrintJobs();
            } catch (error) {
                console.error('Error cancelling job:', error);
                setError('Failed to cancel print job. Please try again.');
            }
        }
    };

    // Add notification
    const addNotification = (message) => {
        setNotifications(prev => [{
            id: Date.now(),
            message,
            timestamp: new Date()
        }, ...prev].slice(0, DISPLAY_NOTIFICATIONS));
    };

    // Get color based on job state
    const getStateColor = (state) => {
        switch (state) {
            case 'printing':
                return 'info';
            case 'completed':
                return 'success';
            case 'paused':
                return 'warning';
            case 'cancelled':
            case 'error':
                return 'error';
            default:
                return 'default';
        }
    };

    // Format time HH:MM
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

    // Format filename for display
    const formatFileName = (filePath) => {
        if (!filePath) return 'Unknown';
        
        // Extract just the filename from the path
        const fileName = filePath.split(/[\\\/]/).pop();
        
        // If it's a group file, extract material and color info
        if (fileName.includes('group_')) {
            const parts = fileName.replace('.stl', '').split('_');
            if (parts.length >= 3) {
                const material = parts[1].toUpperCase();
                const color = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
                return `${color} ${material} Print`;
            }
        }
        
        return fileName;
    };
    
    // Get estimated completion time
    const getEstimatedCompletion = (job) => {
        if (!job.jobInfo || !job.jobInfo.progress || job.jobInfo.progress.completion === null) {
            return 'Calculating...';
        }
        
        const completion = job.jobInfo.progress.completion;
        const printTimeLeft = job.jobInfo.progress.printTimeLeft || 0;
        
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

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4">
                    My Print Jobs
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchUserPrintJobs}
                >
                    Refresh All
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <LinearProgress sx={{ width: '100%' }} />
                </Box>
            ) : (
                <>
                    {printJobs.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <PrintIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                No active print jobs
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                You don't have any active print jobs at the moment.
                            </Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={3}>
                            {printJobs.map(job => (
                                <Grid item xs={12} md={6} key={job.id}>
                                    <Card 
                                        variant="outlined" 
                                        sx={{ 
                                            position: 'relative',
                                            borderColor: job.state === 'printing' ? 'info.main' : 
                                                      job.state === 'paused' ? 'warning.main' : 'inherit',
                                            borderWidth: (job.state === 'printing' || job.state === 'paused') ? 2 : 1
                                        }}
                                    >
                                        {refreshTimers[job.id] && (
                                            <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
                                        )}
                                        
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Avatar 
                                                        sx={{ 
                                                            bgcolor: getStateColor(job.state) + '.light',
                                                            color: getStateColor(job.state) + '.dark',
                                                            width: 32,
                                                            height: 32
                                                        }}
                                                    >
                                                        <PrintIcon />
                                                    </Avatar>
                                                    <Typography variant="h6">
                                                        {formatFileName(job.file_path)}
                                                    </Typography>
                                                </Stack>
                                                <Chip 
                                                    label={job.state || 'Unknown'} 
                                                    color={getStateColor(job.state)}
                                                    size="small"
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                            </Stack>
                                            
                                            {/* Print details */}
                                            <Box sx={{ mt: 2 }}>
                                                <Grid container spacing={1}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Material
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {job.filaments?.[0]?.material || 'Unknown'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Color
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {job.filaments?.[0]?.color || 'Unknown'}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                                
                                                <Divider sx={{ my: 1.5 }} />
                                                
                                                {(job.state === 'printing' || job.state === 'paused') && job.jobInfo && (
                                                    <>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                            <Typography variant="body2">
                                                                {Math.round(job.jobInfo.progress?.completion || 0)}%
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                Est. finish: {getEstimatedCompletion(job)}
                                                            </Typography>
                                                        </Stack>
                                                        
                                                        <LinearProgress 
                                                            variant="determinate" 
                                                            value={job.jobInfo.progress?.completion || 0} 
                                                            sx={{ height: 8, borderRadius: 1 }}
                                                        />
                                                        
                                                        <Grid container spacing={1} sx={{ mt: 1 }}>
                                                            <Grid item xs={6}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Time Remaining
                                                                </Typography>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {formatTimeHoursMinutes(job.jobInfo.progress?.printTimeLeft)}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Elapsed Time
                                                                </Typography>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {formatTimeHoursMinutes(job.jobInfo.progress?.printTime)}
                                                                </Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </>
                                                )}
                                                
                                                {(job.state !== 'printing' && job.state !== 'paused') && (
                                                    <Box sx={{ p: 2, textAlign: 'center' }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {job.state === 'completed' ? 'Print job completed successfully!' : 
                                                             job.state === 'cancelled' ? 'Print job was cancelled' : 
                                                             job.state === 'error' ? 'Print job encountered an error' : 
                                                             'Print job is pending'}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </CardContent>
                                        
                                        {(job.state === 'printing' || job.state === 'paused') && (
                                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                                                <Tooltip title="Refresh Status">
                                                    <IconButton
                                                        onClick={() => handleRefreshJob(job.id)}
                                                        disabled={refreshTimers[job.id]}
                                                    >
                                                        <RefreshIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                
                                                <Box>
                                                    {job.state === 'printing' ? (
                                                        <Tooltip title="Pause Print">
                                                            <Button
                                                                variant="contained"
                                                                color="warning"
                                                                startIcon={<PauseCircleIcon />}
                                                                onClick={() => handlePauseJob(job.id)}
                                                                sx={{ mr: 1 }}
                                                            >
                                                                Pause
                                                            </Button>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="Resume Print">
                                                            <Button
                                                                variant="contained"
                                                                color="primary"
                                                                startIcon={<PlayCircleIcon />}
                                                                onClick={() => handleResumeJob(job.id)}
                                                                sx={{ mr: 1 }}
                                                            >
                                                                Resume
                                                            </Button>
                                                        </Tooltip>
                                                    )}
                                                    
                                                    <Tooltip title="Cancel Print">
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            startIcon={<StopIcon />}
                                                            onClick={() => handleCancelJob(job.id)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        )}
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                    
                    {notifications.length > 0 && (
                        <Paper sx={{ mt: 3, p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Notifications
                            </Typography>
                            <Stack spacing={1}>
                                {notifications.map(notification => (
                                    <Alert 
                                        key={notification.id} 
                                        severity="info"
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
                </>
            )}
        </Box>
    );
};

export default PrintMonitor;