import axios from 'axios';

// URLs de los servicios
const AUTH_URL = 'http://localhost:3001/api/auth';
const CATALOG_URL = 'http://localhost:3002/api/spaces';
const BOOKING_URL = 'http://localhost:3003/api/bookings';

// Crear instancia de axios
const api = axios.create({
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// AUTH SERVICE
export const authAPI = {
    login: async (email, password) => {
        const response = await axios.post(`${AUTH_URL}/login`, { email, password });
        return response.data;
    },

    register: async (email, password, role) => {
        const response = await axios.post(`${AUTH_URL}/register`, { email, password, role });
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get(`${AUTH_URL}/profile`);
        return response.data;
    }
};

// CATALOG SERVICE
export const catalogAPI = {
    getAllSpaces: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`${CATALOG_URL}${params ? `?${params}` : ''}`);
        return response.data;
    },

    getSpace: async (id) => {
        const response = await api.get(`${CATALOG_URL}/${id}`);
        return response.data;
    },

    createSpace: async (spaceData) => {
        const response = await api.post(CATALOG_URL, spaceData);
        return response.data;
    },

    updateSpace: async (id, spaceData) => {
        const response = await api.put(`${CATALOG_URL}/${id}`, spaceData);
        return response.data;
    },

    deleteSpace: async (id) => {
        const response = await api.delete(`${CATALOG_URL}/${id}`);
        return response.data;
    },

    getDashboard: async () => {
        const response = await api.get(`${CATALOG_URL}/dashboard`);
        return response.data;
    },

    getSpacesWithBookings: async (date) => {
        const response = await api.get(`${CATALOG_URL}`);
        if (response.data.success) {
            const spaces = response.data.data;
            const stats = {
                total: spaces.length,
                disponibles: spaces.filter(s => s.estado === 'Disponible').length,
                ocupados: spaces.filter(s => s.estado === 'Ocupado').length,
                mantenimiento: spaces.filter(s => s.estado === 'Mantenimiento').length,
                porcentajeOcupacion: spaces.length > 0
                    ? Math.round((spaces.filter(s => s.estado === 'Ocupado').length / spaces.length) * 100)
                    : 0
            };
            return {
                success: true,
                data: {
                    spaces,
                    stats
                }
            };
        }
        return response.data;
    }
};

// BOOKING SERVICE
export const bookingAPI = {
    searchAvailable: async (fechaInicio, fechaFin, filters = {}) => {
        const params = new URLSearchParams({
            fechaInicio,
            fechaFin,
            ...filters
        }).toString();
        const response = await api.get(`${BOOKING_URL}/search?${params}`);
        return response.data;
    },

    createBooking: async (bookingData) => {
        const response = await api.post(BOOKING_URL, bookingData);
        return response.data;
    },

    getMyBookings: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`${BOOKING_URL}/my-bookings${params ? `?${params}` : ''}`);
        return response.data;
    },

    getAllBookings: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`${BOOKING_URL}${params ? `?${params}` : ''}`);
        return response.data;
    },

    getBooking: async (id) => {
        const response = await api.get(`${BOOKING_URL}/${id}`);
        return response.data;
    },

    cancelBooking: async (id, motivo = '') => {
        const response = await api.patch(`${BOOKING_URL}/${id}/cancel`, { motivo });
        return response.data;
    },

    getStats: async () => {
        const response = await api.get(`${BOOKING_URL}/stats/summary`);
        return response.data;
    }
};

export default api;
