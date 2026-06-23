import React, { useState, useEffect } from 'react';
import { bookingAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './MyBookings.css';

const MyBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('todas'); // todas, activas, futuras
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadBookings();
    }, [filter]);

    const loadBookings = async () => {
        setLoading(true);
        setError('');

        try {
            const filters = {};
            if (filter === 'activas') filters.estado = 'Activa';
            if (filter === 'futuras') filters.futuras = 'true';

            const response = await bookingAPI.getMyBookings(filters);

            if (response.success) {
                setBookings(response.data);
            }
        } catch (err) {
            setError('Error al cargar las reservas');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm('¿Está seguro de cancelar esta reserva?')) {
            return;
        }

        try {
            const response = await bookingAPI.cancelBooking(bookingId, 'Cancelada por el usuario');

            if (response.success) {
                setSuccessMessage('Reserva cancelada exitosamente');
                setTimeout(() => setSuccessMessage(''), 3000);
                loadBookings();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cancelar la reserva');
            setTimeout(() => setError(''), 3000);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isFutureBooking = (fechaInicio) => {
        return new Date(fechaInicio) > new Date();
    };

    const getStatusBadge = (estado) => {
        const badges = {
            'Activa': 'badge-success',
            'Cancelada': 'badge-danger',
            'Completada': 'badge-secondary'
        };

        return `badge ${badges[estado] || 'badge-secondary'}`;
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="page-title">Mis Reservas</h1>

                {error && <div className="alert alert-error">{error}</div>}
                {successMessage && <div className="alert alert-success">{successMessage}</div>}

                <div className="filters-bar">
                    <button
                        className={`filter-btn ${filter === 'todas' ? 'active' : ''}`}
                        onClick={() => setFilter('todas')}
                    >
                        Todas
                    </button>
                    <button
                        className={`filter-btn ${filter === 'futuras' ? 'active' : ''}`}
                        onClick={() => setFilter('futuras')}
                    >
                        Próximas
                    </button>
                    <button
                        className={`filter-btn ${filter === 'activas' ? 'active' : ''}`}
                        onClick={() => setFilter('activas')}
                    >
                        Activas
                    </button>
                </div>

                {loading ? (
                    <div className="loading">Cargando reservas...</div>
                ) : bookings.length === 0 ? (
                    <div className="empty-state">
                        <p>No tienes reservas{filter !== 'todas' ? ` ${filter}` : ''}.</p>
                        <p>¿Por qué no buscas un espacio disponible?</p>
                        <a href="/search" className="btn btn-primary">
                            Buscar Espacios
                        </a>
                    </div>
                ) : (
                    <div className="bookings-list">
                        {bookings.map((booking) => (
                            <div key={booking._id} className="booking-card">
                                <div className="booking-header">
                                    <div>
                                        <h3>{booking.espacioNombre}</h3>
                                        <span className={getStatusBadge(booking.estado)}>
                                            {booking.estado}
                                        </span>
                                    </div>
                                </div>

                                <div className="booking-details">
                                    <div className="detail-row">
                                        <strong>Fecha de Inicio:</strong>
                                        <span>{formatDate(booking.fechaInicio)}</span>
                                    </div>

                                    <div className="detail-row">
                                        <strong>Fecha de Fin:</strong>
                                        <span>{formatDate(booking.fechaFin)}</span>
                                    </div>

                                    <div className="detail-row">
                                        <strong>Número de Personas:</strong>
                                        <span>{booking.cantidadPersonas}</span>
                                    </div>

                                    {booking.motivo && (
                                        <div className="detail-row">
                                            <strong>Motivo:</strong>
                                            <span>{booking.motivo}</span>
                                        </div>
                                    )}

                                    <div className="detail-row">
                                        <strong>Creada el:</strong>
                                        <span>{formatDate(booking.createdAt)}</span>
                                    </div>

                                    {booking.estado === 'Cancelada' && booking.canceladaAt && (
                                        <div className="detail-row">
                                            <strong>Cancelada el:</strong>
                                            <span>{formatDate(booking.canceladaAt)}</span>
                                        </div>
                                    )}
                                </div>

                                {booking.estado === 'Activa' && isFutureBooking(booking.fechaInicio) && (
                                    <div className="booking-actions">
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => handleCancelBooking(booking._id)}
                                        >
                                            Cancelar Reserva
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default MyBookings;
