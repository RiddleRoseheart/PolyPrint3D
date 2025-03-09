import React, { useState } from 'react';
import { 
  Box,
  Button,
  Typography,
  LinearProgress,
  Paper,
  Alert,
  Card,
  CardContent,
  Divider,
  Zoom,
  Fade,
  IconButton,
  Tooltip,
  createTheme,
  ThemeProvider
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CancelIcon from '@mui/icons-material/Cancel';
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
  // Create a custom theme with monochrome black and white scheme
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
      background: {
        default: '#000000',
        paper: '#111111',
      },
      text: {
        primary: '#ffffff',
        secondary: '#aaaaaa',
      },
      error: {
        main: '#ffffff',
      },
      success: {
        main: '#ffffff',
      }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      h4: {
        fontWeight: 900,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 700,
        letterSpacing: '0.02em',
      },
      body1: {
        fontWeight: 300,
        letterSpacing: '0.02em',
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'linear-gradient(135deg, #111111 0%, #0a0a0a 100%)',
            borderColor: '#222222',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            backgroundColor: 'transparent',
            border: '2px solid #ffffff',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#ffffff',
              color: '#000000',
              boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
            },
          },
          outlinedPrimary: {
            borderColor: '#ffffff',
            color: '#ffffff',
          }
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          barColorPrimary: {
            backgroundImage: 'linear-gradient(90deg, #ffffff 0%, #cccccc 100%)',
          },
          root: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        },
      },
    },
  });

  const [uploadState, setUploadState] = useState({
    progress: 0,
    error: '',
    selectedFile: null,
    isLoading: false,
    showRequirements: true,
  });
  
  const [uploadComplete, setUploadComplete] = useState(false);

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
        setUploadComplete(false);
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
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 10, 95)
        }));
      }, 300);

      const formData = new FormData();
      formData.append('file', uploadState.selectedFile);

      const response = await uploadSTLFile(formData);
      console.log('Upload response in component:', response);
      
      clearInterval(progressInterval);
      
      const fileData = response.status === 'success' ? response.data : response;

      if (!fileData || !fileData.id) {
        throw new Error('Invalid response format from server');
      }

      setUploadState(prev => ({ ...prev, progress: 100 }));
      setUploadComplete(true);
      
      onFileUploaded(fileData);

      // Don't reset immediately to show completion animation
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (err) {
      setUploadState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to upload file',
        progress: 0
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
      isLoading: false,
      showRequirements: true
    });
    setUploadComplete(false);
  };

  const formatFileSize = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(UPLOAD_CONFIG.SIZE_DISPLAY_DECIMALS);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box 
        sx={{
          backgroundColor: '#000000',
          backgroundImage: 'linear-gradient(135deg, #050505 0%, #000000 100%)',
          p: 4,
          borderRadius: 0,
          maxWidth: '800px',
          mx: 'auto',
          mt: 4,
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            color: 'primary.main', 
            fontWeight: 900, 
            textAlign: 'center', 
            mb: 2,
            fontFamily: '"Inter", "Roboto", sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Upload Your 3D Model
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'text.secondary', 
            textAlign: 'center', 
            mb: 4,
            fontWeight: 300,
          }}
        >
          We'll optimize your model for distributed printing across multiple devices
        </Typography>
        
        {/* Requirements Box */}
        <Zoom in={uploadState.showRequirements} timeout={500}>
          <Card sx={{ 
            mb: 4, 
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
            borderRadius: 0,
            backgroundImage: 'linear-gradient(135deg, #111111 0%, #0a0a0a 100%)',
            border: '1px solid #222222',
          }}>
            <CardContent>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'primary.main', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  fontFamily: '"Inter", "Roboto", sans-serif',
                  letterSpacing: '0.02em',
                }}
              >
                <InfoOutlinedIcon fontSize="small" /> 
                Bestandsvereisten
              </Typography>
              
              <Divider sx={{ mb: 2, mt: 1, backgroundColor: '#333333' }} />
              
              <Box sx={{ pl: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <CheckCircleOutlineIcon 
                    fontSize="small" 
                    sx={{ color: 'primary.main', mr: 1, mt: 0.3 }} 
                  />
                  <Typography variant="body2" color="text.secondary">
                    Voor een <strong style={{ color: theme.palette.primary.main }}>best mogelijke uitkomst</strong>, upload een bestand van het type <strong style={{ color: theme.palette.primary.main }}>.STL</strong>
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <CheckCircleOutlineIcon 
                    fontSize="small" 
                    sx={{ color: 'primary.main', mr: 1, mt: 0.3 }} 
                  />
                  <Typography variant="body2" color="text.secondary">
                    Hoewel we meerdere bestandsformaten kunnen accepteren, zijn deze minder getest
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <CheckCircleOutlineIcon 
                    fontSize="small" 
                    sx={{ color: 'primary.main', mr: 1, mt: 0.3 }} 
                  />
                  <Typography variant="body2" color="text.secondary">
                    Zorg ervoor dat de objecten elkaar <strong style={{ color: theme.palette.primary.main }}>niet overlappen</strong>, zodat de slicer ze correct kan detecteren en verdelen
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <CheckCircleOutlineIcon 
                    fontSize="small" 
                    sx={{ color: 'primary.main', mr: 1, mt: 0.3 }} 
                  />
                  <Typography variant="body2" color="text.secondary">
                    Alle objecten moeten <strong style={{ color: theme.palette.primary.main }}>in de juiste printpositie</strong> staan. Onze software past dit niet aan
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <CheckCircleOutlineIcon 
                    fontSize="small" 
                    sx={{ color: 'primary.main', mr: 1, mt: 0.3 }} 
                  />
                  <Typography variant="body2" color="text.secondary">
                    Controleer dat objecten <strong style={{ color: theme.palette.primary.main }}>voldoende steunpalen/support</strong> hebben waar nodig. Onze software voegt dit niet automatisch toe
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Zoom>
        
        {/* Upload Box */}
        <Fade in={true} timeout={800}>
          <Card sx={{
            p: 3,
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
            borderRadius: 0,
            backgroundImage: 'linear-gradient(135deg, #111111 0%, #0a0a0a 100%)',
            border: '1px solid #222222',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {uploadComplete && (
              <Zoom in={uploadComplete} timeout={500}>
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  zIndex: 10,
                }}>
                  <CheckCircleOutlineIcon 
                    sx={{ 
                      fontSize: 72, 
                      color: 'primary.main', 
                      mb: 2,
                      animation: 'pulse 1.5s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(0.95)', opacity: 0.7 },
                        '50%': { transform: 'scale(1.05)', opacity: 1 },
                        '100%': { transform: 'scale(0.95)', opacity: 0.7 },
                      },
                    }} 
                  />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'primary.main',
                      fontWeight: 'bold', 
                    }}
                  >
                    Upload Successful!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Your file is being processed...
                  </Typography>
                </Box>
              </Zoom>
            )}
            
            <Box sx={{ textAlign: 'center' }}>
              <input
                accept={UPLOAD_CONFIG.ALLOWED_FILE_TYPE}
                style={{ display: 'none' }}
                id="stl-file-upload"
                name="file" 
                type="file"
                onChange={handleFileSelect}
                disabled={uploadState.isLoading}
              />
              
              {!uploadState.selectedFile ? (
                <label htmlFor="stl-file-upload" style={{ cursor: 'pointer', width: '100%' }}>
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: '40px 20px',
                    borderRadius: 0,
                    border: '2px dashed rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'primary.main',
                    },
                  }}>
                    <CloudUploadIcon sx={{ 
                      fontSize: 48, 
                      color: 'primary.main', 
                      mb: 2 
                    }} />
                    <Typography variant="h6" gutterBottom color="text.primary">
                      Drag and drop your STL file here
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      or
                    </Typography>
                    <Button
                      variant="contained"
                      component="span"
                      sx={{
                        px: 3,
                        py: 1.2,
                        borderRadius: 0,
                        color:'white',
                        border: '2px solid white',
                        boxShadow: 'none',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          backgroundColor: 'white',
                          color: 'black',
                          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
                        },
                      }}
                      disabled={uploadState.isLoading}
                    >
                      Browse Files
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                      Maximum file size: {UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB
                    </Typography>
                  </Box>
                </label>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 0,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <InsertDriveFileIcon sx={{ 
                      fontSize: 36, 
                      color: 'primary.main', 
                      mr: 2 
                    }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        {uploadState.selectedFile.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                        {formatFileSize(uploadState.selectedFile.size)} MB
                      </Typography>
                    </Box>
                    <Tooltip title="Remove file">
                      <IconButton 
                        onClick={resetForm}
                        disabled={uploadState.isLoading}
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {uploadState.progress > 0 && (
                    <Box sx={{ mt: 3, mb: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={uploadState.progress}
                        sx={{ 
                          height: 10, 
                          borderRadius: 0,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                      />
                      <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                        Upload Progress: {Math.round(uploadState.progress)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {uploadState.error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 3, 
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  }}
                >
                  {uploadState.error}
                </Alert>
              )}

              {uploadState.selectedFile && !uploadState.error && (
                <Box sx={{ 
                  mt: 3, 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: 'center' 
                }}>
                  <LoadingButton
                    loading={uploadState.isLoading}
                    loadingPosition="start"
                    startIcon={<CloudUploadIcon />}
                    variant="contained"
                    onClick={handleUpload}
                    sx={{
                      px: 3,
                      py: 1.2,
                      borderRadius: 0,
                      border: '2px solid white',
                      boxShadow: 'none',
                      backgroundColor: 'transparent',
                      color: 'white',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        backgroundColor: 'white',
                        color: 'black',
                        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
                      },
                      '& .MuiLoadingButton-loadingIndicator': {
                        color: 'white',
                      },
                    }}
                    disabled={uploadComplete}
                  >
                    {uploadState.isLoading ? 'Uploading...' : 'Upload File'}
                  </LoadingButton>
                  
                  <Button
                    variant="outlined"
                    onClick={resetForm}
                    disabled={uploadState.isLoading || uploadComplete}
                    sx={{
                      borderColor: '#555555',
                      color: '#aaaaaa',
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'white',
                        color: 'white'
                      },
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>
          </Card>
        </Fade>
      </Box>
    </ThemeProvider>
  );
};

export default STLFileUpload;