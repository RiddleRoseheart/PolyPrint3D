import React, { useState } from 'react';
import { 
    Box, 
    Container, 
    Paper, 
    Tabs, 
    Tab, 
    Typography,
    Divider
} from '@mui/material';
import PrinterIcon from '@mui/icons-material/Print';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';

import PrinterAdmin from './PrinterAdmin';
import UserAdmin from '../AdminInfo.js';
import AlertSection from './AlertSection';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
            <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 700 }}>
                Admin Panel
            </Typography>
            
            <Paper 
                sx={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden'
                }}
            >
                {/* Tab Navigation */}
                <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange}
                    sx={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        '& .MuiTabs-indicator': {
                            height: 3
                        }
                    }}
                >
                    <Tab 
                        icon={<PrinterIcon />} 
                        label="Printer Management" 
                        sx={{ 
                            color: activeTab === 0 ? 'white' : '#aaaaaa',
                            fontWeight: activeTab === 0 ? 700 : 400,
                            textTransform: 'none',
                            fontSize: '1rem'
                        }}
                    />
                    <Tab 
                        icon={<PeopleIcon />} 
                        label="User Management" 
                        sx={{ 
                            color: activeTab === 1 ? 'white' : '#aaaaaa',
                            fontWeight: activeTab === 1 ? 700 : 400,
                            textTransform: 'none',
                            fontSize: '1rem'
                        }}
                    />
                    <Tab 
                        icon={<NotificationsIcon />} 
                        label="Alerts" 
                        sx={{ 
                            color: activeTab === 2 ? 'white' : '#aaaaaa',
                            fontWeight: activeTab === 2 ? 700 : 400,
                            textTransform: 'none',
                            fontSize: '1rem'
                        }}
                    />
                </Tabs>
                
                {/* Content Area */}
                <Box sx={{ p: 0 }}>
                    {/* Printer Management Tab */}
                    {activeTab === 0 && (
                        <Box sx={{ mt: 0 }}>
                            <PrinterAdmin />
                        </Box>
                    )}
                    
                    {/* User Management Tab */}
                    {activeTab === 1 && (
                        <Box sx={{ mt: 0 }}>
                            <UserAdmin />
                        </Box>
                    )}
                    
                    {/* Alerts Tab */}
                    {activeTab === 2 && (
                        <Box sx={{ mt: 0, p: 3 }}>
                            <AlertSection />
                        </Box>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default AdminPanel;