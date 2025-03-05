import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PrintProgress from './PrintProgress';
import { getJobStatus } from '../api/endpoints/printerEndpoints';
import { deleteUser } from '../api/endpoints/authEndpoints';
import { deleteOwnAccount } from '../api/endpoints/authEndpoints';

const UserProfile = ({ user, onLogout }) => {
    const [printJobs, setPrintJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const navigate = useNavigate();

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

    const handleDeleteAccount = async () => {
        try {
            await deleteOwnAccount();
            setDeleteSuccess(true);
            setDeleteDialogOpen(false);
            
            // Force logout immediately
            if (onLogout) {
                onLogout(); // This should clear the user state in your app
            }
            
            // Clear any session/local storage data
            localStorage.removeItem('user'); // if you store user data in localStorage
            sessionStorage.clear(); // Clear any session data
            
            // A brief timeout before redirecting to homepage
            setTimeout(() => {
                // Force a complete page reload to ensure all state is reset
                window.location.href = '/';
            }, 1500);
        } catch (error) {
            console.log("Delete account error:", error);
            // Still perform all the logout steps even on error
            if (onLogout) {
                onLogout();
            }
            
            localStorage.removeItem('user');
            sessionStorage.clear();
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        }
    };

    const openDeleteDialog = () => {
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
    };

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

                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #eee' }}>
                    <Typography variant="h6" color="error" gutterBottom>
                        Account Management
                    </Typography>
                    <Button 
                        variant="outlined" 
                        color="error"
                        onClick={openDeleteDialog}
                        sx={{ mt: 1 }}
                    >
                        Delete My Account
                    </Button>
                </Box>
            </Paper>

            {/* Delete Account Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={closeDeleteDialog}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    {"Are you sure you want to delete your account?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        This action cannot be undone. All your data, including print history and personal information,
                        will be permanently deleted from our system.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteDialog}>Cancel</Button>
                    <Button onClick={handleDeleteAccount} color="error" autoFocus>
                        Delete Account
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Notification */}
            <Snackbar
                open={deleteSuccess}
                autoHideDuration={6000}
                onClose={() => setDeleteSuccess(false)}
                message="Your account has been successfully deleted. You will be redirected to the homepage."
            />
        </Box>
    );
};

export default UserProfile;