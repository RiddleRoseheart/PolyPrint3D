import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, CircularProgress, Typography } from '@mui/material';
import axiosInstance from '../api/axiosConfig';

/**
 * Component for rendering a 3D preview of an object
 * @param {Object} props
 * @param {string} props.previewUrl - URL to the STL file
 * @param {string} props.color - Hex color to apply to the object
 * @returns {JSX.Element} Object preview component
 */
const ObjectPreview = ({ previewUrl, color }) => {
    const mountRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const sceneRef = useRef(null);
    const meshRef = useRef(null);

        useEffect(() => {
            if (!mountRef.current || !previewUrl) return;
            
            let renderer, controls, scene, camera, animationId;
            
            try {
              const width = mountRef.current.clientWidth;
              const height = mountRef.current.clientHeight || 120;
              
              // Check for WebGL support
              const canvas = document.createElement('canvas');
              const hasWebGL = !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
              
              if (!hasWebGL) {
                setError('WebGL not supported');
                return;
              }
              
              // Scene setup
              scene = new THREE.Scene();
              scene.background = new THREE.Color(0xf5f5f5);
              
              camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
              
              try {
                renderer = new THREE.WebGLRenderer({ 
                  antialias: true,
                  powerPreference: 'default'
                });
                
                renderer.setSize(width, height);
                
                // Clear previous content
                if (mountRef.current.firstChild) {
                  mountRef.current.removeChild(mountRef.current.firstChild);
                }
                
                mountRef.current.appendChild(renderer.domElement);
              } catch (renderError) {
                console.error('WebGL renderer error:', renderError);
                setError('WebGL initialization failed');
                return;
              }
              
              // Add lighting
              const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
              const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
              directionalLight.position.set(1, 1, 1);
              scene.add(ambientLight, directionalLight);
              
              // Add controls
              controls = new OrbitControls(camera, renderer.domElement);
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
                  const hexColor = color ? (
                    typeof color === 'string' && color.startsWith('#') 
                      ? parseInt(color.replace('#', '0x'), 16)
                      : 0x00ff00
                  ) : 0x00ff00;
                  
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
              
              // Animation loop with error handling
              const animate = () => {
                try {
                  const id = requestAnimationFrame(animate);
                  controls.update();
                  renderer.render(scene, camera);
                  return id;
                } catch (error) {
                  console.error('Render loop error:', error);
                  setError('Preview rendering failed');
                  return null;
                }
              };
              
              animationId = animate();
              
              // Handle window resizing
              const handleResize = () => {
                if (!mountRef.current) return;
                
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
                if (animationId) cancelAnimationFrame(animationId);
                if (controls) controls.dispose();
                
                if (renderer) {
                  renderer.forceContextLoss();
                  renderer.dispose();
                }
                
                if (mountRef.current) {
                  mountRef.current.innerHTML = '';
                }
              };
            } catch (error) {
              console.error('Setup error:', error);
              setError('Failed to set up preview');
              return () => {};
            }
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
            {error && (
                <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    flexDirection: 'column'
                }}>
                    <Typography variant="caption" color="error">
                        {error}
                    </Typography>
                </Box>
            )}
        </Box>
    );
 };
 
 export default ObjectPreview;