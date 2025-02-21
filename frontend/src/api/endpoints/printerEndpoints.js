
//todo - implement printer endpoints in backend

// import axiosInstance from '../axiosConfig';
// import { handleError } from '../../utils/errorHandler';

// /**
//  * Start a new print job
//  * @param {Object} printJob - Print job configuration
//  * @returns {Promise<Object>} Print job status
//  */
// export const startPrintJob = async (printJob) => {
//     try {
//         const response = await axiosInstance.post('/api/printer/print', printJob);
//         return response.data;
//     } catch (error) {
//         handleError(error);
//     }
// };

// /**
//  * Get the status of a print job
//  * @param {string} jobId - ID of the print job
//  * @returns {Promise<Object>} Current status of the print job
//  */
// export const getPrinterStatus = async (jobId) => {
//     try {
//         const response = await axiosInstance.get(`/api/printer/status/${jobId}`);
//         return response.data;
//     } catch (error) {
//         handleError(error);
//     }
// };

// /**
//  * Cancel a print job
//  * @param {string} jobId - ID of the print job to cancel
//  * @returns {Promise<Object>} Cancellation status
//  */
// export const cancelPrintJob = async (jobId) => {
//     try {
//         const response = await axiosInstance.post(`/api/printer/cancel/${jobId}`);
//         return response.data;
//     } catch (error) {
//         handleError(error);
//     }
// };

// export default {
//     startPrintJob,
//     getPrinterStatus,
//     cancelPrintJob
// };