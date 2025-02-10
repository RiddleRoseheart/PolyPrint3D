import React, { useState } from 'react';
import { 
  Box,
  Button,
  Typography,
  LinearProgress,
  Paper,
  Alert
} from '@mui/material';
import { uploadSTLFile } from '../api/endpoints'; 
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { LoadingButton } from '@mui/lab';


const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit 

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
    setError('');
    
    if (!selectedFile) {
      setError('Please select a file first');
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await uploadSTLFile(formData);
      
      setUploadProgress(0);
      setSelectedFile(null);
      
      onFileUploaded({
        file: selectedFile,
        fileId: response.fileId,
        filename: response.filename,
        status: response.status
      });

    } catch (err) {
      setError(err.message || 'Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
};
  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setError('');
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        <input
          accept=".stl"
          style={{ display: 'none' }}
          id="stl-file-upload"
          name="file" 
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
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Selected file: {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Box>
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
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <LoadingButton
              loading={isLoading}
              loadingPosition="start"
              startIcon={<CloudUploadIcon />}
              variant="contained"
              color="primary"
              onClick={handleUpload}
            >
              {isLoading ? 'Uploading...' : 'Upload File'}
            </LoadingButton>
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={cancelUpload}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default STLFileUpload;