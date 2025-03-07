import { API_BASE_URL } from '../config';

export async function checkLocalMode() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config/mode`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      // If server doesn't have this endpoint yet, assume we're in local mode
      return { isLocalMode: true };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking local mode:', error);
    // If we can't connect to the server, assume we're in local mode
    return { isLocalMode: true };
  }
}