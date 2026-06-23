require('dotenv').config();
const jwt = require('jsonwebtoken');

const tokenAdmin = jwt.sign(
  { id: 1, email: 'admin@corporativoalpha.com', perfil: 'ADMINISTRADOR' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

const tokenColaborador = jwt.sign(
  { id: 2, email: 'carlos.mendez@corporativoalpha.com', perfil: 'COLABORADOR' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('TOKEN ADMIN:\n', tokenAdmin);
console.log('\nTOKEN COLABORADOR:\n', tokenColaborador);