import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import PrintProgress from './PrintProgress'; // Import the PrintingProgress component
import { getJobStatus } from '../api/endpoints/printerEndpoints'; // Import the printer endpoint

const UserProfile = ({ user }) => {
    const [printJobs, setPrintJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch the user's print jobs
    useEffect(() => {
        const fetchPrintJobs = async () => {
            try {
                if (!user || !user.printers) {
                    setPrintJobs([]);
                    return;
                }

                // Fetch the user's print jobs from the backend
                const jobs = await Promise.all(
                    user.printers.map(async (printerId) => {
                        const jobStatus = await getJobStatus(printerId);
                        return {
                            id: printerId,
                            fileName: jobStatus.fileName || `Print_${printerId}`,
                            printer: `Printer ${printerId}`,
                            status: jobStatus.state || 'UNKNOWN',
                            progress: jobStatus.progress || 0,
                            isPaused: jobStatus.state === 'PAUSED',
                            estimatedTime: jobStatus.estimatedTime || 30,
                            timeRemaining: jobStatus.timeRemaining || 30,
                            startTime: new Date(jobStatus.startTime || Date.now()),
                            printVariables: {
                                material: jobStatus.material || 'PLA',
                                quality: jobStatus.quality || '0.2mm',
                                infill: jobStatus.infill || '20%',
                                temperature: jobStatus.temperature || '200°C',
                                bedTemp: jobStatus.bedTemp || '60°C'
                            }
                        };
                    })
                );

                setPrintJobs(jobs);
            } catch (err) {
                setError('Failed to fetch print jobs. Please try again later.');
                console.error('Error fetching print jobs:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPrintJobs();
    }, [user]);

    // If the user is not logged in, show a message and a link to the login page
    if (!user) {
        return (
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        User Profile
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        You are not logged in. Please log in to view your profile.
                    </Typography>
                    <Button
                        variant="contained"
                        component={Link}
                        to="/authPage"
                    >
                        Login
                    </Button>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto', mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    User Profile
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Welcome, {user.name}!
                </Typography>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                ) : (
                    <>
                        <Typography variant="h5" gutterBottom>
                            Your Print Jobs
                        </Typography>
                        <PrintProgress 
                            selectedFiles={printJobs} 
                            onReset={() => {}} // No reset functionality in the profile
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default UserProfile;