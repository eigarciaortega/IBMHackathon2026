import { Injectable, Logger } from '@nestjs/common';
import { AssistantContextDto } from '../dto/assistant.dto';

type Role = 'ADMIN' | 'COLLABORATOR';

export interface AssistantSuggestion {
  label: string;
  message: string;
}
export interface AssistantAction {
  type: 'NAVIGATE' | 'NONE';
  target?: string;
}
export interface AssistantReply {
  answer: string;
  suggestions: AssistantSuggestion[];
  action?: AssistantAction;
  engine: 'local' | 'watson';
}

/** Normaliza texto: minúsculas, sin acentos, sin signos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUGGESTIONS: Record<Role, AssistantSuggestion[]> = {
  ADMIN: [
    { label: 'Ver ocupación de hoy', message: 'ver ocupacion de hoy' },
    { label: 'Aprobar recurrentes', message: 'aprobar reservas recurrentes' },
    { label: 'Liberar una sala', message: 'como liberar una sala' },
    { label: 'Gestionar espacios', message: 'gestionar espacios' },
    { label: 'Ver auditoría', message: 'ver auditoria' },
  ],
  COLLABORATOR: [
    { label: 'Reservar ahora', message: 'quiero reservar' },
    { label: 'Ver mis reservas', message: 'ver mis reservas' },
    { label: 'Buscar sala disponible', message: 'ver salas disponibles' },
    { label: 'Agregar reserva a Google Calendar', message: 'como agregar reserva a google calendar' },
    { label: 'Solicitar reserva recurrente', message: 'como solicitar reserva recurrente' },
  ],
};

interface Intent {
  keys: string[];
  answer: string;
  action?: AssistantAction;
  roles?: Role[]; // si se define, solo aplica a esos roles
}

/**
 * Motor local rule-based (sin IA, sin red). Cada intención se reconoce por
 * palabras clave normalizadas. El orden importa: la primera coincidencia gana.
 */
