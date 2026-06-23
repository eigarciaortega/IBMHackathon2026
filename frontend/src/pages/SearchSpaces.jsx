import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './SearchSpaces.css';

const SearchSpaces = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        fechaInicio: '',
        fechaFin: '',
        tipo: '',
        piso: '',
        capacidadMin: ''
    });

    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const handleInputChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');

        if (!filters.fechaInicio || !filters.fechaFin) {
            setError('Debe seleccionar fecha y hora de inicio y fin');
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            const searchFilters = {};
            if (filters.tipo) searchFilters.tipo = filters.tipo;
            if (filters.piso) searchFilters.piso = filters.piso;
            if (filters.capacidadMin) searchFilters.capacidadMin = filters.capacidadMin;

            const response = await bookingAPI.searchAvailable(
                filters.fechaInicio,
                filters.fechaFin,
                searchFilters
            );

            if (response.success) {
                setSpaces(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al buscar espacios disponibles');
        } finally {
            setLoading(false);
        }
    };

    const handleReserve = (space) => {
        navigate('/confirm-booking', {
            state: {
                space,
                fechaInicio: filters.fechaInicio,
                fechaFin: filters.fechaFin
            }
        });
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 className="page-title">Buscar Espacios Disponibles</h1>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="card search-card">
                    <h2 className="card-header">Filtros de Búsqueda</h2>
                    <form onSubmit={handleSearch} className="search-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Fecha y Hora de Inicio *</label>
                                <input
                                    type="datetime-local"
                                    name="fechaInicio"
                                    className="form-control"
                                    value={filters.fechaInicio}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Fecha y Hora de Fin *</label>
                                <input
                                    type="datetime-local"
                                    name="fechaFin"
                                    className="form-control"
                                    value={filters.fechaFin}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Tipo de Espacio</label>
                                <select
                                    name="tipo"
                                    className="form-control"
                                    value={filters.tipo}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Todos</option>
                                    <option value="Sala de juntas">Sala de juntas</option>
                                    <option value="Escritorio individual">Escritorio individual</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Piso</label>
                                <select
                                    name="piso"
                                    className="form-control"
                                    value={filters.piso}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Todos</option>
                                    <option value="1">Piso 1</option>
                                    <option value="2">Piso 2</option>
                                    <option value="3">Piso 3</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Capacidad Mínima</label>
                                <input
                                    type="number"
                                    name="capacidadMin"
                                    className="form-control"
                                    value={filters.capacidadMin}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder="Ej: 5"
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Buscando...' : 'Buscar Espacios Disponibles'}
                        </button>
                    </form>
                </div>

                {loading && <div className="loading">Buscando espacios disponibles...</div>}

                {searched && !loading && (
                    <div className="results-section">
                        <h2 className="results-title">
                            {spaces.length > 0
                                ? `Se encontraron ${spaces.length} espacios disponibles`
                                : 'No se encontraron espacios disponibles'}
                        </h2>

                        <div className="spaces-grid">
                            {spaces.map((space) => (
                                <div key={space._id} className="space-card">
                                    <div className="space-header">
                                        <h3>{space.nombre}</h3>
                                        <span className="badge badge-success">Disponible</span>
                                    </div>

                                    <div className="space-details">
                                        <p><strong>Tipo:</strong> {space.tipo}</p>
                                        <p><strong>Capacidad:</strong> {space.capacidad} personas</p>
                                        <p><strong>Ubicación:</strong> Piso {space.piso} - {space.ubicacion}</p>

                                        <div className="space-resources">
                                            <strong>Recursos:</strong>
                                            <ul>
                                                {space.recursos.proyector && <li>Proyector</li>}
                                                {space.recursos.aireAcondicionado && <li>Aire Acondicionado</li>}
                                                {space.recursos.pantalla && <li>Pantalla</li>}
                                                {space.recursos.wifi && <li>WiFi</li>}
                                            </ul>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary btn-block"
                                        onClick={() => handleReserve(space)}
                                    >
                                        Reservar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default SearchSpaces;
