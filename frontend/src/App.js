import React, { useEffect, useState } from 'react';
import { fetchTestData } from './api/endpoints';
import PrintSettings from './components/PrintSettings';
import { Box, Alert, Container } from '@mui/material';
import STLFileUpload from './components/STLFileUpload';
import SlicedFilesPreview from './components/SlicedFilesPreview';
import PrintingProgress from './components/PrintProgress';

function App() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [slicingResult, setSlicingResult] = useState(null);
    const [printStarted, setPrintStarted] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetchTestData();
                setData(response.message);
            } catch (err) {
                setError('Failed to fetch data');
                console.error(err);
            }
        };

        loadData();
    }, []);

    const handleFileUploaded = (fileData) => {
        setError(null);
        setUploadedFile(fileData);
    };

    const handleSlicingComplete = (result) => {
        setError(null);
        setSlicingResult(result);
    };

    const handlePrintStart = (printData) => {
        setError(null);
        setPrintStarted(printData);
    };

    const handleReset = () => {
        setUploadedFile(null);
        setSlicingResult(null);
        setPrintStarted(null);
        setError(null);
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <h1>3D Print Workflow</h1>
                    {data && (
                        <Box sx={{ mb: 2 }}>
                            {data}
                        </Box>
                    )}
                </Box>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ mb: 3 }}
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                
<Box sx={{ width: '100%', p: 2 }}>
                {!uploadedFile ? (
                    <STLFileUpload onFileUploaded={handleFileUploaded} />
                ) : !slicingResult ? (
                    <PrintSettings
                        fileData={uploadedFile}  // Now contains both file and fileId
                        onSlicingComplete={setSlicingResult}
                    />
                ) : !printStarted ? (
                    <SlicedFilesPreview
                        slicingResult={slicingResult}
                        onPrintStart={handlePrintStart}
                    />
                ) : (
                        <PrintingProgress
                            selectedFiles={printStarted}
                            onReset={handleReset}
                            onError={handleError}
                        />
                    )}
                </Box>
            </Box>
        </Container>
    );
}

export default App;