import React from 'react';
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
const ObjectSettingsCard = ({ object, index, materials, colors, onChange }) => {
    // Get hex color for the preview
    const hexColor = colors[object.color] || '#00FF00';
    
    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4} md={3}>
                    {/* Add 3D preview of the specific object */}
                    <Box sx={{ p: 2 }}>
                        <ObjectPreview 
                            previewUrl={object.preview_url} 
                            color={hexColor}
                        />
                    </Box>
                </Grid>
                <Grid item xs={12} sm={8} md={9}>
                    <CardContent>
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
                                        onChange={(e) => onChange(index, 'material', e.target.value)}
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
                                        value={object.color || 'Black'}
                                        label="Color"
                                        onChange={(e) => onChange(index, 'color', e.target.value)}
                                        sx={{
                                            '& .MuiSelect-select': {
                                                display: 'flex',
                                                alignItems: 'center'
                                            }
                                        }}
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

/**
 * Component for managing multiple object settings
 * @param {Object} props
 * @param {Array} props.objects - List of objects to configure
 * @param {Function} props.onObjectsChange - Handler for when objects are changed
 * @param {Object} props.materials - Available materials
 * @param {Object} props.colors - Available colors with hex values
 * @returns {JSX.Element} Multi-object settings component
 */
const MultiObjectSettings = ({ objects, onObjectsChange, materials, colors }) => {
    /**
     * Handle changes to a specific object property
     * @param {number} index - Index of the object to update
     * @param {string} property - Property to update
     * @param {any} value - New value for the property
     */
    const handleObjectChange = (index, property, value) => {
        const updatedObjects = [...objects];
        updatedObjects[index] = {
            ...updatedObjects[index],
            [property]: value
        };
        onObjectsChange(updatedObjects);
    };

    /**
     * Apply a property value to all objects
     * @param {string} property - Property to update
     * @param {any} value - Value to apply to all objects
     */
    const applyToAll = (property, value) => {
        const updatedObjects = objects.map(obj => ({
            ...obj,
            [property]: value
        }));
        onObjectsChange(updatedObjects);
    };

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Object-Specific Settings ({objects.length} objects)
            </Typography>
            
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
                            onChange={(e) => applyToAll('material', e.target.value)}
                        >
                            {Object.keys(materials).map(material => (
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
                            onChange={(e) => applyToAll('color', e.target.value)}
                            sx={{
                                '& .MuiSelect-select': {
                                    display: 'flex',
                                    alignItems: 'center'
                                }
                            }}
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
                </Stack>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {objects.map((object, index) => (
                <ObjectSettingsCard
                    key={index}
                    object={object}
                    index={index}
                    materials={materials}
                    colors={colors}
                    onChange={handleObjectChange}
                />
            ))}
            
            {objects.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No objects available
                </Typography>
            )}
        </Paper>
    );
};

export default MultiObjectSettings;