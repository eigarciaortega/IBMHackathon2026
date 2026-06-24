export default function SpaceCard({ space, onReserve }) {
  return (
    <div className="card">
      <h3>{space.name}</h3>
      <p><strong>Tipo:</strong> {space.type}</p>
      <p><strong>Capacidad:</strong> {space.capacity}</p>
      <p><strong>Piso:</strong> {space.floor}</p>
      <p><strong>Ubicación:</strong> {space.location}</p>
      <p><strong>Estado:</strong> {space.status}</p>

      <div className="resources">
        {space.hasProjector && <span>Proyector</span>}
        {space.hasAirConditioning && <span>Aire acondicionado</span>}
        {space.hasWhiteboard && <span>Pizarra</span>}
        {space.hasMonitor && <span>Monitor</span>}
      </div>

      {onReserve && (
        <button onClick={() => onReserve(space)}>
          Reservar
        </button>
      )}
    </div>
  );
}