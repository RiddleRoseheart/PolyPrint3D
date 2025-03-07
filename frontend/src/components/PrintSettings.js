import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
    Box, 
    FormControl, 
    InputLabel, 
    MenuItem, 
    Select, 
    Stack, 
    Typography, 
    Paper, 
    Alert,
    CircularProgress,
    Button,
    Zoom,
    Fade,
    Divider,
    Chip,
    Grid,
    Tooltip,
    useTheme
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { getFileContent, analyzeSTLFile } from '../api/endpoints/fileEndpoints';
import { sliceSTLFile, getMaterials, getColors } from '../api/endpoints/slicerEndpoints';
import MultiObjectSettings from './MultiObjectSettings';
import ModelIcon from '@mui/icons-material/ViewInAr';
import CameraIcon from '@mui/icons-material/CameraAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import LayersIcon from '@mui/icons-material/Layers';
import SettingsIcon from '@mui/icons-material/Settings';

const PRINT_SETTINGS = {
    QUALITY_LEVELS: [
        { value: 'LOW', label: 'Low (0.3mm)'},
        { value: 'MEDIUM', label: 'Medium (0.2mm)'},
        { value: 'HIGH', label: 'High (0.1mm)'}
    ],
    INFILL_LEVELS: [
        { value: 20, label: '20% - Light' },
        { value: 50, label: '50% - Standard' },
        { value: 80, label: '80% - Strong' }
    ]
};

// Helper function to check if WebGL is available
const isWebGLAvailable = () => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    } catch (e) {
        console.error("Error checking WebGL availability:", e);
        return false;
    }
};

