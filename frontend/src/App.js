import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Container, Box } from '@mui/material';
import Landing from './components/Landing';
import AuthPage from './components/authPage';
import Navbar from './components/Navbar';
import UserProfile from './components/UserProfile';
import STLFileUpload from './components/STLFileUpload';
import SlicedFilesPreview from './components/SlicedFilesPreview';
import PrintSettings from './components/PrintSettings';
import PrintProgress from './components/PrintProgress';
import { getCurrentUser } from './api/endpoints/authEndpoints';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user data on initial render
    useEffect(() => {
        const checkAuth = async () => {
            const isAuthenticated = localStorage.getItem('isAuthenticated');
            if (isAuthenticated) {
                const userData = await getCurrentUser();
                setUser(userData);
            }
            setLoading(false);
        };
        checkAuth();
    }, []);
    

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh'
                }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Router>
            <Navbar user={user} setUser={setUser} />

            <Routes>
                {/* Landing Page - Always Accessible */}
                <Route path="/Landing" element={<Landing user={user} />} />

                {/* Auth Page - Always Accessible */}
                <Route path="/authPage" element={<AuthPage setUser={setUser} />} />

                {/* Protected Routes - Accessible Only When Logged In */}
                {user ? (
                    <>
                        <Route path="/userProfile" element={<UserProfile user={user} />} />
                        <Route path="/upload" element={<STLFileUpload />} />
                        <Route path="/preview" element={<SlicedFilesPreview />} />
                        <Route path="/settings" element={<PrintSettings />} />
                        <Route path="/progress" element={<PrintProgress />} />
                    </>
                ) : (
                    <>
                        <Route path="/userProfile" element={<Navigate to="/authPage" />} />
                        <Route path="/upload" element={<Navigate to="/authPage" />} />
                    </>
                )}

                {/* Redirect '/' and Unmatched Routes to Landing Page */}
                <Route path="/" element={<Navigate to="/Landing" />} />
                <Route path="*" element={<Navigate to="/Landing" />} />
            </Routes>
        </Router>
    );
}

export default App;