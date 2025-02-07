import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography, Button,Paper} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Alert } from '@mui/material';

const PrintSettings = ({ fileData, onSlicingComplete = () => {} }) => {

const mountRef = useRef(null);
const [material, setMaterial] = useState('PLA');
const [quality, setQuality] = useState('MEDIUM');
const [infill, setInfill] = useState(20);
const [printerStatus, setPrinterStatus] = useState('READY');
const [selectedFilament, setSelectedFilament] = useState(null);
const [color, setColor] = useState(null);

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');

// Mock data //TODO should come from backend
const filaments = [
    { id: 1, material: 'PLA', color: 'Red', technicalSpecs: 'Print Temp: 200-220°C' },
    { id: 2, material: 'PLA', color: 'Blue', technicalSpecs: 'Print Temp: 200-220°C' },
    { id: 3, material: 'ABS', color: 'Black', technicalSpecs: 'Print Temp: 230-250°C' },
    ];

    const selectedFilamentDetails = filaments.find(f => f.id === selectedFilament);

useEffect(() => {
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    const camera = new THREE.PerspectiveCamera(75,
    mountRef.current.clientWidth / mountRef.current.clientHeight,
    0.1,
    1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

// Load STL file
const loader = new STLLoader();
if (fileData) {
    const reader = new FileReader();
    reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    try {
        const geometry = loader.parse(arrayBuffer);
        const material = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00,
        specular: 0x111111,
        shininess: 200
        });
        const mesh = new THREE.Mesh(geometry, material);

      // Center the model
        geometry.computeBoundingBox();
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        mesh.position.sub(center);
        
      // Auto-adjust camera to fit model
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.z = maxDim * 2;
        
        scene.add(mesh);
    } catch (error) {
        console.error('Error parsing STL:', error);
    }
    };
    reader.readAsArrayBuffer(fileData);
}

    // Animation loop
    const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
    mountRef.current?.removeChild(renderer.domElement);
    };
}, [fileData]);

const handleSubmit = async () => {
    setIsLoading(true); 
    try {
        const printRequest = {
            gcodeFile: fileData.name,
            printerStatus: printerStatus,
            filament: selectedFilamentDetails ? {
                material: selectedFilamentDetails.material,
                color: selectedFilamentDetails.color,
            } : null,
        printSettings: {
            quality,
            infill,
            }
        };

    console.log('Print settings submitted:', printRequest);

    // TODO: uncomment when api done
        /*
        const response = await sliceSTLFile(fileData.name, {
            material: selectedFilamentDetails.material,
            quality,
            infill,
            filamentColor: selectedFilamentDetails.color
        });
        
        if (!response.ok) {
            throw new Error('Slicing failed');
        }
        
        const slicingResult = await response.json();
        console.log('Slicing started:', slicingResult);
        */

        // Simulation 
        console.log('Starting mock slicing process:', printRequest);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockResponse = {
            id: 'slice_' + Math.random().toString(36).substr(2, 9),
            status: 'SUCCESS',
            gcodeFile: fileData.name.replace('.stl', '.gcode'),
            timestamp: new Date().toISOString()
        };
        console.log('Mock slicing complete:', mockResponse);

        onSlicingComplete?.(mockResponse);

    
    } catch (error) {
    console.error('Error submitting print settings:', error);
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
        
        <Box ref={mountRef} sx={{ height: 400, width: '100%', mb: 3 }} />

        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} sx={{ mb: 2 }}>
        <FormControl fullWidth>
            <InputLabel>Material</InputLabel>
            <Select
            value={material}
            label="Material"
            onChange={(e) => setMaterial(e.target.value)}
            >
            <MenuItem value="PLA">PLA</MenuItem>
            <MenuItem value="ABS">ABS</MenuItem>
            <MenuItem value="PETG">PETG</MenuItem>
            </Select>
        </FormControl>

        <FormControl fullWidth>
            <InputLabel>Quality</InputLabel>
            <Select
            value={quality}
            label="Quality"
            onChange={(e) => setQuality(e.target.value)}
            >
            <MenuItem value="LOW">Low (0.3mm)</MenuItem>
            <MenuItem value="MEDIUM">Medium (0.2mm)</MenuItem>
            <MenuItem value="HIGH">High (0.1mm)</MenuItem>
            </Select>
        </FormControl>

        <FormControl fullWidth>
            <InputLabel>Infill</InputLabel>
            <Select
            value={infill}
            label="Infill"
            onChange={(e) => setInfill(e.target.value)}
            >
            <MenuItem value={20}>20%</MenuItem>
            <MenuItem value={50}>50%</MenuItem>
            <MenuItem value={80}>80%</MenuItem>
            </Select>
        </FormControl>

        <FormControl fullWidth>
        <InputLabel>Filament</InputLabel>
        <Select
        value={selectedFilament}
        label="Filament"
        onChange={(e) => {
            const filament = filaments.find(f => f.id === e.target.value);
            setSelectedFilament(e.target.value);
            setMaterial(filament.material);
            setColor(filament.color);
        }}
        >
        {filaments.map(filament => (
            <MenuItem key={filament.id} value={filament.id}>
                {`${filament.material} - ${filament.color}`}
            </MenuItem>
        ))}
        </Select>
    </FormControl>
        </Stack>

        <LoadingButton 
    loading={isLoading}
    loadingPosition="start"
    variant="contained" 
    color="primary" 
    onClick={handleSubmit}
    fullWidth
    disabled={!fileData || isLoading}
>
    {isLoading ? 'Processing...' : 'Start Slicing'}
</LoadingButton>

{error && (
    <Alert severity="error" sx={{ mt: 2 }}>
        {error}
    </Alert>
)}
    </Paper>
    </Stack>
);
};

export default PrintSettings;