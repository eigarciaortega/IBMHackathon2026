import React, { useState, useEffect } from 'react';
import { catalogAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './SpacesDashboard.css';

const SpacesDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadDashboard();
    }, [selectedDate]);

    const loadDashboard = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await catalogAPI.getSpacesWithBookings(selectedDate);

            if (response.success) {
                setSpaces(response.data.spaces);
                setStats(response.data.stats);
            }
        } catch (err) {
            setError('Error al cargar el dashboard de espacios');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (estado) => {
        const statusMap = {
            'Disponible': 'space-status-available',
            'Ocupado': 'space-status-occupied',
            'Mantenimiento': 'space-status-maintenance'
        };
        return statusMap[estado] || 'space-status-available';
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <p className="dashboard-loading-text">Cargando dashboard...</p>
            </div>
        );
    }

    return (
        <div className="spaces-dashboard">
            <Navbar />

            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <div className="dashboard-header-info">
                        <h1>Dashboard de Espacios</h1>
                        <p>Vista general de todos los espacios y su estado actual</p>
                    </div>
                    <div className="dashboard-header-actions">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={loadDashboard}>
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                {error && <div className="alert alert-error">{error}</div>}

                {stats && (
                    <div className="dashboard-stats-grid">
                        <div className="dashboard-stat-card stat-total">
                            <div className="dashboard-stat-content">
                                <div className="dashboard-stat-info">
                                    <p>Total Espacios</p>
                                    <p>{stats.total}</p>
                                </div>
                                <div className="dashboard-stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <path d="M3 9h18M9 21V9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-stat-card stat-available">
                            <div className="dashboard-stat-content">
                                <div className="dashboard-stat-info">
                                    <p>Disponibles</p>
                                    <p>{stats.disponibles}</p>
                                </div>
                                <div className="dashboard-stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-stat-card stat-occupied">
                            <div className="dashboard-stat-content">
                                <div className="dashboard-stat-info">
                                    <p>Ocupados</p>
                                    <p>{stats.ocupados}</p>
                                </div>
                                <div className="dashboard-stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="5" y="11" width="14" height="10" rx="2" />
                                        <path d="M12 11V7a3 3 0 016 0v4" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-stat-card stat-maintenance">
                            <div className="dashboard-stat-content">
                                <div className="dashboard-stat-info">
                                    <p>Mantenimiento</p>
                                    <p>{stats.mantenimiento}</p>
                                </div>
                                <div className="dashboard-stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-stat-card stat-occupancy">
                            <div className="dashboard-stat-content">
                                <div className="dashboard-stat-info">
                                    <p>Ocupación</p>
                                    <p>{stats.porcentajeOcupacion}%</p>
                                </div>
                                <div className="dashboard-stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M18 17V9M13 17V5M8 17v-3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="dashboard-spaces-section">
                    <div className="dashboard-spaces-header">
                        <h2>Todos los Espacios</h2>
                    </div>
                    <div className="dashboard-spaces-content">
                        <div className="dashboard-spaces-grid">
                            {spaces.map((space) => (
                                <div key={space._id} className="dashboard-space-card">
                                    <div className="dashboard-space-header">
                                        <div className="dashboard-space-title">
                                            <h3>{space.nombre}</h3>
                                            <p>{space.tipo}</p>
                                        </div>
                                        <span className={`space-status-badge ${getStatusBadge(space.estado)}`}>
                                            {space.estado}
                                        </span>
                                    </div>

                                    <div className="dashboard-space-details">
                                        <div className="space-detail-item">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                                                <circle cx="9" cy="7" r="4" />
                                                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span>Capacidad: {space.capacidad} personas</span>
                                        </div>

                                        <div className="space-detail-item">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            <span>Piso {space.piso} - {space.ubicacion}</span>
                                        </div>
                                    </div>

                                    {space.reservaActual && (
                                        <div className="space-booking-info">
                                            <p>Reserva Actual:</p>
                                            <p>{space.reservaActual.usuarioNombre}</p>
                                            <p>
                                                {new Date(space.reservaActual.fechaInicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} -
                                                {new Date(space.reservaActual.fechaFin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpacesDashboard;

// Made with Bob
