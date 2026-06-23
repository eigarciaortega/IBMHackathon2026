import { useState } from "react";

export default function TransferForm({ accounts, fromAccountId, onTransfer }) {
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const otherAccounts = accounts.filter((a) => a.id !== fromAccountId);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const tx = await onTransfer({ from_account_id: fromAccountId, to_account_id: toAccountId, amount: Number(amount) });
      setResult(tx);
      setAmount("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Transferir (P2P)</h2>
      <label>
        Cuenta destino
        <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
          <option value="" disabled>
            Selecciona destino
          </option>
          {otherAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.owner_name} ({acc.email})
            </option>
          ))}
        </select>
      </label>
      <label>
        Monto
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <button type="submit" disabled={submitting || !fromAccountId || !toAccountId}>
        {submitting ? "Procesando..." : "Transferir"}
      </button>
      {!fromAccountId && <p className="muted">Selecciona una cuenta origen primero.</p>}
      {result && (
        <p className={`status-badge status-${result.status.toLowerCase()}`}>
          Transacción {result.status} ({result.id.slice(0, 8)})
          {result.error_message && <span className="error-detail"> — {result.error_message}</span>}
        </p>
      )}
    </form>
  );
}
