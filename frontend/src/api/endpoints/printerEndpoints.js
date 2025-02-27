import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * API endpoints for printer operations
 */

/**
 * Add a new printer
 * @param {Object} printerData - Printer configuration
 * @param {string} printerData.name - Printer name
 * @param {string} printerData.ip_address - Printer IP address
 * @param {string} printerData.api_key - OctoPrint API key
 * @returns {Promise<Object>} Created printer data
 * @throws {Error} If addition fails
 */
export const addPrinter = async (printerData) => {
    try {
        const response = await axiosInstance.post('/api/printers', printerData);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get all printers
 * @returns {Promise<Object>} List of printers
 * @throws {Error} If retrieval fails
 */
export const getPrinters = async () => {
    try {
        const response = await axiosInstance.get('/api/printers');
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get printer by ID
 * @param {string} printerId - ID of printer
 * @returns {Promise<Object>} Printer data
 * @throws {Error} If retrieval fails
 */
export const getPrinter = async (printerId) => {
    try {
        const response = await axiosInstance.get(`/api/printers/${printerId}`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Connect to printer
 * @param {string} printerId - ID of printer to connect
 * @returns {Promise<Object>} Connection response
 * @throws {Error} If connection fails
 */
export const connectPrinter = async (printerId) => {
    try {
        const response = await axiosInstance.post(`/api/printers/${printerId}/connect`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Disconnect from printer
 * @param {string} printerId - ID of printer to disconnect
 * @returns {Promise<Object>} Disconnection response
 * @throws {Error} If disconnection fails
 */
export const disconnectPrinter = async (printerId) => {
    try {
        const response = await axiosInstance.post(`/api/printers/${printerId}/disconnect`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get printer status
 * @param {string} printerId - ID of printer
 * @returns {Promise<Object>} Printer status data
 * @throws {Error} If status check fails
 */
export const getPrinterStatus = async (printerId) => {
    try {
        const response = await axiosInstance.get(`/api/printers/${printerId}/status`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get files on printer
 * @param {string} printerId - ID of printer
 * @returns {Promise<Object>} List of files
 * @throws {Error} If retrieval fails
 */
export const getPrinterFiles = async (printerId) => {
    try {
        const response = await axiosInstance.get(`/api/printers/${printerId}/files`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Upload G-code file to printer
 * @param {string} printerId - ID of printer
 * @param {FormData} formData - FormData containing file and options
 * @returns {Promise<Object>} Upload response
 * @throws {Error} If upload fails
 */
export const uploadGcode = async (printerId, formData) => {
    try {
        const response = await axiosInstance.post(
            `/api/printers/${printerId}/files`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Delete file from printer
 * @param {string} printerId - ID of printer
 * @param {string} filename - Name of file to delete
 * @returns {Promise<void>} No content on success
 * @throws {Error} If deletion fails
 */
export const deletePrinterFile = async (printerId, filename) => {
    try {
        await axiosInstance.delete(`/api/printers/${printerId}/files/${filename}`);
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get print job status
 * @param {string} printerId - ID of printer
 * @returns {Promise<Object>} Job status data
 * @throws {Error} If status check fails
 */
export const getJobStatus = async (printerId) => {
    try {
        const response = await axiosInstance.get(`/api/printers/${printerId}/job`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Cancel current print job
 * @param {string} printerId - ID of printer
 * @returns {Promise<Object>} Cancellation response
 * @throws {Error} If cancellation fails
 */
export const cancelPrintJob = async (printerId) => {
    try {
        const response = await axiosInstance.post(`/api/printers/${printerId}/job/cancel`);
        return response.data;
    } catch (error) {
        handleError(error);
    }
};

/**
 * Get available printers
 * @returns {Promise<Object>} List of available printers
 *  
 * @throws {Error} If retrieval fails
 */
export const getAvailablePrinters = async () => {
try {
    const response = await axiosInstance.get('/api/printers/available');
    return response.data;
} catch (error) {
    handleError(error);
}
};

export default {
    addPrinter,
    getPrinters,
    getPrinter,
    connectPrinter,
    disconnectPrinter,
    getPrinterStatus,
    getPrinterFiles,
    uploadGcode,
    deletePrinterFile,
    getJobStatus,
    cancelPrintJob,
    getAvailablePrinters
};