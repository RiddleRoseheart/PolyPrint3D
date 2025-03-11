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
const ObjectSettingsCard = ({ object, index, materials, colors, onChange, onMaterialChange, unavailableColors }) => {
    // Get hex color for the preview
    const hexColor = colors[object.color] || unavailableColors[object.color] || '#00FF00';
    
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
                                       
                                     {/* Available Colors */}
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

{/* Unavailable Colors */}
{Object.keys(unavailableColors).length > 0 && (
                                            <MenuItem disabled sx={{ 
                                                opacity: 1, 
                                                color: '#666', 
                                                fontWeight: 'bold',
                                                pointerEvents: 'none'
                                            }}>
                                                Currently Unavailable Colors
                                            </MenuItem>
                                        )}
                                        
                                        {Object.keys(unavailableColors).map(color => (
                                            <Tooltip title="Printer with this color is currently busy" arrow>
                                                <MenuItem 
                                                    key={`unavailable-${color}`} 
                                                    value={color} 
                                                    sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center',
                                                        opacity: 0.7
                                                    }}
                                                >
                                                    <Box 
                                                        component="span" 
                                                        sx={{ 
                                                            display: 'inline-block', 
                                                            width: 16, 
                                                            height: 16, 
                                                            bgcolor: `rgba(${hexToRgb(unavailableColors[color])}, 0.5)`,
                                                            mr: 1,
                                                            border: '1px solid #ccc',
                                                            borderRadius: '2px'
                                                        }} 
                                                    />
                                                    {color} (Busy)
                                                </MenuItem>
                                            </Tooltip>
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
const MultiObjectSettings = ({ objects, onObjectsChange, materials, colors: globalColors, setColors }) => {
    // New state for object-specific colors
    const [objectColors, setObjectColors] = useState({});
    const [objectUnavailableColors, setObjectUnavailableColors] = useState({});
    const [printerStatus, setPrinterStatus] = useState({});

// Fetch printer status
useEffect(() => {
    const fetchPrinterStatus = async () => {
        try {
            const response = await getAllPrinters();
            if (response && response.printers) {
                const status = {};
                
                response.printers.forEach(printer => {
                    status[printer.id] = {
                        isAvailable: printer.is_available && 
                                     printer.status !== 'printing' && 
                                     printer.status !== 'paused' && 
                                     printer.status !== 'cancelling',
                        material: printer.material,
                        color: printer.color
                    };
                });
                
                setPrinterStatus(status);
            }
        } catch (error) {
            console.error('Error fetching printer status:', error);
        }
    };
    
    fetchPrinterStatus();
   
        // Poll for updates every 30 seconds
        const intervalId = setInterval(fetchPrinterStatus, 30000);
        return () => clearInterval(intervalId);
    }, []);


   // Initialize object colors
   useEffect(() => {
    const initialObjectColors = {};
    const initialUnavailableColors = {};
    
    objects.forEach((_, index) => {
        initialObjectColors[index] = globalColors;
        initialUnavailableColors[index] = {};
    });
    
    setObjectColors(initialObjectColors);
    setObjectUnavailableColors(initialUnavailableColors);
}, [objects, globalColors]);

    // Get colors for a specific object
    const getColorsForObject = (index) => {
        return objectColors[index] || globalColors;
    };
    
     // Get unavailable colors for a specific object
     const getUnavailableColorsForObject = (index) => {
        return objectUnavailableColors[index] || {};
    };

    // Handle material change for a specific object
    const handleMaterialChange = async (index, materialName) => {
        try {
            console.log(`Fetching colors for object ${index}, material: ${materialName}`);
            
            // Get material ID
            const materialInfo = materials[materialName];
            const materialId = materialInfo?.id;
            
            if (materialId) {
                // Get all colors for this material
                const allColorsResponse = await getColors(materialId);
                const allColors = allColorsResponse || {};
                
                // Filter by printer availability
                const availableColors = {};
                const unavailableColors = {};
                
                // Check each color if it's available on any printer with the selected material
                Object.entries(allColors).forEach(([colorName, colorHex]) => {
                    // Check if any printer with this color+material is available
                    const hasAvailablePrinter = Object.values(printerStatus).some(printer => 
                        printer.isAvailable && 
                        printer.material === materialName && 
                        printer.color === colorName
                    );
                    
                    // Check if this color+material exists on any printer (even if busy)
                    const existsOnAnyPrinter = Object.values(printerStatus).some(printer => 
                        printer.material === materialName && 
                        printer.color === colorName
                    );
                    
                    if (hasAvailablePrinter) {
                        availableColors[colorName] = colorHex;
                    } else if (existsOnAnyPrinter) {
                        unavailableColors[colorName] = colorHex;
                    }
                });
                
                // Update colors for this specific object
                setObjectColors(prev => ({
                    ...prev,
                    [index]: availableColors
                }));
                
                setObjectUnavailableColors(prev => ({
                    ...prev,
                    [index]: unavailableColors
                }));
                
                // Update object's color if current color isn't available anymore
                const updatedObjects = [...objects];
                const availableColorNames = Object.keys(availableColors);
                
                if (availableColorNames.length > 0 && 
                    !availableColorNames.includes(updatedObjects[index].color) &&
                    !Object.keys(unavailableColors).includes(updatedObjects[index].color)) {
                    // Set to first available color if current one isn't available or unavailable
                    updatedObjects[index] = {
                        ...updatedObjects[index],
                        color: availableColorNames[0]
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
                // Get all colors for this material
                const allColorsResponse = await getColors(materialId);
                const allColors = allColorsResponse || {};
                
                // Filter by printer availability
                const availableColors = {};
                const unavailableColors = {};
                
                Object.entries(allColors).forEach(([colorName, colorHex]) => {
                    const hasAvailablePrinter = Object.values(printerStatus).some(printer => 
                        printer.isAvailable && 
                        printer.material === value && 
                        printer.color === colorName
                    );
                    
                    const existsOnAnyPrinter = Object.values(printerStatus).some(printer => 
                        printer.material === value && 
                        printer.color === colorName
                    );
                    
                    if (hasAvailablePrinter) {
                        availableColors[colorName] = colorHex;
                    } else if (existsOnAnyPrinter) {
                        unavailableColors[colorName] = colorHex;
                    }
                });
                
                // Update global colors
                setColors(availableColors);
                
                // Reset object-specific colors
                const resetObjectColors = {};
                const resetUnavailableColors = {};
                
                objects.forEach((_, idx) => {
                    resetObjectColors[idx] = availableColors;
                    resetUnavailableColors[idx] = unavailableColors;
                });
                
                setObjectColors(resetObjectColors);
                setObjectUnavailableColors(resetUnavailableColors);
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
            
           {/* Object cards with availability status */}
           {objects.map((object, index) => (
                <ObjectSettingsCard
                    key={index}
                    object={object}
                    index={index}
                    materials={materials}
                    colors={getColorsForObject(index)}
                    unavailableColors={getUnavailableColorsForObject(index)}
                    onChange={handleObjectChange}
                    onMaterialChange={(material) => handleMaterialChange(index, material)}
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
