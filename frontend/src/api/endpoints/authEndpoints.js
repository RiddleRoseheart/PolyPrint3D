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
        const response = await axiosInstance.post('/api/auth/login', credentials);
        return response.data;
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
        const response = await axiosInstance.post('/api/auth/logout');
        return response.data;
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
        const response = await axiosInstance.get('/api/auth/user');
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Admin: Get all users
 * @returns {Promise<Object>} List of all users
 * @throws {Error} If retrieval fails or user is not admin
 */
export const getAllUsers = async () => {
    try {
        const response = await axiosInstance.get('/api/auth/admin/users');
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Admin: Create a new user (with optional admin role)
 * @param {Object} userData - User data
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} userData.name - User's name
 * @param {boolean} userData.isAdmin - Whether the user should have admin role
 * @returns {Promise<Object>} Created user data
 * @throws {Error} If creation fails or current user is not admin
 */
export const createUser = async (userData) => {
    try {
        const response = await axiosInstance.post('/api/auth/admin/users', userData);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Admin: Update a user's role
 * @param {string} userId - ID of user to update
 * @param {Object} updateData - Update data
 * @param {string} updateData.role - New role for the user
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If update fails or current user is not admin
 */
export const updateUserRole = async (userId, updateData) => {
    try {
        const response = await axiosInstance.put(`/api/auth/admin/users/${userId}`, updateData);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

export default {
    register,
    login,
    logout,
    getCurrentUser,
    getAllUsers,
    createUser,
    updateUserRole
};