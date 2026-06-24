export default function SpaceCard({ space, onReserve }) {
  return (
    <div className="card">
      <h3>{space.name}</h3>

      <p>
        <strong>Tipo:</strong>{" "}
        {space.type === "SALA_JUNTAS" ? "Sala de juntas" : "Escritorio individual"}
      </p>

      <p>
        <strong>Capacidad:</strong> {space.capacity} persona
        {space.capacity === 1 ? "" : "s"}
      </p>

      <p>
        <strong>Piso:</strong> {space.floor}
      </p>

      <p>
        <strong>Ubicación:</strong> {space.location}
      </p>

      <p>
        <strong>Estado:</strong>{" "}
        <span className={`status-pill ${space.status}`}>{space.status}</span>
      </p>

      <div className="resources">
        {space.hasProjector && <span>Proyector</span>}
        {space.hasAirConditioning && <span>Aire acondicionado</span>}
        {space.hasWhiteboard && <span>Pizarra</span>}
        {space.hasMonitor && <span>Monitor</span>}
        {space.otherResources && <span>{space.otherResources}</span>}
      </div>

      {onReserve && (
        <button onClick={() => onReserve(space)}>
          Reservar espacio
        </button>
      )}
    </div>
  );
}