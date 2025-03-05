
/**
 * Process API response to extract data from standard response format
 * @param {Object} response - API response object
 * @returns {*} Extracted data or original response
 */
export const processResponse = (response) => {
    // Handle new format with status and data properties
    if (response && response.status === 'success' && response.data !== undefined) {
      return response.data;
    }
    
    // Handle error responses
    if (response && response.status === 'error') {
      throw new Error(response.error || 'Unknown error occurred');
    }
    
    // Fallback for backward compatibility
    return response;
  };