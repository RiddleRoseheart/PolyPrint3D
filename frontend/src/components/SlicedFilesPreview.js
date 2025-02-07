import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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
    CardActions
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PrintIcon from '@mui/icons-material/Print';

const SlicedFilesPreview = ({ slicingResult, onReset, onPrintStart = () => {} }) => {
    const [selectedSlices, setSelectedSlices] = useState(new Set());
    const [activePreview, setActivePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const previewRef = useRef(null);
    const rendererRef = useRef(null);

    // Mock slices //TODO amount of slices should come from backend
    const mockSlices = [
        { id: 1, name: 'Layer_1.gcode', height: '0-2mm', estimatedTime: '45min' },
        { id: 2, name: 'Layer_2.gcode', height: '2-4mm', estimatedTime: '30min' },
        { id: 3, name: 'Layer_3.gcode', height: '4-6mm', estimatedTime: '25min' },
    ];

    // Cleanup previous renderer
    useEffect(() => {
        return () => {
            if (rendererRef.current) {
                rendererRef.current.dispose();
                previewRef.current?.removeChild(rendererRef.current.domElement);
            }
        };
    }, []);

    // Initialize or update preview
    useEffect(() => {
        if (previewRef.current && activePreview) {
            if (rendererRef.current) {
                previewRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            initializePreview();
        }
    }, [activePreview]);

    const initializePreview = () => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);

        const camera = new THREE.PerspectiveCamera(
            75,
            previewRef.current.clientWidth / previewRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(previewRef.current.clientWidth, previewRef.current.clientHeight);
        rendererRef.current = renderer;
        previewRef.current.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        scene.add(directionalLight);

        // Mock visualization (layer height!)
        const height = parseFloat(activePreview.height.split('-')[0]) / 10;
        const geometry = new THREE.BoxGeometry(2, height, 2);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();
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
        const allIds = new Set(mockSlices.map(slice => slice.id));
        setSelectedSlices(selectedSlices.size === mockSlices.length ? new Set() : allIds);
    };

    const handlePrint = async () => {
        if (selectedSlices.size === 0) {
            setError('Please select at least one slice to print');
            return;
        }
    
        setIsLoading(true);
        try {
            // Mock implementation
            await new Promise(resolve => setTimeout(resolve, 2000));
            const selectedSliceDetails = mockSlices.filter(slice => 
                selectedSlices.has(slice.id)
            );
            console.log('Mock print started for slices:', selectedSliceDetails);
    
            /* //TODO api implementation (add to and split into seperate componet for pritn progress ?)
            const printRequest = {
                gcodeFiles: selectedSliceDetails.map(slice => ({
                    path: slice.name,
                    parameters: {
                        height: slice.height,
                        estimatedTime: slice.estimatedTime
                    }
                })),
                printerStatus: 'READY',
                printSettings: slicingResult.settings,
                filament: slicingResult.filament
            };
    
            const response = await startPrint(printRequest);
            
            if (!response.ok) {
                throw new Error('Print request failed');
            }
    
            const printJob = await response.json();
            
            // Poll for print status
            const printStatus = await checkPrintStatus(printJob.id);
            if (printStatus.status === 'FAILED') {
                throw new Error(printStatus.error || 'Print failed to start');
            }
    
            console.log('Print job started:', printJob);
            */
            
            onPrintStart(selectedSliceDetails);
        } catch (error) {
            setError('Failed to start print: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Sliced Files Preview
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Box ref={previewRef} sx={{ height: 400, width: '100%', mb: 3 }} />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <Button
                            variant="outlined"
                            onClick={handleSelectAll}
                            sx={{ mb: 2, width: '100%' }}
                        >
                            {selectedSlices.size === mockSlices.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        <Stack spacing={2}>
                            {mockSlices.map((slice) => (
                                <Card 
                                    key={slice.id}
                                    variant="outlined"
                                    sx={{ 
                                        cursor: 'pointer',
                                        bgcolor: selectedSlices.has(slice.id) ? 'action.selected' : 'inherit'
                                    }}
                                >
                                    <CardContent
                                        onClick={() => handleSliceToggle(slice)}
                                        sx={{ pb: 1 }}
                                    >
                                        <Typography variant="subtitle1">
                                            {slice.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Height: {slice.height}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Est. Time: {slice.estimatedTime}
                                        </Typography>
                                    </CardContent>
                                    <CardActions>
                                        <Button 
                                            size="small"
                                            onClick={() => setActivePreview(slice)}
                                        >
                                            Preview
                                        </Button>
                                    </CardActions>
                                </Card>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                        variant="outlined"
                        onClick={onReset}
                    >
                        Start Over
                    </Button>
                    
                    <LoadingButton
                        loading={isLoading}
                        loadingPosition="start"
                        startIcon={<PrintIcon />}
                        variant="contained"
                        onClick={handlePrint}
                        disabled={selectedSlices.size === 0 || isLoading}
                    >
                        {isLoading ? 'Starting Print...' : `Print Selected (${selectedSlices.size})`}
                    </LoadingButton>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </Paper>
        </Stack>
    );
};
export default SlicedFilesPreview;