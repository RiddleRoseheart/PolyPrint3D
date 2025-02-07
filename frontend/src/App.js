import React, { useEffect, useState } from 'react';
import { fetchTestData } from './api/endpoints';
import PrintSettings from './components/PrintSettings';
import { Box } from '@mui/material';
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

    if (error) return <div>Error: {error}</div>;

    const handlePrintStart = (printData) => {
        console.log('Starting print with data:', printData);
        setPrintStarted(printData);
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>{data ? data : "Loading..."}</h1>
            </header>
            <main style={{ padding: "20px" }}>
            </main>
            
           <Box sx={{ width: '100%', p: 2 }}>
            <Box sx={{ mb: 2 }}>
                {data ? data : "Loading..."}
            </Box>
            
            {!uploadedFile ? (
                <STLFileUpload onFileUploaded={setUploadedFile} />
            ) : !slicingResult ? (
                <PrintSettings 
                    fileData={uploadedFile} 
                    onSlicingComplete={setSlicingResult}
                />
            ) : !printStarted ? (
                <SlicedFilesPreview 
                    slicingResult={slicingResult}
                    onPrintStart={handlePrintStart}  // Make sure this prop is passed
                />
            ) : (
                <PrintingProgress 
                    selectedFiles={printStarted}
                    onReset={() => {
                        setUploadedFile(null);
                        setSlicingResult(null);
                        setPrintStarted(null);
                    }}
                />
            )}
        </Box>

        </div>
    );
}

export default App;
