import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
 * Get alerts for current user
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} List of alerts
 */
export const getAlerts = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/api/alerts', { params });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

/**
 * Mark an alert as read
 * @param {string} alertId - ID of alert to mark as read
 * @returns {Promise<Object>} Response data
 */
export const markAlertAsRead = async (alertId) => {
  try {
    const response = await axiosInstance.post(`/api/alerts/${alertId}/read`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

const alertEndpoints = {
  getAlerts,
  markAlertAsRead
};

export default alertEndpoints;