const INTENTS: Intent[] = [
  {
    keys: ['hola', 'buenos dias', 'buenas', 'ayuda', 'que puedes hacer', 'menu'],
    answer:
      'Hola, soy OfficeSpace Assistant. Puedo ayudarte a reservar salas, revisar disponibilidad o entender tus notificaciones. ¿Qué te gustaría hacer?',
  },
  {
    keys: ['ocupacion de hoy', 'ocupacion hoy', 'ver ocupacion', 'tablero', 'dashboard', 'metricas'],
    answer: 'Aquí tienes el panel de ocupación con disponibilidad, uso de salas y asistencia en tiempo real.',
    action: { type: 'NAVIGATE', target: '/dashboard' },
  },
  {
    keys: ['gestionar espacios', 'administrar espacios', 'crear espacio', 'editar espacio', 'nueva sala', 'gestionar salas'],
    answer: 'Puedes administrar las salas (crear, editar, estado y recursos) desde la sección de Espacios.',
    action: { type: 'NAVIGATE', target: '/spaces' },
    roles: ['ADMIN'],
  },
  {
    keys: ['aprobar', 'recurrentes pendientes', 'solicitudes pendientes', 'pending_approval', 'pendientes de aprobacion'],
    answer:
      'Las solicitudes recurrentes en PENDING_APPROVAL esperan tu revisión. Ábrelas en Reservas (Admin) y usa Aprobar o Rechazar.',
    action: { type: 'NAVIGATE', target: '/admin/bookings' },
    roles: ['ADMIN'],
  },
  {
    keys: ['auditoria', 'logs', 'bitacora', 'registro de actividad'],
    answer: 'La auditoría registra cada acción del sistema. Revísala en la sección Auditoría.',
    action: { type: 'NAVIGATE', target: '/admin/audit' },
    roles: ['ADMIN'],
  },
  {
    keys: ['liberar', 'liberar espacio', 'liberar sala', 'soltar sala'],
    answer:
      'Para liberar un espacio anticipadamente, abre Reservas (Admin), busca la reserva CONFIRMED futura y pulsa "Liberar espacio". La reserva se cancela y el horario queda disponible; el colaborador es notificado.',
    action: { type: 'NAVIGATE', target: '/admin/bookings' },
    roles: ['ADMIN'],
  },
  {
    keys: ['reservar', 'quiero reservar', 'hacer una reserva', 'nueva reserva', 'reservar sala', 'reservar espacio'],
    answer: 'Claro, puedes iniciar una reserva seleccionando un espacio disponible.',
    action: { type: 'NAVIGATE', target: '/spaces' },
  },
  {
    keys: ['salas disponibles', 'espacios disponibles', 'ver disponibilidad', 'disponibilidad', 'buscar sala', 'que salas hay'],
    answer:
      'En Espacios puedes filtrar por tipo, capacidad y zona, y ver qué salas están disponibles para reservar.',
    action: { type: 'NAVIGATE', target: '/spaces' },
  },
  {
    keys: ['mis reservas', 'ver mis reservas', 'mis reservaciones'],
    answer: 'Aquí están tus reservas y su estado.',
    action: { type: 'NAVIGATE', target: '/my-bookings' },
  },
  {
    keys: ['cancelar', 'como cancelo', 'anular reserva'],
    answer:
      'Para cancelar, ve a Mis Reservas, ubica la reserva CONFIRMED y pulsa "Cancelar". Solo puedes cancelar reservas que aún no han finalizado.',
    action: { type: 'NAVIGATE', target: '/my-bookings' },
  },
  {
    keys: ['recurrente', 'solicitar recurrente', 'reserva recurrente', 'repetir reserva'],
    answer:
      'Al reservar, activa la opción "Reserva recurrente" e indica el rango de fechas y la frecuencia (diaria, semanal o mensual). La solicitud queda en PENDING_APPROVAL hasta que un administrador la apruebe.',
    action: { type: 'NAVIGATE', target: '/spaces' },
  },
  {
    keys: ['google calendar', 'calendario', 'agregar a calendar', 'exportar reserva', 'ics'],
    answer:
      'Desde Mis Reservas, en cada reserva CONFIRMED o ATTENDED puedes usar "Agregar a Google Calendar" (abre Google con el evento prellenado) o "Descargar .ics" para importarlo a cualquier calendario. No requiere credenciales.',
    action: { type: 'NAVIGATE', target: '/my-bookings' },
  },
  {
    keys: ['attended', 'asistio', 'asistencia verificada', 'que significa attended', 'verificar asistencia'],
    answer:
      'ATTENDED significa que un administrador verificó que la reserva se utilizó. Es un estado final: la reserva ya terminó y se contabiliza como asistencia confirmada.',
  },
  {
    keys: ['no_show', 'no show', 'no asistio', 'no se presento', 'que significa no_show'],
    answer:
      'NO_SHOW indica que la reserva finalizó sin que el administrador confirmara asistencia (nadie se presentó). No ocupa el espacio y queda registrado para métricas.',
  },
  {
    keys: ['pending_approval', 'pendiente de aprobacion', 'que significa pending', 'esperando aprobacion'],
    answer:
      'PENDING_APPROVAL es una solicitud (normalmente recurrente) que espera la aprobación de un administrador. No ocupa el espacio hasta que se aprueba y pasa a CONFIRMED.',
  },
  {
    keys: ['como funciona la asistencia', 'control de asistencia', 'asistencia'],
    answer:
      'Cuando una reserva CONFIRMED finaliza, el administrador la verifica: "Asistió" la marca como ATTENDED, "No asistió" la marca como NO_SHOW. Esto alimenta las métricas de asistencia del dashboard.',
  },
  {
    keys: ['notificaciones', 'ver notificaciones', 'avisos', 'alertas'],
    answer: 'Tus notificaciones (aprobaciones, cancelaciones, liberaciones) están en la sección Notificaciones.',
    action: { type: 'NAVIGATE', target: '/notifications' },
  },
  {
    keys: ['contactar administrador', 'hablar con admin', 'soporte', 'contacto'],
    answer:
      'Para temas que requieren intervención (cambios de estado de salas, aprobaciones, accesos), contacta a tu administrador desde Notificaciones o por el canal interno de tu organización.',
  },
  {
    keys: ['como reservar', 'como hago una reserva', 'pasos para reservar'],
    answer:
      'Reservar es sencillo: 1) entra a Espacios, 2) elige una sala disponible (verás su capacidad máxima), 3) selecciona fecha y un horario sugerido, 4) confirma. ¡Listo!',
    action: { type: 'NAVIGATE', target: '/spaces' },
  },
];

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  /** Indica si IBM Watson Assistant está configurado por variables de entorno. */
  private watsonConfigured(): boolean {
    return Boolean(
      process.env.IBM_WATSON_ASSISTANT_API_KEY &&
        process.env.IBM_WATSON_ASSISTANT_URL &&
        process.env.IBM_WATSON_ASSISTANT_ID,
    );
  }

  async reply(message: string, ctx: AssistantContextDto, jwtRole?: Role): Promise<AssistantReply> {
    const role: Role = (ctx?.role ?? jwtRole ?? 'COLLABORATOR') as Role;

    // 1) Si IBM Watson está configurado, intentarlo; si falla, caer a local.
    if (this.watsonConfigured()) {
      try {
        const watson = await this.askWatson(message, role);
        if (watson) return watson;
      } catch (error) {
        this.logger.warn(
          `IBM Watson Assistant falló; usando motor local. ${error instanceof Error ? error.message : ''}`,
        );
      }
    }

    // 2) Motor local rule-based.
    return this.localReply(message, role);
  }

  private localReply(message: string, role: Role): AssistantReply {
    const text = norm(message);
    const suggestions = SUGGESTIONS[role];

    for (const intent of INTENTS) {
      if (intent.roles && !intent.roles.includes(role)) continue;
      if (intent.keys.some((k) => text.includes(k))) {
        return { answer: intent.answer, suggestions, action: intent.action, engine: 'local' };
      }
    }

    // Fallback: no entendió.
    return {
      answer:
        'No tengo una respuesta exacta, pero puedo llevarte a las opciones principales. Elige una de estas acciones rápidas:',
      suggestions,
      action: { type: 'NONE' },
      engine: 'local',
    };
  }

  /**
   * Cliente IBM Watson Assistant v2 (REST, sin SDK) usando fetch nativo.
   * Stateless: usa el endpoint message_stateless. Si la respuesta no trae
   * texto utilizable, devuelve null para que el motor local complete.
   *
   * Documentado en README: se activa solo si existen las variables IBM_*.
   */
  private async askWatson(message: string, role: Role): Promise<AssistantReply | null> {
    const apiKey = process.env.IBM_WATSON_ASSISTANT_API_KEY as string;
    const baseUrl = (process.env.IBM_WATSON_ASSISTANT_URL as string).replace(/\/+$/, '');
    const assistantId = process.env.IBM_WATSON_ASSISTANT_ID as string;
    const version = process.env.IBM_WATSON_ASSISTANT_VERSION ?? '2023-06-15';

    const url = `${baseUrl}/v2/assistants/${assistantId}/message?version=${version}`;
    const auth = Buffer.from(`apikey:${apiKey}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ input: { message_type: 'text', text: message } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Watson HTTP ${res.status}`);

    const data = (await res.json()) as {
      output?: { generic?: { response_type: string; text?: string }[] };
    };
    const texts = (data.output?.generic ?? [])
      .filter((g) => g.response_type === 'text' && g.text)
      .map((g) => g.text as string);
    if (texts.length === 0) return null;

    return {
      answer: texts.join('\n'),
      suggestions: SUGGESTIONS[role],
      action: { type: 'NONE' },
      engine: 'watson',
    };
  }
}
