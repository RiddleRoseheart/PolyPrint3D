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
    Paper 
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Alert } from '@mui/material';
import { getFileContent } from '../api/endpoints/fileEndpoints';
import { sliceSTLFile } from '../api/endpoints/slicerEndpoints';

/**
 * Constants for print settings 
 */
const PRINT_SETTINGS = {
    MATERIALS: ['PLA', 'ABS', 'PETG'],
    QUALITY_LEVELS: [
        { value: 'LOW', label: 'Low (0.3mm)' },
        { value: 'MEDIUM', label: 'Medium (0.2mm)' },
        { value: 'HIGH', label: 'High (0.1mm)' }
    ],
    INFILL_LEVELS: [20, 50, 80]
}; //TODO shoudl come from db

const FILAMENTS = [
    { id: 1, material: 'PLA', color: 'Red', technicalSpecs: 'Print Temp: 200-220°C' },
    { id: 2, material: 'PLA', color: 'Blue', technicalSpecs: 'Print Temp: 200-220°C' },
    { id: 3, material: 'ABS', color: 'Black', technicalSpecs: 'Print Temp: 230-250°C' }
];//TODO shoudl come from db

/**
 * PrintSettings component for configuring 3D print parameters and previewing STL files
 * @param {Object} props
 * @param {Object} props.fileData - Data about the STL file to be printed
 * @param {Function} props.onSlicingComplete - Callback when slicing is complete
 */
const PrintSettings = ({ fileData, onSlicingComplete = () => {} }) => {
    const [printSettings, setPrintSettings] = useState({
        material: 'PLA',
        quality: 'MEDIUM',
        infill: 20,
        selectedFilament: '' //TODO shoudl come from db
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [stlFile, setStlFile] = useState(null);
    const mountRef = useRef(null);

    // Get selected filament details
    const selectedFilamentDetails = FILAMENTS.find(f => f.id === printSettings.selectedFilament);

    // Load STL file content when fileData changes
    useEffect(() => {
        if (!fileData?.id) return;

        const loadFileContent = async () => {
            try {
                const blob = await getFileContent(fileData.id);
                const file = new File([blob], fileData.filename, { type: 'application/octet-stream' });
                setStlFile(file);
            } catch (error) {
                console.error('Error loading file:', error);
                setError('Failed to load file');
            }
        };

        loadFileContent();
    }, [fileData]);

    // Initialize and manage THREE.js scene
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
            const slicingSettings = {
                fileId: fileData.id,
                settings: {
                    material: selectedFilamentDetails?.material || printSettings.material,
                    quality: printSettings.quality,
                    infill: printSettings.infill,
                    filamentColor: selectedFilamentDetails?.color
                }
            };
            
            const response = await sliceSTLFile(slicingSettings);
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
                    Preview and Settings
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                
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

                <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} sx={{ mb: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Material</InputLabel>
                        <Select
                            value={printSettings.material}
                            label="Material"
                            onChange={(e) => handleSettingChange('material', e.target.value)}
                        >
                            {PRINT_SETTINGS.MATERIALS.map(material => (
                                <MenuItem key={material} value={material}>
                                    {material}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Filament</InputLabel>
                        <Select
                            value={printSettings.selectedFilament}
                            label="Filament"
                            onChange={(e) => {
                                const filament = FILAMENTS.find(f => f.id === e.target.value);
                                handleSettingChange('selectedFilament', e.target.value);
                                if (filament) {
                                    handleSettingChange('material', filament.material);
                                }
                            }}
                        >
                            {FILAMENTS.map(filament => (
                                <MenuItem key={filament.id} value={filament.id}>
                                    {`${filament.material} - ${filament.color}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

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

                <LoadingButton
                    loading={isLoading}
                    variant="contained"
                    color="primary"
                    onClick={handleSlicingSubmit}
                    fullWidth
                    disabled={!fileData || isLoading}
                >
                    {isLoading ? 'Processing...' : 'Start Slicing'}
                </LoadingButton>
            </Paper>
        </Stack>
    );
};

export default PrintSettings;