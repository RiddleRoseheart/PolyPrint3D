import React, { useState } from 'react';
import { 
  Box,
  Button,
  Typography,
  LinearProgress,
  Paper,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { LoadingButton } from '@mui/lab';

const MAX_FILE_SIZE = 100 * 1024 * 1024; //placeholder 

const STLFileUpload = ({ onFileUploaded }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateFile = (file) => {
    if (!file) {
      setError('Please select a file');
      return false;
    }

    if (!file.name.toLowerCase().endsWith('.stl')) {
      setError('Only STL files are allowed');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size should not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (event) => {
    setError('');
    const file = event.target.files[0];
    
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    setIsLoading(true); 
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('stlFile', selectedFile);

    try {
      /*const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log('Upload successful:', data);
       */

    // Simulation //TODO replace with actual API call (comemnted out above)
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Upload successful (mocked):', {
      id: 'mock123',
      fileName: selectedFile.name,
      uploadedAt: new Date().toISOString()
    });


      setUploadProgress(0);
      setSelectedFile(null);
      onFileUploaded(selectedFile);

    } catch (err) {
      setError('Failed to upload file: ' + err.message);
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        <input
          accept=".stl"
          style={{ display: 'none' }}
          id="stl-file-upload"
          type="file"
          onChange={handleFileSelect}
        />
        
        <label htmlFor="stl-file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<CloudUploadIcon />}
            disabled={isLoading}
          >
            Select STL File
          </Button>
        </label>

        {selectedFile && (
          <Typography variant="body1" sx={{ mt: 2 }}>
            Selected file: {selectedFile.name}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {uploadProgress > 0 && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
            />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Upload Progress: {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        )}
{selectedFile && !error && (
          <LoadingButton
            loading={isLoading}
            loadingPosition="start"
            startIcon={<CloudUploadIcon />}
            variant="contained"
            color="primary"
            onClick={handleUpload}
            sx={{ mt: 2 }}
          >
            {isLoading ? 'Processing...' : 'Upload File'}
          </LoadingButton>
        )}
      </Box>
    </Paper>
  );
};

export default STLFileUpload;