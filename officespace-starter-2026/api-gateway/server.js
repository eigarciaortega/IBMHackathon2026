const express = require('express');
const proxy   = require('express-http-proxy');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// En Docker los servicios se llaman por nombre de contenedor
const AUTH_URL    = process.env.AUTH_URL    || 'http://officespace_auth:3003';
const CATALOG_URL = process.env.CATALOG_URL || 'http://officespace_catalog:3001';
const BOOKING_URL = process.env.BOOKING_URL || 'http://officespace_booking:3002';

app.use('/login',  proxy(AUTH_URL,    { proxyReqPathResolver: () => '/login'  }));
app.use('/verify', proxy(AUTH_URL,    { proxyReqPathResolver: () => '/verify' }));

app.use('/spaces', proxy(CATALOG_URL, {
  proxyReqPathResolver: (req) => `/spaces${req.url === '/' ? '' : req.url}`
}));

app.use('/bookings', proxy(BOOKING_URL, {
  proxyReqPathResolver: (req) => `/bookings${req.url === '/' ? '' : req.url}`
}));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API Gateway corriendo en el puerto ${PORT}`);
  console.log(`  /login     -> ${AUTH_URL}`);
  console.log(`  /spaces    -> ${CATALOG_URL}`);
  console.log(`  /bookings  -> ${BOOKING_URL}`);
});
