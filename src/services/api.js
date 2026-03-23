import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_URL =
  Constants?.expoConfig?.extra?.apiUrl
  || 'https://client-progress.onrender.com';

export const getApiBaseUrl = () => API_URL;

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
      await AsyncStorage.multiRemove(['token', 'orgName', 'orgLogo']);
      if (onAuthFailure) onAuthFailure();
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = (email, password) => api.post('/auth/login', { email, password });

// Helper: upload with FormData via fetch (axios 1.x mangles multipart headers)
const fetchMultipart = async (path, method, formData) => {
  const token = await AsyncStorage.getItem('token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // Do NOT set Content-Type — fetch/RN will set the correct multipart boundary
  const res = await fetch(`${API_URL}${path}`, {
    method,
    body: formData,
    headers,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || 'Request failed');
    err.response = { data: json, status: res.status };
    throw err;
  }
  return { data: json };
};

// Build a FormData with text fields + optional image file
const buildFormData = async (data, logoFile) => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });
  if (logoFile) {
    if (Platform.OS === 'web') {
      // On web, convert the URI (blob/data URL) to an actual File/Blob
      const response = await fetch(logoFile.uri);
      const blob = await response.blob();
      const fileName = logoFile.fileName || `logo-${Date.now()}.jpg`;
      const file = new File([blob], fileName, {
        type: logoFile.mimeType || logoFile.type || blob.type || 'image/jpeg',
      });
      formData.append('logo', file);
    } else {
      // On React Native (iOS/Android), use the RN-style object
      formData.append('logo', {
        uri: logoFile.uri,
        name: logoFile.fileName || `logo-${Date.now()}.jpg`,
        type: logoFile.mimeType || logoFile.type || 'image/jpeg',
      });
    }
  }
  return formData;
};

export const register = async (data, logoFile) => {
  if (!logoFile) return api.post('/auth/register', data);
  const formData = await buildFormData(data, logoFile);
  return fetchMultipart('/auth/register', 'POST', formData);
};

export const getMe = () => api.get('/auth/me');

export const updateProfile = async (data, logoFile) => {
  if (!logoFile) return api.put('/auth/update', data);
  const formData = await buildFormData(data, logoFile);
  return fetchMultipart('/auth/update', 'PUT', formData);
};

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

// Notification APIs
export const registerNotificationDevice = (platform, expoPushToken) =>
  api.post('/notifications/register-device', { platform, expoPushToken });
export const unregisterNotificationDevice = (expoPushToken) =>
  api.delete('/notifications/register-device', { data: { expoPushToken } });
export const sendNotificationTest = () => api.post('/notifications/test');

// Organization APIs (public)
export const getOrganizations = () => api.get('/organizations');
export const getOrganization = (id) => api.get(`/organizations/${id}`);

export default api;
