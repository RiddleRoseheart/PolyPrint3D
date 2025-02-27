import React, { useEffect, useRef, useState } from 'react';
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
    CircularProgress
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { getFileContent, analyzeSTLFile } from '../api/endpoints/fileEndpoints';
import { sliceSTLFile, getMaterials, getColors } from '../api/endpoints/slicerEndpoints';
import MultiObjectSettings from './MultiObjectSettings';

const PRINT_SETTINGS = {
    QUALITY_LEVELS: [
        { value: 'LOW', label: 'Low (0.3mm)' },
        { value: 'MEDIUM', label: 'Medium (0.2mm)' },
        { value: 'HIGH', label: 'High (0.1mm)' }
    ],
    INFILL_LEVELS: [20, 50, 80]
};

const PrintSettings = ({ fileData, onSlicingComplete = () => {} }) => {
    const [printSettings, setPrintSettings] = useState({
        quality: 'MEDIUM',
        infill: 20,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [stlFile, setStlFile] = useState(null);
    const [materials, setMaterials] = useState({});
    const [colors, setColors] = useState({});
    const [objectSettings, setObjectSettings] = useState([]);
    const mountRef = useRef(null);

    // Load STL file content, materials, colors and analyze objects
    useEffect(() => {
        if (!fileData?.id) return;

        const loadDataAndAnalyze = async () => {
            try {
                setIsAnalyzing(true);
                
                // Get available materials and colors
                const [materialsData, colorsData] = await Promise.all([
                    getMaterials(),
                    getColors()
                ]);
                
                setMaterials(materialsData || {});
                setColors(colorsData || {});
                
                // Load file for 3D preview
                const blob = await getFileContent(fileData.id);
                const file = new File([blob], fileData.filename, { type: 'application/octet-stream' });
                setStlFile(file);
                
                // Analyze STL file to get object count
                const analysisResult = await analyzeSTLFile(fileData.id);
                
                if (analysisResult && analysisResult.objects) {
                    console.log(`Detected ${analysisResult.objects.length} objects in the STL file`);
                    setObjectSettings(analysisResult.objects);
                } else {
                    // Fallback if analysis fails
                    setObjectSettings([{ id: 1, material: 'PLA', color: 'Black' }]);
                    setError('Could not analyze objects in the STL file');
                }
                
            } catch (error) {
                console.error('Error loading or analyzing data:', error);
                setError('Failed to analyze the 3D model');
                setObjectSettings([{ id: 1, material: 'PLA', color: 'Black' }]);
            } finally {
                setIsAnalyzing(false);
            }
        };

        loadDataAndAnalyze();
    }, [fileData]);

    // Three.js preview setup (keep your existing code)
    useEffect(() => {
        if (!stlFile || !mountRef.current) return;

        const initScene = () => {
            // Clear existing scene
            if (mountRef.current.children.length > 0) {
                mountRef.current.innerHTML = '';
            }

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf5f5f5);
            
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;
            
            // Setup camera and renderer
            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            mountRef.current.appendChild(renderer.domElement);

            // Setup controls
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;

            // Setup lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(ambientLight, directionalLight);

            return { scene, camera, renderer, controls };
        };

        const { scene, camera, renderer, controls } = initScene();

        // Load and display STL file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loader = new STLLoader();
                const geometry = loader.parse(e.target.result);
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
                camera.position.z = maxDim * 2;
                
                scene.add(mesh);
            } catch (error) {
                console.error('Error parsing STL:', error);
                setError('Failed to parse 3D model');
            }
        };

        reader.readAsArrayBuffer(stlFile);

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

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            renderer.dispose();
            if (mountRef.current) {
                mountRef.current.innerHTML = '';
            }
        };
    }, [stlFile]);

    const handleSettingChange = (setting, value) => {
        setPrintSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleSlicingSubmit = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            // Send the object configurations to the backend
            const response = await sliceSTLFile(fileData.id, {
                globalSettings: {
                    infill: printSettings.infill,
                    quality: printSettings.quality
                },
                objects: objectSettings
            });
            
            onSlicingComplete(response);
        } catch (error) {
            setError(error.message || 'Failed to start slicing process');
            console.error('Slicing error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Preview and Global Settings
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                
                {isAnalyzing ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                        <CircularProgress />
                        <Typography variant="body1" sx={{ ml: 2 }}>
                            Analyzing 3D model...
                        </Typography>
                    </Box>
                ) : (
                    <Box 
                        ref={mountRef} 
                        sx={{ 
                            height: 400, 
                            width: '100%', 
                            mb: 3,
                            border: '1px solid #eee',
                            borderRadius: 1,
                            overflow: 'hidden',
                            backgroundColor: '#f5f5f5',
                            visibility: stlFile ? 'visible' : 'hidden'
                        }} 
                    />
                )}

                <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} sx={{ mb: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Quality</InputLabel>
                        <Select
                            value={printSettings.quality}
                            label="Quality"
                            onChange={(e) => handleSettingChange('quality', e.target.value)}
                        >
                            {PRINT_SETTINGS.QUALITY_LEVELS.map(({ value, label }) => (
                                <MenuItem key={value} value={value}>
                                    {label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Infill</InputLabel>
                        <Select
                            value={printSettings.infill}
                            label="Infill"
                            onChange={(e) => handleSettingChange('infill', e.target.value)}
                        >
                            {PRINT_SETTINGS.INFILL_LEVELS.map(level => (
                                <MenuItem key={level} value={level}>
                                    {`${level}%`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>
            
            {isAnalyzing ? (
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography variant="body1" component="span">
                        Detecting objects in 3D model...
                    </Typography>
                </Paper>
            ) : objectSettings.length > 0 && (
                <MultiObjectSettings 
                    objects={objectSettings}
                    onObjectsChange={setObjectSettings}
                    materials={materials}
                    colors={colors}
                />
            )}
            
            <LoadingButton
                loading={isLoading || isAnalyzing}
                variant="contained"
                color="primary"
                onClick={handleSlicingSubmit}
                fullWidth
                disabled={!fileData || isLoading || isAnalyzing || objectSettings.length === 0}
            >
                {isLoading ? 'Processing...' : 'Start Slicing'}
            </LoadingButton>
        </Stack>
    );
};

export default PrintSettings;