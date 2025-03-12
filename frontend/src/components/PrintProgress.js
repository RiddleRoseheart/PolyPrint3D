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
    Button,
    Divider,
    CircularProgress,
    Chip,
    Fade
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import axiosInstance from '../api/axiosConfig';

const PrintProgress = ({ selectedFiles, onReset }) => {
    const [printers, setPrinters] = useState([]);
    const [printJobs, setPrintJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    // Fetch both printers and print jobs on load
    useEffect(() => {
        fetchData();
        
        // Poll for updates
        const interval = setInterval(() => {
            // Use silent refresh for polling
            refreshData(true);
        }, 15000);
        
        return () => clearInterval(interval);
    }, []);

    // Initial data load
    const fetchData = async () => {
        try {
            setLoading(true);
            
            // First get all printers
            const printersResponse = await axiosInstance.get('/api/admin/printers');
            if (printersResponse?.data?.data?.printers) {
                setPrinters(printersResponse.data.data.printers);
            }
            
            // Then get user's print requests
            const requestsResponse = await axiosInstance.get('/api/slicer/requests');
            if (requestsResponse?.data?.data?.print_requests) {
                setPrintJobs(requestsResponse.data.data.print_requests);
            }
            
            setError('');
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load print information');
        } finally {
            setLoading(false);
        }
    };

    // Refresh data without showing loading state
    const refreshData = async (silent = false) => {
        if (refreshing) return;
        
        try {
            setRefreshing(true);
            
            // Get printer data
            const printersResponse = await axiosInstance.get('/api/admin/printers');
            const newPrinters = printersResponse?.data?.data?.printers || [];
            
            // Get print request data
            const requestsResponse = await axiosInstance.get('/api/slicer/requests');
            const newJobs = requestsResponse?.data?.data?.print_requests || [];
            
            // Update state with new data
            setPrinters(newPrinters);
            setPrintJobs(newJobs);
            
        } catch (error) {
            console.error('Error refreshing data:', error);
            if (!silent) {
                setError('Failed to refresh data. Please try again.');
            }
        } finally {
            setRefreshing(false);
        }
    };

    // Find printer associated with a print job
    const getPrinterForJob = (jobId) => {
        return printers.find(printer => 
            printer.active_print_request && printer.active_print_request.id === jobId
        );
    };

    const formatTimeRemaining = (seconds, printer) => {
        // Direct seconds handling
        if (seconds && seconds > 0) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
        }
    
        // Fallback to OctoPrint specific parsing
        if (printer?.job_info?.progress) {
            const progress = printer.job_info.progress;
            
            // Direct printTimeLeft from OctoPrint
            if (progress.printTimeLeft) {
                const leftMinutes = Math.floor(progress.printTimeLeft / 60);
                return `${leftMinutes}m`;
            }
    
            // Alternative calculation using total and current time
            if (progress.printTimeTotal && progress.printTime) {
                const totalMinutes = Math.floor(progress.printTimeTotal / 60);
                const currentMinutes = Math.floor(progress.printTime / 60);
                const remainingMinutes = totalMinutes - currentMinutes;
                
                return remainingMinutes > 0 ? `${remainingMinutes}m` : 'Almost done';
            }
        }
    
        return 'Unknown';
    };
    
    const getEstimatedFinishTime = (printer) => {
        // Direct time left handling
        if (printer?.job_info?.progress?.printTimeLeft) {
            const timeLeftSeconds = printer.job_info.progress.printTimeLeft;
            const now = new Date();
            const completionTime = new Date(now.getTime() + timeLeftSeconds * 1000);
            return completionTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    
        // Fallback calculations
        const progress = printer?.job_info?.progress;
        if (progress) {
            const totalTime = progress.printTimeTotal;
            const currentTime = progress.printTime;
    
            if (totalTime && currentTime) {
                const timeLeftSeconds = totalTime - currentTime;
                if (timeLeftSeconds > 0) {
                    const now = new Date();
                    const completionTime = new Date(now.getTime() + timeLeftSeconds * 1000);
                    return completionTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            }
        }
    
        return 'Calculating...';
    };
    


    // Control functions
    const handlePause = async (jobId) => {
        const printer = getPrinterForJob(jobId);
        if (!printer) {
            setError('Cannot find printer for this job');
            return;
        }
        
        try {
            await axiosInstance.post(`/api/admin/printers/${printer.id}/pause`);
            
            // Update local state immediately for UI feedback
            setPrinters(current => 
                current.map(p => 
                    p.id === printer.id 
                        ? {...p, status: 'Paused'} 
                        : p
                )
            );
            
            // Then refresh data after a brief delay
            setTimeout(() => refreshData(true), 1000);
        } catch (error) {
            console.error('Failed to pause print:', error);
            setError('Failed to pause print');
        }
    };

    const handleResume = async (jobId) => {
        const printer = getPrinterForJob(jobId);
        if (!printer) {
            setError('Cannot find printer for this job');
            return;
        }
        
        try {
            await axiosInstance.post(`/api/admin/printers/${printer.id}/resume`);
            
            // Update local state immediately for UI feedback
            setPrinters(current => 
                current.map(p => 
                    p.id === printer.id 
                        ? {...p, status: 'Printing'} 
                        : p
                )
            );
            
            // Then refresh data after a brief delay
            setTimeout(() => refreshData(true), 1000);
        } catch (error) {
            console.error('Failed to resume print:', error);
            setError('Failed to resume print');
        }
    };

    const handleCancel = async (jobId) => {
        const printer = getPrinterForJob(jobId);
        if (!printer) {
            setError('Cannot find printer for this job');
            return;
        }
        
        if (window.confirm('Are you sure you want to cancel this print?')) {
            try {
                await axiosInstance.post(`/api/admin/printers/${printer.id}/cancel`);
                
                // Update local state immediately for UI feedback
                setPrinters(current => 
                    current.map(p => 
                        p.id === printer.id 
                            ? {...p, status: 'Operational', active_print_request: null} 
                            : p
                    )
                );
                
                // Then refresh data after a brief delay
                setTimeout(() => refreshData(true), 1000);
            } catch (error) {
                console.error('Failed to cancel print:', error);
                setError('Failed to cancel print');
            }
        }
    };

    // Render user's active prints
    const renderActivePrints = () => {
        // Find jobs that have active printers
        const activeJobs = printJobs.filter(job => 
            printers.some(printer => 
                printer.active_print_request && printer.active_print_request.id === job.id
            )
        );
        
        if (activeJobs.length === 0) {
            return (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <PrintIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6">No active print jobs</Typography>
                </Paper>
            );
        }
        
        return (
            <Grid container spacing={3}>
                {activeJobs.map(job => {
                    const printer = getPrinterForJob(job.id);
                    return (
                        <Grid item xs={12} md={6} key={job.id}>
                            <Card 
                                variant="outlined" 
                                sx={{ 
                                    borderColor: printer?.status === 'Printing' ? 'primary.main' : 
                                                 printer?.status === 'Paused' ? 'warning.main' : 'inherit',
                                    borderWidth: printer ? 2 : 1,
                                    position: 'relative'
                                }}
                            >
                                {/* Show subtle refresh indicator */}
                                {refreshing && (
                                    <LinearProgress 
                                        sx={{ 
                                            position: 'absolute', 
                                            top: 0, 
                                            left: 0, 
                                            right: 0, 
                                            height: 2 
                                        }} 
                                    />
                                )}
                                
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="h6" noWrap sx={{ maxWidth: 200 }}>
                                            {formatFileName(job.file_path)}
                                        </Typography>
                                        <Chip 
                                            label={printer?.status || 'Unknown'} 
                                            color={getStateColor(printer?.status)}
                                            size="small"
                                        />
                                    </Stack>
                                    
                                    {/* Progress from printer job info */}
                                    {printer && (
                                        <Box sx={{ my: 2 }}>
                                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                                <Typography variant="body2">
                                                    {printer.job_info?.progress?.completion !== undefined 
                                                        ? `${Math.round(printer.job_info.progress.completion)}%` 
                                                        : 'Calculating...'}
                                                </Typography>
                                                <Typography variant="body2">
                                                    Est. finish: {getEstimatedFinishTime(printer)}
                                                </Typography>
                                            </Stack>
                                            
                                            <LinearProgress 
                                                variant={printer.job_info?.progress?.completion !== undefined 
                                                    ? "determinate" 
                                                    : "indeterminate"}
                                                value={printer.job_info?.progress?.completion || 0}
                                                color={printer.status === 'Paused' ? "warning" : "primary"}
                                                sx={{ height: 8, borderRadius: 1 }}
                                            />
                                            
                                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Time Remaining
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {formatTimeRemaining(
                                                            printer.job_info?.progress?.printTimeLeft, 
                                                            printer
                                                        )}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Elapsed Time
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {formatTimeRemaining(
                                                            printer.job_info?.progress?.printTime, 
                                                            printer
                                                        )}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                            
                                            {/* Additional job info */}
                                            {printer.job_info && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    {printer.job_info.progress?.filamentUsed && 
                                                        `Filament: ${printer.job_info.progress.filamentUsed}`}
                                                    {printer.job_info.progress?.printTimeTotal && 
                                                        ` • Total Time: ${formatTimeRemaining(
                                                            printer.job_info.progress.printTimeTotal, 
                                                            printer
                                                        )}`}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                    
                                    <Divider sx={{ my: 1.5 }} />
                                    
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Printer:</strong> {printer?.name || 'Unknown'}
                                    </Typography>
                                    
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Material:</strong> {job.filaments?.[0]?.material || 'Unknown'}
                                    </Typography>
                                    
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Color:</strong> {job.filaments?.[0]?.color || 'Unknown'}
                                    </Typography>
                                    
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Infill:</strong> {job.filling || '0'}%
                                    </Typography>
                                    
                                    {/* Control buttons */}
                                    {printer && (
                                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                                            {printer.status === 'Printing' ? (
                                                <Button
                                                    variant="contained"
                                                    color="warning"
                                                    startIcon={<PauseIcon />}
                                                    onClick={() => handlePause(job.id)}
                                                >
                                                    Pause
                                                </Button>
                                            ) : printer.status === 'Paused' ? (
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    startIcon={<PlayArrowIcon />}
                                                    onClick={() => handleResume(job.id)}
                                                >
                                                    Resume
                                                </Button>
                                            ) : (
                                                <Button variant="contained" disabled>
                                                    Control
                                                </Button>
                                            )}
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<StopIcon />}
                                                onClick={() => handleCancel(job.id)}
                                                disabled={!['Printing', 'Paused'].includes(printer.status)}
                                            >
                                                Cancel
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        );
    };

    // Helper functions (added missing ones)
    const formatFileName = (filePath) => {
        if (!filePath) return 'Unknown';
        const parts = filePath.split(/[\\\/]/);
        return parts[parts.length - 1];
    };

    const getStateColor = (state) => {
        if (!state) return 'default';
        
        switch (state.toLowerCase()) {
            case 'printing': return 'primary';
            case 'paused': return 'warning';
            case 'completed': return 'success';
            case 'cancelled': case 'error': return 'error';
            case 'operational': return 'success';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">My Print Jobs</Typography>
                <Stack direction="row" spacing={2}>
                    <Button 
                        variant="outlined" 
                        startIcon={<RefreshIcon />} 
                        onClick={() => refreshData()}
                        disabled={refreshing}
                    >
                        Refresh
                    </Button>
                    <Button 
                        variant="outlined" 
                        startIcon={<RestartAltIcon />} 
                        onClick={onReset}
                    >
                        Start Over
                    </Button>
                </Stack>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Fade in={true}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    renderActivePrints()
                )}
            </Fade>
        </Box>
    );
};

export default PrintProgress;