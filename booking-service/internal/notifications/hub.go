// Package notifications implementa la entrega en tiempo real de notificaciones:
// un hub de clientes SSE alimentado por un listener de PostgreSQL (LISTEN/NOTIFY).
package notifications

import "sync"

// Hub mantiene los clientes SSE conectados y les difunde cada notificación.
type Hub struct {
	mu       sync.RWMutex
	clientes map[chan string]struct{}
}

func NewHub() *Hub {
	return &Hub{clientes: make(map[chan string]struct{})}
}

// Suscribir registra un cliente y devuelve su canal y una función para darse de
// baja (idempotente). El canal tiene buffer para tolerar ráfagas cortas.
func (h *Hub) Suscribir() (<-chan string, func()) {
	ch := make(chan string, 16)
	h.mu.Lock()
	h.clientes[ch] = struct{}{}
	h.mu.Unlock()

	var unaVez sync.Once
	cancelar := func() {
		unaVez.Do(func() {
			h.mu.Lock()
			delete(h.clientes, ch)
			close(ch)
			h.mu.Unlock()
		})
	}
	return ch, cancelar
}

// Difundir envía el payload a todos los clientes sin bloquear: si un cliente va
// rezagado y su buffer está lleno, se omite ese mensaje para él.
func (h *Hub) Difundir(payload string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clientes {
		select {
		case ch <- payload:
		default:
		}
	}
}

// Clientes informa cuántos clientes están conectados (diagnóstico).
func (h *Hub) Clientes() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clientes)
}
