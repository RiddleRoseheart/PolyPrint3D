import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';
import { processResponse } from './adapter';

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
            globalSettings: settings.globalSettings || {},
            objects: settings.objects || []
        });
        return processResponse(response.data);
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
        return processResponse(response.data);
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
        return processResponse(response.data);
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

/**
 * Get available colors 
 * @param {string} materialId - Optional material ID to filter by
 * @returns {Promise<Object>} Colors and their hex codes
 */
// Modified getColors function in slicerEndpoints.js
export const getColors = async (materialId = null, printerId = null, showUnavailable = true) => {
    try {
        let url = '/api/slicer/colors';
        const params = [];
        
        if (materialId) {
            params.push(`material_id=${materialId}`);
        }
        
        if (printerId) {
            params.push(`printer_id=${printerId}`);
        }
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        const response = await axiosInstance.get(url);
        return processResponse(response.data);
    } catch (error) {
        handleError(error);
        return {}; 
    }
};

/**
 * Get available materials
 * @param {string} printerId - Optional printer ID to filter by
 * @returns {Promise<Object>} Materials and their properties
 */
export const getMaterials = async (printerId = null) => {
    try {
        let url = '/api/slicer/materials';
        if (printerId) {
            url += `?printer_id=${printerId}`;
        }
        const response = await axiosInstance.get(url);
        return processResponse(response.data);
    } catch (error) {
        handleError(error);
        return {}; 
    }
};

/**
 * Download G-code file for a print request
 * @param {string} requestId - ID of the print request
 * @returns {Promise<Blob>} G-code content as binary data
 * @throws {Error} If download fails
 */
export const downloadGcode = async (requestId) => {
    try {
        const response = await axiosInstance.get(`/api/slicer/download/${requestId}`, {
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


const slicerEndpoints = {
    sliceSTLFile,
    getPrintRequests,
    getPrintRequest,
    deletePrintRequest,
    getMaterials,
    getColors,
    downloadGcode
};

export default slicerEndpoints;