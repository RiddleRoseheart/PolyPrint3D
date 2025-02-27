import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api/endpoints/authEndpoints';

const Navbar = ({ user, setUser }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            setUser(null);
            navigate('/Landing'); // Redirect after logout
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    PolyPrint 3D
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {!user ? (
                        <Button color="inherit" onClick={() => navigate('/authPage')}>
                            Login
                        </Button>
                    ) : (
                        <>
                            <Button color="inherit" onClick={() => navigate('/upload')}>
                                Start
                            </Button>
                            <Button color="inherit" onClick={() => navigate('/userProfile')}>
                                {user.name}
                            </Button>
                            <Button color="inherit" onClick={handleLogout}>
                                Logout
                            </Button>
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;