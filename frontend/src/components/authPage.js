import React, { useState } from 'react';
import { register, login } from '../api/endpoints/authEndpoints';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AuthPage = ({ setUser }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const userData = await login({ email, password });
            setUser(userData);
            setError(null);
            navigate('/Landing');
        } catch (error) {
            handleError(error);
            setError('Login failed. Please check your credentials.');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const userData = await register({ email, password, name });
            setUser(userData);
            setError(null);
            navigate('/Landing');
        } catch (error) {
            handleError(error);
            setError('Registration failed. Please try again.');
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
                    />

                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button type="submit" variant="contained" color="primary" fullWidth>
                            {isLogin ? 'Login' : 'Register'}
                        </Button>

                        <Button
                            variant="outlined"
                            color="secondary"
                            fullWidth
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Switch to Register' : 'Switch to Login'}
                        </Button>
                    </Box>
                </form>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
                    </Link>
                </Box>
            </Paper>
        </Container>
    );
};

export default AuthPage;