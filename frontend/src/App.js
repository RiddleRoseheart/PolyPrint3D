import React, { useEffect, useState } from 'react';
import { Box, Alert, Container, Typography, Stepper, Step, StepLabel } from '@mui/material';
import PrintSettings from './components/PrintSettings';
import STLFileUpload from './components/STLFileUpload';
import SlicedFilesPreview from './components/SlicedFilesPreview';
import PrintingProgress from './components/PrintProgress';
import { CircularProgress } from '@mui/material';

const STEPS = [
  'Upload STL File',
  'Configure Print Settings',
  'Preview Slices',
  'Print Progress'
];

function App() {
    const [appState, setAppState] = useState({
        data: null,
        error: null,
        uploadedFile: null,
        slicingResult: null,
        printStarted: null,
        isLoading: false
    });

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
    );
}

export default App;