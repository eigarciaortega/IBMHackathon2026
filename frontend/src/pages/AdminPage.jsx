import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import MessageBox from "../components/MessageBox";
import {
  createSpace,
  deactivateSpace,
  getSpaces,
  updateSpace,
} from "../services/catalogService";
import {
  getAdminDashboard,
  getAllBookings,
} from "../services/bookingService";

export default function AdminPage() {
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [spaceForm, setSpaceForm] = useState({
    name: "",
    type: "SALA_JUNTAS",
    capacity: 1,
    floor: 1,
    location: "",
    hasProjector: false,
    hasAirConditioning: false,
    hasWhiteboard: false,
    hasMonitor: false,
    otherResources: "",
  });

  async function loadData() {
    const [spacesData, bookingsData, dashboardData] = await Promise.all([
      getSpaces(),
      getAllBookings(),
      getAdminDashboard(),
    ]);

    setSpaces(spacesData);
    setBookings(bookingsData);
    setDashboard(dashboardData);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setSpaceForm({
      ...spaceForm,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function handleCreateSpace(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await createSpace({
        ...spaceForm,
        capacity: Number(spaceForm.capacity),
        floor: Number(spaceForm.floor),
      });

      setMessage("Espacio creado correctamente");

      setSpaceForm({
        name: "",
        type: "SALA_JUNTAS",
        capacity: 1,
        floor: 1,
        location: "",
        hasProjector: false,
        hasAirConditioning: false,
        hasWhiteboard: false,
        hasMonitor: false,
        otherResources: "",
      });

      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeactivate(id) {
    setMessage("");
    setError("");

    try {
      await deactivateSpace(id);
      setMessage("Espacio desactivado correctamente");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleActivate(space) {
    setMessage("");
    setError("");

    try {
      await updateSpace(space.id, {
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        floor: space.floor,
        location: space.location,
        hasProjector: space.hasProjector,
        hasAirConditioning: space.hasAirConditioning,
        hasWhiteboard: space.hasWhiteboard,
        hasMonitor: space.hasMonitor,
        otherResources: space.otherResources,
        status: "ACTIVO",
      });

      setMessage("Espacio activado correctamente");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar />

      <main className="container">
        <h1>Panel de administración</h1>

        {dashboard && (
          <section className="stats">
            <div>Total hoy: {dashboard.totalBookingsToday}</div>
            <div>Activas hoy: {dashboard.activeBookingsToday}</div>
            <div>Canceladas hoy: {dashboard.cancelledBookingsToday}</div>
            <div>Finalizadas hoy: {dashboard.finishedBookingsToday}</div>
          </section>
        )}

        <MessageBox type="success" message={message} />
        <MessageBox type="error" message={error} />

        <h2>Crear espacio</h2>

        <form className="form-grid" onSubmit={handleCreateSpace}>
          <label>
            Nombre
            <input
              name="name"
              value={spaceForm.name}
              onChange={handleChange}
              placeholder="Ej. Sala Dirección"
              required
            />
          </label>

          <label>
            Tipo
            <select name="type" value={spaceForm.type} onChange={handleChange}>
              <option value="SALA_JUNTAS">Sala de juntas</option>
              <option value="ESCRITORIO_INDIVIDUAL">
                Escritorio individual
              </option>
            </select>
          </label>

          <label>
            Capacidad
            <input
              type="number"
              name="capacity"
              min="1"
              value={spaceForm.capacity}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Piso
            <input
              type="number"
              name="floor"
              value={spaceForm.floor}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Ubicación
            <input
              name="location"
              value={spaceForm.location}
              onChange={handleChange}
              placeholder="Ej. Edificio A - Piso 5"
              required
            />
          </label>

          <label>
            Otros recursos
            <input
              name="otherResources"
              value={spaceForm.otherResources}
              onChange={handleChange}
              placeholder="Ej. Cámara de videoconferencia"
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="hasProjector"
              checked={spaceForm.hasProjector}
              onChange={handleChange}
            />
            Proyector
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="hasAirConditioning"
              checked={spaceForm.hasAirConditioning}
              onChange={handleChange}
            />
            Aire acondicionado
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="hasWhiteboard"
              checked={spaceForm.hasWhiteboard}
              onChange={handleChange}
            />
            Pizarra
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="hasMonitor"
              checked={spaceForm.hasMonitor}
              onChange={handleChange}
            />
            Monitor
          </label>

          <button type="submit">Crear espacio</button>
        </form>

        <h2>Espacios</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Capacidad</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {spaces.length === 0 ? (
              <tr>
                <td colSpan="6">No hay espacios registrados.</td>
              </tr>
            ) : (
              spaces.map((space) => (
                <tr key={space.id}>
                  <td>{space.id}</td>
                  <td>{space.name}</td>
                  <td>
                    {space.type === "SALA_JUNTAS"
                      ? "Sala de juntas"
                      : "Escritorio individual"}
                  </td>
                  <td>{space.capacity}</td>
                  <td>
                    <span className={`status-pill ${space.status}`}>
                      {space.status}
                    </span>
                  </td>
                  <td>
                    {space.status === "ACTIVO" ? (
                      <button onClick={() => handleDeactivate(space.id)}>
                        Desactivar
                      </button>
                    ) : (
                      <button onClick={() => handleActivate(space)}>
                        Activar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <h2>Reservas recientes</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Espacio</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="6">No hay reservas registradas.</td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.userEmail}</td>
                  <td>{booking.spaceName}</td>
                  <td>{booking.date}</td>
                  <td>
                    {booking.startTime} - {booking.endTime}
                  </td>
                  <td>
                    <span className={`status-pill ${booking.status}`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>
    </>
  );
}