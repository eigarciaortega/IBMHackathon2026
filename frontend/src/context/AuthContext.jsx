import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const response = await authAPI.getProfile();
                    if (response.success) {
                        setUser(response.data.user);
                    } else {
                        logout();
                    }
                } catch (error) {
                    console.error('Error al cargar usuario:', error);
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await authAPI.login(email, password);

            if (response.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                setToken(token);
                setUser(user);
                return { success: true };
            }

            return { success: false, message: response.message };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Error al iniciar sesión'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const isAdmin = () => {
        return user?.role === 'ADMINISTRADOR';
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        isAdmin
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
