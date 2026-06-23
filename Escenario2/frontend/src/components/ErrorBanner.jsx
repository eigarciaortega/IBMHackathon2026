export default function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <span>⚠ {message}</span>
      <button onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}
