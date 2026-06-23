// Script para probar la conexión y consulta directa a la BD
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testLogin() {
  try {
    console.log('🔍 Probando conexión a BD...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    const email = 'admin@corporativoalpha.com';
    const contrasena = 'Admin123';
    
    console.log('\n📧 Buscando usuario:', email);
    console.log('🔑 Con contraseña:', contrasena);
    
    const result = await pool.query(
      `SELECT id, email, nombre, perfil, contrasena FROM usuarios 
       WHERE email = $1 AND contrasena = $2`,
      [email, contrasena]
    );
    
    console.log('\n✅ Resultado de la consulta:');
    console.log('Filas encontradas:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('Usuario encontrado:', result.rows[0]);
    } else {
      console.log('❌ No se encontró el usuario con esas credenciales');
      
      // Verificar si el email existe
      const emailCheck = await pool.query(
        'SELECT email, contrasena FROM usuarios WHERE email = $1',
        [email]
      );
      
      if (emailCheck.rows.length > 0) {
        console.log('\n⚠️ El email existe pero la contraseña no coincide');
        console.log('Contraseña en BD:', emailCheck.rows[0].contrasena);
        console.log('Contraseña enviada:', contrasena);
        console.log('¿Son iguales?', emailCheck.rows[0].contrasena === contrasena);
      } else {
        console.log('\n❌ El email no existe en la base de datos');
      }
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testLogin();

// Made with Bob
