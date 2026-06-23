import { useCallback, useEffect, useState } from "react";
import { accountsApi, processorApi } from "./api";
import AccountsList from "./components/AccountsList";
import CreateAccountForm from "./components/CreateAccountForm";
import ErrorBanner from "./components/ErrorBanner";
import RechargeForm from "./components/RechargeForm";
import TransactionHistory from "./components/TransactionHistory";
import TransferForm from "./components/TransferForm";

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = useCallback((err) => {
    setError(err.message || "Ocurrió un error inesperado");
  }, []);

  const refreshAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await accountsApi.list();
      setAccounts(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const refreshTransactions = useCallback(
    async (accountId) => {
      if (!accountId) {
        setTransactions([]);
        return;
      }
      try {
        const data = await processorApi.getAccountTransactions(accountId);
        setTransactions(data);
      } catch (err) {
        handleError(err);
      }
    },
    [handleError]
  );

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    refreshTransactions(selectedId);
  }, [selectedId, refreshTransactions]);

  async function handleCreateAccount(payload) {
    try {
      await accountsApi.create(payload);
      await refreshAccounts();
    } catch (err) {
      handleError(err);
      throw err;
    }
  }

  async function handleRecharge(payload) {
    try {
      const tx = await processorApi.recharge(payload);
      await refreshAccounts();
      await refreshTransactions(selectedId);
      return tx;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }

  async function handleTransfer(payload) {
    try {
      const tx = await processorApi.transfer(payload);
      await refreshAccounts();
      await refreshTransactions(selectedId);
      return tx;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }

  const selectedAccount = accounts.find((a) => a.id === selectedId) || null;

  return (
    <div className="app">
      <header>
        <h1>Fintech P2P — Panel de pruebas</h1>
      </header>
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <div className="layout">
        <aside>
          <AccountsList accounts={accounts} selectedId={selectedId} onSelect={setSelectedId} onRefresh={refreshAccounts} loading={loading} />
          <CreateAccountForm onCreate={handleCreateAccount} />
        </aside>
        <main>
          {selectedAccount && (
            <div className="panel selected-summary">
              <h2>{selectedAccount.owner_name}</h2>
              <p>
                Saldo actual: <strong>{selectedAccount.balance} {selectedAccount.currency}</strong>
              </p>
            </div>
          )}
          <div className="forms-row">
            <RechargeForm accountId={selectedId} onRecharge={handleRecharge} />
            <TransferForm accounts={accounts} fromAccountId={selectedId} onTransfer={handleTransfer} />
          </div>
          <TransactionHistory transactions={transactions} accountId={selectedId} />
        </main>
      </div>
    </div>
  );
}
