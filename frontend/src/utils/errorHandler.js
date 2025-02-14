export const handleError = (error) => {
    if (error.response) {
    throw new Error(error.response.data.error || 'Server error');
    }
    throw error;
};