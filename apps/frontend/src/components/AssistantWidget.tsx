import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { bookingsService, chatbotService, dashboardService } from '../services';
import { AssistantReply, AssistantSuggestion } from '../types';

interface ChatMessage {
  id: number;
  from: 'user' | 'bot';
  text: string;
  suggestions?: AssistantSuggestion[];
  action?: AssistantReply['action'];
}

const WELCOME =
  'Hola, soy OfficeSpace Assistant. Puedo ayudarte a reservar salas, revisar disponibilidad o entender tus notificaciones.';

function defaultSuggestions(isAdmin: boolean): AssistantSuggestion[] {
  return isAdmin
    ? [
        { label: 'Ver ocupación de hoy', message: 'ver ocupacion de hoy' },
        { label: 'Aprobar recurrentes', message: 'aprobar reservas recurrentes' },
        { label: 'Liberar una sala', message: 'como liberar una sala' },
        { label: 'Gestionar espacios', message: 'gestionar espacios' },
        { label: 'Ver auditoría', message: 'ver auditoria' },
      ]
    : [
        { label: 'Reservar ahora', message: 'quiero reservar' },
        { label: 'Ver mis reservas', message: 'ver mis reservas' },
        { label: 'Buscar sala disponible', message: 'ver salas disponibles' },
        { label: 'Agregar a Google Calendar', message: 'como agregar reserva a google calendar' },
        { label: 'Solicitar recurrente', message: 'como solicitar reserva recurrente' },
      ];
}

const AI_ICON = (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
    <path
      d="M12 3a2 2 0 012 2v.5a4.5 4.5 0 013 4.243V14a4 4 0 01-4 4h-2a4 4 0 01-4-4v-4.257A4.5 4.5 0 0110 5.5V5a2 2 0 012-2z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="9.5" cy="11" r="1" fill="currentColor" />
    <circle cx="14.5" cy="11" r="1" fill="currentColor" />
    <path d="M9 21h6M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export function AssistantWidget() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Datos reales (no bloqueantes) para una sugerencia contextual.
  const collabQ = useQuery({
    queryKey: ['assistant', 'collab-spaces'],
    queryFn: dashboardService.collaborator,
    enabled: open && !isAdmin,
    staleTime: 60_000,
  });
  const pendingQ = useQuery({
    queryKey: ['assistant', 'pending'],
    queryFn: bookingsService.pending,
    enabled: open && isAdmin,
    staleTime: 60_000,
  });

  // Mensaje de bienvenida la primera vez que se abre.
  useEffect(() => {
    if (open && messages.length === 0) {
      const extra: string[] = [];
      setMessages([
        {
          id: idRef.current++,
          from: 'bot',
          text: WELCOME,
          suggestions: defaultSuggestions(isAdmin),
        },
      ]);
      void extra;
    }
  }, [open, isAdmin, messages.length]);

  // Sugerencia contextual con datos reales cuando llegan.
  useEffect(() => {
    if (!open) return;
    let hint: string | null = null;
    if (!isAdmin && collabQ.data) {
      hint = `Ahora mismo hay ${collabQ.data.availableSpaces} ${
        collabQ.data.availableSpaces === 1 ? 'sala disponible' : 'salas disponibles'
      }.`;
    } else if (isAdmin && pendingQ.data && pendingQ.data.length > 0) {
      hint = `Tienes ${pendingQ.data.length} ${
        pendingQ.data.length === 1 ? 'solicitud recurrente pendiente' : 'solicitudes recurrentes pendientes'
      } de aprobación.`;
    }
    if (hint) {
      setMessages((prev) =>
        prev.some((m) => m.text === hint)
          ? prev
          : [...prev, { id: idRef.current++, from: 'bot', text: hint as string }],
      );
    }
  }, [open, isAdmin, collabQ.data, pendingQ.data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { id: idRef.current++, from: 'user', text: msg }]);
    setSending(true);
    try {
      const reply = await chatbotService.assistant(msg, {
        role: user?.role,
        currentPage: location.pathname,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: idRef.current++,
          from: 'bot',
          text: reply.answer,
          suggestions: reply.suggestions,
          action: reply.action,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: idRef.current++,
          from: 'bot',
          text: 'No pude conectar con el asistente. Intenta de nuevo o usa el menú lateral.',
          suggestions: defaultSuggestions(isAdmin),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const runAction = (action: AssistantReply['action']) => {
    if (action?.type === 'NAVIGATE' && action.target) {
      navigate(action.target);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir OfficeSpace Assistant"
        className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0b1f3a] to-teal-600 text-white shadow-lift ring-1 ring-white/20 transition-transform hover:scale-105 active:scale-95 ${
          open ? 'rotate-90' : ''
        }`}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          AI_ICON
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex h-[80vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift ring-1 ring-graphite-200 animate-fade-up sm:inset-x-auto sm:bottom-24 sm:right-5 sm:h-[560px] sm:w-[400px] sm:rounded-2xl"
          role="dialog"
          aria-label="OfficeSpace Assistant"
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#0b1f3a] to-teal-700 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
              {AI_ICON}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold">OfficeSpace Assistant</div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> En línea · {isAdmin ? 'Admin' : 'Colaborador'}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="ml-auto rounded-full p-1.5 text-white/80 transition hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-graphite-50 px-3 py-4">
            {messages.map((m) => (
              <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      m.from === 'user'
                        ? 'rounded-br-sm bg-teal-600 text-white'
                        : 'rounded-bl-sm bg-white text-graphite-800 ring-1 ring-graphite-100'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.action?.type === 'NAVIGATE' && m.action.target && (
                    <button onClick={() => runAction(m.action)} className="btn btn-primary btn-sm">
                      Ir a {m.action.target}
                    </button>
                  )}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => void send(s.message)}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20 transition hover:bg-teal-50"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 ring-1 ring-graphite-100">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-graphite-300 [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-graphite-300 [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-graphite-300" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-graphite-100 bg-white p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="input flex-1"
              aria-label="Mensaje"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-40"
              aria-label="Enviar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
