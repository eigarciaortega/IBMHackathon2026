export default function MessageBox({ type = "info", message }) {
  if (!message) return null;

  const iconByType = {
    success: "✓",
    error: "!",
    info: "i",
  };

  return (
    <div className={`message ${type}`}>
      <span style={{ marginRight: "8px" }}>{iconByType[type] || "i"}</span>
      {message}
    </div>
  );
}