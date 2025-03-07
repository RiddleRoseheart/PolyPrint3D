import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * API endpoints for admin printer management
 */

/**
 * Get all printers with detailed status and print request information
 * @returns {Promise<Object>} Detailed printer information
 * @throws {Error} If retrieval fails
 */
export const getAllPrintersAdmin = async () => {
  try {
    const response = await axiosInstance.get('/api/admin/printers');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Add a new printer
 * @param {Object} printerData - Printer data to add
 * @returns {Promise<Object>} Added printer information
 * @throws {Error} If adding fails
 */
export const addPrinter = async (printerData) => {
  try {
    const response = await axiosInstance.post('/api/admin/printers', printerData);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error; // Re-throw for component handling
  }
};

/**
 * Update a printer
 * @param {string} printerId - ID of printer to update
 * @param {Object} printerData - Updated printer data
 * @returns {Promise<Object>} Updated printer information
 * @throws {Error} If update fails
 */
export const updatePrinter = async (printerId, printerData) => {
  try {
    const response = await axiosInstance.put(`/api/admin/printers/${printerId}`, printerData);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Delete a printer
 * @param {string} printerId - ID of printer to delete
 * @returns {Promise<Object>} Response data
 * @throws {Error} If deletion fails
 */
export const deletePrinter = async (printerId) => {
  try {
    const response = await axiosInstance.delete(`/api/admin/printers/${printerId}`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Get detailed status of a specific printer
 * @param {string} printerId - ID of printer
 * @returns {Promise<Object>} Detailed printer status
 * @throws {Error} If retrieval fails
 */
export const getPrinterStatusAdmin = async (printerId) => {
  try {
    const response = await axiosInstance.get(`/api/admin/printers/${printerId}/status`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Get all materials with usage statistics
 * @returns {Promise<Object>} Material information with statistics
 * @throws {Error} If retrieval fails
 */
export const getMaterialsAdmin = async () => {
  try {
    const response = await axiosInstance.get('/api/admin/materials');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Add a new material
 * @param {Object} materialData - Material data to add
 * @returns {Promise<Object>} Added material information
 * @throws {Error} If adding fails
 */
export const addMaterial = async (materialData) => {
  try {
    const response = await axiosInstance.post('/api/admin/materials', materialData);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Get all colors with usage statistics
 * @returns {Promise<Object>} Color information with statistics
 * @throws {Error} If retrieval fails
 */
export const getColorsAdmin = async () => {
  try {
    const response = await axiosInstance.get('/api/admin/colors');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Add a new color
 * @param {Object} colorData - Color data to add
 * @returns {Promise<Object>} Added color information
 * @throws {Error} If adding fails
 */
export const addColor = async (colorData) => {
  try {
    const response = await axiosInstance.post('/api/admin/colors', colorData);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Pause a print job
 * @param {string} printerId - ID of the printer
 * @returns {Promise<Object>} Response data
 * @throws {Error} If pausing fails
 */
export const pausePrintJob = async (printerId) => {
  try {
    const response = await axiosInstance.post(`/api/admin/printers/${printerId}/pause`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Resume a paused print job
 * @param {string} printerId - ID of the printer
 * @returns {Promise<Object>} Response data
 * @throws {Error} If resuming fails
 */
export const resumePrintJob = async (printerId) => {
  try {
    const response = await axiosInstance.post(`/api/admin/printers/${printerId}/resume`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Cancel a print job
 * @param {string} printerId - ID of the printer
 * @returns {Promise<Object>} Response data
 * @throws {Error} If cancellation fails
 */
export const cancelPrintJob = async (printerId) => {
  try {
    const response = await axiosInstance.post(`/api/admin/printers/${printerId}/cancel`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

const adminEndpoints = {
  getAllPrintersAdmin,
  addPrinter,
  updatePrinter,
  deletePrinter,
  getPrinterStatusAdmin,
  getMaterialsAdmin,
  addMaterial,
  getColorsAdmin,
  addColor,
  pausePrintJob,
  resumePrintJob,
  cancelPrintJob
};

export default adminEndpoints;