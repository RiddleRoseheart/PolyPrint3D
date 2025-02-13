import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * API endpoints for file operations
 */

/**
 * Uploads an STL file to the server
 * @param {FormData} formData - FormData containing the file to upload
 * @returns {Promise<Object>} Upload response data
 * @throws {Error} If upload fails
 */
export const uploadSTLFile = async (formData) => {
    try {
        // Log FormData contents in development environment
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
 * Retrieves file metadata by ID
 * @param {string} fileId - ID of the file to retrieve
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
 * Deletes a file by ID
 * @param {string} fileId - ID of the file to delete
 * @returns {Promise<Object>} Deletion response data
 * @throws {Error} If deletion fails
 */
export const deleteFile = async (fileId) => {
    try {
        const response = await axiosInstance.delete(`/api/files/${fileId}`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Retrieves file content (binary data) by ID
 * @param {string} fileId - ID of the file content to retrieve
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
        console.error('File content error:', error);
        throw error;
    }
};

export default {
    uploadSTLFile,
    getFile,
    deleteFile,
    getFileContent
};