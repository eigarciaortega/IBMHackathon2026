export default function TransactionHistory({ transactions, accountId }) {
  return (
    <div className="panel">
      <h2>Historial de transacciones</h2>
      {!accountId && <p className="muted">Selecciona una cuenta para ver su historial.</p>}
      {accountId && transactions.length === 0 && <p className="muted">Sin transacciones todavía.</p>}
      {transactions.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Monto</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} title={tx.error_message || ""}>
                <td>{tx.type}</td>
                <td>
                  <span className={`status-badge status-${tx.status.toLowerCase()}`}>{tx.status}</span>
                </td>
                <td>{tx.amount}</td>
                <td>{tx.from_account_id ? tx.from_account_id.slice(0, 8) : "—"}</td>
                <td>{tx.to_account_id.slice(0, 8)}</td>
                <td>{new Date(tx.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
