import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Landing = ({ user }) => {
    const navigate = useNavigate();

    const handleStartPrinting = () => {
        if (user) {
            navigate('/upload'); // Redirect to Upload File if logged in
        } else {
            navigate('/authPage'); // Redirect to Login if not logged in
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Welcome to PolyPrint 3D
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Revolutionizing 3D printing with speed and efficiency.
                </Typography>
                <Button
                    variant="contained"
                    onClick={handleStartPrinting}
                    sx={{ mt: 2 }}
                >
                    {user ? 'Start Printing' : 'Login to Start Printing'}
                </Button>
            </Paper>
        </Box>
    );
};

export default Landing;