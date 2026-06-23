import { Wallet } from 'lucide-react';
import { UserSelector } from './components/features/UserSelector';
import { BalanceCard } from './components/features/BalanceCard';
import { TransactionHistory } from './components/features/TransactionHistory';
import { ThemeToggle, QuickActions, HealthStatus } from './components/common';
import { useApp } from './contexts/AppContext';

function App() {
  const { currentUser, loading } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  NeoWallet
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  P2P Payment System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <UserSelector />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !currentUser ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading dashboard...
              </p>
            </div>
          </div>
        ) : currentUser ? (
          <div className="space-y-6">
            {/* Top Section: Balance and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <BalanceCard />
              </div>
              <div className="space-y-6">
                <QuickActions />
                <HealthStatus />
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Transaction History
              </h2>
              <TransactionHistory />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to NeoWallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please select a user to get started
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              NeoWallet - IBM Hackathon 2026 Escenario 2
            </p>
            <p className="mt-1">
              Built with React, TypeScript, TailwindCSS & NestJS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

// Made with Bob
