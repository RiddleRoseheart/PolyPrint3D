import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container, Typography, Stepper, Step, StepLabel, Alert, CircularProgress, Paper } from '@mui/material';
import PrintSettings from './components/PrintSettings';
import STLFileUpload from './components/STLFileUpload';
import SlicedFilesPreview from './components/SlicedFilesPreview';
import PrintingProgress from './components/PrintProgress';
import Landing from './components/Landing';
import AuthPage from './components/authPage';
import Navbar from './components/Navbar';
import UserProfile from './components/UserProfile';
import { getCurrentUser } from './api/endpoints/authEndpoints'; 
import PrinterAdmin from './components/Admin/PrinterAdmin';
import { checkLocalMode } from './api/endpoints/configEndpoints';

const STEPS = [
  'Upload STL File',
  'Configure Print Settings',
  'Preview Slices',
  'Print Progress'
];

function App() {
    const [user, setUser] = useState(null);
    const [isLocalMode, setIsLocalMode] = useState(false);
    const [appState, setAppState] = useState({
        data: null,
        error: null,
        uploadedFile: null,
        slicingResult: null,
        printStarted: null,
        isLoading: true // Start with isLoading true to check auth status
    });

    // Check authentication status and local mode on app load
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Check if in local mode
                const localModeStatus = await checkLocalMode();
                setIsLocalMode(localModeStatus.isLocalMode);

                // Get current user
                const userData = await getCurrentUser();
                setUser(userData); // Set the user if logged in
            } catch (error) {
                if (error.message !== "Not authenticated") {
                    console.error("Error during initialization:", error);
                }
                setUser(null); // No user is logged in
            } finally {
                setAppState(prev => ({ ...prev, isLoading: false })); // Stop loading
            }
        };

        fetchInitialData();
    }, []);

    const getActiveStep = () => {
        if (!appState.uploadedFile) return 0;
        if (!appState.slicingResult) return 1;
        if (!appState.printStarted) return 2;
        return 3;
    };

    const handleFileUploaded = (fileData) => {
        setAppState(prev => ({
            ...prev,
            error: null,
            uploadedFile: fileData
        }));
    };

    const handleSlicingComplete = (result) => {
        setAppState(prev => ({
            ...prev,
            error: null,
            slicingResult: result
        }));
    };

    const handlePrintStart = (printData) => {
        setAppState(prev => ({
            ...prev,
            error: null,
            printStarted: printData
        }));
    };

    const handleReset = () => {
        setAppState({
            data: appState.data,
            error: null,
            uploadedFile: null,
            slicingResult: null,
            printStarted: null,
            isLoading: false
        });
    };

    const handleError = (errorMessage) => {
        setAppState(prev => ({
            ...prev,
            error: errorMessage
        }));
    };

    const LocalModeBanner = () => (
        <Paper 
            elevation={0}
            sx={{
                backgroundColor: '#fff3cd',
                color: '#856404',
                p: 2,
                mb: 3,
                borderRadius: 1,
                border: '1px solid #ffeeba',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Typography variant="body1">
                <strong>Network Connection Mode:</strong> You are not on the same network as the printers. 
                Direct printing is unavailable, but you can download files for manual printing.
            </Typography>
        </Paper>
    );

    // Show loading spinner while checking auth status
    if (appState.isLoading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '100vh' 
                }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    // Protected route component for admin-only access
    const ProtectedAdminRoute = ({ children }) => {
        // Check if user exists and has admin role
        if (!user || user.role !== 'admin') {
            return <Navigate to="/Landing" />;
        }
        
        return children;
    };

    // Redirect logged-in users based on their role
    const LoginRedirect = () => {
        // If no user is logged in, show the auth page
        if (!user) {
            return <Navigate to="/authPage" />;
        }
        
        // If user is an admin, redirect to admin page
        if (user.role === 'admin') {
            return <Navigate to="/admin" />;
        }
        
        // Regular users go to the landing page
        return <Navigate to="/Landing" />;
    };

    const renderCurrentStep = () => {
        if (!appState.uploadedFile) {
            return <STLFileUpload onFileUploaded={handleFileUploaded} />;
        }
        
        if (!appState.slicingResult) {
            return (
                <PrintSettings
                    fileData={appState.uploadedFile}
                    onSlicingComplete={handleSlicingComplete}
                    onReset={handleReset}
                />
            );
        }
        
        if (!appState.printStarted) {
            return (
                <SlicedFilesPreview
                    slicingResult={appState.slicingResult}
                    onPrintStart={handlePrintStart}
                    onReset={handleReset}
                    isLocalMode={isLocalMode} 
                />
            );
        }
        
        return (
            <PrintingProgress
                selectedFiles={appState.printStarted}
                onReset={handleReset}
                onError={handleError}
            />
        );
    };

    return (
        <Router>
            <Navbar user={user} setUser={setUser} />
            <Routes>
                {/* Add a login redirect route */}
                <Route path="/login-redirect" element={<LoginRedirect />} />
                
                {/* Admin route - protected */}
                <Route 
                    path="/admin" 
                    element={
                        <ProtectedAdminRoute>
                            <PrinterAdmin />
                        </ProtectedAdminRoute>
                    } 
                />
                
                <Route path="/Landing" element={<Landing user={user} />} />
                
                <Route 
                    path="/authPage" 
                    element={
                        user ? (
                            // If user is already logged in, redirect based on role
                            <Navigate to="/login-redirect" />
                        ) : (
                            <AuthPage user={user} setUser={setUser} />
                        )
                    } 
                />
                
                <Route 
                    path="/userProfile" 
                    element={
                        user ? <UserProfile user={user} /> : <Navigate to="/authPage" />
                    } 
                />
                
                <Route
                    path="/"
                    element={
                        <Container maxWidth="lg">
                            <Box sx={{ py: 4 }}>
                                <Box sx={{ mb: 4, textAlign: 'center' }}>
                                    <Typography variant="h3" component="h1" gutterBottom>
                                        3D Print Workflow
                                    </Typography>
                                    {appState.data && (
                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                            {appState.data}
                                        </Typography>
                                    )}
                                </Box>

                                 {/* Display local mode banner if active */}
                                 {isLocalMode && <LocalModeBanner />}

                                <Stepper 
                                    activeStep={getActiveStep()} 
                                    sx={{ mb: 4 }}
                                    alternativeLabel
                                >
                                    {STEPS.map((label) => (
                                        <Step key={label}>
                                            <StepLabel>{label}</StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>

                                {appState.error && (
                                    <Alert 
                                        severity="error" 
                                        sx={{ mb: 3 }}
                                        onClose={() => setAppState(prev => ({ ...prev, error: null }))}
                                    >
                                        {appState.error}
                                    </Alert>
                                )}

                                <Box 
                                    sx={{ 
                                        width: '100%', 
                                        p: 2,
                                        minHeight: '60vh',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {renderCurrentStep()}
                                </Box>
                            </Box>
                        </Container>
                    }
                />
                <Route path="*" element={<Navigate to="/Landing" />} />
            </Routes>
        </Router>
    );
}

export default App;