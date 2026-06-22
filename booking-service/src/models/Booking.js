const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'beespace',
  user: process.env.DB_USER || 'beespace_user',
  password: process.env.DB_PASSWORD || 'beespace_pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3001';

class Booking {
  static async findAll(filters = {}) {
    const { user_id, space_id, status, start_date, end_date } = filters;
    
    let query = `
      SELECT b.*,
             u.name as user_name,
             u.email as user_email
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND b.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    if (space_id) {
      query += ` AND b.space_id = $${paramCount}`;
      params.push(space_id);
      paramCount++;
    }

    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (start_date) {
      query += ` AND b.start_time >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND b.end_time <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT b.*,
             u.name as user_name,
             u.email as user_email,
             u.phone as user_phone
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(bookingData) {
    const {
      space_id,
      user_id,
      start_time,
      end_time,
      attendees,
      purpose,
      special_requirements
    } = bookingData;

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    if (startDate < new Date()) {
      throw new Error('La fecha de inicio no puede ser en el pasado');
    }

    try {
      const availabilityResponse = await axios.get(
        `${CATALOG_SERVICE_URL}/api/spaces/${space_id}/availability`,
        {
          params: {
            start_time: start_time,
            end_time: end_time
          }
        }
      );

      if (!availabilityResponse.data.data.available) {
        throw new Error('El espacio no está disponible en el horario seleccionado');
      }
    } catch (error) {
      if (error.response) {
        throw new Error('Error al verificar disponibilidad del espacio');
      }
      throw error;
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const spaceQuery = await axios.get(`${CATALOG_SERVICE_URL}/api/spaces/${space_id}`);
      const space = spaceQuery.data.data;

      if (!space) {
        throw new Error('Espacio no encontrado');
      }

      if (attendees > space.capacity) {
        throw new Error(`El número de asistentes (${attendees}) excede la capacidad del espacio (${space.capacity})`);
      }

      const hours = (endDate - startDate) / (1000 * 60 * 60);
      const total_price = hours * space.price_per_hour;

      const insertQuery = `
        INSERT INTO bookings (
          space_id, user_id, start_time, end_time, attendees,
          purpose, special_requirements, total_price, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        space_id, user_id, start_time, end_time, attendees,
        purpose, special_requirements, total_price
      ]);

      await client.query('COMMIT');
      return await Booking.findById(result.rows[0].id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, bookingData) {
    const existingBooking = await Booking.findById(id);
    
    if (!existingBooking) {
      throw new Error('Reserva no encontrada');
    }

    if (existingBooking.status === 'cancelled') {
      throw new Error('No se puede modificar una reserva cancelada');
    }

    if (existingBooking.status === 'completed') {
      throw new Error('No se puede modificar una reserva completada');
    }

    const {
      start_time,
      end_time,
      attendees,
      purpose,
      special_requirements,
      status
    } = bookingData;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramCount = 1;

      if (start_time !== undefined || end_time !== undefined) {
        const newStartTime = start_time || existingBooking.start_time;
        const newEndTime = end_time || existingBooking.end_time;

        const startDate = new Date(newStartTime);
        const endDate = new Date(newEndTime);

        if (startDate >= endDate) {
          throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
        }

        if (startDate < new Date()) {
          throw new Error('La fecha de inicio no puede ser en el pasado');
        }

        const availabilityResponse = await axios.get(
          `${CATALOG_SERVICE_URL}/api/spaces/${existingBooking.space_id}/availability`,
          {
            params: {
              start_time: newStartTime,
              end_time: newEndTime
            }
          }
        );

        const checkQuery = `
          SELECT COUNT(*) as count
          FROM bookings
          WHERE space_id = $1
            AND id != $2
            AND status IN ('confirmed', 'pending')
            AND (
              (start_time <= $3 AND end_time > $3) OR
              (start_time < $4 AND end_time >= $4) OR
              (start_time >= $3 AND end_time <= $4)
            )
        `;
        
        const checkResult = await client.query(checkQuery, [
          existingBooking.space_id,
          id,
          newStartTime,
          newEndTime
        ]);

        if (parseInt(checkResult.rows[0].count) > 0) {
          throw new Error('El espacio no está disponible en el nuevo horario');
        }

        if (start_time !== undefined) {
          fields.push(`start_time = $${paramCount}`);
          values.push(start_time);
          paramCount++;
        }

        if (end_time !== undefined) {
          fields.push(`end_time = $${paramCount}`);
          values.push(end_time);
          paramCount++;
        }

        const spaceQuery = await axios.get(`${CATALOG_SERVICE_URL}/api/spaces/${existingBooking.space_id}`);
        const space = spaceQuery.data.data;
        
        const hours = (endDate - startDate) / (1000 * 60 * 60);
        const total_price = hours * space.price_per_hour;

        fields.push(`total_price = $${paramCount}`);
        values.push(total_price);
        paramCount++;
      }

      if (attendees !== undefined) {
        const spaceQuery = await axios.get(`${CATALOG_SERVICE_URL}/api/spaces/${existingBooking.space_id}`);
        const space = spaceQuery.data.data;

        if (attendees > space.capacity) {
          throw new Error(`El número de asistentes (${attendees}) excede la capacidad del espacio (${space.capacity})`);
        }

        fields.push(`attendees = $${paramCount}`);
        values.push(attendees);
        paramCount++;
      }

      if (purpose !== undefined) {
        fields.push(`purpose = $${paramCount}`);
        values.push(purpose);
        paramCount++;
      }

      if (special_requirements !== undefined) {
        fields.push(`special_requirements = $${paramCount}`);
        values.push(special_requirements);
        paramCount++;
      }

      if (status !== undefined) {
        fields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (fields.length > 0) {
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const updateQuery = `
          UPDATE bookings 
          SET ${fields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        await client.query(updateQuery, values);
      }

      await client.query('COMMIT');
      return await Booking.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async cancel(id) {
    const booking = await Booking.findById(id);
    
    if (!booking) {
      throw new Error('Reserva no encontrada');
    }

    if (booking.status === 'cancelled') {
      throw new Error('La reserva ya está cancelada');
    }

    if (booking.status === 'completed') {
      throw new Error('No se puede cancelar una reserva completada');
    }

    const query = `
      UPDATE bookings 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    return await Booking.findById(id);
  }

  static async getStatistics(userId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0) as total_spent
      FROM bookings
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = Booking;

// Made with Bob
