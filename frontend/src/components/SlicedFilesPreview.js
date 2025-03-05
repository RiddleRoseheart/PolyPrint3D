import React, { useEffect, useRef, useState, useCallback } from 'react';
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
    Divider
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import axiosInstance from '../api/axiosConfig';

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
                zIndex: 10,
            }}>
                <CircularProgress />
            </Box>
        )}
    </Box>
);

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
        console.error("WebGL not available:", e);
        return false;
    }
};

const SlicedFilesPreview = ({ slicingResult, onReset, onPrintStart, isOfflineMode = false }) => {
    // State management
    const [selectedRequests, setSelectedRequests] = useState(new Set());
    const [activePreview, setActivePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [webGLAvailable, setWebGLAvailable] = useState(true);
    const [rendererReady, setRendererReady] = useState(false);
    const [previewRequestStatus, setPreviewRequestStatus] = useState({
        pending: false,
        success: false,
        error: null
    });
    
    // THREE.js refs
    const containerRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const meshRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const mountedRef = useRef(true);
    const sceneMounted = useRef(false);
    const resizeHandlerRef = useRef(null);
    const throttleTimerRef = useRef(null);

    // Calculate total price of selected items
    const calculateSelectedPrice = useCallback(() => {
        if (!slicingResult?.print_requests) return 0;
        
        return slicingResult.print_requests
            .filter(request => selectedRequests.has(request.id))
            .reduce((sum, request) => sum + (parseFloat(request.price) || 0), 0);
    }, [slicingResult, selectedRequests]);

    // Get total project price
    const getTotalPrice = useCallback(() => {
        if (!slicingResult?.print_requests) return 0;
        
        return slicingResult.print_requests.reduce((sum, request) => 
            sum + (parseFloat(request.price) || 0), 0);
    }, [slicingResult]);

    // Safe method to clear container contents
    const clearContainer = useCallback(() => {
        if (containerRef.current) {
            try {
                // Safer way to clear children
                while (containerRef.current.firstChild) {
                    containerRef.current.firstChild.remove();
                }
            } catch (e) {
                console.warn('Error clearing container:', e);
                // Fallback to innerHTML if remove() fails
                containerRef.current.innerHTML = '';
            }
        }
    }, []);

    // Clean up THREE.js resources
    const cleanupThreeJS = useCallback(() => {
        console.log('Cleaning up THREE.js resources');
        
        // Clear throttle timer
        if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
            throttleTimerRef.current = null;
        }
        
        // Remove resize handler
        if (resizeHandlerRef.current) {
            window.removeEventListener('resize', resizeHandlerRef.current);
            resizeHandlerRef.current = null;
        }
        
        // Cancel animation frame
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        
        // Dispose controls
        if (controlsRef.current) {
            controlsRef.current.dispose();
            controlsRef.current = null;
        }
        
        // Dispose mesh and geometry
        if (meshRef.current) {
            if (sceneRef.current) {
                sceneRef.current.remove(meshRef.current);
            }
            
            if (meshRef.current.geometry) {
                meshRef.current.geometry.dispose();
            }
            
            if (meshRef.current.material) {
                if (Array.isArray(meshRef.current.material)) {
                    meshRef.current.material.forEach(material => material.dispose());
                } else {
                    meshRef.current.material.dispose();
                }
            }
            
            meshRef.current = null;
        }
        
        // Dispose renderer
        if (rendererRef.current) {
            try {
                rendererRef.current.dispose();
            } catch (e) {
                console.error('Error disposing renderer:', e);
            }
            rendererRef.current = null;
        }
        
        // Clear container - but only if we need to
        if (sceneMounted.current) {
            clearContainer();
            sceneMounted.current = false;
        }
        
        // Reset refs
        sceneRef.current = null;
        cameraRef.current = null;
        
        setRendererReady(false);
    }, [clearContainer]);

    // Add lighting to the scene
    const addLighting = useCallback((scene) => {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        scene.add(ambientLight);
        
        // Directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Back light for better definition
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-1, -1, -1);
        scene.add(backLight);
    }, []);

    // Throttled render function to improve performance
    const throttledRender = useCallback(() => {
        if (throttleTimerRef.current) return;
        
        throttleTimerRef.current = setTimeout(() => {
            throttleTimerRef.current = null;
            
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        }, 16); // ~60fps
    }, []);

    // Initialize THREE.js scene
    const initScene = useCallback(() => {
        try {
            if (!containerRef.current) {
                console.error('Container ref not available');
                return;
            }

            // First clean up any existing scene
            cleanupThreeJS();

            console.log('Creating scene');
            // Create scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf5f5f5);
            sceneRef.current = scene;

            // Get container dimensions
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            console.log('Container dimensions:', width, 'x', height);
            
            if (width === 0 || height === 0) {
                console.warn('Container has zero width or height');
                return;
            }

            // Create camera
            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.set(0, 10, 20);
            cameraRef.current = camera;

            // Create renderer
            console.log('Creating WebGL renderer');
            const renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                powerPreference: 'default'
            });
            renderer.setSize(width, height);
            // Limit pixel ratio to improve performance
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            
            // Clear any existing content
            clearContainer();
            
            // Add renderer to DOM
            containerRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;
            sceneMounted.current = true;

            // Create controls with reduced performance impact
            console.log('Creating OrbitControls');
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1; // Higher value = less physics but better performance
            controls.enableZoom = true;
            controls.zoomSpeed = 0.8; // Slightly reduced zoom speed
            controls.rotateSpeed = 0.8; // Slightly reduced rotate speed
            controls.screenSpacePanning = true;
            controls.autoRotate = false; // No auto-rotation
            controlsRef.current = controls;

            // Add lighting
            addLighting(scene);

            // Handle browser resize with throttling
            const handleResize = () => {
                if (throttleTimerRef.current) return;
                
                throttleTimerRef.current = setTimeout(() => {
                    throttleTimerRef.current = null;
                    
                    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
                    
                    const width = containerRef.current.clientWidth;
                    const height = containerRef.current.clientHeight;
                    
                    if (width === 0 || height === 0) return;
                    
                    cameraRef.current.aspect = width / height;
                    cameraRef.current.updateProjectionMatrix();
                    
                    rendererRef.current.setSize(width, height);
                }, 150); // Throttle resize events
            };
            resizeHandlerRef.current = handleResize;
            window.addEventListener('resize', handleResize);

            // Animation loop with throttling
            let lastRenderTime = 0;
            const animate = (time) => {
                if (!mountedRef.current) return;
                
                animationFrameIdRef.current = requestAnimationFrame(animate);
                
                // Throttle renders to ~30fps to reduce performance impact
                if (time - lastRenderTime < 33) { // ~30fps (1000ms / 30 = 33.33)
                    return;
                }
                
                if (controlsRef.current) {
                    controlsRef.current.update();
                }
                
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                    lastRenderTime = time;
                }
            };
            animate(0);
            
            setRendererReady(true);
            console.log('THREE.js scene initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize THREE.js scene:', error);
            setError(`Failed to initialize 3D preview: ${error.message}`);
        }
    }, [addLighting, cleanupThreeJS, clearContainer]);

    // Position model in scene
    const positionModel = useCallback((mesh, geometry) => {
        // Center the model
        geometry.computeBoundingBox();
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        mesh.position.sub(center);
        
        // Scale camera distance based on model size
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(0, maxDim, maxDim * 2);
            cameraRef.current.lookAt(0, 0, 0);
            
            controlsRef.current.minDistance = maxDim * 0.5;
            controlsRef.current.maxDistance = maxDim * 4;
            controlsRef.current.update();
        }
    }, []);

    // Clear existing mesh
    const clearExistingMesh = useCallback(() => {
        if (meshRef.current && sceneRef.current) {
            sceneRef.current.remove(meshRef.current);
            
            if (meshRef.current.geometry) {
                meshRef.current.geometry.dispose();
            }
            
            if (meshRef.current.material) {
                if (Array.isArray(meshRef.current.material)) {
                    meshRef.current.material.forEach(material => material.dispose());
                } else {
                    meshRef.current.material.dispose();
                }
            }
            
            meshRef.current = null;
        }
    }, []);

    // Get material color from request
    const getMaterialColor = useCallback((request) => {
        // Default to green
        let materialColor = 0x00ff00;
        
        if (request?.filaments && request.filaments[0]?.color) {
            const colorString = request.filaments[0].color;
            
            // Convert color string to hex if it's not already
            try {
                if (colorString.startsWith('#')) {
                    materialColor = parseInt(colorString.replace('#', '0x'), 16);
                } else if (typeof colorString === 'string') {
                    // Handle named colors (basic ones only)
                    const colorMap = {
                        'black': 0x000000,
                        'white': 0xffffff,
                        'red': 0xff0000,
                        'green': 0x00ff00,
                        'blue': 0x0000ff,
                        'yellow': 0xffff00,
                        'orange': 0xffa500,
                        'purple': 0x800080,
                        'gray': 0x808080,
                        'grey': 0x808080
                    };
                    materialColor = colorMap[colorString.toLowerCase()] || 0x00ff00;
                }
            } catch (e) {
                console.warn('Error parsing color:', e);
            }
        }
        
        return materialColor;
    }, []);

    // Load STL preview
    const loadSTLPreview = useCallback(async (requestId) => {
        if (!requestId || !rendererReady) {
            console.log('Cannot load STL preview - missing requestId or renderer not ready');
            return;
        }
        
        setIsLoading(true);
        setPreviewRequestStatus({ pending: true, success: false, error: null });
        setError('');
        
        try {
            console.log(`Fetching STL preview for request ${requestId}`);
            const response = await axiosInstance.get(`/api/slicer/preview/${requestId}`, {
                responseType: 'arraybuffer',
                headers: {
                    'Accept': 'application/octet-stream'
                }
            });
            
            if (!mountedRef.current) return;
            
            console.log(`Received STL data: ${response.data.byteLength} bytes`);
            
            // Verify data
            if (!response.data || response.data.byteLength === 0) {
                throw new Error('Received empty STL data');
            }
            
            // Clear existing mesh
            clearExistingMesh();
            
            // Parse STL
            const loader = new STLLoader();
            const geometry = loader.parse(response.data);
            
            // Get material color
            const activeRequest = slicingResult?.print_requests?.find(r => r.id === requestId);
            const materialColor = getMaterialColor(activeRequest);
            
            // Create mesh
            const material = new THREE.MeshPhongMaterial({
                color: materialColor,
                specular: 0x111111,
                shininess: 200
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            meshRef.current = mesh;
            
            // Position model
            positionModel(mesh, geometry);
            
            // Add to scene
            if (sceneRef.current) {
                sceneRef.current.add(mesh);
            }
            
            setPreviewRequestStatus({ pending: false, success: true, error: null });
            console.log('STL preview loaded successfully');
            
            // Force a render since we're throttling the animation loop
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            
        } catch (error) {
            console.error('Failed to load STL preview:', error);
            setPreviewRequestStatus({ pending: false, success: false, error: error.message });
            setError(`Failed to load 3D preview: ${error.message}`);
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [rendererReady, clearExistingMesh, getMaterialColor, positionModel, slicingResult]);

    // Check if component is still mounted
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Initialization and cleanup
    useEffect(() => {
        console.log('SlicedFilesPreview mounted');
        
        // Check WebGL support
        const webGLSupported = isWebGLAvailable();
        setWebGLAvailable(webGLSupported);
        if (!webGLSupported) {
            setError('Your browser does not support WebGL, which is required for 3D model previews.');
        }
        
        // Clean up on unmount
        return () => {
            console.log('SlicedFilesPreview unmounting');
            mountedRef.current = false;
            cleanupThreeJS();
        };
    }, [cleanupThreeJS]);

    // Handle slicing result changes
    useEffect(() => {
        if (slicingResult) {
            console.log('Slicing result received:', 
                slicingResult.print_requests ? 
                `${slicingResult.print_requests.length} print requests` : 
                'No print requests'
            );
            
            // Reset current selection
            setSelectedRequests(new Set());
            setActivePreview(null);
            
            // Auto-select first preview after receiving results
            if (slicingResult.print_requests && slicingResult.print_requests.length > 0) {
                const firstRequest = slicingResult.print_requests[0];
                console.log('Auto-selecting first request:', firstRequest.id);
                
                // Short delay to allow UI to update first
                setTimeout(() => {
                    if (mountedRef.current) {
                        setActivePreview(firstRequest);
                        setSelectedRequests(new Set([firstRequest.id]));
                    }
                }, 100);
            }
        } else {
            console.log('No slicing result available');
        }
    }, [slicingResult]);

    // Initialize THREE.js scene
    useEffect(() => {
        if (!containerRef.current || !webGLAvailable || rendererReady) return;
        
        console.log('Initializing THREE.js scene');
        
        // Short timeout to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
                initScene();
            }
        }, 100);
        
        return () => {
            clearTimeout(timeoutId);
        };
    }, [webGLAvailable, rendererReady, initScene]);

    // Handle active preview change
    useEffect(() => {
        if (!activePreview || !rendererReady) return;
        
        console.log('Loading preview for request:', activePreview.id);
        
        // Clear any existing timeout
        const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
                loadSTLPreview(activePreview.id);
            }
        }, 100);
        
        return () => {
            clearTimeout(timeoutId);
        };
    }, [activePreview, rendererReady, loadSTLPreview]);

    // Toggle selection of a print request
    const handleRequestToggle = useCallback((request) => {
        setSelectedRequests(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(request.id)) {
                newSelected.delete(request.id);
            } else {
                newSelected.add(request.id);
            }
            return newSelected;
        });
    }, []);

    // Reset camera view
    const handleResetView = useCallback(() => {
        if (!meshRef.current || !cameraRef.current || !controlsRef.current) return;
        
        const box = new THREE.Box3().setFromObject(meshRef.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        cameraRef.current.position.set(0, maxDim, maxDim * 2);
        cameraRef.current.lookAt(0, 0, 0);
        
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
        
        // Force a render
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
    }, []);

    // Select or deselect all print requests
    const handleSelectAll = useCallback(() => {
        if (!slicingResult?.print_requests) return;
        
        setSelectedRequests(prev => {
            if (prev.size === slicingResult.print_requests.length) {
                return new Set();
            } else {
                return new Set(slicingResult.print_requests.map(request => request.id));
            }
        });
    }, [slicingResult]);

    // Download a single file
    const handleDownload = useCallback(async (request) => {
        if (isDownloading) return;
        
        setIsDownloading(true);
        setError('');
        
        try {
            console.log(`Downloading G-code for request ${request.id}`);
            const response = await axiosInstance.get(`/api/slicer/download/${request.id}`, {
                responseType: 'blob'
            });
            
            if (!mountedRef.current) return;
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Set filename
            const material = request.filaments?.[0]?.name || 'unknown';
            const color = request.filaments?.[0]?.color || 'unknown';
            const filename = `print_${material}_${color}_${request.id}.gcode`;
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            console.log('Download complete');
        } catch (error) {
            console.error('Download error:', error);
            if (mountedRef.current) {
                setError(`Failed to download file: ${error.message}`);
            }
        } finally {
            if (mountedRef.current) {
                setIsDownloading(false);
            }
        }
    }, [isDownloading]);

    // Download selected files
    const handleDownloadFiles = useCallback(async () => {
        if (selectedRequests.size === 0 || isDownloading) return;
        
        setIsDownloading(true);
        setError('');
        
        try {
            const selectedRequestIds = Array.from(selectedRequests);
            console.log(`Downloading ${selectedRequestIds.length} files`);
            
            // Process each selected request
            for (const requestId of selectedRequestIds) {
                if (!mountedRef.current) break;
                
                const request = slicingResult?.print_requests?.find(r => r.id === requestId);
                if (!request) continue;
                
                await handleDownload(request);
                
                // Small delay between downloads to avoid browser issues
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Batch download error:', error);
            if (mountedRef.current) {
                setError(`Failed to download one or more files: ${error.message}`);
            }
        } finally {
            if (mountedRef.current) {
                setIsDownloading(false);
            }
        }
    }, [selectedRequests, isDownloading, slicingResult, handleDownload]);

    // Memoize print requests to prevent unnecessary re-renders
    const printRequests = React.useMemo(() => {
        return slicingResult?.print_requests || [];
    }, [slicingResult?.print_requests]);

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
                        <Box 
                            sx={{ 
                                position: 'relative',
                                height: 400,
                                width: '100%',
                                border: '1px solid #eee',
                                borderRadius: 1,
                                backgroundColor: '#f5f5f5',
                                overflow: 'hidden'
                            }}
                        >
                            {!webGLAvailable ? (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    p: 2,
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="body1" color="error">
                                        WebGL is not supported in your browser.<br />
                                        3D preview requires WebGL support.
                                    </Typography>
                                </Box>
                            ) : (
                                <PreviewContainer isLoading={isLoading}>
                                    <Box 
                                        ref={containerRef} 
                                        sx={{ height: '100%', width: '100%' }} 
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
                                            zIndex: 5,
                                        }}>
                                            <Typography variant="body1" color="text.secondary">
                                                {printRequests.length > 0 
                                                    ? 'Select a print request to view preview' 
                                                    : 'No preview available'}
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {previewRequestStatus.error && !isLoading && (
                                        <Box sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            p: 1,
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            zIndex: 5,
                                        }}>
                                            <Typography variant="body2" color="error">
                                                Failed to load preview: {previewRequestStatus.error}
                                            </Typography>
                                        </Box>
                                    )}
                                </PreviewContainer>
                            )}
                        </Box>
                        
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(request);
                                            }}
                                            disabled={isDownloading}
                                            startIcon={<DownloadIcon />}
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