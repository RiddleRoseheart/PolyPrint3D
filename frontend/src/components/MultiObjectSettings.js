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
    Grid,
    Tooltip
} from '@mui/material';
import ObjectPreview from './ObjectPreview';
import { getColors, getMaterials } from '../api/endpoints/slicerEndpoints';
import { getAllPrinters } from '../api/endpoints/printerEndpoints';
import { checkLocalMode} from '../api/endpoints/configEndpoints';
/* Component for individual object settings card
 * @param {Object} props
 * @param {Object} props.object - Object data
 * @param {number} props.index - Index of the object in the list
 * @param {Object} props.materials - Available materials
 * @param {Object} props.colors - Available colors with hex values
 * @param {Function} props.onChange - Change handler for object properties
 * @returns {JSX.Element} Object settings card component
 */
const ObjectSettingsCard = ({ 
    object, 
    index, 
    materials = {}, 
    colors = {}, 
    onChange, 
    onMaterialChange 
}) => {
    // Ensure object is defined with default values
    const safeObject = object || {};
    
    // Fallback color selection
    const selectedMaterial = safeObject.material || Object.keys(materials)[0] || 'PLA';
    const selectedColor = safeObject.color || Object.keys(colors)[0] || 'Black';

    // Get hex color for the preview, with multiple fallbacks
    const hexColor = (colors[selectedColor] || '#00FF00');
    
    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4} md={3}>
                    <Box sx={{ p: 2 }}>
                        <ObjectPreview 
                            previewUrl={safeObject.preview_url} 
                            color={hexColor}
                        />
                    </Box>
                </Grid>
                <Grid item xs={12} sm={8} md={9}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Object {index + 1}
                        </Typography>
                        
                        {safeObject.volume && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Volume: {(safeObject.volume / 1000).toFixed(2)} cm³ 
                                {safeObject.face_count && ` • Faces: ${safeObject.face_count.toLocaleString()}`}
                            </Typography>
                        )}
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Material</InputLabel>
                                    <Select
                                        value={selectedMaterial}
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
                                        value={selectedColor}
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
                                                        border: '1px solid #ccc',
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

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '0, 0, 0';
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
const MultiObjectSettings = ({ 
    objects = [], 
    onObjectsChange, 
    materials = {}, 
    colors: globalColors = {}, 
    setColors,
    isLocalMode = false 
}) => {
    const [printerStatus, setPrinterStatus] = useState({});
    const [availableMaterials, setAvailableMaterials] = useState(materials);
    const [availableColors, setAvailableColors] = useState(globalColors);

    // Fetch printer status
    

    // Handle material change for a specific object
    const handleMaterialChange = async (index, materialName) => {
        try {
            // Ensure the material is from an operational printer
            if (!availableMaterials[materialName]) {
                console.warn(`Material ${materialName} is not available on operational printers`);
                return;
            }

            const materialInfo = materials[materialName];
            const materialId = materialInfo?.id;
            
            if (materialId) {
                const colorsResponse = await getColors(materialId);
                const allColors = colorsResponse || {};
                
                // Strictly filter colors based on operational printers
                const availableColorEntries = Object.entries(allColors).filter(([colorName]) => 
                    Object.values(printerStatus).some(printer => 
                        printer.isAvailable && 
                        printer.material === materialName && 
                        printer.color === colorName
                    )
                );

                const filteredColors = Object.fromEntries(availableColorEntries);
                
                // Update colors and object configuration
                const updatedObjects = [...objects];
                const availableColorNames = Object.keys(filteredColors);
                
                if (availableColorNames.length > 0) {
                    updatedObjects[index] = {
                        ...updatedObjects[index],
                        material: materialName,
                        color: availableColorNames[0]
                    };
                    onObjectsChange(updatedObjects);
                }
            }
        } catch (error) {
            console.error(`Error fetching colors for object:`, error);
        }
    };

    // Handle object property change
    const handleObjectChange = (index, property, value) => {
        const updatedObjects = [...objects];
        updatedObjects[index] = {
            ...updatedObjects[index],
            [property]: value
        };
        
        if (property === 'material') {
            handleMaterialChange(index, value);
        }
        
        onObjectsChange(updatedObjects);
    };

    return (
        <Box border='1px solid rgb(222, 222, 222)'>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Object-Specific Settings ({objects.length} objects)
                </Typography>
                
                {Object.keys(availableMaterials).length > 0 ? (
                    <>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Apply to all objects:
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <FormControl sx={{ minWidth: 120 }}>
                                    <InputLabel size="small">Material</InputLabel>
                                    <Select
                                        size="small"
                                        label="Material"
                                        onChange={(e) => {
                                            const updatedObjects = objects.map(obj => ({
                                                ...obj,
                                                material: e.target.value
                                            }));
                                            onObjectsChange(updatedObjects);
                                        }}
                                    >
                                        {Object.keys(availableMaterials).map(material => (
                                            <MenuItem key={material} value={material}>
                                                {material}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                <FormControl sx={{ minWidth: 120 }}>
                                    <InputLabel size="small">Color</InputLabel>
                                    <Select
                                        size="small"
                                        label="Color"
                                        onChange={(e) => {
                                            const updatedObjects = objects.map(obj => ({
                                                ...obj,
                                                color: e.target.value
                                            }));
                                            onObjectsChange(updatedObjects);
                                        }}
                                    >
                                        {Object.keys(availableColors).map(color => (
                                            <MenuItem key={color} value={color} sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Box 
                                                    component="span" 
                                                    sx={{ 
                                                        display: 'inline-block', 
                                                        width: 16, 
                                                        height: 16, 
                                                        bgcolor: availableColors[color],
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
                        
                        {objects.map((object, index) => (
                            <ObjectSettingsCard
                                key={index}
                                object={object}
                                index={index}
                                materials={availableMaterials}
                                colors={availableColors}
                                onChange={handleObjectChange}
                                onMaterialChange={(material) => handleMaterialChange(index, material)}
                            />
                        ))}
                    </>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                        No operational printers available
                    </Typography>
                )}
            </Paper>
        </Box>
    );
};

export default MultiObjectSettings;