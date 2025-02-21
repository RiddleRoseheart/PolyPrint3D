import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * API endpoints for slicing operations
 */

/**
 * Start slicing job for a file
 * @param {string} fileId - ID of the file to slice
 * @param {Object} settings - Slicing settings
 * @param {string} [settings.filament] - Filament type
 * @param {string} [settings.dimension] - Print dimensions
 * @param {string} [settings.filling] - Fill settings
 * @param {string} [settings.layer] - Layer settings
 * @returns {Promise<Object>} Slicing job data
 * @throws {Error} If slicing fails
 */
export const sliceSTLFile = async (fileId, settings = {}) => {
    try {
        const response = await axiosInstance.post('/api/slicer/slice', {
            fileId,
            settings
        });
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get all print requests for current user
 * @returns {Promise<Object>} List of print requests
 * @throws {Error} If retrieval fails
 */
export const getPrintRequests = async () => {
    try {
        const response = await axiosInstance.get('/api/slicer/requests');
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get specific print request
 * @param {string} requestId - ID of the print request
 * @returns {Promise<Object>} Print request data
 * @throws {Error} If retrieval fails
 */
export const getPrintRequest = async (requestId) => {
    try {
        const response = await axiosInstance.get(`/api/slicer/requests/${requestId}`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Delete print request and associated files
 * @param {string} requestId - ID of the print request
 * @returns {Promise<void>} No content on success
 * @throws {Error} If deletion fails
 */
export const deletePrintRequest = async (requestId) => {
    try {
        await axiosInstance.delete(`/api/slicer/requests/${requestId}`);
    } catch (error) {
        handleError(error);
    }
};

export default {
    sliceSTLFile,
    getPrintRequests,
    getPrintRequest,
    deletePrintRequest
};