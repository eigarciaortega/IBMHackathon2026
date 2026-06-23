import React, { useState, useEffect } from 'react';
import { catalogAPI, bookingAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [bookingStats, setBookingStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        setError('');

        try {
            const [dashboardData, statsData] = await Promise.all([
                catalogAPI.getDashboard(),
                bookingAPI.getStats()
            ]);

            if (dashboardData.success) {
                setDashboard(dashboardData.data);
            }

            if (statsData.success) {
                setBookingStats(statsData.data);
            }
        } catch (err) {
            setError('Error al cargar el dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <div className="loading">Cargando dashboard...</div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <div className="alert alert-error">{error}</div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="page-title">Dashboard de Administración</h1>

                {/* Estadísticas Generales */}
                <div className="stats-grid">
                    <div className="stat-card stat-total">
                        <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg></div>
                        <div className="stat-content">
                            <div className="stat-value">{dashboard.estadisticas.total}</div>
                            <div className="stat-label">Total Espacios</div>
                        </div>
                    </div>

                    <div className="stat-card stat-available">
                        <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                        <div className="stat-content">
                            <div className="stat-value">{dashboard.estadisticas.disponibles}</div>
                            <div className="stat-label">Disponibles</div>
                        </div>
                    </div>

                    <div className="stat-card stat-occupied">
                        <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M12 11V7a3 3 0 016 0v4" strokeLinecap="round" /></svg></div>
                        <div className="stat-content">
                            <div className="stat-value">{dashboard.estadisticas.ocupados}</div>
                            <div className="stat-label">Ocupados Hoy</div>
                        </div>
                    </div>

                    <div className="stat-card stat-maintenance">
                        <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                        <div className="stat-content">
                            <div className="stat-value">{dashboard.estadisticas.mantenimiento}</div>
                            <div className="stat-label">En Mantenimiento</div>
                        </div>
                    </div>
                </div>

                {/* Reservas Estadísticas */}
                {bookingStats && (
                    <div className="stats-grid">
                        <div className="stat-card stat-booking">
                            <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg></div>
                            <div className="stat-content">
                                <div className="stat-value">{bookingStats.reservasHoy}</div>
                                <div className="stat-label">Reservas Hoy</div>
                            </div>
                        </div>

                        <div className="stat-card stat-booking">
                            <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" /></svg></div>
                            <div className="stat-content">
                                <div className="stat-value">{bookingStats.reservasFuturas}</div>
                                <div className="stat-label">Reservas Futuras</div>
                            </div>
                        </div>

                        <div className="stat-card stat-booking">
                            <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 17V9M13 17V5M8 17v-3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                            <div className="stat-content">
                                <div className="stat-value">{bookingStats.totalReservas}</div>
                                <div className="stat-label">Total Reservas</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ocupación por Tipo */}
                <div className="dashboard-section">
                    <h2>Espacios por Tipo</h2>
                    <div className="type-stats">
                        <div className="type-card">
                            <h3>Salas de Juntas</h3>
                            <div className="type-value">{dashboard.porTipo.salas}</div>
                        </div>
                        <div className="type-card">
                            <h3>Escritorios Individuales</h3>
                            <div className="type-value">{dashboard.porTipo.escritorios}</div>
                        </div>
                    </div>
                </div>

                {/* Ocupación por Piso */}
                <div className="dashboard-section">
                    <h2>Ocupación por Piso</h2>
                    <div className="floor-stats">
                        {Object.entries(dashboard.porPiso).map(([piso, datos]) => (
                            <div key={piso} className="floor-card">
                                <h3>Piso {piso}</h3>
                                <div className="floor-details">
                                    <div className="floor-item">
                                        <span>Total:</span>
                                        <strong>{datos.total}</strong>
                                    </div>
                                    <div className="floor-item">
                                        <span>Disponibles:</span>
                                        <strong className="text-success">{datos.disponibles}</strong>
                                    </div>
                                    <div className="floor-item">
                                        <span>Ocupados:</span>
                                        <strong className="text-danger">{datos.ocupados}</strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Espacios Ocupados Hoy */}
                <div className="dashboard-section">
                    <h2>Espacios Ocupados Hoy</h2>
                    {dashboard.espaciosPorEstado.ocupados.length === 0 ? (
                        <p className="empty-message">No hay espacios ocupados en este momento</p>
                    ) : (
                        <div className="occupied-list">
                            {dashboard.espaciosPorEstado.ocupados.map((space) => (
                                <div key={space._id} className="occupied-item">
                                    <div>
                                        <strong>{space.nombre}</strong>
                                        <span className="occupied-type">{space.tipo}</span>
                                    </div>
                                    <div className="occupied-location">
                                        Piso {space.piso} - {space.ubicacion}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
