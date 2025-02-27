import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * API endpoints for authentication operations
 */

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} userData.name - User's name
 * @returns {Promise<Object>} Registration response data
 * @throws {Error} If registration fails
 */
export const register = async (userData) => {
    try {
        const response = await axiosInstance.post('/api/auth/register', userData);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Log in a user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} Login response data
 * @throws {Error} If login fails
 */
export const login = async (credentials) => {
    try {
        const response = await axiosInstance.post('/api/auth/login', credentials, { withCredentials: true });

        if (response.data) {
            localStorage.setItem('isAuthenticated', 'true'); // Store login state
            return response.data;
        }
    } catch (error) {
        handleError(error);
    }
};


/**
 * Log out the current user
 * @returns {Promise<Object>} Logout response data
 * @throws {Error} If logout fails
 */
export const logout = async () => {
    try {
        await axiosInstance.post('/api/auth/logout', {}, { withCredentials: true });
        localStorage.removeItem('isAuthenticated'); // Clear session
    } catch (error) {
        handleError(error);
    }
};


/**
 * Get current user's information
 * @returns {Promise<Object>} User data
 * @throws {Error} If retrieval fails
 */
export const getCurrentUser = async () => {
    try {
        const response = await axiosInstance.get('/api/auth/user', { withCredentials: true });
        return response.data;
    } catch (error) {
        localStorage.removeItem('isAuthenticated'); // Remove if session expired
        handleError(error);
    }
};


export default {
    register,
    login,
    logout,
    getCurrentUser
};