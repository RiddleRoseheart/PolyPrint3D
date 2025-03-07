import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    Divider,
    Card, 
    CardContent, 
    FormControl, 
    InputLabel, 
    MenuItem, 
    Select,
    Stack,
    Grid
} from '@mui/material';
import ObjectPreview from './ObjectPreview';
import { getColors, getMaterials } from '../api/endpoints/slicerEndpoints';
/**
 * Component for individual object settings card
 * @param {Object} props
 * @param {Object} props.object - Object data
 * @param {number} props.index - Index of the object in the list
 * @param {Object} props.materials - Available materials
 * @param {Object} props.colors - Available colors with hex values
 * @param {Function} props.onChange - Change handler for object properties
 * @returns {JSX.Element} Object settings card component
 */
const ObjectSettingsCard = ({ object, index, materials, colors, onChange, onMaterialChange }) => {
    // Get hex color for the preview
    const hexColor = colors[object.color] || '#00FF00';
    
    // Handle material change
    const handleMaterialChange = (e) => {
        const materialValue = e.target.value;
        onChange(index, 'material', materialValue);
        
        // Notify parent to fetch colors for this material
        if (onMaterialChange) {
            onMaterialChange(materialValue);
        }
    };
    
    return (
        <Card variant="outlined"  sx={{ mb: 2 }} >
            <Grid container  spacing={2}>
                <Grid item xs={12} sm={4} md={3}>
                    <Box sx={{ p: 2 }}>
                        <ObjectPreview 
                            previewUrl={object.preview_url} 
                            color={hexColor}
                        />
                    </Box>
                </Grid>
                <Grid item xs={12} sm={8} md={9} >
                    <CardContent >
                        <Typography variant="h6" gutterBottom>
                            Object {index + 1}
                        </Typography>
                        
                        {object.volume && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Volume: {(object.volume / 1000).toFixed(2)} cm³ 
                                {object.face_count && ` • Faces: ${object.face_count.toLocaleString()}`}
                            </Typography>
                        )}
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                        <InputLabel>Material</InputLabel>
                        <Select
                            value={object.material || 'PLA'}
                            label="Material"
                            onChange={(e) => {
                                onChange(index, 'material', e.target.value);
                            }}
                        >
                        
                                        {Object.keys(materials).map(material => (
                                            <MenuItem key={material} value={material}>
                                                {material}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                        <InputLabel>Color</InputLabel>
                        <Select
                            value={object.color || Object.keys(colors)[0] || 'Black'}
                            label="Color"
                            onChange={(e) => onChange(index, 'color', e.target.value)}
                        >
                                        {Object.keys(colors).map(color => (
                                <MenuItem key={color} value={color} sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box 
                                        component="span" 
                                        sx={{ 
                                            display: 'inline-block', 
                                            width: 16, 
                                            height: 16, 
                                            bgcolor: colors[color],
                                            mr: 1,
                                            border: '1px solid white',
                                            borderRadius: '2px'
                                        }} 
                                        />
                                        {color}
                                    </MenuItem>
                                ))}
                            </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Grid>
            </Grid>
        </Card>
    );
};

/**
 * Component for managing multiple object settings
 * @param {Object} props
 * @param {Array} props.objects - List of objects to configure
 * @param {Function} props.onObjectsChange - Handler for when objects are changed
 * @param {Object} props.materials - Available materials
 * @param {Object} props.colors - Available colors with hex values
 * @returns {JSX.Element} Multi-object settings component
 */
const MultiObjectSettings = ({ objects, onObjectsChange, materials, colors: globalColors, setColors }) => {
    // New state for object-specific colors
    const [objectColors, setObjectColors] = useState({});
    
    // Initialize object colors
    useEffect(() => {
        const initialObjectColors = {};
        objects.forEach((obj, index) => {
            initialObjectColors[index] = globalColors;
        });
        setObjectColors(initialObjectColors);
    }, []);
    
    // Get colors for a specific object
    const getColorsForObject = (index) => {
        return objectColors[index] || globalColors;
    };
    
    // Handle material change for a specific object
    const handleMaterialChange = async (index, materialName) => {
        try {
            console.log(`Fetching colors for object ${index}, material: ${materialName}`);
            
            // Get the material ID from the materials object
            const materialInfo = materials[materialName];
            const materialId = materialInfo?.id;
            
            if (materialId) {
                const materialColors = await getColors(materialId);
                
                // Only update colors for this specific object
                setObjectColors(prev => ({
                    ...prev,
                    [index]: materialColors
                }));
                
                // Update object's color if current color isn't available in new material
                const updatedObjects = [...objects];
                const availableColors = Object.keys(materialColors);
                
                if (availableColors.length > 0 && !availableColors.includes(updatedObjects[index].color)) {
                    updatedObjects[index] = {
                        ...updatedObjects[index],
                        color: availableColors[0]
                    };
                    onObjectsChange(updatedObjects);
                }
            }
        } catch (error) {
            console.error(`Error fetching colors for object ${index}:`, error);
        }
    };
    
    const handleObjectChange = (index, property, value) => {
        const updatedObjects = [...objects];
        updatedObjects[index] = {
            ...updatedObjects[index],
            [property]: value
        };
        
        // If changing material, fetch new colors for this object
        if (property === 'material') {
            handleMaterialChange(index, value);
        }
        
        onObjectsChange(updatedObjects);
    };
    
    // Apply to all objects
    const applyToAll = async (property, value) => {
        const updatedObjects = objects.map(obj => ({
            ...obj,
            [property]: value
        }));
        onObjectsChange(updatedObjects);
        
        // If changing material for all, update global colors
        if (property === 'material') {
            const materialInfo = materials[value];
            const materialId = materialInfo?.id;
            
            if (materialId) {
                const newColors = await getColors(materialId);
                setColors(newColors);
                
                // Reset object-specific colors to use global colors
                const resetObjectColors = {};
                objects.forEach((_, index) => {
                    resetObjectColors[index] = newColors;
                });
                setObjectColors(resetObjectColors);
            }
        }
    };

    return (
        <Box border='1px solid rgb(222, 222, 222)'>
        <Paper  elevation={3} sx={{ p: 2 }}  >
            {/* Apply to all section - no change */}
            <Typography variant="h6" gutterBottom>
                Object-Specific Settings ({objects.length} objects)
            </Typography>
            
            <Box sx={{ mb: 2 }} >
                <Typography variant="subtitle2" gutterBottom>
                    Apply to all objects:
                </Typography>
                <Stack direction="row" spacing={2}>
                    {/* Material selector - no change */}
                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel size="small">Material</InputLabel>
                        <Select
                            size="small"
                            label="Material"
                            onChange={(e) => applyToAll('material', e.target.value)}
                        >
                            {Object.keys(materials).map(material => (
                                <MenuItem key={material} value={material}>
                                    {material}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    {/* Global color selector */}
                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel size="small">Color</InputLabel>
                        <Select
                            size="small"
                            label="Color"
                            onChange={(e) => applyToAll('color', e.target.value)}
                            sx={{
                                '& .MuiSelect-select': {
                                    display: 'flex',
                                    alignItems: 'center'
                                }
                            }}
                        >
                            {Object.keys(globalColors).map(color => (
                                <MenuItem key={color} value={color} sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box 
                                        component="span" 
                                        sx={{ 
                                            display: 'inline-block', 
                                            width: 16, 
                                            height: 16, 
                                            bgcolor: globalColors[color],
                                            mr: 1,
                                            border: '1px solid #ccc',
                                            borderRadius: '2px'
                                        }} 
                                    />
                                    {color}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Object cards with object-specific colors */}
            {objects.map((object, index) => (
                <ObjectSettingsCard
                    key={index}
                    object={object}
                    index={index}
                    materials={materials}
                    colors={getColorsForObject(index)}
                    onChange={handleObjectChange}
                />
            ))}
            
            {objects.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No objects available
                </Typography>
            )}
        </Paper>
        </Box>
    );
};
export default MultiObjectSettings;