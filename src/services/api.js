import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your server URL
const API_URL = 'https://client-progress.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Navigation callback for 401 redirects
let onAuthFailure = null;
export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'orgName']);
      if (onAuthFailure) onAuthFailure();
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/update', data);
export const changePassword = (currentPassword, newPassword) =>
  api.put('/auth/change-password', { currentPassword, newPassword });

// Client APIs
export const getClients = () => api.get('/clients');
export const getClient = (id) => api.get(`/clients/${id}`);
export const addClient = (clientName) => api.post('/add/clients', { clientName });
export const updateClient = (id, clientName) => api.put(`/update/client/${id}`, { clientName });
export const deleteClient = (id) => api.delete(`/delete/client/${id}`);

// Progress APIs
export const getProgress = (clientId) => api.get(`/progress?clientId=${clientId}`);
export const getAllProgress = () => api.get('/progress');
export const updateProgress = (clientId, data) => api.put(`/update/progress?clientId=${clientId}`, data);

// Organization APIs (public)
export const getOrganizations = () => api.get('/organizations');
export const getOrganization = (id) => api.get(`/organizations/${id}`);

export default api;
