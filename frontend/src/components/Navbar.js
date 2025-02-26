import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/endpoints/authEndpoints';

const Navbar = ({ user, setUser }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            setUser(null);
            navigate('/Landing'); // Redirect to Landing Page after logout
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
                {user ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1">
                            Welcome, {user.name}!
                        </Typography>
                        <Button
                            color="inherit"
                            onClick={handleLogout}
                        >
                            Logout
                        </Button>
                    </Box>
                ) : (
                    <Button color="inherit" component={Link} to="/authPage">
                        Login
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;