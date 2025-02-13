// SlicedFilesPreview.jsx

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
    IconButton,
    Tooltip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PrintIcon from '@mui/icons-material/Print';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import axiosInstance from '../api/axiosConfig';
import SelectAllIcon from '@mui/icons-material/SelectAll';

/**
 * Loading overlay component for 3D preview
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
 * Individual slice card component
 */
const SliceCard = ({ slice, isSelected, onSelect, onPreview }) => (
    <Card 
        variant="outlined"
        sx={{ 
            cursor: 'pointer',
            bgcolor: isSelected ? 'action.selected' : 'inherit',
        }}
    >
        <CardContent onClick={onSelect}>
            <Typography variant="subtitle1">{slice.name}</Typography>
            <Typography variant="body2" color="text.secondary">
                ID: {slice.id}
            </Typography>
        </CardContent>
        <CardActions>
            <Button size="small" onClick={() => onPreview(slice)}>
                Preview
            </Button>
        </CardActions>
    </Card>
);

/**
 * Main component for previewing sliced 3D files
 * @param {Object} props
 * @param {Object} props.slicingResult - Result data from slicing operation
 * @param {Function} props.onReset - Callback for resetting the view
 * @param {Function} props.onPrintStart - Callback for starting the print
 */
const SlicedFilesPreview = ({ slicingResult, onReset, onPrintStart }) => {
    const [selectedSlices, setSelectedSlices] = useState(new Set());
    const [activePreview, setActivePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Three.js refs
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const rendererRef = useRef(null);

    // Initialize Three.js scene
    useEffect(() => {
        if (!mountRef.current) return;

        const setupScene = () => {
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf5f5f5);

            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true 
            });
            
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            mountRef.current.appendChild(renderer.domElement);

            const controls = new OrbitControls(camera, renderer.domElement);
            
            // Save refs
            sceneRef.current = scene;
            cameraRef.current = camera;
            controlsRef.current = controls;
            rendererRef.current = renderer;

            // Animation loop
            const animate = () => {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };
            animate();

            // Handle window resizing
            const handleResize = () => {
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            };
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                controls.dispose();
                renderer.dispose();
                if (mountRef.current) {
                    mountRef.current.innerHTML = '';
                }
            };
        };

        return setupScene();
    }, []);

    // Load and display STL preview
    useEffect(() => {
        if (!activePreview || !sceneRef.current || !cameraRef.current) return;

        const loadSTL = async () => {
            try {
                setIsLoading(true);
                setError('');
                
                const response = await axiosInstance.get(activePreview.path, {
                    responseType: 'arraybuffer',
                    headers: {
                        'Accept': 'application/octet-stream'
                    }
                });

                const loader = new STLLoader();
                const geometry = loader.parse(response.data);
                const material = new THREE.MeshPhongMaterial({
                    color: 0x00ff00,
                    specular: 0x111111,
                    shininess: 200
                });
                const mesh = new THREE.Mesh(geometry, material);

                // Center and scale mesh
                geometry.computeBoundingBox();
                const center = geometry.boundingBox.getCenter(new THREE.Vector3());
                mesh.position.sub(center);
                
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                // Setup camera and controls
                setupCameraAndControls(maxDim);
                
                // Setup lighting
                setupLighting();

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
    }, [activePreview]);

    const setupCameraAndControls = (maxDim) => {
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

    const setupLighting = () => {
        sceneRef.current.clear();
        
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        
        directionalLight.position.set(1, 1, 1);
        backLight.position.set(-1, -1, -1);
        
        sceneRef.current.add(ambientLight, directionalLight, backLight);
    };

    const handleSliceToggle = (slice) => {
        const newSelected = new Set(selectedSlices);
        if (newSelected.has(slice.id)) {
            newSelected.delete(slice.id);
        } else {
            newSelected.add(slice.id);
        }
        setSelectedSlices(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedSlices.size === slicingResult?.slices?.length) {
            setSelectedSlices(new Set());
        } else {
            setSelectedSlices(new Set(slicingResult?.slices?.map(slice => slice.id)));
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
                        </PreviewContainer>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                            {slicingResult?.slices?.map((slice) => (
                                <SliceCard
                                    key={slice.id}
                                    slice={slice}
                                    isSelected={selectedSlices.has(slice.id)}
                                    onSelect={() => handleSliceToggle(slice)}
                                    onPreview={() => setActivePreview(slice)}
                                />
                            ))}
                        </Stack>
                    </Grid>
                </Grid>

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
        >
            {selectedSlices.size === slicingResult?.slices?.length ? 'Deselect All' : 'Select All'}
        </Button>
    </Stack>
    
    <LoadingButton
        loading={isLoading}
        loadingPosition="start"
        startIcon={<PrintIcon />}
        variant="contained"
        onClick={() => onPrintStart(Array.from(selectedSlices))}
        disabled={selectedSlices.size === 0 || isLoading}
    >
        {isLoading ? 'Starting Print...' : `Print Selected (${selectedSlices.size})`}
    </LoadingButton>
</Box>
            </Paper>
        </Stack>
    );
};

export default SlicedFilesPreview;