import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import MessageBox from "../components/MessageBox";
import {
  cancelBooking,
  getAllBookings,
  getMyBookings,
  getMyDashboard,
} from "../services/bookingService";
import { getUser } from "../utils/authStorage";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const user = getUser();
  const isAdmin = user?.role === "ADMINISTRADOR";

  async function loadData() {
    const currentUser = getUser();

    if (currentUser?.role === "ADMINISTRADOR") {
      const bookingsData = await getAllBookings();

      setBookings(bookingsData);

      setDashboard({
        totalMyBookings: bookingsData.length,
        activeMyBookings: bookingsData.filter(
          (booking) => booking.status === "ACTIVA"
        ).length,
        cancelledMyBookings: bookingsData.filter(
          (booking) => booking.status === "CANCELADA"
        ).length,
        finishedMyBookings: bookingsData.filter(
          (booking) => booking.status === "FINALIZADA"
        ).length,
      });

      return;
    }

    const [bookingsData, dashboardData] = await Promise.all([
      getMyBookings(),
      getMyDashboard(),
    ]);

    setBookings(bookingsData);
    setDashboard(dashboardData);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  async function handleCancel(id) {
    setMessage("");
    setError("");

    try {
      await cancelBooking(id);
      setMessage("Reserva cancelada correctamente");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Navbar />

      <main className="container">
        <h1>{isAdmin ? "Todas las reservas" : "Mis reservas"}</h1>

        {dashboard && (
          <section className="stats">
            <div>Total: {dashboard.totalMyBookings}</div>
            <div>Activas: {dashboard.activeMyBookings}</div>
            <div>Canceladas: {dashboard.cancelledMyBookings}</div>
            <div>Finalizadas: {dashboard.finishedMyBookings}</div>
          </section>
        )}

        <MessageBox type="success" message={message} />
        <MessageBox type="error" message={error} />

        <table>
          <thead>
            <tr>
              <th>ID</th>
              {isAdmin && <th>Usuario</th>}
              <th>Espacio</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Asistentes</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7}>
                  No hay reservas para mostrar.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>

                  {isAdmin && <td>{booking.userEmail}</td>}

                  <td>{booking.spaceName}</td>
                  <td>{booking.date}</td>
                  <td>
                    {booking.startTime} - {booking.endTime}
                  </td>
                  <td>{booking.attendees}</td>
                  <td>{booking.status}</td>
                  <td>
                    {booking.status === "ACTIVA" ? (
                      <button onClick={() => handleCancel(booking.id)}>
                        Cancelar
                      </button>
                    ) : (
                      "Sin acción"
                    )}
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