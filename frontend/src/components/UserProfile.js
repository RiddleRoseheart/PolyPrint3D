import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link } from 'react-router-dom';

const UserProfile = ({ user }) => {
    return (
        <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    User Profile
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Welcome, {user.name}!
                </Typography>
                <Button
                    variant="contained"
                    component={Link}
                    to="/"
                    sx={{ mt: 2 }}
                >
                    Start Printing
                </Button>
            </Paper>
        </Box>
    );
};

export default UserProfile;