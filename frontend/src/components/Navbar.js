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
            window.location.href = '/Landing'; // Redirect to Landing Page after logout
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    <Button color="inherit" component={Link} to="/Landing">
                        PolyPrint 3D
                    </Button>
                </Typography>
                {user ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Clickable user name to redirect to profile or admin info */}
                        <Button
                            color="inherit"
                            component={Link}
                            to={user.role === 'admin' ? "/admin" : "/userProfile"}
                            sx={{ textTransform: 'none' }} // Prevent uppercase transformation
                        >
                            <Typography variant="body1">
                                {user.role === 'admin' ? "User Info" : `Welcome, ${user.name}!`}
                            </Typography>
                        </Button>
                   

                        {user.role === 'admin' && (
                            <Button color="inherit" component={Link} to="/adminPrinter">
                                Admin Printer
                            </Button>
                        )}

     {/* "Start Printing" button */}
     <Button
                            color="inherit"
                            component={Link}
                            to="/"
                        >
                            Start Printing
                        </Button>

                        {/* Logout button */}
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