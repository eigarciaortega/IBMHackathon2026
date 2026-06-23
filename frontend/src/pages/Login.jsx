import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Por favor complete todos los campos');
            return;
        }

        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            // Redirigir según el rol
            if (isAdmin()) {
                navigate('/admin/dashboard');
            } else {
                navigate('/search');
            }
        } else {
            setError(result.message || 'Credenciales inválidas');
        }

        setLoading(false);
    };

    const fillCredentials = (userType) => {
        if (userType === 'admin') {
            setEmail('admin@corporativoalpha.com');
            setPassword('Admin123');
        } else if (userType === 'carlos') {
            setEmail('carlos.mendez@corporativoalpha.com');
            setPassword('User123');
        } else if (userType === 'ana') {
            setEmail('ana.torres@corporativoalpha.com');
            setPassword('User123');
        }
        setError('');
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <h1>Sistema de Reservas</h1>
                    <p>Corporativo Alpha</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Usuario (Email)</label>
                        <input
                            id="email"
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@corporativoalpha.com"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ingrese su contraseña"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="test-users">
                    <p className="test-users-title">Usuarios de prueba:</p>
                    <div className="test-users-buttons">
                        <button
                            onClick={() => fillCredentials('admin')}
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                        >
                            Admin
                        </button>
                        <button
                            onClick={() => fillCredentials('carlos')}
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                        >
                            Carlos
                        </button>
                        <button
                            onClick={() => fillCredentials('ana')}
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                        >
                            Ana
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
