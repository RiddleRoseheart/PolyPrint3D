import React, { useState } from 'react';
import { register, login, logout, getCurrentUser } from '../api/endpoints/authEndpoints';
import { handleError } from '../utils/errorHandler';
import {
    Container,
    Typography,
    TextField,
    Button,
    Box,
    Paper,
    Link,
    Alert,
    CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AuthPage = ({ user, setUser }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            const userData = await login({ email, password });
            setUser(userData);
            
            // Role-based redirection
            if (userData.role === 'admin') {
                navigate('/admin'); // Redirect admins to admin dashboard
            } else {
                navigate('/Landing'); // Redirect regular users to landing page
            }
        } catch (error) {
            handleError(error);
            setError('Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            const userData = await register({ email, password, name });
            setUser(userData);
            
            // New users are typically regular users, so redirect to landing
            navigate('/Landing');
        } catch (error) {
            handleError(error);
            setError('Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            await logout();
            setUser(null);
            navigate('/Landing');
        } catch (error) {
            handleError(error);
            setError('Logout failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Clear form fields when toggling between login and register
    const toggleAuthMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setEmail('');
        setPassword('');
        if (isLogin) {
            setName('');
        }
    };

    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    {isLogin ? 'Login' : 'Register'}
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <form onSubmit={isLogin ? handleLogin : handleRegister}>
                    {!isLogin && (
                        <TextField
                            label="Name"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    )}

                    <TextField
                        label="Email"
                        type="email"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                    />

                    <TextField
                        label="Password"
                        type="password"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />

                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            color="primary" 
                            fullWidth
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                isLogin ? 'Login' : 'Register'
                            )}
                        </Button>

                        <Button
                            variant="outlined"
                            color="secondary"
                            fullWidth
                            onClick={toggleAuthMode}
                            disabled={isLoading}
                        >
                            {isLogin ? 'Switch to Register' : 'Switch to Login'}
                        </Button>

                        {user && (
                            <Button 
                                variant="contained" 
                                color="error" 
                                fullWidth 
                                onClick={handleLogout}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : 'Logout'}
                            </Button>
                        )}
                    </Box>
                </form>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Link
                        component="button"
                        variant="body2"
                        onClick={toggleAuthMode}
                        disabled={isLoading}
                    >
                        {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
                    </Link>
                </Box>
            </Paper>
        </Container>
    );
};

export default AuthPage;