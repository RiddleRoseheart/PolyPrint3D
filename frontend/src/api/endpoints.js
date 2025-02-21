import axios from 'axios';
import { API_BASE_URL } from './config';

const handleError = (error) => {
  if (error.response) {
    throw new Error(error.response.data.error || 'Server error');
  }
  throw error;
};

export const fetchTestData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/data`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const uploadSTLFile = async (formData) => {
  try {
    // Debug log
    for (let pair of formData.entries()) {
      console.log('FormData content:', pair[0], pair[1]);
    }
    
    const response = await axios.post(`${API_BASE_URL}/api/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const sliceSTLFile = async (slicingSettings) => {
  try {
    console.log('Sending slicing request to backend:', {
      url: `${API_BASE_URL}/api/slicer/slice`,
      data: slicingSettings
    });
    
    const response = await axios.post(`${API_BASE_URL}/api/slicer/slice`, slicingSettings);
    console.log('Backend response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Slicing error response:', error.response || error);
    handleError(error);
  }
};

export const checkSlicingStatus = async (slicingId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/slicer/status/${slicingId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const startPrint = async (printRequest) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/printer/send`, printRequest);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const checkPrintStatus = async (printJobId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/printer/status/${printJobId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};