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
    Fade,
    Zoom,
    IconButton,
    Divider,
    ThemeProvider,
    createTheme,
    CssBaseline
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';

// Create a monochrome theme
const theme = createTheme({
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5) !important',
          borderWidth: '1px !important',
          borderStyle: 'solid !important',
          borderColor: '#222222 !important',
          borderRadius: '0 !important',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5) !important',
          borderWidth: '1px !important',
          borderStyle: 'solid !important',
          borderColor: '#222222 !important',
          borderRadius: '0 !important',
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px !important',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0 !important',
          padding: '10px 16px !important',
          boxShadow: 'none !important',
        }
      }
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h4: {
      fontWeight: 900,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    }
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff',
      light: '#ffffff',
      dark: '#aaaaaa',
    },
    background: {
      default: '#000000',
      paper: '#111111',
    },
    text: {
      primary: '#ffffff',
      secondary: '#aaaaaa',
    }
  }
});

const PRINT_SPEED = 1000; // 1 second per percent
const DISPLAY_NOTIFICATIONS = 5; // Number of notifications to show

const PrintingProgress = ({ selectedFiles, onReset }) => {
    const [printJobs, setPrintJobs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Use some sample files if none are provided
    const files = selectedFiles || [
        { name: 'Print_1.stl', material: 'PLA', quality: '0.2mm', infill: '20%' },
        { name: 'Print_2.stl', material: 'PETG', quality: '0.15mm', infill: '30%' },
        { name: 'Print_3.stl', material: 'ABS', quality: '0.1mm', infill: '50%' }
    ];

    // Initialize print jobs with settings
    const initializePrintJobs = useCallback(() => {
        const jobs = files.map((file, index) => ({
            id: `print_${Date.now()}_${index}`,
            fileName: file.name || `Print_${index + 1}.stl`,
            printer: `Printer ${(index % 3) + 1}`,
            status: 'PRINTING',
            progress: Math.floor(Math.random() * 30), // Start at different progress points
            isPaused: false,
            estimatedTime: 30 + (Math.random() * 30),
            timeRemaining: 30,
            startTime: new Date(),
            printVariables: {
                material: file.material || 'PLA',
                quality: file.quality || '0.2mm',
                infill: file.infill || '20%',
                temperature: '200°C',
                bedTemp: '60°C'
            }
        }));

        setPrintJobs(jobs);
    }, [files]);

    // Update progress for active prints
    const updateJobProgress = useCallback(() => {
        setPrintJobs(prev => prev.map(job => {
            if (job.status === 'COMPLETED' || job.isPaused) return job;

            const newProgress = Math.min(job.progress + 1, 100);
            const newStatus = newProgress === 100 ? 'COMPLETED' : 'PRINTING';
            const newTimeRemaining = Math.max(
                0, 
                job.estimatedTime * (100 - newProgress) / 100
            );

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
    }, []);

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

    // Clear notifications
    const clearNotifications = () => {
        setNotifications([]);
    };

    // Format time display
    const formatTimeRemaining = (minutes) => {
        if (minutes < 1) return 'Less than a minute';
        return `${Math.round(minutes)} minutes`;
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {/* Main Container */}
            <Box sx={{ 
                maxWidth: 1200, 
                mt: 4, 
                bgcolor: '#000000',
                border: '1px solid rgb(61, 61, 61)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                p: 4
            }}>
                {/* Header */}
                <Fade in={true} timeout={500}>
                    <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        justifyContent="space-between" 
                        alignItems={{ xs: 'stretch', sm: 'center' }} 
                        sx={{ 
                            mb: 4, 
                            bgcolor: '#111111', 
                            p: 3, 
                            border: '1px solid #222222',
                        }}
                    >
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                fontWeight: 900, 
                                color: '#ffffff',
                                mb: { xs: 2, sm: 0 },
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Printing Progress
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={onReset}
                            startIcon={<RestartAltIcon />}
                            sx={{
                                border: '2px solid white',
                                color: 'white',
                                padding: '12px 24px !important',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                letterSpacing: '0.05em',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: 'white',
                                    color: 'black',
                                    borderColor: 'white',
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3) !important'
                                }
                            }}
                        >
                            START OVER
                        </Button>
                    </Stack>
                </Fade>

                {/* Print Jobs Grid */}
                <Grid container spacing={3}>
                    {printJobs.map((job) => (
                        <Grid item xs={12} sm={6} md={4} key={job.id}>
                            <Zoom in={true} style={{ transitionDelay: `${job.id.split('_')[2] * 100}ms` }}>
                                <Card
                                    sx={{
                                        border: '2px solid rgb(255, 254, 254) !important',
                                        background: '#111111',
                                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-5px)',
                                            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5) !important',
                                            borderColor: '#333333 !important'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3}}>
                                        {/* File Name and Printer */}
                                        <Box sx={{ 
                                            mb: 3, 
                                            bgcolor: '#0a0a0a', 
                                            p: 2, 
                                            border: '1px solid #222222',
                                        }}>
                                            <Typography 
                                                variant="h6" 
                                                gutterBottom 
                                                sx={{ 
                                                    fontWeight: 'bold', 
                                                    color: '#ffffff',
                                                    fontSize: '1.25rem',
                                                    letterSpacing: '0.02em'
                                                }}
                                            >
                                                {job.fileName}
                                            </Typography>
                                            <Typography 
                                                sx={{ 
                                                    fontSize: '1rem',
                                                    color: '#aaaaaa',
                                                    fontWeight: 300,
                                                    letterSpacing: '0.02em'
                                                }}
                                            >
                                                {job.printer}
                                            </Typography>
                                        </Box>

                                        {/* Progress Bar */}
                                        <Box sx={{ 
                                            mb: 3,
                                            p: 2,
                                            bgcolor: '#0a0a0a',
                                            border: '1px solid #222222',
                                        }}>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={job.progress} 
                                                sx={{
                                                    height: 16,
                                                    mb: 2,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: '#ffffff'
                                                    }
                                                }}
                                            />
                                            
                                            {/* Status and Progress Percentage */}
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography 
                                                    sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: 1, 
                                                        fontWeight: 600,
                                                        fontSize: '0.95rem',
                                                        color: '#ffffff'
                                                    }}
                                                >
                                                    {job.status === 'COMPLETED' ? <CheckCircleIcon /> : <PrintIcon />}
                                                    {job.status}
                                                    {job.isPaused && ' (Paused)'}
                                                </Typography>
                                                <Typography sx={{ 
                                                    fontWeight: 'bold', 
                                                    color: '#ffffff',
                                                    fontSize: '1.2rem'
                                                }}>
                                                    {job.progress}%
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        {/* Pause/Resume Button */}
                                        {job.status !== 'COMPLETED' && (
                                            <Box sx={{ mb: 3 }}>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    onClick={() => togglePauseJob(job.id)}
                                                    startIcon={job.isPaused ? <PlayCircleIcon /> : <PauseCircleIcon />}
                                                    sx={{ 
                                                        p: '14px !important',
                                                        border: '2px solid white',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        letterSpacing: '0.05em',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            backgroundColor: 'white',
                                                            color: 'black',
                                                            borderColor: 'white',
                                                            transform: 'translateY(-3px)',
                                                            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3) !important'
                                                        }
                                                    }}
                                                >
                                                    {job.isPaused ? 'RESUME PRINT' : 'PAUSE PRINT'}
                                                </Button>
                                            </Box>
                                        )}

                                        {/* Time Remaining */}
                                        {job.status === 'PRINTING' && !job.isPaused && (
                                            <Box sx={{ 
                                                mb: 3,
                                                p: 2,
                                                bgcolor: '#0a0a0a',
                                                border: '1px solid #222222',
                                                textAlign: 'center'
                                            }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 300, color: '#aaaaaa' }}>
                                                    Time remaining:
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
                                                    {formatTimeRemaining(job.timeRemaining)}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Print Settings */}
                                        <Paper elevation={0} sx={{ 
                                            p: 3, 
                                            border: '1px solid #222222 !important',
                                            backgroundColor: '#0a0a0a'
                                        }}>
                                            <Typography 
                                                variant="subtitle1" 
                                                sx={{ 
                                                    fontWeight: 600, 
                                                    color: '#ffffff', 
                                                    mb: 2,
                                                    borderBottom: '1px solid #333333',
                                                    pb: 1,
                                                    letterSpacing: '0.02em'
                                                }}
                                            >
                                                Print Settings:
                                            </Typography>
                                            {Object.entries(job.printVariables).map(([key, value]) => (
                                                <Box 
                                                    key={key} 
                                                    sx={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        mb: 1.5,
                                                        pb: 1,
                                                        borderBottom: '1px solid #222222'
                                                    }}
                                                >
                                                    <Typography 
                                                        variant="body1" 
                                                        sx={{ color: '#aaaaaa', fontWeight: 300 }}
                                                    >
                                                        {key}:
                                                    </Typography>
                                                    <Typography 
                                                        variant="body1" 
                                                        sx={{ color: '#ffffff', fontWeight: 500 }}
                                                    >
                                                        {value}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Paper>
                                    </CardContent>
                                </Card>
                            </Zoom>
                        </Grid>
                    ))}
                </Grid>

                {/* Notifications */}
                {notifications.length > 0 && (
                    <Fade in={true} timeout={500}>
                        <Paper 
                            elevation={0}
                            sx={{ 
                                mt: 4, 
                                p: 3,
                                background: '#111111',
                                border: '1px solid #222222 !important',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography 
                                    variant="h6" 
                                    sx={{ 
                                        fontWeight: 600, 
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        letterSpacing: '0.02em'
                                    }}
                                >
                                    <NotificationsIcon sx={{ mr: 1, fontSize: '1.5rem' }} />
                                    Notifications
                                </Typography>
                                <IconButton 
                                    onClick={clearNotifications} 
                                    size="small"
                                    sx={{
                                        color: '#aaaaaa',
                                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid #333333',
                                        '&:hover': {
                                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                                            color: '#ffffff'
                                        }
                                    }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                            <Divider sx={{ mb: 2, borderColor: '#333333' }} />
                            <Stack spacing={2}>
                                {notifications.slice(0, DISPLAY_NOTIFICATIONS).map(notification => (
                                    <Alert 
                                        key={notification.id} 
                                        severity="success"
                                        sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            padding: '12px 16px !important',
                                            border: '1px solid rgba(255, 255, 255, 0.2) !important',
                                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                            fontSize: '1rem',
                                            color: '#ffffff',
                                            '& .MuiAlert-icon': {
                                                color: '#ffffff'
                                            }
                                        }}
                                    >
                                        <Typography variant="body1" sx={{ fontWeight: 400, color: '#ffffff' }}>
                                            {notification.message}
                                        </Typography>
                                        <Typography variant="caption" sx={{ ml: 2, color: '#aaaaaa', fontWeight: 300 }}>
                                            {notification.timestamp.toLocaleTimeString()}
                                        </Typography>
                                    </Alert>
                                ))}
                            </Stack>
                        </Paper>
                    </Fade>
                )}
            </Box>
        </ThemeProvider>
    );
};

export default PrintingProgress;