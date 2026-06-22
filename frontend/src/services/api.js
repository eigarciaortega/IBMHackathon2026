import axios from 'axios';

const CATALOG_API_URL = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:3001/api';
const BOOKING_API_URL = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:3002/api';

const catalogApi = axios.create({
  baseURL: CATALOG_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const bookingApi = axios.create({
  baseURL: BOOKING_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

catalogApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

bookingApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

catalogApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

bookingApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const spacesService = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.city) params.append('city', filters.city);
    if (filters.capacity) params.append('capacity', filters.capacity);
    if (filters.priceMin) params.append('priceMin', filters.priceMin);
    if (filters.priceMax) params.append('priceMax', filters.priceMax);
    if (filters.amenities?.length) params.append('amenities', filters.amenities.join(','));
    
    const response = await catalogApi.get(`/spaces?${params.toString()}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await catalogApi.get(`/spaces/${id}`);
    return response.data;
  },

  checkAvailability: async (id, startTime, endTime) => {
    const response = await catalogApi.get(`/spaces/${id}/availability`, {
      params: { start_time: startTime, end_time: endTime }
    });
    return response.data;
  },

  getAmenities: async () => {
    const response = await catalogApi.get('/spaces/amenities');
    return response.data;
  },

  create: async (spaceData) => {
    const response = await catalogApi.post('/spaces', spaceData);
    return response.data;
  },

  update: async (id, spaceData) => {
    const response = await catalogApi.put(`/spaces/${id}`, spaceData);
    return response.data;
  },

  delete: async (id) => {
    const response = await catalogApi.delete(`/spaces/${id}`);
    return response.data;
  }
};

export const bookingsService = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.space_id) params.append('space_id', filters.space_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const response = await bookingApi.get(`/bookings?${params.toString()}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await bookingApi.get(`/bookings/${id}`);
    return response.data;
  },

  create: async (bookingData) => {
    const response = await bookingApi.post('/bookings', bookingData);
    return response.data;
  },

  update: async (id, bookingData) => {
    const response = await bookingApi.put(`/bookings/${id}`, bookingData);
    return response.data;
  },

  cancel: async (id) => {
    const response = await bookingApi.post(`/bookings/${id}/cancel`);
    return response.data;
  },

  getUserStatistics: async (userId) => {
    const response = await bookingApi.get(`/bookings/user/${userId}/statistics`);
    return response.data;
  }
};

export const authService = {
  login: async (email, password) => {
    const users = [
      { id: 1, email: 'admin@beespace.com', password: 'admin123', name: 'Admin User', role: 'admin' },
      { id: 2, email: 'user@beespace.com', password: 'user123', name: 'Regular User', role: 'user' },
      { id: 3, email: 'owner@beespace.com', password: 'owner123', name: 'Space Owner', role: 'owner' }
    ];

    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const token = `mock-token-${user.id}-${Date.now()}`;
    
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default {
  spacesService,
  bookingsService,
  authService
};

// Made with Bob
