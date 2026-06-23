export default function AccountsList({ accounts, selectedId, onSelect, onRefresh, loading }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Cuentas</h2>
        <button onClick={onRefresh} disabled={loading}>
          ⟳ Refrescar
        </button>
      </div>
      {accounts.length === 0 && <p className="muted">No hay cuentas todavía.</p>}
      <ul className="accounts-list">
        {accounts.map((acc) => (
          <li key={acc.id} className={acc.id === selectedId ? "selected" : ""} onClick={() => onSelect(acc.id)}>
            <div className="account-name">{acc.owner_name}</div>
            <div className="account-email muted">{acc.email}</div>
            <div className="account-balance">
              {acc.balance} {acc.currency}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
