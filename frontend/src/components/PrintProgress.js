import React, { useState, useEffect } from 'react';
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
    IconButton
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { LoadingButton } from '@mui/lab';

const PrintingProgress = ({ selectedFiles, printerAssignments }) => {
    const [printJobs, setPrintJobs] = useState([]);
    const [error, setError] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

//TODO add preview again or merge with previous


    // Mock //TODO should come from backend
    const [printerStatuses, setPrinterStatuses] = useState({
        'Printer 1': { status: 'PRINTING', progress: 0 },
        'Printer 2': { status: 'PRINTING', progress: 0 },
        'Printer 3': { status: 'PRINTING', progress: 0 },
    });

    useEffect(() => {
        initializePrintJobs();
        startProgressSimulation();
        return () => clearAllIntervals();
    }, []);

    const initializePrintJobs = () => {
        // Mock initialization
        const jobs = selectedFiles.map((file, index) => ({
            id: `job_${index}`,
            fileName: file.name,
            printer: `Printer ${(index % 3) + 1}`,
            status: 'QUEUED',
            progress: 0,
            printVariables: {
                material: file.material,
                quality: file.quality,
                infill: file.infill
            }
        }));
        setPrintJobs(jobs);
        setIsLoading(false);

        /* //TODO API implementation
        const initializePrints = async () => {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/printer/batch`, {
                    files: selectedFiles,
                    printerAssignments
                });
                
                setPrintJobs(response.data.jobs);
                startPrinterMonitoring(response.data.jobs);
            } catch (error) {
                setError('Failed to initialize print jobs: ' + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        initializePrints();
        */
    };

    const startProgressSimulation = () => {
        // Mock 
        const intervals = printJobs.map(job => {
            return setInterval(() => {
                setPrintJobs(prev => prev.map(j => {
                    if (j.id === job.id) {
                        const newProgress = Math.min(j.progress + 1, 100);
                        const newStatus = newProgress === 100 ? 'COMPLETED' : 'PRINTING';
                        
                        if (newProgress === 100) {
                            addNotification(`Print completed: ${j.fileName}`);
                        }
                        
                        return { ...j, progress: newProgress, status: newStatus };
                    }
                    return j;
                }));
            }, 1000);
        });

        return () => intervals.forEach(clearInterval);
    };

    /* //TODO API implementation
    const startPrinterMonitoring = (jobs) => {
        const monitorInterval = setInterval(async () => {
            try {
                const statuses = await Promise.all(
                    jobs.map(job => 
                        axios.get(`${API_BASE_URL}/api/printer/status/${job.id}`)
                    )
                );
                
                const updatedJobs = jobs.map((job, index) => ({
                    ...job,
                    ...statuses[index].data
                }));
                
                setPrintJobs(updatedJobs);
                
                // Check for completed prints
                updatedJobs.forEach(job => {
                    if (job.status === 'COMPLETED') {
                        addNotification(`Print completed: ${job.fileName}`);
                    }
                });
                
                // Stop monitoring if all jobs are done
                if (updatedJobs.every(job => 
                    ['COMPLETED', 'FAILED'].includes(job.status)
                )) {
                    clearInterval(monitorInterval);
                }
            } catch (error) {
                setError('Error monitoring print jobs: ' + error.message);
            }
        }, 5000);

        return () => clearInterval(monitorInterval);
    };
    */

    const addNotification = (message) => {
        setNotifications(prev => [...prev, {
            id: Date.now(),
            message,
            timestamp: new Date()
        }]);
    };

    const clearAllIntervals = () => {
        const interval_id = window.setInterval(() => {}, Number.MAX_SAFE_INTEGER);
        for (let i = 1; i < interval_id; i++) {
            window.clearInterval(i);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'success.main';
            case 'PRINTING': return 'primary.main';
            case 'FAILED': return 'error.main';
            default: return 'text.secondary';
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Typography variant="h4" gutterBottom>
                Printing Progress
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

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
                                        color={job.status === 'FAILED' ? 'error' : 'primary'}
                                    />
                                </Box>

                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography 
                                        color={getStatusColor(job.status)}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                    >
                                        {job.status === 'COMPLETED' && <CheckCircleIcon />}
                                        {job.status === 'FAILED' && <ErrorIcon />}
                                        {job.status === 'PRINTING' && <PrintIcon />}
                                        {job.status}
                                    </Typography>
                                    <Typography>
                                        {job.progress}%
                                    </Typography>
                                </Stack>

                                <Typography variant="body2" sx={{ mt: 2 }}>
                                    Print variables:
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
                        {notifications.map(notification => (
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