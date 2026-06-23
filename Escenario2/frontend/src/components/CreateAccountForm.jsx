import { useState } from "react";

export default function CreateAccountForm({ onCreate }) {
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({ owner_name: ownerName, email, initial_balance: Number(initialBalance) || 0 });
      setOwnerName("");
      setEmail("");
      setInitialBalance("0");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Nueva cuenta</h2>
      <label>
        Nombre
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Saldo inicial
        <input type="number" min="0" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}
