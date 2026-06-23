import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  warning: (m: string) => void;
  info: (m: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const STYLES: Record<ToastType, { ring: string; icon: ReactNode; bar: string }> = {
  success: { ring: 'ring-mint-500/30', bar: 'bg-mint-500', icon: '✓' },
  error: { ring: 'ring-rose-500/30', bar: 'bg-rose-500', icon: '!' },
  warning: { ring: 'ring-amber-500/30', bar: 'bg-amber-500', icon: '!' },
  info: { ring: 'ring-teal-500/30', bar: 'bg-teal-500', icon: 'i' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
  }, []);

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    warning: (m) => toast(m, 'warning'),
    info: (m) => toast(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const s = STYLES[toast.type];
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 overflow-hidden rounded-2xl border border-white/40 bg-white/90 p-3 pr-4 shadow-lift ring-1 backdrop-blur-xl ${s.ring}`}
      role="status"
    >
      <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${s.bar}`}>
        {s.icon}
      </span>
      <p className="flex-1 py-0.5 text-sm text-graphite-800">{toast.message}</p>
      <button onClick={onClose} className="text-graphite-400 hover:text-graphite-700" aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
