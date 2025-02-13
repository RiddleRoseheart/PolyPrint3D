import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

/**
* API endpoints for slicing operations
*/

/**
* Checks the status of a slicing job
* @param {string} jobId - ID of the slicing job to check
* @returns {Promise<Object>} Current status of the slicing job
* @throws {Error} If status check fails
*/
export const checkSlicingStatus = async (jobId) => {
   try {
       const response = await axiosInstance.get(`/api/slicer/status/${jobId}`);
       return response.data;
   } catch (error) {
       handleError(error);
   }
};

/**
* Initiates slicing of an STL file with specified settings
* @param {Object} slicingSettings - Settings for the slicing operation
* @param {string} slicingSettings.fileId - ID of the STL file to slice
* @param {Object} slicingSettings.settings - Slicing parameters
* @param {string} slicingSettings.settings.material - Print material
* @param {string} slicingSettings.settings.quality - Print quality level
* @param {number} slicingSettings.settings.infill - Infill percentage
* @param {string} [slicingSettings.settings.filamentColor] - Color of filament
* @returns {Promise<Object>} Slicing job response data
* @throws {Error} If slicing operation fails
*/
export const sliceSTLFile = async (slicingSettings) => {
   try {
       console.log('Sending slicing request:', slicingSettings);
       
       const response = await axiosInstance.post('/api/slicer/slice', slicingSettings);
       
       console.log('Slicing response:', response.data);
       return response.data;
   } catch (error) {
       console.error('Slicing error:', error);
       throw new Error(
           error.response?.data?.message || 
           error.message || 
           'Failed to slice file'
       );
   }
};

export default {
   checkSlicingStatus,
   sliceSTLFile
};