import { useState } from "react";

export default function RechargeForm({ accountId, onRecharge }) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const tx = await onRecharge({ account_id: accountId, amount: Number(amount) });
      setResult(tx);
      setAmount("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Recargar saldo</h2>
      <label>
        Monto
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <button type="submit" disabled={submitting || !accountId}>
        {submitting ? "Procesando..." : "Recargar"}
      </button>
      {!accountId && <p className="muted">Selecciona una cuenta primero.</p>}
      {result && (
        <p className={`status-badge status-${result.status.toLowerCase()}`}>
          Transacción {result.status} ({result.id.slice(0, 8)})
        </p>
      )}
    </form>
  );
}
