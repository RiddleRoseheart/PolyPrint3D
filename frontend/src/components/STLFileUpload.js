import React, { useState } from 'react';
import { 
  Box,
  Button,
  Typography,
  LinearProgress,
  Paper,
  Alert
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { uploadSTLFile } from '../api/endpoints/fileEndpoints';

/**
 * Configuration constants for file upload constraints
 */
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB limit
  ALLOWED_FILE_TYPE: '.stl',
  SIZE_DISPLAY_DECIMALS: 2
};

/**
 * STL File Upload component that handles file selection and upload
 * @param {Object} props
 * @param {Function} props.onFileUploaded - Callback function called after successful upload
 */
const STLFileUpload = ({ onFileUploaded }) => {
  const [uploadState, setUploadState] = useState({
    progress: 0,
    error: '',
    selectedFile: null,
    isLoading: false
  });

  /**
   * Validates the selected file against size and type constraints
   * @param {File} file - The file to validate
   * @throws {Error} If validation fails
   */
  const validateFile = (file) => {
    if (!file) {
      throw new Error('Please select a file');
    }

    if (!file.name.toLowerCase().endsWith(UPLOAD_CONFIG.ALLOWED_FILE_TYPE)) {
      throw new Error(`Only ${UPLOAD_CONFIG.ALLOWED_FILE_TYPE.toUpperCase()} files are allowed`);
    }

    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `File size should not exceed ${UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    return true;
  };

  /**
   * Handles file selection from input
   * @param {Event} event - File input change event
   */
  const handleFileSelect = (event) => {
    setUploadState(prev => ({ ...prev, error: '' }));
    const file = event.target.files[0];
    
    try {
      if (validateFile(file)) {
        setUploadState(prev => ({ ...prev, selectedFile: file }));
      }
    } catch (err) {
      setUploadState(prev => ({ ...prev, error: err.message }));
    }
  };

  /**
   * Handles the file upload process
   */
  const handleUpload = async () => {
    setUploadState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: '' 
    }));
    
    if (!uploadState.selectedFile) {
      setUploadState(prev => ({ 
        ...prev, 
        error: 'Please select a file first',
        isLoading: false 
      }));
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('file', uploadState.selectedFile);
  
      const response = await uploadSTLFile(formData);
      
      setUploadState(prev => ({ ...prev, progress: 100 }));
      
      if (onFileUploaded) {
        onFileUploaded({
          id: response.id,
          filename: response.filename,
          status: response.status,
          created_at: response.created_at,
          updated_at: response.updated_at
        });
      }
  
      resetForm();
  
    } catch (err) {
      setUploadState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to upload file'
      }));
      console.error('Upload error:', err);
    } finally {
      setUploadState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setUploadState({
      progress: 0,
      error: '',
      selectedFile: null,
      isLoading: false
    });
  };

  const formatFileSize = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(UPLOAD_CONFIG.SIZE_DISPLAY_DECIMALS);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        <input
          accept={UPLOAD_CONFIG.ALLOWED_FILE_TYPE}
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
            disabled={uploadState.isLoading}
          >
            Select STL File
          </Button>
        </label>

        {uploadState.selectedFile && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Selected file: {uploadState.selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Size: {formatFileSize(uploadState.selectedFile.size)} MB
            </Typography>
          </Box>
        )}

        {uploadState.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {uploadState.error}
          </Alert>
        )}

        {uploadState.progress > 0 && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={uploadState.progress} 
            />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Upload Progress: {Math.round(uploadState.progress)}%
            </Typography>
          </Box>
        )}

        {uploadState.selectedFile && !uploadState.error && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <LoadingButton
              loading={uploadState.isLoading}
              loadingPosition="start"
              startIcon={<CloudUploadIcon />}
              variant="contained"
              color="primary"
              onClick={handleUpload}
            >
              {uploadState.isLoading ? 'Uploading...' : 'Upload File'}
            </LoadingButton>
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={resetForm}
              disabled={uploadState.isLoading}
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