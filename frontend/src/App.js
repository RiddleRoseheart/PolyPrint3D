import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  Alert, 
  CircularProgress,
  createTheme,
  ThemeProvider,
  CssBaseline,
  Paper
} from '@mui/material';
import PrintSettings from './components/PrintSettings';
import STLFileUpload from './components/STLFileUpload';
import SlicedFilesPreview from './components/SlicedFilesPreview';
import PrintingProgress from './components/PrintProgress';
import Landing from './components/Landing';
import AuthPage from './components/authPage';
import Navbar from './components/Navbar';
import UserProfile from './components/UserProfile';
import PrinterAdmin from './components/Admin/PrinterAdmin';
import AdminInfo from './components/AdminInfo';
import StarsBackground from './components/StarsBackground'; // Import the new component
import { getCurrentUser } from './api/endpoints/authEndpoints';

// Create a custom theme with monochrome black and white styling
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff',
      light: '#ffffff',
      dark: '#cccccc',
    },
    secondary: {
      main: '#aaaaaa',
      light: '#dddddd',
      dark: '#666666',
    },
    error: {
      main: '#ffffff',
    },
    warning: {
      main: '#cccccc',
    },
    info: {
      main: '#aaaaaa',
    },
    success: {
      main: '#ffffff',
    },
    background: {
      default: '#000000',
      paper: '#111111',
    },
    text: {
      primary: '#ffffff',
      secondary: '#aaaaaa',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 900,
      letterSpacing: '-0.05em',
    },
    h2: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 900,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 700,
    },
    body1: {
      fontWeight: 300,
      letterSpacing: '0.02em',
    },
    body2: {
      fontWeight: 300,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#000000',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(160deg, #111111 0%, #0a0a0a 100%)',
          borderRadius: 0,
          border: '1px solid #222222',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 1,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: 'transparent',
          border: '2px solid #ffffff',
          color: '#ffffff',
          borderRadius: 0,
          textTransform: 'uppercase',
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          padding: '10px 25px',
          transition: 'all 0.3s ease',
          boxShadow: 'none',
          '&:hover': {
            background: '#ffffff',
            color: '#000000',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
            transform: 'translateY(-3px)',
          },
        },
        outlinedSecondary: {
          borderColor: '#aaaaaa',
          color: '#aaaaaa',
          borderRadius: 0,
          '&:hover': {
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          border: '1px solid #222222',
          borderRadius: 0,
          position: 'relative',
          zIndex: 1,
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          '&.Mui-active': {
            color: '#ffffff',
            fontWeight: 'bold',
          },
          '&.Mui-completed': {
            color: '#aaaaaa',
          },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': {
            color: '#ffffff',
            filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))',
          },
          '&.Mui-completed': {
            color: '#aaaaaa',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardError: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
        },
        standardSuccess: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        colorPrimary: {
          color: '#ffffff',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#333333',
              borderRadius: 0,
            },
            '&:hover fieldset': {
              borderColor: '#666666',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ffffff',
            },
          },
        },
      },
    },
  },
});


const STEPS = [
  'Upload STL File',
  'Configure Print Settings',
  'Preview Slices',
  'Print Progress'
];

function App() {
    const [user, setUser] = useState(null);
    const [appState, setAppState] = useState({
        data: null,
        error: null,
        uploadedFile: null,
        slicingResult: null,
        printStarted: null,
        isLoading: true // Start with isLoading true to check auth status
    });

    // Check authentication status on app load
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const userData = await getCurrentUser();
                setUser(userData); // Set the user if logged in
            } catch (error) {
                setUser(null); // No user is logged in
            } finally {
                setAppState(prev => ({ ...prev, isLoading: false })); // Stop loading
            }
        };

        fetchCurrentUser();
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

    // Show loading spinner while checking auth status
    if (appState.isLoading) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <StarsBackground zIndex={-1} /> {/* Add stars background */}
                <Container maxWidth="lg">
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '100vh',
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <CircularProgress />
                    </Box>
                </Container>
            </ThemeProvider>
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

        <ThemeProvider theme={theme}>
            <CssBaseline />
            {/* Add stars background to the entire app */}
            <StarsBackground 
                zIndex={-1} 
                starCount={100} // Reduced count for better performance
                enableRipples={true} // Set to false if you still have performance issues
            />
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
                                <AdminInfo />
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
                            <Container maxWidth="lg" sx={{ py: 4 }}>
                                <Paper 
                                    elevation={3} 
                                    sx={{ 
                                        p: 3, 
                                        borderRadius: 0, 
                                        background: 'linear-gradient(135deg, #111111 0%, #0a0a0a 100%)',
                                        border: '1px solid #222222',
                                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                                        position: 'relative',
                                        zIndex: 1
                                    }}

                                >
                                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                                        <Typography 
                                            variant="h3" 
                                            component="h1" 
                                            gutterBottom
                                            sx={{ 
                                                color: 'primary.main',
                                                textShadow: '0 2px 10px rgba(255, 255, 255, 0.2)',
                                                letterSpacing: '-0.02em',
                                                fontWeight: 800
                                            }}
                                        >
                                            3D Print Workflow
                                        </Typography>
                                        {appState.data && (
                                            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                                {appState.data}
                                            </Typography>
                                        )}
                                    </Box>

                                    <Stepper 
                                        activeStep={getActiveStep()} 
                                        sx={{ 
                                            mb: 4,
                                            p: 2,
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: 0,
                                            border: '1px solid #222222'
                                        }}
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
                                            sx={{ 
                                                mb: 3, 
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                color: '#ffffff'
                                            }}
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
                                            justifyContent: 'center',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    >
                                        {renderCurrentStep()}
                                    </Box>
                                </Paper>
                            </Container>
                        }
                    />
                    <Route path="*" element={<Navigate to="/Landing" />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;