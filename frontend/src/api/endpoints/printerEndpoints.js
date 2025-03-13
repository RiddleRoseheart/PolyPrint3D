import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * API endpoints for printer operations
 */

/**
 * Get all available printers
 * @returns {Promise<Object>} List of printers
 * @throws {Error} If retrieval fails
 */
export const getAllPrinters = async () => {
  try {
    const response = await axiosInstance.get('/api/admin/printers');
    return response.data;
  } catch (error) {
    // If access denied (403), try the user endpoint instead
    if (error.response && error.response.status === 403) {
      return getUserPrinters();
    }
    handleError(error);
  }
};

/**
 * Get printers for monitoring based on user role
 * @returns {Promise<Object>} List of printers (all for admin, user's printers for regular users)
 * @throws {Error} If retrieval fails
 */
export const getMonitorPrinters = async () => {
  try {
    const response = await axiosInstance.get('/api/printers/monitor');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Get printers associated with the current user's print jobs
 * @returns {Promise<Object>} List of user's printers
 * @throws {Error} If retrieval fails
 */
export const getUserPrinters = async () => {
  try {
    const response = await axiosInstance.get('/api/printers/user');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Send a print request to a printer
 * @param {string} requestId - ID of the print request to send
 * @returns {Promise<Object>} Response data
 * @throws {Error} If sending fails
 */
export const sendToPrinter = async (requestId) => {
  try {
    const response = await axiosInstance.post(`/api/slicer/requests/${requestId}/print`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error; // Re-throw for component handling
  }
};

/**
 * Get printer status
 * @param {string} printerId - ID of the printer
 * @returns {Promise<Object>} Printer status information
 * @throws {Error} If retrieval fails
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
 * Get job status for a print request
 * @param {string} requestId - ID of the print request
 * @returns {Promise<Object>} Job status information
 * @throws {Error} If retrieval fails
 */
export const getJobStatus = async (requestId) => {
  try {
    const response = await axiosInstance.get(`/api/slicer/requests/${requestId}/status`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Cancel a print job
 * @param {string} requestId - ID of the print request
 * @returns {Promise<Object>} Response data
 * @throws {Error} If cancellation fails
 */
export const cancelPrintJob = async (requestId) => {
  try {
    const response = await axiosInstance.post(`/api/slicer/requests/${requestId}/cancel`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Pause a print job
 * @param {string} requestId - ID of the print request
 * @returns {Promise<Object>} Response data
 * @throws {Error} If pausing fails
 */
export const pausePrintJob = async (requestId) => {
  try {
    const response = await axiosInstance.post(`/api/slicer/requests/${requestId}/pause`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Resume a paused print job
 * @param {string} requestId - ID of the print request
 * @returns {Promise<Object>} Response data
 * @throws {Error} If resuming fails
 */
export const resumePrintJob = async (requestId) => {
  try {
    const response = await axiosInstance.post(`/api/slicer/requests/${requestId}/resume`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

const printerEndpoints = {
  getAllPrinters,
  sendToPrinter,
  getPrinterStatus,
  getJobStatus,
  cancelPrintJob,
  pausePrintJob,
  resumePrintJob
};

export default printerEndpoints;