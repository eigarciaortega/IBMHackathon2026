import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to={isAdmin() ? '/admin/dashboard' : '/search'} className="navbar-brand">
                    Sistema de Reservas
                </Link>

                <div className="navbar-menu">
                    {isAdmin() ? (
                        <>
                            <Link to="/admin/spaces" className="nav-link">
                                Dashboard Espacios
                            </Link>
                            <Link to="/admin/dashboard" className="nav-link">
                                Dashboard Admin
                            </Link>
                            <Link to="/search" className="nav-link">
                                Buscar Espacios
                            </Link>
                            <Link to="/my-bookings" className="nav-link">
                                Mis Reservas
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/admin/spaces" className="nav-link">
                                Dashboard Espacios
                            </Link>
                            <Link to="/search" className="nav-link">
                                Buscar Espacios
                            </Link>
                            <Link to="/my-bookings" className="nav-link">
                                Mis Reservas
                            </Link>
                        </>
                    )}

                    <div className="navbar-user">
                        <span className="user-info">
                            {user?.email}
                            <span className="user-role">({user?.role})</span>
                        </span>
                        <button onClick={handleLogout} className="btn btn-logout">
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
