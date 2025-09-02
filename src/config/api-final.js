// Final API Configuration for AWS AI Calling Agent
// Updated with the provided API Gateway URL

// Get API Gateway URL - using the provided URL directly
const getApiUrl = () => {
  return 'https://5uuch24xvd.execute-api.ap-southeast-1.amazonaws.com/staging';
};

export const API_CONFIG = {
  baseURL: getApiUrl(),
  region: 'ap-southeast-1',
  endpoints: {
    // Customer Management
    customers: '/clients',
    customerById: (id) => `/clients/${id}`,

    // Chat endpoint for AI conversations
    chat: '/chat',

    // File Upload
    uploadFile: '/upload',

    // Suspicious client marking
    suspicious: '/suspicious',

    // Health Check
    health: '/health'
  },

  // Request headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Enhanced API Client class with better error handling
class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.isConfigured = true; // Always configured with direct URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        ...API_CONFIG.headers,
        ...options.headers
      },
      ...options
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Success: ${options.method || 'GET'} ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error('🚨 API request failed:', error);

      // Provide helpful error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to API. Check your internet connection.');
      }

      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET'
    });
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Check if API is healthy
  async healthCheck() {
    try {
      const response = await this.get('/health');
      return response.success === true;
    } catch (error) {
      return false;
    }
  }
}

// Create API client instance
export const apiClient = new ApiClient();

// Specific API functions for EMI Reminder AI
export const customerAPI = {
  create: (customer) => apiClient.post(API_CONFIG.endpoints.customers, customer),
  getAll: () => apiClient.get(API_CONFIG.endpoints.customers)
};

export const chatAPI = {
  sendMessage: (messageData) => apiClient.post(API_CONFIG.endpoints.chat, messageData)
};

export const fileAPI = {
  upload: (fileData) => apiClient.post(API_CONFIG.endpoints.uploadFile, fileData)
};

export const suspiciousAPI = {
  markClient: (clientId) => apiClient.post(API_CONFIG.endpoints.suspicious, { clientId })
};

// Health check function
export const healthCheck = () => apiClient.healthCheck();

// Configuration status
export const getConfigurationStatus = () => ({
  isConfigured: apiClient.isConfigured,
  apiUrl: API_CONFIG.baseURL,
  region: API_CONFIG.region
});

export default apiClient;
