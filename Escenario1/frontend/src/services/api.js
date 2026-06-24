import axios from 'axios';

const CATALOG_URL = 'http://localhost:3001';
const BOOKING_URL = 'http://localhost:3002';

const getToken = () => {
  const token = localStorage.getItem('token');
  console.log('🔑 getToken() llamado, token:', token ? `${token.substring(0, 20)}...` : 'NULL');
  return token;
};

const authHeader = () => {
  const token = getToken();
  const header = {
    headers: { Authorization: `Bearer ${token}` }
  };
  console.log('📤 authHeader() generado:', header);
  return header;
};

// AUTH
export const login = (email, contrasena) =>
  axios.post(`${CATALOG_URL}/auth/login`, { email, contrasena });

// ESPACIOS
export const getSpaces = (filters = {}) =>
  axios.get(`${CATALOG_URL}/spaces`, { ...authHeader(), params: filters });

export const getSpaceById = (id) =>
  axios.get(`${CATALOG_URL}/spaces/${id}`, authHeader());

export const createSpace = (data) =>
  axios.post(`${CATALOG_URL}/spaces`, data, authHeader());

export const updateSpace = (id, data) =>
  axios.put(`${CATALOG_URL}/spaces/${id}`, data, authHeader());

export const deleteSpace = (id) =>
  axios.delete(`${CATALOG_URL}/spaces/${id}`, authHeader());

// RESERVACIONES
export const createBooking = (data) =>
  axios.post(`${BOOKING_URL}/bookings`, data, authHeader());

export const getMyBookings = () =>
  axios.get(`${BOOKING_URL}/bookings/mine`, authHeader());

export const getTodayBookings = () =>
  axios.get(`${BOOKING_URL}/bookings/today`, authHeader());

export const getBookingsByDate = (fecha) =>
  axios.get(`${BOOKING_URL}/bookings/by-date`, { ...authHeader(), params: { fecha } });

export const cancelBooking = (id) =>
  axios.delete(`${BOOKING_URL}/bookings/${id}`, authHeader());

export const getAvailableSpaces = (params) =>
  axios.get(`${BOOKING_URL}/bookings/available`, { ...authHeader(), params });

// Made with Bob
