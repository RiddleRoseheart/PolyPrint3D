import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Tooltip, Divider } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { logout } from '../api/endpoints/authEndpoints';

// Import icons for better visual cues
import PrintIcon from '@mui/icons-material/Print';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

const Navbar = ({ user, setUser }) => {
    const location = useLocation();
    
    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        try {
            await logout();
            setUser(null);
            window.location.href = '/Landing';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Styling for active/inactive buttons
    const getButtonStyle = (path) => ({
        fontWeight: isActive(path) ? 700 : 400,
        borderBottom: isActive(path) ? '2px solid white' : 'none',
        borderRadius: 0,
        mx: 0.5,
        px: 2,
        transition: 'all 0.2s ease',
        opacity: isActive(path) ? 1 : 0.85,
        '&:hover': {
            opacity: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }
    });

    return (
        <AppBar 
            position="static" 
            elevation={0}
            sx={{ 
                backgroundImage: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
        >
            <Toolbar>
                {/* Logo and brand */}
    
                <Typography 
    variant="h6" 
    component={Link} 
    to="/Landing"
    sx={{ 
        flexGrow: 1, 
        textDecoration: 'none',
        color: 'white',
        fontWeight: 700,
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center'
    }}
>
    POLYPRINT <Box component="span" sx={{ ml: 0.5, opacity: 0.85 }}>3D</Box>
</Typography>

                {/* Main navigation links */}
                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Start a new 3D printing job">
                            <Button
                                component={Link}
                                to="/"
                                color="inherit"
                                startIcon={<PrintIcon />}
                                sx={getButtonStyle('/')}
                            >
                                Start Printing
                            </Button>
                        </Tooltip>

                        {/* Admin panel link (for admin users) */}
                        {user.role === 'admin' && (
                            <Tooltip title="Access admin controls">
                                <Button
                                    component={Link}
                                    to="/admin-panel"
                                    color="inherit"
                                    startIcon={<AdminPanelSettingsIcon />}
                                    sx={getButtonStyle('/admin-panel')}
                                >
                                    Admin Panel
                                </Button>
                            </Tooltip>
                        )}
                    </Box>
                )}

                {/* Push remaining items to the right */}
                <Box sx={{ flexGrow: 1 }} />

                {/* User profile and actions */}
                {user ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="View your profile">
                            <Button
                                color="inherit"
                                component={Link}
                                to="/userProfile"
                                startIcon={<AccountCircleIcon />}
                                sx={{ 
                                    textTransform: 'none',
                                    fontWeight: isActive('/userProfile') ? 700 : 400,
                                }}
                            >
                                {user.name || 'Your Profile'}
                            </Button>
                        </Tooltip>

                        <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />

                        <Tooltip title="Log out of your account">
                            <Button
                                color="inherit"
                                onClick={handleLogout}
                                startIcon={<LogoutIcon />}
                                sx={{ ml: 1 }}
                            >
                                Logout
                            </Button>
                        </Tooltip>
                    </Box>
                ) : (
                    <Button 
                        color="inherit" 
                        component={Link} 
                        to="/authPage"
                        variant="outlined"
                        sx={{ 
                            borderColor: 'rgba(255,255,255,0.3)',
                            '&:hover': {
                                borderColor: 'white',
                                backgroundColor: 'rgba(255,255,255,0.05)'
                            }
                        }}
                    >
                        Login
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;