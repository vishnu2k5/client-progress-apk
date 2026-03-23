import axios from 'axios';
import { clearAuth, getToken } from './storage.js';

const API_URL = 'https://client-progress.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let onAuthFailure = null;
export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      if (onAuthFailure) onAuthFailure();
    }
    return Promise.reject(error);
  }
);

const fetchMultipart = async (path, method, formData) => {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || 'Request failed');
    err.response = { data: json, status: res.status };
    throw err;
  }
  return { data: json };
};

const buildFormData = (data, logoFile) => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) formData.append(key, data[key]);
  });
  if (logoFile) formData.append('logo', logoFile);
  return formData;
};

export const login = (email, password) => api.post('/auth/login', { email, password });

export const register = async (data, logoFile) => {
  if (!logoFile) return api.post('/auth/register', data);
  const formData = buildFormData(data, logoFile);
  return fetchMultipart('/auth/register', 'POST', formData);
};

export const getMe = () => api.get('/auth/me');

export const updateProfile = async (data, logoFile) => {
  if (!logoFile) return api.put('/auth/update', data);
  const formData = buildFormData(data, logoFile);
  return fetchMultipart('/auth/update', 'PUT', formData);
};

export const changePassword = (currentPassword, newPassword) =>
  api.put('/auth/change-password', { currentPassword, newPassword });

export const getClients = () => api.get('/clients');
export const addClient = (clientName) => api.post('/add/clients', { clientName });
export const updateClient = (id, clientName) => api.put(`/update/client/${id}`, { clientName });
export const deleteClient = (id) => api.delete(`/delete/client/${id}`);

export const getProgress = (clientId) => api.get(`/progress?clientId=${clientId}`);
export const getAllProgress = () => api.get('/progress');
export const updateProgress = (clientId, data) => api.put(`/update/progress?clientId=${clientId}`, data);

export default api;
