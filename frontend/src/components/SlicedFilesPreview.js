import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
    Box, 
    Grid,
    Paper, 
    Typography, 
    Stack,
    Card,
    CardContent,
    Button,
    Alert,
    CardActions,
    CircularProgress,
    Tooltip,
    Divider,
    Chip
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import axiosInstance from '../api/axiosConfig';

/**
 * Loading overlay component for 3D preview
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {boolean} props.isLoading - Whether the content is loading
 * @returns {JSX.Element} Loading overlay wrapper component
 */
const PreviewContainer = ({ children, isLoading }) => (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
        {children}
        {isLoading && (
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }}>
                <CircularProgress />
            </Box>
        )}
    </Box>
);

/**
 * Format price value to currency string
 * @param {number} price - Price value to format
 * @param {string} currency - Currency code (default: EUR)
 * @returns {string} Formatted price string
 */
const formatPrice = (price, currency = 'EUR') => {
    if (price === undefined || price === null) return '—';
    
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(price);
};

const isWebGLAvailable = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch(e) {
      return false;
    }
};
  
/**
 * Main component for previewing sliced 3D files
 * @param {Object} props
 * @param {Object} props.slicingResult - Result data from slicing operation
 * @param {Function} props.onReset - Callback for resetting the view
 * @param {Function} props.onPrintStart - Callback for starting the print
 * @param {boolean} props.isOfflineMode - Whether the app is in offline mode
 * @returns {JSX.Element} Sliced files preview component
 */
