import axios from 'axios';
import { API_BASE_URL } from './config';

export const fetchTestData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/data`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const uploadSTLFile = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const sliceSTLFile = async (fileId, slicingSettings) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/slicer/slice`, {
      fileId,
      settings: slicingSettings
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const checkSlicingStatus = async (slicingId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/slicer/status/${slicingId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const startPrint = async (printRequest) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/printer/send`, printRequest);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const checkPrintStatus = async (printJobId) => {
  const response = await axios.get(`${API_BASE_URL}/api/printer/status/${printJobId}`);
  return response.data;
};