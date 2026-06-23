import axios from 'axios';

// Use relative URLs - nginx will proxy to the correct service
const API_BASE_URL = '';
const ROOM_API_URL = '';
const RESERVATION_API_URL = '';

// Create axios instance with default config
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Service
export const authService = {
  login: async (correo, contrasena) => {
    const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
      correo,
      contrasena,
    });
    return response.data;
  },

  register: async (nombre, correo, contrasena, role = 'Colaborador') => {
    const response = await axios.post(`${API_BASE_URL}/api/users/register`, {
      nombre,
      correo,
      contrasena,
      role,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get(`${API_BASE_URL}/api/users/me`);
    return response.data;
  },
};

// Room Service
export const roomService = {
  getRooms: async (page = 1, size = 10, search = '') => {
    const params = new URLSearchParams({ page, size });
    if (search) params.append('search', search);
    const response = await api.get(`${ROOM_API_URL}/api/rooms?${params}`);
    return response.data;
  },

  getRoom: async (id) => {
    const response = await api.get(`${ROOM_API_URL}/api/rooms/${id}`);
    return response.data;
  },

  createRoom: async (roomData) => {
    const response = await api.post(`${ROOM_API_URL}/api/rooms`, roomData);
    return response.data;
  },

  updateRoom: async (id, roomData) => {
    const response = await api.put(`${ROOM_API_URL}/api/rooms/${id}`, roomData);
    return response.data;
  },

  deleteRoom: async (id) => {
    await api.delete(`${ROOM_API_URL}/api/rooms/${id}`);
  },
};

// Reservation Service
export const reservationService = {
  getReservations: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.sala_id) params.append('sala_id', filters.sala_id);
    if (filters.estado) params.append('estado', filters.estado);
    const response = await api.get(`${RESERVATION_API_URL}/api/reservations?${params}`);
    return response.data;
  },

  getReservation: async (id) => {
    const response = await api.get(`${RESERVATION_API_URL}/api/reservations/${id}`);
    return response.data;
  },

  createReservation: async (reservationData) => {
    const response = await api.post(`${RESERVATION_API_URL}/api/reservations`, reservationData);
    return response.data;
  },

  cancelReservation: async (id) => {
    const response = await api.delete(`${RESERVATION_API_URL}/api/reservations/${id}`);
    return response.data;
  },
};

export default api;

// Made with Bob