const SlicedFilesPreview = ({ slicingResult, onReset, onPrintStart, isOfflineMode = false }) => {
    const [selectedSlices, setSelectedSlices] = useState(new Set());
    const [activePreview, setActivePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedRequests, setSelectedRequests] = useState(new Set());
    const [sceneInitialized, setSceneInitialized] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Three.js refs
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const rendererRef = useRef(null);
    const meshRef = useRef(null);
    const initialLoadRef = useRef(false);

    /**
     * Calculate total price of selected items
     * @returns {number} Total price of selected items
     */
    const calculateSelectedPrice = () => {
        if (!slicingResult?.print_requests) return 0;
        
        return slicingResult.print_requests
            .filter(request => selectedRequests.has(request.id))
            .reduce((sum, request) => sum + (parseFloat(request.price) || 0), 0);
    };

    /**
     * Get total project price directly from slicing result
     * @returns {number} Total project price
     */
    const getTotalPrice = () => {
        if (!slicingResult?.print_requests) return 0;
        
        // Calculate total from all print requests
        return slicingResult.print_requests.reduce((sum, request) => 
            sum + (parseFloat(request.price) || 0), 0);
    };

    /**
     * Initialize Three.js scene
     */
    useEffect(() => {
        if (!mountRef.current || sceneInitialized) return;

        const setupScene = () => {
            if (!isWebGLAvailable()) {
                setError('WebGL is not supported in your browser. Cannot display 3D preview.');
                return () => {};
            }
            
            try {
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;

                // Create scene
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0xf5f5f5);

                // Set up camera
                const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
                camera.position.set(0, 10, 20);
                
                // Set up renderer with error handling
                let renderer;
                try {
                    renderer = new THREE.WebGLRenderer({ 
                        antialias: true,
                        alpha: true,
                        powerPreference: 'default'
                    });
                    
                    // Check if renderer was created successfully
                    if (!renderer || !renderer.domElement) {
                        throw new Error('Failed to initialize WebGL renderer');
                    }
                    
                    renderer.setSize(width, height);
                    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
                    
                    // Clear any existing content
                    while (mountRef.current.firstChild) {
                        mountRef.current.removeChild(mountRef.current.firstChild);
                    }
                    
                    mountRef.current.appendChild(renderer.domElement);
                } catch (renderError) {
                    console.error('WebGL renderer error:', renderError);
                    setError('Failed to initialize 3D preview. WebGL error occurred.');
                    return () => {};
                }

                // Set up controls
                const controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                
                // Save refs
                sceneRef.current = scene;
                cameraRef.current = camera;
                controlsRef.current = controls;
                rendererRef.current = renderer;

                // Setup initial lighting
                const setupLighting = () => {
                    if (!sceneRef.current) return;
                    
                    // Clear previous lights but keep meshes
                    sceneRef.current.children = sceneRef.current.children.filter(
                        child => !(child instanceof THREE.Light)
                    );
                    
                    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
                    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
                    
                    directionalLight.position.set(1, 1, 1);
                    backLight.position.set(-1, -1, -1);
                    
                    sceneRef.current.add(ambientLight, directionalLight, backLight);
                };

                setupLighting();

                // Handle WebGL context loss
                const handleContextLost = (event) => {
                    event.preventDefault();
                    console.warn('WebGL context lost. Attempting to recover...');
                    setError('WebGL context lost. Please reload the page if 3D preview doesn\'t recover.');
                    
                    // Try to reinitialize after a brief delay
                    setTimeout(() => {
                        if (mountRef.current) {
                            mountRef.current.innerHTML = '';
                            setupScene();
                        }
                    }, 2000);
                };

                renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
                renderer.domElement.addEventListener('webglcontextrestored', () => {
                    console.log('WebGL context restored');
                    setError('');
                });

                // Animation loop with error handling
                let animFrameId;
                const animate = () => {
                    try {
                        animFrameId = requestAnimationFrame(animate);
                        if (controls) controls.update();
                        if (renderer && scene && camera) {
                            renderer.render(scene, camera);
                        }
                    } catch (renderError) {
                        console.error('Render loop error:', renderError);
                        setError('Error displaying 3D preview. Try reloading the page.');
                        cancelAnimationFrame(animFrameId);
                    }
                };
                
                animate();

                // Handle window resizing
                const handleResize = () => {
                    if (!mountRef.current || !renderer) return;
                    
                    try {
                        const width = mountRef.current.clientWidth;
                        const height = mountRef.current.clientHeight;
                        
                        if (camera) {
                            camera.aspect = width / height;
                            camera.updateProjectionMatrix();
                        }
                        
                        renderer.setSize(width, height);
                    } catch (resizeError) {
                        console.error('Resize error:', resizeError);
                    }
                };
                
                window.addEventListener('resize', handleResize);
                
                setSceneInitialized(true);
                
                return () => {
                    window.removeEventListener('resize', handleResize);
                    if (animFrameId) cancelAnimationFrame(animFrameId);
                    
                    if (controls) {
                        controls.dispose();
                    }
                    
                    if (renderer) {
                        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
                        renderer.domElement.removeEventListener('webglcontextrestored', () => {});
                        
                        try {
                            renderer.dispose();
                            
                            // Force context loss to ensure proper cleanup
                            const extension = renderer.getContext().getExtension('WEBGL_lose_context');
                            if (extension) extension.loseContext();
                        } catch (disposeError) {
                            console.error('Error disposing renderer:', disposeError);
                        }
                    }
                    
                    if (meshRef.current) {
                        try {
                            if (sceneRef.current) sceneRef.current.remove(meshRef.current);
                            if (meshRef.current.geometry) meshRef.current.geometry.dispose();
                            if (meshRef.current.material) {
                                if (Array.isArray(meshRef.current.material)) {
                                    meshRef.current.material.forEach(material => material.dispose());
                                } else {
                                    meshRef.current.material.dispose();
                                }
                            }
                        } catch (meshDisposeError) {
                            console.error('Error disposing mesh:', meshDisposeError);
                        }
                        
                        meshRef.current = null;
                    }
                    
                    if (mountRef.current) {
                        mountRef.current.innerHTML = '';
                    }
                    
                    sceneRef.current = null;
                    cameraRef.current = null;
                    controlsRef.current = null;
                    rendererRef.current = null;
                    setSceneInitialized(false);
                };
            } catch (error) {
                console.error('Scene setup error:', error);
                setError('Failed to initialize 3D preview');
                return () => {};
            }
        };

        return setupScene();
    }, [mountRef.current]);

    /**
     * Handle initial loading of the first preview when slicing result changes
     */
    useEffect(() => {
        if (slicingResult?.print_requests?.length > 0 && sceneInitialized && !initialLoadRef.current) {
            // Load the first file by default
            setActivePreview(slicingResult.print_requests[0]);
            
            // Also select the first request by default
            setSelectedRequests(new Set([slicingResult.print_requests[0].id]));
            
            initialLoadRef.current = true;
        }
        
        // Reset the initialLoad flag when slicing result changes
        if (!slicingResult || slicingResult.print_requests?.length === 0) {
            initialLoadRef.current = false;
        }
    }, [slicingResult, sceneInitialized]);

    /**
     * Toggle selection of a print request
     * @param {Object} request - The print request to toggle
     */
    const handleRequestToggle = (request) => {
        const newSelected = new Set(selectedRequests);
        if (newSelected.has(request.id)) {
            newSelected.delete(request.id);
        } else {
            newSelected.add(request.id);
        }
        setSelectedRequests(newSelected);
    };

    /**
     * Load and display STL preview
     */
    useEffect(() => {
        if (!activePreview || !sceneRef.current || !cameraRef.current || !sceneInitialized) return;

        const loadSTL = async () => {
            try {
                setIsLoading(true);
                setError('');
                
                // Get the color from the active preview
                // Default to green if color is not specified
                let materialColor = 0x00ff00;
                if (activePreview.filaments && activePreview.filaments[0]?.color) {
                    const colorString = activePreview.filaments[0].color;
                    // Convert color string to hex if it's not already
                    materialColor = colorString.startsWith('#') 
                        ? parseInt(colorString.replace('#', '0x'), 16)
                        : colorString;
                }

                const response = await axiosInstance.get(`/api/slicer/preview/${activePreview.id}`, {
                    responseType: 'arraybuffer',
                    headers: {
                        'Accept': 'application/octet-stream'
                    }
                });

                // Clear previous mesh
                if (meshRef.current) {
                    sceneRef.current.remove(meshRef.current);
                    meshRef.current.geometry.dispose();
                    meshRef.current.material.dispose();
                }

                const loader = new STLLoader();
                const geometry = loader.parse(response.data);
                const material = new THREE.MeshPhongMaterial({
                    color: materialColor,
                    specular: 0x111111,
                    shininess: 200
                });
                const mesh = new THREE.Mesh(geometry, material);
                meshRef.current = mesh;

                // Center and scale mesh
                geometry.computeBoundingBox();
                const center = geometry.boundingBox.getCenter(new THREE.Vector3());
                mesh.position.sub(center);
                
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                // Setup camera and controls
                setupCameraAndControls(maxDim);
                
                // Add mesh to scene
                sceneRef.current.add(mesh);

            } catch (error) {
                console.error('STL loading error:', error);
                setError('Failed to load 3D preview');
            } finally {
                setIsLoading(false);
            }
        };

        loadSTL();
    }, [activePreview, sceneInitialized]);

    /**
     * Set up camera and controls for the 3D preview
     * @param {number} maxDim - Maximum dimension of the object
     */
    const setupCameraAndControls = (maxDim) => {
        if (!cameraRef.current || !controlsRef.current) return;
        
        cameraRef.current.position.set(0, maxDim, maxDim * 2);
        cameraRef.current.lookAt(0, 0, 0);

        controlsRef.current.enableDamping = true;
        controlsRef.current.dampingFactor = 0.05;
        controlsRef.current.screenSpacePanning = true;
        controlsRef.current.minDistance = maxDim * 0.5;
        controlsRef.current.maxDistance = maxDim * 4;
        controlsRef.current.maxPolarAngle = Math.PI / 1.5;
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
    };

    /**
     * Set up lighting for the 3D scene
     */
    const setupLighting = () => {
        if (!sceneRef.current) return;
        
        // Clear previous lights but keep meshes
        sceneRef.current.children = sceneRef.current.children.filter(
            child => !(child instanceof THREE.Light)
        );
        
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        
        directionalLight.position.set(1, 1, 1);
        backLight.position.set(-1, -1, -1);
        
        sceneRef.current.add(ambientLight, directionalLight, backLight);
    };

    /**
     * Toggle a slice selection
     * @param {Object} slice - The slice to toggle
     */
    const handleSliceToggle = (slice) => {
        const newSelected = new Set(selectedSlices);
        if (newSelected.has(slice.id)) {
            newSelected.delete(slice.id);
        } else {
            newSelected.add(slice.id);
        }
        setSelectedSlices(newSelected);
    };

    /**
     * Select or deselect all print requests
     */
    const handleSelectAll = () => {
        if (selectedRequests.size === slicingResult?.print_requests?.length) {
            setSelectedRequests(new Set());
        } else {
            setSelectedRequests(new Set(slicingResult?.print_requests?.map(request => request.id)));
        }
    };

    /**
     * Reset the camera view to default position
     */
    const handleResetView = () => {
        if (cameraRef.current && controlsRef.current && meshRef.current) {
            const box = new THREE.Box3().setFromObject(meshRef.current);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            setupCameraAndControls(maxDim);
        }
    };

    //TODO
    const handleDownload = async (request) => {
        try {
            setIsLoading(true);
            const response = await axiosInstance.get(`/api/slicer/download/${request.id}`, {
                responseType: 'blob'
            });
            
            // Create a download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `print_${request.id}.gcode`);
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            
            // Try to get more information about the error
            if (error.response) {
                if (error.response.data && typeof error.response.data === 'object') {
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const errorData = JSON.parse(reader.result);
                            setError(`Download failed: ${errorData.error || 'Unknown error'}`);
                        } catch (e) {
                            setError(`Download failed: ${error.response.status} ${error.response.statusText}`);
                        }
                    };
                    reader.readAsText(error.response.data);
                } else {
                    setError(`Download failed: ${error.response.status} ${error.response.statusText}`);
                }
            } else {
                setError(`Download failed: ${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Download G-code files for selected print requests
     */
    const handleDownloadFiles = async () => {
        setIsDownloading(true);
        setError('');
        
        try {
            const selectedRequestIds = Array.from(selectedRequests);
            
            // Process each selected request one by one
            for (const requestId of selectedRequestIds) {
                const request = slicingResult.print_requests.find(r => r.id === requestId);
                if (!request) continue;
                
                // Get the G-code file for this request
                const response = await axiosInstance.get(`/api/slicer/download/${requestId}`, {
                    responseType: 'blob',
                    headers: {
                        'Accept': 'application/octet-stream'
                    }
                });
                
                // Create a download link
                const url = window.URL.createObjectURL(response.data);
                const link = document.createElement('a');
                
                // Set filename - use the material and color info if available
                const material = request.filaments?.[0]?.name || 'unknown';
                const color = request.filaments?.[0]?.color || 'unknown';
                const filename = `print_${material}_${color}_${requestId}.gcode`;
                
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                
                // Clean up
                window.URL.revokeObjectURL(url);
                document.body.removeChild(link);
                
                // Small delay between downloads to ensure browser handles each one
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Success message could be shown here
        } catch (error) {
            console.error('Download error:', error);
            setError('Failed to download one or more files. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };
   
    return (
        <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Sliced Files Preview
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <PreviewContainer isLoading={isLoading}>
                            <Box 
                                ref={mountRef} 
                                sx={{ 
                                    height: 400,
                                    width: '100%',
                                    border: '1px solid #eee',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    backgroundColor: '#f5f5f5'
                                }} 
                            />
                            {!activePreview && !isLoading && (
                                <Box sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                }}>
                                    <Typography variant="body1" color="text.secondary">
                                        {slicingResult?.print_requests?.length > 0 
                                            ? 'Loading preview...' 
                                            : 'No preview available'}
                                    </Typography>
                                </Box>
                            )}
                        </PreviewContainer>
                        {activePreview && (
                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                <Tooltip title="Reset View">
                                    <Button 
                                        size="small" 
                                        onClick={handleResetView}
                                        startIcon={<RotateLeftIcon />}
                                    >
                                        Reset View
                                    </Button>
                                </Tooltip>
                            </Box>
                        )}
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" gutterBottom>
                            Print Requests
                        </Typography>
                        <Stack spacing={2} sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                            {slicingResult?.print_requests?.map((request) => (
                                <Card 
                                    key={request.id}
                                    variant="outlined"
                                    sx={{ 
                                        cursor: 'pointer',
                                        bgcolor: selectedRequests.has(request.id) ? 'action.selected' : 'inherit',
                                        border: activePreview?.id === request.id ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)'
                                    }}
                                >
                                   <CardContent onClick={() => handleRequestToggle(request)}>
                                        <Typography variant="subtitle1">
                                            {request.filaments?.[0]?.name || 'Unknown Material'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Infill: {request.filling}% | Layer: {request.layer}mm
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Color: {request.filaments?.[0]?.color || 'Unknown'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Material: {request.filaments?.[0]?.material || 'Unknown'}
                                        </Typography> 
                                    </CardContent>

                                    <CardActions>
                                        <Button 
                                            size="small" 
                                            onClick={() => setActivePreview(request)}
                                            variant={activePreview?.id === request.id ? "contained" : "text"}
                                        >
                                            {activePreview?.id === request.id ? "Viewing" : "Preview"}
                                        </Button>
                                        <Button
        size="small"
        onClick={() => handleDownload(request)}
        disabled={isLoading}
    >
        Download
    </Button>
                                    </CardActions>
                                </Card>
                            ))}
                            {(!slicingResult?.print_requests || slicingResult.print_requests.length === 0) && (
                                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                    No print requests available
                                </Typography>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

                {/* Pricing Summary */}
                <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Stack spacing={1}>
                                <Typography variant="subtitle2">
                                    Selected Items: {selectedRequests.size} of {slicingResult?.print_requests?.length || 0}
                                </Typography>
                                <Typography variant="h6" color="primary">
                                    Selected Total: {formatPrice(calculateSelectedPrice())}
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Stack spacing={1} sx={{ textAlign: 'right' }}>
                                <Typography variant="subtitle2">
                                    Project Summary
                                </Typography>
                                <Typography variant="h6">
                                    Total Project Price: {formatPrice(getTotalPrice())}
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            onClick={onReset}
                            startIcon={<RotateLeftIcon />}
                        >
                            Start Over
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleSelectAll}
                            startIcon={<SelectAllIcon />}
                            disabled={!slicingResult?.print_requests?.length}
                        >
                            {selectedRequests.size === slicingResult?.print_requests?.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </Stack>
                    
                    {isOfflineMode ? (
                        <LoadingButton
                            loading={isDownloading}
                            loadingPosition="start"
                            startIcon={<DownloadIcon />}
                            variant="contained"
                            onClick={handleDownloadFiles}
                            disabled={selectedRequests.size === 0 || isDownloading}
                        >
                            {isDownloading ? 'Downloading...' : `Download Selected (${formatPrice(calculateSelectedPrice())})`}
                        </LoadingButton>
                    ) : (
                        <LoadingButton
                            loading={isLoading}
                            loadingPosition="start"
                            startIcon={<PrintIcon />}
                            variant="contained"
                            onClick={() => onPrintStart(Array.from(selectedRequests))}
                            disabled={selectedRequests.size === 0 || isLoading}
                        >
                            {isLoading ? 'Starting Print...' : `Print Selected (${formatPrice(calculateSelectedPrice())})`}
                        </LoadingButton>
                    )}
                </Box>
            </Paper>
        </Stack>
    );
};

export default SlicedFilesPreview;