import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './ConfirmBooking.css';

const ConfirmBooking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { space, fechaInicio, fechaFin } = location.state || {};

    const [cantidadPersonas, setCantidadPersonas] = useState(1);
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!space || !fechaInicio || !fechaFin) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <div className="error-state">
                        <svg className="error-icon"  viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                            <path d="M12 8v4m0 4h.01" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h2>Información de Reserva Incompleta</h2>
                        <p>No hay información de reserva disponible. Por favor realice una búsqueda primero.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/search')}>
                            Ir a Búsqueda de Espacios
                        </button>
                    </div>
                </div>
            </>
        );
    }

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

    const handleConfirm = async (e) => {
        e.preventDefault();
        setError('');

        if (cantidadPersonas < 1) {
            setError('La cantidad de personas debe ser al menos 1');
            return;
        }

        if (cantidadPersonas > space.capacidad) {
            setError(`La cantidad de personas no puede exceder la capacidad del espacio (}{space.capacidad})`);
            return;
        }

        setLoading(true);

        try {
            const response = await bookingAPI.createBooking({
                espacioId: space._id,
                espacioNombre: space.nombre,
                fechaInicio,
                fechaFin,
                cantidadPersonas: parseInt(cantidadPersonas),
                capacidadEspacio: space.capacidad,
                motivo
            });

            if (response.success) {
                setSuccess(true);
            } else {
                setError(response.message || 'Error al crear la reserva');
            }
        } catch (err) {
            console.error('Error al crear reserva:', err);
            setError(err.response?.data?.message || err.message || 'Error al crear la reserva. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <div className="success-container">
                        <div className="success-icon-wrapper">
                            <svg className="success-icon"  viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h1 className="success-title">Reserva Confirmada</h1>
                        <p className="success-message">Su reserva ha sido procesada exitosamente y se encuentra confirmada.</p>

                        <div className="success-details">
                            <div className="detail-item">
                                <span className="detail-label">Espacio</span>
                                <span className="detail-value">{space.nombre}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Fecha de Inicio</span>
                                <span className="detail-value">{formatDate(fechaInicio)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Asistentes</span>
                                <span className="detail-value">{cantidadPersonas} personas</span>
                            </div>
                        </div>

                        <div className="success-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/my-bookings')}
                            >
                                Ver Mis Reservas
                            </button>
                            <button
                                className="btn btn-secondary-outline"
                                onClick={() => navigate('/search')}
                            >
                                Nueva Búsqueda
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="page-title">Confirmar Reserva</h1>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="booking-layout">
                    <div className="booking-summary card">
                        <h2 className="card-header">Resumen de Reserva</h2>

                        <div className="summary-item">
                            <strong>Espacio:</strong>
                            <span>{space.nombre}</span>
                        </div>

                        <div className="summary-item">
                            <strong>Tipo:</strong>
                            <span>{space.tipo}</span>
                        </div>

                        <div className="summary-item">
                            <strong>Ubicación:</strong>
                            <span>Piso {space.piso} - {space.ubicacion}</span>
                        </div>

                        <div className="summary-item">
                            <strong>Capacidad Máxima:</strong>
                            <span>{space.capacidad} personas</span>
                        </div>

                        <div className="summary-divider"></div>

                        <div className="summary-item">
                            <strong>Fecha y Hora de Inicio:</strong>
                            <span>{formatDate(fechaInicio)}</span>
                        </div>

                        <div className="summary-item">
                            <strong>Fecha y Hora de Fin:</strong>
                            <span>{formatDate(fechaFin)}</span>
                        </div>

                        <div className="summary-divider"></div>

                        <div className="summary-resources">
                            <strong>Recursos Disponibles:</strong>
                            <ul>
                                {space.recursos.proyector && <li>Proyector</li>}
                                {space.recursos.aireAcondicionado && <li>Aire Acondicionado</li>}
                                {space.recursos.pantalla && <li>Pantalla</li>}
                                {space.recursos.wifi && <li>WiFi</li>}
                            </ul>
                        </div>
                    </div>

                    <div className="booking-form-container card">
                        <h2 className="card-header">Información de la Reserva</h2>

                        <form onSubmit={handleConfirm}>
                            <div className="form-group">
                                <label htmlFor="cantidadPersonas">
                                    Número de Asistentes *
                                </label>
                                <input
                                    id="cantidadPersonas"
                                    type="number"
                                    className="form-control"
                                    value={cantidadPersonas}
                                    onChange={(e) => setCantidadPersonas(e.target.value)}
                                    min="1"
                                    max={space.capacidad}
                                    required
                                />
                                <small className="form-text">
                                    Máximo: {space.capacidad} personas
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="motivo">
                                    Motivo de la Reserva (Opcional)
                                </label>
                                <textarea
                                    id="motivo"
                                    className="form-control"
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    rows="4"
                                    maxLength="500"
                                    placeholder="Ej: Reunión de equipo, presentación de proyecto..."
                                />
                                <small className="form-text">
                                    {motivo.length}/500 caracteres
                                </small>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => navigate(-1)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success"
                                    disabled={loading}
                                >
                                    {loading ? 'Confirmando...' : 'Confirmar Reserva'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmBooking;
