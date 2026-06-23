import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    // 1. Prueba de Lectura: 100 VUs pidiendo el saldo a la vez
    lectura_saldo: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5s',
      exec: 'consultarSaldo',
    },
    // 2. Prueba de Escritura aislada: Espera a que acabe la lectura y lanza transferencias
    transferencias: {
      executor: 'constant-vus',
      vus: 50, // Concurrencia realista para transacciones locales
      duration: '5s',
      startTime: '6s', // Inicia después de la prueba de lectura
      exec: 'hacerTransferencia',
    }
  },
  summaryTrendStats: ['avg', 'p(95)'], // Mostrar solo lo que piden los jueces
};

const params = { headers: { 'Content-Type': 'application/json' } };

export function consultarSaldo() {
  http.get('http://localhost:3010/accounts/1');
  sleep(1);
}

export function hacerTransferencia() {
  const transferPayload = JSON.stringify({ 
      sender_id: 1, 
      receiver_id: 2, 
      amount: 0.10 
  });
  http.post('http://localhost:3011/api/transfer', transferPayload, params);
  sleep(1);
}