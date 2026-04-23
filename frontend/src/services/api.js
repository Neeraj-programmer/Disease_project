import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth API ──
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const updateProfile = (data) => {
  if (data instanceof FormData) {
    return API.put('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return API.put('/auth/profile', data);
};
export const forgotPassword = (data) => API.post('/auth/forgot-password', data);
export const resetPassword = (token, data) => API.post(`/auth/reset-password/${token}`, data);

// ── Posts API ──
export const getPosts = (params) => API.get('/posts', { params });
export const getPost = (id) => API.get(`/posts/${id}`);
export const createPost = (data) => {
  if (data instanceof FormData) {
    return API.post('/posts', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return API.post('/posts', data);
};
export const updatePost = (id, data) => {
  if (data instanceof FormData) {
    return API.put(`/posts/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return API.put(`/posts/${id}`, data);
};
export const deletePost = (id) => API.delete(`/posts/${id}`);
export const reactToPost = (id, type) => API.post(`/posts/${id}/react`, { type });
export const addComment = (id, data) => API.post(`/posts/${id}/comments`, data);
export const deleteComment = (postId, commentId) => API.delete(`/posts/${postId}/comments/${commentId}`);
export const savePost = (id) => API.post(`/posts/${id}/save`);
export const getSavedPosts = () => API.get('/posts/saved');
export const summarizePost = (id) => API.post(`/posts/${id}/summarize`);
export const getSimilarUsers = () => API.get('/posts/similar-users');

// ── Chat API ──
export const getConversations = () => API.get('/chat/conversations');
export const getMessages = (userId) => API.get(`/chat/messages/${userId}`);
export const getChatUsers = () => API.get('/chat/users');
export const moderateChatMessage = (content) => API.post('/chat/moderate', { content });

// ── Analytics API ──
export const getTriggerAnalytics = () => API.get('/analytics/triggers');
export const getSymptomAnalytics = () => API.get('/analytics/symptoms');
export const getTreatmentAnalytics = () => API.get('/analytics/treatments');
export const getSeverityAnalytics = () => API.get('/analytics/severity');
export const getAnalyticsOverview = () => API.get('/analytics/overview');

// ── Notifications API ──
export const getNotifications = () => API.get('/notifications');
export const markAllNotificationsRead = () => API.put('/notifications/read-all');
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const clearAllNotifications = () => API.delete('/notifications');

// ── Users API ──
export const getUserProfile = (id) => API.get(`/users/${id}`);

// ── Trust & Safety API ──
export const reportPost = (data) => API.post('/reports', data);
export const getFlaggedPosts = () => API.get('/reports/flagged');
export const reviewModerationPost = (postId, data) => API.put(`/reports/moderation/post/${postId}`, data);
export const getUserTrustScores = () => API.get('/reports/admin/users');
export const toggleBanUser = (userId, data) => API.put(`/reports/admin/users/${userId}/ban`, data);
export const verifyEmail = (token) => API.get(`/auth/verify-email/${token}`);
export const sendPhoneOtp = (data) => API.post('/auth/send-phone-otp', data);
export const verifyPhoneOtp = (data) => API.post('/auth/verify-phone-otp', data);

export default API;