const PrintSettings = ({ fileData, onSlicingComplete = () => {}, onReset }) => {
    const theme = useTheme();

    // State for print settings
    const [printSettings, setPrintSettings] = useState({
        quality: 'MEDIUM',
        infill: 20,
    });

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState({ stage: 'initial', message: 'Initializing' });
    const [previewStatus, setPreviewStatus] = useState({
        webGLAvailable: true,
        fileLoaded: false,
        parsingComplete: false,
        sceneReady: false
    });

    // Data states
    const [stlFile, setStlFile] = useState(null);
    const [materials, setMaterials] = useState({});
    const [colors, setColors] = useState({});
    const [objectSettings, setObjectSettings] = useState([]);
    const [showDebug, setShowDebug] = useState(false);

    // THREE.js refs
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const meshRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const mountedRef = useRef(true);
    const sceneMounted = useRef(false);
    const autoReloadAttemptedRef = useRef(false);

    // Check if component is still mounted
    useEffect(() => {
        mountedRef.current = true;
        // Check WebGL support on mount
        const webGLSupported = isWebGLAvailable();
        setPreviewStatus(prev => ({ ...prev, webGLAvailable: webGLSupported }));
        if (!webGLSupported) {
            setError('WebGL is not supported in your browser. 3D preview will not work.');
        }
        return () => {
            mountedRef.current = false;
            cleanupThreeJS();
        };
    }, []);

    // Safe method to clear container contents
    const clearContainer = useCallback(() => {
        if (mountRef.current) {
            try {
                // Safer way to clear children
                while (mountRef.current.firstChild) {
                    mountRef.current.firstChild.remove();
                }
            } catch (e) {
                console.warn('Error clearing container:', e);
                // Fallback to innerHTML if remove() fails
                mountRef.current.innerHTML = '';
            }
        }
    }, []);

    // Clean up THREE.js resources
    const cleanupThreeJS = useCallback(() => {
        console.log('Cleaning up THREE.js resources');
        
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
        
        // Dispose mesh
        if (meshRef.current) {
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
            
            if (sceneRef.current) {
                sceneRef.current.remove(meshRef.current);
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
        
        setPreviewStatus(prev => ({
            ...prev,
            sceneReady: false
        }));
    }, [clearContainer]);

    // Load STL file content, materials, colors and analyze objects
    useEffect(() => {
        if (!fileData?.id) {
            console.log("No fileData.id available");
            return;
        }

        const loadDataAndAnalyze = async () => {
            setIsAnalyzing(true);
            setDebugInfo({ stage: 'loading', message: 'Loading file and materials' });
            
            try {
                // Get available materials and colors
                console.log("Fetching materials and colors...");
                const [materialsData, colorsData] = await Promise.all([
                    getMaterials(),
                    getColors()
                ]);
                
                setMaterials(materialsData || {});
                setColors(colorsData || {});
                
                // Load file for 3D preview
                setDebugInfo({ stage: 'file_loading', message: 'Loading STL file content' });
                console.log("Loading STL file content...");
                
                try {
                    const blob = await getFileContent(fileData.id);
                    console.log("File loaded, size:", blob.size, "bytes");
                    
                    if (!blob || blob.size === 0) {
                        throw new Error('Received empty file');
                    }
                    
                    const file = new File([blob], fileData.filename || 'model.stl', { type: 'application/octet-stream' });
                    setStlFile(file);
                    setPreviewStatus(prev => ({ ...prev, fileLoaded: true }));
                    
                    setDebugInfo({ stage: 'file_loaded', message: `File loaded: ${file.name} (${file.size} bytes)` });
                } catch (fileError) {
                    console.error("Error loading file content:", fileError);
                    setError(`Failed to load file: ${fileError.message}`);
                }
                
                // Analyze STL file to get object count
                setDebugInfo({ stage: 'analyzing', message: 'Analyzing STL file for objects' });
                console.log("Analyzing STL file...");
                
                try {
                    const analysisResult = await analyzeSTLFile(fileData.id);
                    console.log('Analysis result:', analysisResult);
                    
                    if (analysisResult?.status === 'success' && analysisResult.data?.objects) {
                        setObjectSettings(analysisResult.data.objects);
                        setDebugInfo({ stage: 'analysis_complete', message: `Detected ${analysisResult.data.objects.length} objects` });
                    } else if (analysisResult?.objects) {
                        setObjectSettings(analysisResult.objects);
                        setDebugInfo({ stage: 'analysis_complete', message: `Detected ${analysisResult.objects.length} objects (legacy format)` });
                    } else {
                        console.warn("Could not detect objects, using default");
                        setObjectSettings([{ id: 1, material: 'PLA', color: 'Black' }]);
                        setDebugInfo({ stage: 'analysis_fallback', message: 'Using default object settings' });
                    }
                } catch (analysisError) {
                    console.error("Error analyzing STL:", analysisError);
                    setError(`Failed to analyze model: ${analysisError.message}`);
                    setObjectSettings([{ id: 1, material: 'PLA', color: 'Black' }]);
                    setDebugInfo({ stage: 'analysis_error', message: `Analysis error: ${analysisError.message}` });
                }
                
            } catch (error) {
                console.error('Error in data loading pipeline:', error);
                setError(`Error: ${error.message}`);
                setDebugInfo({ stage: 'error', message: `Error: ${error.message}` });
            } finally {
                setIsAnalyzing(false);
            }
        };

        loadDataAndAnalyze();
        
        // Reset auto-reload attempt flag when fileData changes
        autoReloadAttemptedRef.current = false;
    }, [fileData]);

    // Initialize THREE.js scene when STL file is ready
    useEffect(() => {
        if (!stlFile || !mountRef.current || !previewStatus.webGLAvailable) {
            return;
        }

        // First clean up any existing scene
        cleanupThreeJS();

        // Short delay to ensure cleanup completes
        const timeoutId = setTimeout(() => {
            if (!mountedRef.current) return;

            console.log("Initializing THREE.js scene");
            setDebugInfo({ stage: 'preview_init', message: 'Initializing 3D preview' });

            try {
                // Initialize scene
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x000000); // Black background
                sceneRef.current = scene;
                
                // Get container dimensions
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;
                console.log("Container dimensions:", width, "x", height);
                
                // Create camera
                const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
                camera.position.set(0, 5, 10);
                cameraRef.current = camera;

                // Clear container before creating renderer
                clearContainer();
                
                console.log("Creating WebGL renderer");
                const renderer = new THREE.WebGLRenderer({ 
                    antialias: true,
                    alpha: true
                });
                
                renderer.setSize(width, height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                mountRef.current.appendChild(renderer.domElement);
                rendererRef.current = renderer;
                sceneMounted.current = true;
                
                setDebugInfo({ stage: 'renderer_created', message: 'WebGL renderer created' });
                
                // Setup controls
                console.log("Setting up orbit controls");
                const controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.25;
                controlsRef.current = controls;
                
                // Add lights
                const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(1, 1, 1);
                scene.add(ambientLight, directionalLight);
                
                // Handle window resize
                const handleResize = () => {
                    if (!mountRef.current || !rendererRef.current) return;
                    
                    const width = mountRef.current.clientWidth;
                    const height = mountRef.current.clientHeight;
                    
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    
                    renderer.setSize(width, height);
                };
                
                window.addEventListener('resize', handleResize);
                
                // Animation loop
                const animate = () => {
                    if (!mountedRef.current) return;
                    
                    animationFrameIdRef.current = requestAnimationFrame(animate);
                    
                    if (controlsRef.current) {
                        controlsRef.current.update();
                    }
                    
                    if (rendererRef.current && sceneRef.current && cameraRef.current) {
                        rendererRef.current.render(sceneRef.current, cameraRef.current);
                    }
                };
                
                animate();
                
                setPreviewStatus(prev => ({ ...prev, sceneReady: true }));
                setDebugInfo({ stage: 'scene_ready', message: 'THREE.js scene ready' });
                
                // Load the STL model
                console.log("Loading STL into scene");
                loadSTLModel();

            } catch (error) {
                console.error('Error setting up THREE.js scene:', error);
                setError(`Failed to initialize 3D preview: ${error.message}`);
                setDebugInfo({ stage: 'init_error', message: `Scene init error: ${error.message}` });
            }
        }, 100);
        
        return () => {
            clearTimeout(timeoutId);
        };
    }, [stlFile, clearContainer, cleanupThreeJS, previewStatus.webGLAvailable]);

    // Load STL model into the scene
    const loadSTLModel = useCallback(() => {
        if (!stlFile || !sceneRef.current || !cameraRef.current) {
            console.log("Cannot load STL model - prerequisites not met");
            return;
        }
        
        try {
            setDebugInfo({ stage: 'loading_stl', message: 'Loading STL into scene' });
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                if (!mountedRef.current) return;
                
                try {
                    console.log("Parsing STL data");
                    const loader = new STLLoader();
                    const geometry = loader.parse(e.target.result);
                    
                    setPreviewStatus(prev => ({ ...prev, parsingComplete: true }));
                    setDebugInfo({ stage: 'stl_parsed', message: 'STL file parsed successfully' });
                    
                    // Create material and mesh with white highlight instead of red
                    const material = new THREE.MeshPhongMaterial({
                        color: 'white', // White color
                        specular: '0x444444',
                        shininess: 1000,
                        emissive: 0x222224, // Slight glow
                        emissiveIntensity: 20
                    });
                    
                    const mesh = new THREE.Mesh(geometry, material);
                    meshRef.current = mesh;
                    
                    // Center model
                    geometry.computeBoundingBox();
                    const center = geometry.boundingBox.getCenter(new THREE.Vector3());
                    mesh.position.sub(center);
                    
                    // Scale view to model
                    const box = new THREE.Box3().setFromObject(mesh);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    
                    console.log("Model dimensions:", size);
                    cameraRef.current.position.z = maxDim * 2.5;
                    
                    if (controlsRef.current) {
                        controlsRef.current.target.set(0, 0, 0);
                        controlsRef.current.update();
                    }
                    
                    // Add to scene
                    sceneRef.current.add(mesh);
                    setDebugInfo({ stage: 'model_loaded', message: 'Model added to scene' });
                    
                } catch (parseError) {
                    console.error('Error parsing STL:', parseError);
                    setError(`Failed to parse STL: ${parseError.message}`);
                    setDebugInfo({ stage: 'parse_error', message: `Parse error: ${parseError.message}` });
                }
            };
            
            reader.onerror = (fileError) => {
                console.error('Error reading file:', fileError);
                setError(`Failed to read file: ${fileError}`);
                setDebugInfo({ stage: 'read_error', message: `File read error: ${fileError}` });
            };
            
            console.log("Reading STL file");
            reader.readAsArrayBuffer(stlFile);
            
        } catch (error) {
            console.error('Error in STL loading process:', error);
            setError(`Failed to load 3D model: ${error.message}`);
            setDebugInfo({ stage: 'load_error', message: `Load error: ${error.message}` });
        }
    }, [stlFile]);

    // Force reload preview
    const handleForceReload = useCallback(() => {
        // First clean up any existing scene
        cleanupThreeJS();
        
        // Short delay to ensure cleanup completes
        setTimeout(() => {
            if (stlFile && mountRef.current) {
                // Create a new scene
                const scene = new THREE.Scene();
                scene.background = new THREE.Color('black'); // Black background
                sceneRef.current = scene;
                
                // Get container dimensions
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;
                
                // Create camera
                const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
                camera.position.set(0, 5, 10);
                cameraRef.current = camera;
                
                // Clear any existing content
                clearContainer();
                
                // Create renderer
                const renderer = new THREE.WebGLRenderer({ 
                    antialias: true,
                    alpha: true
                });
                
                renderer.setSize(width, height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                mountRef.current.appendChild(renderer.domElement);
                rendererRef.current = renderer;
                sceneMounted.current = true;
                
                // Create controls
                const controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controlsRef.current = controls;
                
                // Add lights
                const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(1, 1, 1);
                scene.add(ambientLight, directionalLight);
                
                // Animation loop
                const animate = () => {
                    if (!mountedRef.current) return;
                    
                    animationFrameIdRef.current = requestAnimationFrame(animate);
                    
                    if (controlsRef.current) {
                        controlsRef.current.update();
                    }
                    
                    if (rendererRef.current && sceneRef.current && cameraRef.current) {
                        rendererRef.current.render(sceneRef.current, cameraRef.current);
                    }
                };
                
                animate();
                
                setPreviewStatus(prev => ({ ...prev, sceneReady: true }));
                
                // Load the STL model
                loadSTLModel();
            }
        }, 200);
    }, [stlFile, cleanupThreeJS, clearContainer, loadSTLModel]);

    // Auto-reload effect
    useEffect(() => {
        if (stlFile && 
            previewStatus.fileLoaded && 
            !previewStatus.sceneReady && 
            !autoReloadAttemptedRef.current && 
            !isAnalyzing) {
            
            console.log("Auto-triggering scene reload");
            autoReloadAttemptedRef.current = true;
            
            const autoReloadTimer = setTimeout(() => {
                handleForceReload();
            }, 1000);
            
            return () => clearTimeout(autoReloadTimer);
        }
    }, [stlFile, previewStatus.fileLoaded, previewStatus.sceneReady, isAnalyzing, handleForceReload]);

    // Handle print settings change
    const handleSettingChange = (setting, value) => {
        setPrintSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    // Handle slicing submit
    const handleSlicingSubmit = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            console.log('Sending slicing request:', {
                fileId: fileData.id,
                globalSettings: {
                    infill: printSettings.infill,
                    quality: printSettings.quality
                },
                objects: objectSettings
            });

            const response = await sliceSTLFile(fileData.id, {
                globalSettings: {
                    infill: printSettings.infill,
                    quality: printSettings.quality
                },
                objects: objectSettings
            });
            
            console.log('Slicing completed:', response);
            onSlicingComplete(response);
            
        } catch (error) {
            console.error('Slicing error:', error);
            setError(error.message || 'Failed to start slicing process');
        } finally {
            setIsLoading(false);
        }
    };

    // Reset camera view
    const handleResetCamera = () => {
        if (!meshRef.current || !cameraRef.current || !controlsRef.current) return;
        
        // Get bounding box to calculate best camera position
        const box = new THREE.Box3().setFromObject(meshRef.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Reset camera
        cameraRef.current.position.set(0, maxDim * 0.8, maxDim * 2);
        cameraRef.current.lookAt(0, 0, 0);
        
        // Reset controls
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
        
        // Force a render
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
    };

    // Find quality level label
    const getQualityLabel = (value) => {
        const quality = PRINT_SETTINGS.QUALITY_LEVELS.find(q => q.value === value);
        return quality ? quality.label : value;
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Zoom in={true} timeout={500}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 0, 
                        mb: 3, 
                        overflow: 'hidden',
                        borderRadius: 0,
                        border: '1px solid rgb(236, 236, 236)',
                        background: '#111111',
                        boxShadow: '0 15px 35px rgba(19, 19, 19, 0.5)'
                    }}
                >
                    <Box sx={{ 
                        bgcolor: '#000000',
                        color: 'white',
                        p: 2, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #222222'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ModelIcon sx={{ mr: 1 }} />
                            <Typography variant="h6" sx={{ fontWeight: 'bold', letterSpacing: '0.02em' }}>
                                3D Model Preview
                            </Typography>
                        </Box>
                    </Box>

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                m: 2,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                color: '#ffffff'
                            }}
                            onClose={() => setError('')}
                        >
                            {error}
                        </Alert>
                    )}

                    
                    {isAnalyzing ? (
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            height: 400,
                            bgcolor: '#050505'
                        }}>
                            <CircularProgress sx={{ color: 'white', mb: 2 }} />
                            <Typography variant="body1" sx={{ color: '#aaaaaa' }}>
                                Analyzing 3D model...
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ position: 'relative' }}>
                            <Box 
                                ref={mountRef} 
                                sx={{ 
                                    height: 400, 
                                    width: 800,
                                    
                                    overflow: 'hidden',
                                    position: 'relative',
                                    bgcolor: '#050505',
                                }} 
                            >
                                {(!stlFile || !previewStatus.fileLoaded) && (
                                    <Box sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        zIndex: 1
                                    }}>
                                        <Typography variant="body1" color="#aaaaaa">
                                            {fileData ? 'Loading 3D model...' : 'No 3D model loaded'}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                            
                            {meshRef.current && previewStatus.sceneReady && (
                                <Box sx={{
                                    position: 'absolute',
                                    bottom: 16,
                                    right: 16,
                                    zIndex: 2
                                }}>
                                    <Tooltip title="Reset Camera View">
                                        <Button
                                            variant="contained"
                                            onClick={handleResetCamera}
                                            size="small"
                                            sx={{
                                                minWidth: 'auto',
                                                width: 36,
                                                height: 36,
                                                borderRadius: 0,
                                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255, 255, 255, 0.3)'
                                                }
                                            }}
                                        >
                                            <CameraIcon fontSize="small" />
                                        </Button>
                                    </Tooltip>
                                </Box>
                            )}
                        </Box>
                    )}
                </Paper>
            </Zoom>
            
            {/* Global settings section */}
            <Fade in={true} timeout={800} style={{ transitionDelay: '200ms' }}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 3, 
                        mb: 3,
                        borderRadius: 0,
                        border: '1px solid rgb(211, 211, 211)',
                        background: '#111111',
                        boxShadow: '0 15px 35px rgba(24, 24, 24, 0.5)'
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2 
                    }}>
                        <SettingsIcon 
                            sx={{ 
                                mr: 1, 
                                color: 'white',
                                fontSize: 28
                            }} 
                        />
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                fontWeight: 'bold',
                                color: 'white',
                                letterSpacing: '0.02em'
                            }}
                        >
                            Global Print Settings
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 3, borderColor: '#333333' }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ 
                                p: 2, 
                                border: '1px solid #333333',
                                borderRadius: 0,
                                bgcolor: '#0a0a0a'
                            }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mb: 2 
                                }}>
                                    <LayersIcon 
                                        sx={{ 
                                            mr: 1, 
                                            color: 'white' 
                                        }} 
                                    />
                                    <Typography variant="subtitle1" fontWeight="bold" color="white">
                                        Quality
                                    </Typography>
                                </Box>
                                
                                <FormControl fullWidth sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': {
                                            borderColor: '#333333',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: '#555555',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'white',
                                        }
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#aaaaaa'
                                    }
                                }}>
                                    <InputLabel>Layer Quality</InputLabel>
                                    <Select
                                        value={printSettings.quality}
                                        label="Layer Quality"
                                        onChange={(e) => handleSettingChange('quality', e.target.value)}
                                    >
                                        {PRINT_SETTINGS.QUALITY_LEVELS.map(({ value, label, icon }) => (
                                            <MenuItem key={value} value={value} sx={{color: 'white'}}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ marginRight: 8 }}>{icon}</span>
                                                    {label}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                <Typography variant="body2" color="#aaaaaa" sx={{ mt: 1 }}>
                                    Selected: <Chip 
                                        size="small" 
                                        label={getQualityLabel(printSettings.quality)} 
                                        sx={{ 
                                            ml: 1, 
                                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'white' ,
                                            fontWeight: 'medium'
                                        }} 
                                    />
                                </Typography>
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Box sx={{ 
                                p: 2, 
                                border: '1px solid #333333',
                                borderRadius: 0,
                                bgcolor: '#0a0a0a'
                            }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mb: 2 
                                }}>
                                    <SpeedIcon 
                                        sx={{ 
                                            mr: 1, 
                                            color: 'white' 
                                        }} 
                                    />
                                    <Typography variant="subtitle1" fontWeight="bold" color="white">
                                        Infill
                                    </Typography>
                                </Box>
                                
                                <FormControl fullWidth sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': {
                                            borderColor: '#333333',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: '#555555',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'white',
                                        }
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#aaaaaa'
                                    }
                                }}>
                                    <InputLabel>Infill Density</InputLabel>
                                    <Select
                                        value={printSettings.infill}
                                        label="Infill Density"
                                        onChange={(e) => handleSettingChange('infill', e.target.value)}
                                    >
                                        {PRINT_SETTINGS.INFILL_LEVELS.map(({ value, label }) => (
                                            <MenuItem key={value} value={value} sx={{color: 'white'}}>
                                                {label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                <Typography variant="body2" color="#aaaaaa" sx={{ mt: 1 }}>
                                    Selected: <Chip 
                                        size="small" 
                                        label={`${printSettings.infill}%`} 
                                        sx={{ 
                                            ml: 1, 
                                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'white',
                                            fontWeight: 'medium'
                                        }} 
                                    />
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Fade>
            
            {/* Object settings section */}
            <Fade in={!isAnalyzing && objectSettings.length > 0} timeout={800} style={{ transitionDelay: '400ms' }}>
                <Box>
                    {isAnalyzing ? (
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                p: 4, 
                                textAlign: 'center',
                                borderRadius: 0,
                                border: '1px solid rgb(222, 222, 222)',
                                background: '#111111',
                                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <CircularProgress size={24} sx={{ mr: 2, color: 'white' }} />
                            <Typography variant="body1" component="span" color="#aaaaaa">
                                Detecting objects in 3D model...
                            </Typography>
                        </Paper>
                    ) : objectSettings.length > 0 && (
                        <MultiObjectSettings 
                            objects={objectSettings}
                            onObjectsChange={setObjectSettings}
                            materials={materials}
                            colors={colors}
                            setColors={setColors}
                        
                        />
                    )}
                </Box>
            </Fade>
            
            {/* Submit button */}
            <Fade in={true} timeout={800} style={{ transitionDelay: '600ms' }}>
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={onReset}
                        sx={{
                            py: 1.5,
                            border: '2px solid white',
                            color: 'white',
                            backgroundColor: 'transparent',
                            borderRadius: 0,
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            letterSpacing: '0.05em',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                backgroundColor: 'white',
                                color: 'black',
                                borderColor: 'white',
                                transform: 'translateY(-3px)',
                                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)'
                            }
                        }}
                    >
                        Back
                    </Button>
                    
                    <LoadingButton
                        loading={isLoading || isAnalyzing}
                        loadingPosition="start"
                        startIcon={<SettingsIcon />}
                        variant="contained"
                        onClick={handleSlicingSubmit}
                        fullWidth
                        disabled={!fileData || isLoading || isAnalyzing || objectSettings.length === 0}
                        sx={{
                            py: 1.5,
                            background: 'transparent',
                            border: '2px solid white',
                            color: 'white',
                            borderRadius: 0,
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            letterSpacing: '0.05em',
                            transition: 'all 0.3s ease',
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: 'white',
                                color: 'black',
                                borderColor: 'white',
                                transform: 'translateY(-3px)',
                                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)'
                            },
                            '&:disabled': {
                                backgroundColor: 'transparent',
                                borderColor: '#333333',
                                color: '#333333'
                            },
                            '& .MuiLoadingButton-loadingIndicator': {
                                color: 'white'
                            }
                        }}
                    >
                        {isLoading ? 'Processing...' : 'Start Slicing'}
                    </LoadingButton>
                </Box>
            </Fade>
        </Box>
    );
};

export default PrintSettings;