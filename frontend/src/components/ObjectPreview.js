import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, CircularProgress } from '@mui/material';
import axiosInstance from '../api/axiosConfig';

const ObjectPreview = ({ previewUrl, color }) => {
    const mountRef = useRef(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    useEffect(() => {
        if (!mountRef.current || !previewUrl) return;
        
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight || 120;
        
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(ambientLight, directionalLight);
        
        // Add controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enableZoom = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2;
        
        // Fetch and load the STL for this object
        const loadSTL = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(previewUrl, {
                    responseType: 'arraybuffer',
                });
                
                const loader = new STLLoader();
                const geometry = loader.parse(response.data);
                
                // Use the color prop if provided, or default to green
                const hexColor = color ? parseInt(color.replace('#', '0x')) : 0x00ff00;
                
                const material = new THREE.MeshPhongMaterial({
                    color: hexColor,
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
                
                camera.position.z = maxDim * 2.5;
                scene.add(mesh);
                
                setLoading(false);
            } catch (error) {
                console.error('Error loading object STL:', error);
                setError('Failed to load object preview');
                setLoading(false);
            }
        };
        
        loadSTL();
        
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
    }, [previewUrl, color]);

    return (
        <Box sx={{ position: 'relative' }}>
            <Box 
                ref={mountRef}
                sx={{ 
                    height: 150,
                    width: '100%',
                    border: '1px solid #eee',
                    borderRadius: 1,
                    overflow: 'hidden',
                }}
            />
            {loading && (
                <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.7)'
                }}>
                    <CircularProgress size={24} />
                </Box>
            )}
        </Box>
    );
};

export default ObjectPreview;