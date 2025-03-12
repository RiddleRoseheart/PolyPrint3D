import { API_BASE_URL } from '../config';

export async function checkLocalMode() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config/mode`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.log("Local mode check failed, defaulting to local mode");
      return { isLocalMode: true };
    }
    
    const result = await response.json();
    console.log("Local mode check:", result.isLocalMode ? "local" : "server");
    return result;
  } catch (error) {
    console.log("Error checking mode, defaulting to local mode:", error);
    return { isLocalMode: true };
  }
}