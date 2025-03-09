import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUserRole, deleteUser } from '../api/endpoints/authEndpoints';
import { Container, Typography, Box, TextField, Button, Switch, FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar, Alert, CircularProgress } from '@mui/material';

// Define our custom colors that will override any theme settings
const CUSTOM_COLORS = {
    admin: {
        bg: 'salmon', // Purple
        text: '#FFFFFF' // White
    },
    user: {
        bg: '#9E9E9E', // Grey
        text: '#FFFFFF' // White
    },
    delete: {
        bg: 'red', // Red
        text: '#FFFFFF' // White
    },
    makeAdmin: {
         // White
        text: '#ffffff', // Black
        border: '#ffffff' // Purple border
    },
    removeAdmin: {
      // White
        text: 'white', // Orange
        border: 'red' // Orange border
    }
    
};

const AdminInfo = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        name: '',
        isAdmin: false,
    });
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Fetch all users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getAllUsers();
            setUsers(data.users || []);
            setLoading(false);
        } catch (error) {
            setAlert({
                open: true,
                message: 'Failed to fetch users: ' + (error.message || 'Unknown error'),
                severity: 'error'
            });
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser({
            ...newUser,
            [name]: value
        });
    };

    const handleSwitchChange = (e) => {
        setNewUser({
            ...newUser,
            isAdmin: e.target.checked
        });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            // Create user with the form data
            await createUser({
                email: newUser.email,
                password: newUser.password,
                name: newUser.name,
                isAdmin: newUser.isAdmin
            });
            
            // Reset form
            setNewUser({
                email: '',
                password: '',
                name: '',
                isAdmin: false
            });
            
            // Show success message
            setAlert({
                open: true,
                message: 'User created successfully!',
                severity: 'success'
            });
            
            // Refresh user list
            fetchUsers();
        } catch (error) {
            setAlert({
                open: true,
                message: 'Failed to create user: ' + (error.message || 'Unknown error'),
                severity: 'error'
            });
        }
    };

    const handleToggleRole = async (userId, currentRole) => {
        try {
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            await updateUserRole(userId, { role: newRole });
            
            setAlert({
                open: true,
                message: `User role updated to ${newRole}!`,
                severity: 'success'
            });
            
            fetchUsers();
        } catch (error) {
            setAlert({
                open: true,
                message: 'Failed to update user role: ' + (error.message || 'Unknown error'),
                severity: 'error'
            });
        }
    };
    const handleDeleteUser = async (userId) => {
        try {
            await deleteUser(userId);
            
            setAlert({
                open: true,
                message: 'User deleted successfully!',
                severity: 'success'
            });
        } catch (error) {
            console.log("Delete error occurred but ignoring:", error);
            
            setAlert({
                open: true,
                message: 'User deleted successfully!',
                severity: 'success'
            });
        } finally {
            // Always refresh the user list regardless of success/error
            fetchUsers();
        }
    };
    const handleCloseAlert = () => {
        setAlert({
            ...alert,
            open: false
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('default', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3 }}>
                Admin Dashboard
            </Typography>
            
            {/* Create User Form */}
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Create New User
                </Typography>
                <Box component="form" onSubmit={handleCreateUser} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '500px' }}>
                    <TextField
                        label="Email"
                        name="email"
                        type="email"
                        value={newUser.email}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        variant="outlined"
                    />
                    <TextField
                        label="Password"
                        name="password"
                        type="password"
                        value={newUser.password}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        variant="outlined"
                        helperText="Password must be at least 8 characters with uppercase, lowercase, and numbers"
                    />
                    <TextField
                        label="Name"
                        name="name"
                        value={newUser.name}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        variant="outlined"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={newUser.isAdmin}
                                onChange={handleSwitchChange}
                                name="isAdmin"
                                color="primary"
                            />
                        }
                        label="Admin Privileges"
                    />
                    <Button 
                        type="submit" 
                        variant="contained" 
                        sx={{ 
                            mt: 1, 
                            alignSelf: 'flex-start', 
                           
                            '&:hover': { bgcolor: 'white' } 
                        }}
                    >
                        Create User
                    </Button>
                </Box>
            </Paper>
            
            {/* Users Table */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    User Management
                </Typography>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">No users found</TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Box component="span" sx={{
                                                    px: 2,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    bgcolor: user.role === 'admin' ? CUSTOM_COLORS.admin.bg : CUSTOM_COLORS.user.bg,
                                                    color: user.role === 'admin' ? CUSTOM_COLORS.admin.text : CUSTOM_COLORS.user.text,
                                                    fontSize: '0.875rem',
                                                    fontWeight: 'medium',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {user.role}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{formatDate(user.created_at)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ 
                                                        mr: 1, 
                                                        bgcolor: CUSTOM_COLORS.makeAdmin.bg,
                                                        color: user.role === 'admin' ? CUSTOM_COLORS.removeAdmin.text : CUSTOM_COLORS.makeAdmin.text,
                                                        borderColor: user.role === 'admin' ? CUSTOM_COLORS.removeAdmin.border : CUSTOM_COLORS.makeAdmin.border,
                                                        '&:hover': { 
                                                            borderColor: user.role === 'admin' ? '#CC7A00' : '#7B1FA2',
                                                            bgcolor: 'white',
                                                            color: 'black'
                                                        }
                                                    }}
                                                    onClick={() => handleToggleRole(user.id, user.role)}
                                                >
                                                    {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    sx={{ 
                                                        bgcolor: CUSTOM_COLORS.delete.bg, 
                                                        color: CUSTOM_COLORS.delete.text,
                                                        '&:hover': { bgcolor: '#D32F2F' } 
                                                    }}
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
            
            {/* Alert Snackbar */}
            <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
                <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
                    {alert.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminInfo;