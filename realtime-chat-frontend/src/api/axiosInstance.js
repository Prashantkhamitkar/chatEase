import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:9090",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, 
});


axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    config.withCredentials=true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    // Handle authentication errors
    if (response?.status === 401) {
      console.log("Authentication failed - redirecting to login");
      // Clear any local state if needed
      localStorage.removeItem("persist:root");
      
      // Only redirect if we're not already on login page
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    }
    
    // Handle other errors
    if (response?.status >= 500) {
      console.error("Server error:", error);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;