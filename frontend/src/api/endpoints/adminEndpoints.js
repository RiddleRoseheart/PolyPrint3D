import axios from 'axios';
import { API_BASE_URL } from '../config';

const handleError = (error) => {
  if (error.response) {
    throw new Error(error.response.data.error || 'Server error');
  }
  throw error;
};

export const fetchPrinters = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/printers`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updatePrinterColor = async (printerId, color) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/admin/printers/${printerId}/color`, { color });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const stopPrinter = async (printerId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/admin/printers/${printerId}/stop`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const removePrinter = async (printerId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/admin/printers/${printerId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
