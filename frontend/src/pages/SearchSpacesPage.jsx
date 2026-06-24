import { useState } from "react";
import Navbar from "../components/Navbar";
import MessageBox from "../components/MessageBox";
import SpaceCard from "../components/SpaceCard";
import { getAvailableSpaces } from "../services/catalogService";
import { createBooking } from "../services/bookingService";

export default function SearchSpacesPage() {
  const [filters, setFilters] = useState({
    date: "2026-07-01",
    startTime: "09:00",
    endTime: "10:00",
    type: "",
    minCapacity: "1",
  });

  const [spaces, setSpaces] = useState([]);
  const [attendees, setAttendees] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSearch(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const data = await getAvailableSpaces(filters);
      setSpaces(data);
      setMessage(`Se encontraron ${data.length} espacios disponibles`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReserve(space) {
    setMessage("");
    setError("");

    try {
      await createBooking({
        spaceId: space.id,
        date: filters.date,
        startTime: filters.startTime,
        endTime: filters.endTime,
        attendees: Number(attendees),
      });

      setMessage("Reserva creada correctamente");
      await handleSearch(new Event("submit"));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar />

      <main className="container">
        <h1>Buscar espacios disponibles</h1>

        <form className="form-grid" onSubmit={handleSearch}>
          <label>
            Fecha
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleChange}
            />
          </label>

          <label>
            Hora inicio
            <input
              type="time"
              name="startTime"
              value={filters.startTime}
              onChange={handleChange}
            />
          </label>

          <label>
            Hora fin
            <input
              type="time"
              name="endTime"
              value={filters.endTime}
              onChange={handleChange}
            />
          </label>

          <label>
            Tipo
            <select name="type" value={filters.type} onChange={handleChange}>
              <option value="">Todos</option>
              <option value="SALA_JUNTAS">Sala de juntas</option>
              <option value="ESCRITORIO_INDIVIDUAL">Escritorio individual</option>
            </select>
          </label>

          <label>
            Capacidad mínima
            <input
              type="number"
              name="minCapacity"
              min="1"
              value={filters.minCapacity}
              onChange={handleChange}
            />
          </label>

          <label>
            Asistentes
            <input
              type="number"
              min="1"
              value={attendees}
              onChange={(event) => setAttendees(event.target.value)}
            />
          </label>

          <button type="submit">Buscar</button>
        </form>

        <MessageBox type="success" message={message} />
        <MessageBox type="error" message={error} />

        <section className="grid">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onReserve={handleReserve}
            />
          ))}
        </section>
      </main>
    </>
  );
}