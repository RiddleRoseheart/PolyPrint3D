/**
 * OctoPrint API client for Flask backend
 * This module provides an interface to the OctoPrint service via Flask
 */
import axiosInstance from './axiosConfig';
import { handleError } from '../utils/errorHandler';

// Base URL for the OctoPrint routes in our Flask API
const OCTOPRINT_BASE_URL = '/api/octoprint';

/**
 * Connect to OctoPrint server
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Connection response
 */
export const connect = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/connect`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Disconnect from OctoPrint server
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Disconnection response
 */
export const disconnect = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/disconnect`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get connection information
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Connection information
 */
export const getConnectionInfo = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/connection`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get printer flags
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Printer flags
 */
export const getFlags = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/flags`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get bed temperature
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Bed temperature
 */
export const getBedTemperature = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/temperature/bed`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get tool0 temperature
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Tool0 temperature
 */
export const getTool0Temperature = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/temperature/tool0`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get target bed temperature
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Target bed temperature
 */
export const getTargetBedTemperature = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/temperature/bed/target`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get target tool0 temperature
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Target tool0 temperature
 */
export const getTargetTool0Temperature = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/temperature/tool0/target`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get job status
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Job status
 */
export const getJobStatus = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/job/status`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get all files
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Files information
 */
export const getAllFiles = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.get(`${OCTOPRINT_BASE_URL}/files`, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Delete a file
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @param {string} name - Name of the file to delete
 * @returns {Promise<Object>} - Deletion response
 */
export const deleteFile = async (ip, apiKey, name) => {
  try {
    const response = await axiosInstance.delete(`${OCTOPRINT_BASE_URL}/delete`, {
      params: { ip, api_key: apiKey, name }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Upload a file
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @param {string} path - Local path to the file
 * @returns {Promise<Object>} - Upload response
 */
export const uploadFile = async (ip, apiKey, path) => {
  try {
    const response = await axiosInstance.post(`${OCTOPRINT_BASE_URL}/upload`, null, {
      params: { ip, api_key: apiKey, path }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Select a file
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @param {string} name - Name of the file to select
 * @returns {Promise<Object>} - Selection response
 */
export const selectFile = async (ip, apiKey, name) => {
  try {
    const response = await axiosInstance.post(`${OCTOPRINT_BASE_URL}/select_file`, null, {
      params: { ip, api_key: apiKey, name }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Start a print job
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Job start response
 */
export const startPrintJob = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.post(`${OCTOPRINT_BASE_URL}/job`, null, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Cancel a print job
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Job cancellation response
 */
export const cancelPrintJob = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.post(`${OCTOPRINT_BASE_URL}/job/cancel`, null, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Pause a print job
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Job pause response
 */
export const pausePrintJob = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.post(`${OCTOPRINT_BASE_URL}/job/pause`, null, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Resume a print job
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Job resume response
 */
export const resumePrintJob = async (ip, apiKey) => {
  try {
    const response = await axiosInstance.post(`${OCTOPRINT_BASE_URL}/job/resume`, null, {
      params: { ip, api_key: apiKey }
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get print job details (combined status)
 * @param {string} ip - IP address of the OctoPrint server
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} - Combined job details
 */
export const getPrintJobDetails = async (ip, apiKey) => {
  try {
    // Get connection info
    const connectionInfo = await getConnectionInfo(ip, apiKey);
    const state = connectionInfo.current.state;

    // Get job status
    const jobStatus = await getJobStatus(ip, apiKey);
    const printTime = jobStatus.progress?.printTime || 0;
    const printTimeLeft = jobStatus.progress?.printTimeLeft || 0;
    const completion = jobStatus.progress?.completion || 0;

    return {
      state,
      printTime,
      printTimeLeft,
      completion
    };
  } catch (error) {
    console.error('Error getting print job details:', error);
    throw error;
  }
};

export default {
  connect,
  disconnect,
  getConnectionInfo,
  getFlags,
  getBedTemperature,
  getTool0Temperature,
  getTargetBedTemperature,
  getTargetTool0Temperature,
  getJobStatus,
  getAllFiles,
  deleteFile,
  uploadFile,
  selectFile,
  startPrintJob,
  cancelPrintJob,
  pausePrintJob,
  resumePrintJob,
  getPrintJobDetails
};