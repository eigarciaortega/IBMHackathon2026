import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  cancelBooking,
  createBooking,
  createSpace,
  deleteSpace,
  getMyBookings,
  getSpaces,
  loginRequest,
  updateSpace,
} from "./services/api";

const emptySpaceForm = {
  name: "",
  type: "SALA",
  capacity: 1,
  floorLocation: "",
  hasProjector: false,
  hasAirConditioning: true,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUser(data) {
  return {
    token: data?.token || data?.accessToken || "demo-token",
    email: data?.email || data?.username || data?.userEmail || "",
    role: data?.role || data?.rol || "COLABORADOR",
  };
}

function getSpaceLocation(space) {
  return space.floorLocation || space.floor_location || space.location || "Sin ubicación";
}

function getProjector(space) {
  return Boolean(space.hasProjector ?? space.has_projector);
}

function getAir(space) {
  return Boolean(space.hasAirConditioning ?? space.has_air_conditioning);
}

function typeLabel(type) {
  if (type === "SALA") return "Sala de juntas";
  if (type === "DESK") return "Escritorio individual";
  return "Espacio";
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loginForm, setLoginForm] = useState({
    email: "carlos.mendez@corporativoalpha.com",
    password: "User123",
  });

  const [activeTab, setActiveTab] = useState("search");
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    date: todayISO(),
    startTime: "09:00",
    endTime: "10:00",
    type: "ALL",
    capacity: 1,
  });

  const [selectedSpace, setSelectedSpace] = useState(null);
  const [attendees, setAttendees] = useState(1);

  const [spaceForm, setSpaceForm] = useState(emptySpaceForm);
  const [editingSpaceId, setEditingSpaceId] = useState(null);

  const isAdmin = user?.role === "ADMINISTRADOR";

  useEffect(() => {
    if (user) {
      loadSpaces();
      loadBookings(user.email);
      setActiveTab(user.role === "ADMINISTRADOR" ? "admin" : "search");
    }
  }, [user]);

  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const validType = filters.type === "ALL" || space.type === filters.type;
      const validCapacity = Number(space.capacity) >= Number(filters.capacity);
      const active = space.active !== false;
      return validType && validCapacity && active;
    });
  }, [spaces, filters]);

  async function loadSpaces() {
    try {
      const data = await getSpaces();
      setSpaces(data);
    } catch {
      setMessage({
        type: "error",
        text: "No se pudieron cargar los espacios. Verifica catalog-service en el puerto 8081.",
      });
    }
  }

  async function loadBookings(email) {
    try {
      const data = await getMyBookings(email);
      setBookings(data);
    } catch {
      setBookings([]);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const data = await loginRequest(loginForm.email, loginForm.password);
      const normalizedUser = normalizeUser(data);

      localStorage.setItem("token", normalizedUser.token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));

      setUser(normalizedUser);
      setMessage({ type: "success", text: "Inicio de sesión correcto." });
    } catch {
      setMessage({
        type: "error",
        text: "Credenciales inválidas o booking-service no está disponible.",
      });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setMessage(null);
    setSpaces([]);
    setBookings([]);
  }

  function validateReservation() {
    if (!selectedSpace) return "Selecciona un espacio.";

    const start = new Date(`${filters.date}T${filters.startTime}:00`);
    const end = new Date(`${filters.date}T${filters.endTime}:00`);
    const now = new Date();

    if (start < now) return "No puedes reservar en el pasado.";
    if (end <= start) return "La hora de fin debe ser mayor que la hora de inicio.";
    if (Number(attendees) < 1) return "Debe existir al menos un asistente.";
    if (Number(attendees) > Number(selectedSpace.capacity)) {
      return `La capacidad máxima es ${selectedSpace.capacity}.`;
    }

    return null;
  }

  async function handleConfirmBooking() {
    const error = validateReservation();

    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setLoading(true);

    try {
      await createBooking({
        user,
        space: selectedSpace,
        date: filters.date,
        startTime: filters.startTime,
        endTime: filters.endTime,
        attendees,
      });

      setMessage({ type: "success", text: "Reserva creada correctamente." });
      setSelectedSpace(null);
      await loadBookings(user.email);
    } catch {
      setMessage({
        type: "error",
        text: "No se pudo crear la reserva. Revisa solapamiento, capacidad o endpoint de reservas.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSpace(event) {
    event.preventDefault();

    if (!spaceForm.name.trim() || !spaceForm.floorLocation.trim()) {
      setMessage({ type: "error", text: "Nombre y ubicación son obligatorios." });
      return;
    }

    try {
      if (editingSpaceId) {
        await updateSpace(editingSpaceId, spaceForm);
        setMessage({ type: "success", text: "Espacio actualizado correctamente." });
      } else {
        await createSpace(spaceForm);
        setMessage({ type: "success", text: "Espacio creado correctamente." });
      }

      setSpaceForm(emptySpaceForm);
      setEditingSpaceId(null);
      await loadSpaces();
    } catch {
      setMessage({
        type: "error",
        text: "No se pudo guardar el espacio. Verifica catalog-service.",
      });
    }
  }

  function editSpace(space) {
    setEditingSpaceId(space.id);
    setSpaceForm({
      name: space.name || "",
      type: space.type || "SALA",
      capacity: space.capacity || 1,
      floorLocation: getSpaceLocation(space),
      hasProjector: getProjector(space),
      hasAirConditioning: getAir(space),
    });
    setActiveTab("admin");
  }

  async function handleDeleteSpace(id) {
    if (!confirm("¿Seguro que deseas eliminar este espacio?")) return;

    try {
      await deleteSpace(id);
      setMessage({ type: "success", text: "Espacio eliminado correctamente." });
      await loadSpaces();
    } catch {
      setMessage({
        type: "error",
        text: "No se pudo eliminar. Puede tener reservas asociadas.",
      });
    }
  }

  async function handleCancelBooking(id) {
    if (!confirm("¿Seguro que deseas cancelar esta reserva?")) return;

    try {
      await cancelBooking(id);
      setMessage({ type: "success", text: "Reserva cancelada correctamente." });
      await loadBookings(user.email);
    } catch {
      setMessage({
        type: "error",
        text: "No se pudo cancelar la reserva.",
      });
    }
  }

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand">
            <div className="brand-logo">CA</div>
            <div>
              <h1>Corporativo Alpha</h1>
              <p>Gestión inteligente de espacios híbridos</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="form">
            <label>
              Usuario
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Iniciando..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="demo-box">
            <h3>Usuarios de prueba</h3>
            <p><strong>Admin:</strong> admin@corporativoalpha.com / Admin123</p>
            <p><strong>Colaborador:</strong> carlos.mendez@corporativoalpha.com / User123</p>
          </div>

          {message && <div className={`alert ${message.type}`}>{message.text}</div>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <header className="topbar">
        <div>
          <h1>OfficeSpace</h1>
          <p>
            Sesión: {user.email}
            <span className="role">{user.role}</span>
          </p>
        </div>

        <button className="danger-button" onClick={logout}>
          Cerrar sesión
        </button>
      </header>

      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      <nav className="tabs">
        {isAdmin && (
          <button
            className={activeTab === "admin" ? "active" : ""}
            onClick={() => setActiveTab("admin")}
          >
            Administración
          </button>
        )}

        <button
          className={activeTab === "search" ? "active" : ""}
          onClick={() => setActiveTab("search")}
        >
          Buscar y reservar
        </button>

        <button
          className={activeTab === "bookings" ? "active" : ""}
          onClick={() => {
            setActiveTab("bookings");
            loadBookings(user.email);
          }}
        >
          Mis reservas
        </button>
      </nav>

      {activeTab === "admin" && isAdmin && (
        <section className="layout-two">
          <div className="panel">
            <h2>{editingSpaceId ? "Editar espacio" : "Crear nuevo espacio"}</h2>

            <form className="form" onSubmit={handleSaveSpace}>
              <label>
                Nombre
                <input
                  value={spaceForm.name}
                  onChange={(e) =>
                    setSpaceForm({ ...spaceForm, name: e.target.value })
                  }
                  placeholder="Ej. Sala Creativa"
                />
              </label>

              <label>
                Tipo
                <select
                  value={spaceForm.type}
                  onChange={(e) =>
                    setSpaceForm({ ...spaceForm, type: e.target.value })
                  }
                >
                  <option value="SALA">Sala de juntas</option>
                  <option value="DESK">Escritorio individual</option>
                </select>
              </label>

              <label>
                Capacidad
                <input
                  type="number"
                  min="1"
                  value={spaceForm.capacity}
                  onChange={(e) =>
                    setSpaceForm({ ...spaceForm, capacity: e.target.value })
                  }
                />
              </label>

              <label>
                Ubicación
                <input
                  value={spaceForm.floorLocation}
                  onChange={(e) =>
                    setSpaceForm({ ...spaceForm, floorLocation: e.target.value })
                  }
                  placeholder="Ej. Piso 2 - Ala Norte"
                />
              </label>

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={spaceForm.hasProjector}
                    onChange={(e) =>
                      setSpaceForm({ ...spaceForm, hasProjector: e.target.checked })
                    }
                  />
                  Proyector
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={spaceForm.hasAirConditioning}
                    onChange={(e) =>
                      setSpaceForm({
                        ...spaceForm,
                        hasAirConditioning: e.target.checked,
                      })
                    }
                  />
                  Aire acondicionado
                </label>
              </div>

              <button type="submit">
                {editingSpaceId ? "Actualizar espacio" : "Guardar espacio"}
              </button>
            </form>
          </div>

          <div className="panel">
            <h2>Inventario actual</h2>
            <p className="muted">{spaces.length} espacios registrados</p>

            <div className="cards">
              {spaces.map((space) => (
                <article key={space.id} className="card">
                  <div>
                    <h3>{space.name}</h3>
                    <p>{typeLabel(space.type)} · Capacidad {space.capacity}</p>
                    <p className="muted">{getSpaceLocation(space)}</p>
                  </div>

                  <div className="actions">
                    <button className="secondary" onClick={() => editSpace(space)}>
                      Editar
                    </button>
                    <button className="danger-light" onClick={() => handleDeleteSpace(space.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "search" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Buscar espacios disponibles</h2>
              <p>Filtra por fecha, horario, tipo de espacio y capacidad mínima.</p>
            </div>

            <button className="secondary" onClick={loadSpaces}>
              Actualizar
            </button>
          </div>

          <div className="filters">
            <label>
              Fecha
              <input
                type="date"
                min={todayISO()}
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </label>

            <label>
              Inicio
              <input
                type="time"
                value={filters.startTime}
                onChange={(e) =>
                  setFilters({ ...filters, startTime: e.target.value })
                }
              />
            </label>

            <label>
              Fin
              <input
                type="time"
                value={filters.endTime}
                onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
              />
            </label>

            <label>
              Tipo
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="ALL">Todos</option>
                <option value="SALA">Salas</option>
                <option value="DESK">Escritorios</option>
              </select>
            </label>

            <label>
              Capacidad mínima
              <input
                type="number"
                min="1"
                value={filters.capacity}
                onChange={(e) =>
                  setFilters({ ...filters, capacity: e.target.value })
                }
              />
            </label>
          </div>

          <div className="cards">
            {filteredSpaces.map((space) => (
              <article key={space.id} className="card">
                <div>
                  <h3>{space.name}</h3>
                  <p>{typeLabel(space.type)}</p>
                  <p>Capacidad: {space.capacity}</p>
                  <p className="muted">{getSpaceLocation(space)}</p>

                  <div className="badges">
                    {getProjector(space) && <span>Proyector</span>}
                    {getAir(space) && <span>Aire acondicionado</span>}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedSpace(space);
                    setAttendees(Math.min(Number(filters.capacity), Number(space.capacity)));
                  }}
                >
                  Reservar
                </button>
              </article>
            ))}

            {filteredSpaces.length === 0 && (
              <p className="empty">No hay espacios que coincidan con los filtros.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === "bookings" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Mis reservas</h2>
              <p>Consulta tu historial y cancela reservas futuras.</p>
            </div>

            <button className="secondary" onClick={() => loadBookings(user.email)}>
              Actualizar
            </button>
          </div>

          <div className="cards">
            {bookings.map((booking) => (
              <article key={booking.id} className="card">
                <div>
                  <h3>{booking.spaceName || booking.space?.name || `Reserva #${booking.id}`}</h3>
                  <p>Inicio: {booking.startTime || booking.start_time || booking.start}</p>
                  <p>Fin: {booking.endTime || booking.end_time || booking.end}</p>
                  <p>Asistentes: {booking.attendees}</p>
                  <p className="muted">Estado: {booking.status || "ACTIVA"}</p>
                </div>

                <button className="danger-light" onClick={() => handleCancelBooking(booking.id)}>
                  Cancelar
                </button>
              </article>
            ))}

            {bookings.length === 0 && (
              <p className="empty">Aún no tienes reservas registradas.</p>
            )}
          </div>
        </section>
      )}

      {selectedSpace && (
        <div className="modal-backdrop">
          <section className="modal">
            <h2>Confirmar reserva</h2>

            <p><strong>Espacio:</strong> {selectedSpace.name}</p>
            <p><strong>Fecha:</strong> {filters.date}</p>
            <p><strong>Horario:</strong> {filters.startTime} - {filters.endTime}</p>
            <p><strong>Capacidad máxima:</strong> {selectedSpace.capacity}</p>

            <label>
              Número de asistentes
              <input
                type="number"
                min="1"
                max={selectedSpace.capacity}
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
              />
            </label>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setSelectedSpace(null)}>
                Cancelar
              </button>

              <button disabled={loading} onClick={handleConfirmBooking}>
                {loading ? "Reservando..." : "Confirmar reserva"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}