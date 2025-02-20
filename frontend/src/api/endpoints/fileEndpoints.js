// src/api/endpoints/fileEndpoints.js
import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * API endpoints for file operations
 */

/**
 * Upload an STL file
 * @param {FormData} formData - FormData containing the file to upload
 * @returns {Promise<Object>} Upload response data
 * @throws {Error} If upload fails
 */
export const uploadSTLFile = async (formData) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            for (let pair of formData.entries()) {
                console.log('FormData content:', pair[0], pair[1]);
            }
        }

        const response = await axiosInstance.post('/api/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get all files for current user
 * @returns {Promise<Object>} List of files
 * @throws {Error} If retrieval fails
 */
export const getUserFiles = async () => {
    try {
        const response = await axiosInstance.get('/api/files');
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get file metadata by ID
 * @param {string} fileId - ID of the file
 * @returns {Promise<Object>} File metadata
 * @throws {Error} If retrieval fails
 */
export const getFile = async (fileId) => {
    try {
        const response = await axiosInstance.get(`/api/files/${fileId}`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Delete file by ID
 * @param {string} fileId - ID of the file
 * @returns {Promise<void>} No content on success
 * @throws {Error} If deletion fails
 */
export const deleteFile = async (fileId) => {
    try {
        await axiosInstance.delete(`/api/files/${fileId}`);
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get file content by ID
 * @param {string} fileId - ID of the file
 * @returns {Promise<Blob>} File content as binary data
 * @throws {Error} If content retrieval fails
 */
export const getFileContent = async (fileId) => {
    try {
        const response = await axiosInstance.get(`/api/files/${fileId}/content`, {
            responseType: 'blob',
            headers: {
                'Accept': 'application/octet-stream'
            }
        });
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

export default {
    uploadSTLFile,
    getUserFiles,
    getFile,
    deleteFile,
    getFileContent
};