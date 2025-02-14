import axiosInstance from '../axiosConfig';
import { handleError } from '../../utils/errorHandler';

export const fetchTestData = async () => {
    try {
        const response = await axiosInstance.get('/api/test');
        return response.data;
    } catch (error) {
        handleError(error);
    }
};