const { Pool } = require('pg');

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

class Space {
  static async findAll(filters = {}) {
    const { city, capacity, priceMin, priceMax, amenities, available } = filters;
    
    let query = `
      SELECT s.*, 
             COALESCE(json_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '[]') as amenities,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(DISTINCT r.id) as review_count
      FROM spaces s
      LEFT JOIN space_amenities sa ON s.id = sa.space_id
      LEFT JOIN amenities a ON sa.amenity_id = a.id
      LEFT JOIN reviews r ON s.id = r.space_id
      WHERE s.status = 'active'
    `;
    
    const params = [];
    let paramCount = 1;

    if (city) {
      query += ` AND LOWER(s.city) = LOWER($${paramCount})`;
      params.push(city);
      paramCount++;
    }

    if (capacity) {
      query += ` AND s.capacity >= $${paramCount}`;
      params.push(capacity);
      paramCount++;
    }

    if (priceMin) {
      query += ` AND s.price_per_hour >= $${paramCount}`;
      params.push(priceMin);
      paramCount++;
    }

    if (priceMax) {
      query += ` AND s.price_per_hour <= $${paramCount}`;
      params.push(priceMax);
      paramCount++;
    }

    query += ` GROUP BY s.id`;

    if (amenities && amenities.length > 0) {
      query += ` HAVING COUNT(DISTINCT CASE WHEN a.name = ANY($${paramCount}) THEN a.name END) = $${paramCount + 1}`;
      params.push(amenities);
      params.push(amenities.length);
      paramCount += 2;
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT s.*, 
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'name', a.name,
               'icon', a.icon
             )) FILTER (WHERE a.name IS NOT NULL), '[]') as amenities,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(DISTINCT r.id) as review_count,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'id', r.id,
               'rating', r.rating,
               'comment', r.comment,
               'user_name', r.user_name,
               'created_at', r.created_at
             )) FILTER (WHERE r.id IS NOT NULL), '[]') as reviews
      FROM spaces s
      LEFT JOIN space_amenities sa ON s.id = sa.space_id
      LEFT JOIN amenities a ON sa.amenity_id = a.id
      LEFT JOIN reviews r ON s.id = r.space_id
      WHERE s.id = $1 AND s.status = 'active'
      GROUP BY s.id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(spaceData) {
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      capacity,
      price_per_hour,
      space_type,
      owner_id,
      amenities = []
    } = spaceData;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const insertSpaceQuery = `
        INSERT INTO spaces (
          name, description, address, city, state, country, postal_code,
          latitude, longitude, capacity, price_per_hour, space_type, owner_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
        RETURNING *
      `;

      const spaceResult = await client.query(insertSpaceQuery, [
        name, description, address, city, state, country, postal_code,
        latitude, longitude, capacity, price_per_hour, space_type, owner_id
      ]);

      const space = spaceResult.rows[0];

      if (amenities.length > 0) {
        for (const amenityName of amenities) {
          const amenityQuery = `
            INSERT INTO space_amenities (space_id, amenity_id)
            SELECT $1, id FROM amenities WHERE name = $2
            ON CONFLICT DO NOTHING
          `;
          await client.query(amenityQuery, [space.id, amenityName]);
        }
      }

      await client.query('COMMIT');
      return await Space.findById(space.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, spaceData) {
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      capacity,
      price_per_hour,
      space_type,
      status,
      amenities
    } = spaceData;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        fields.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }
      if (description !== undefined) {
        fields.push(`description = $${paramCount}`);
        values.push(description);
        paramCount++;
      }
      if (address !== undefined) {
        fields.push(`address = $${paramCount}`);
        values.push(address);
        paramCount++;
      }
      if (city !== undefined) {
        fields.push(`city = $${paramCount}`);
        values.push(city);
        paramCount++;
      }
      if (state !== undefined) {
        fields.push(`state = $${paramCount}`);
        values.push(state);
        paramCount++;
      }
      if (country !== undefined) {
        fields.push(`country = $${paramCount}`);
        values.push(country);
        paramCount++;
      }
      if (postal_code !== undefined) {
        fields.push(`postal_code = $${paramCount}`);
        values.push(postal_code);
        paramCount++;
      }
      if (latitude !== undefined) {
        fields.push(`latitude = $${paramCount}`);
        values.push(latitude);
        paramCount++;
      }
      if (longitude !== undefined) {
        fields.push(`longitude = $${paramCount}`);
        values.push(longitude);
        paramCount++;
      }
      if (capacity !== undefined) {
        fields.push(`capacity = $${paramCount}`);
        values.push(capacity);
        paramCount++;
      }
      if (price_per_hour !== undefined) {
        fields.push(`price_per_hour = $${paramCount}`);
        values.push(price_per_hour);
        paramCount++;
      }
      if (space_type !== undefined) {
        fields.push(`space_type = $${paramCount}`);
        values.push(space_type);
        paramCount++;
      }
      if (status !== undefined) {
        fields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (fields.length > 0) {
        values.push(id);
        const updateQuery = `
          UPDATE spaces 
          SET ${fields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        await client.query(updateQuery, values);
      }

      if (amenities !== undefined) {
        await client.query('DELETE FROM space_amenities WHERE space_id = $1', [id]);
        
        if (amenities.length > 0) {
          for (const amenityName of amenities) {
            const amenityQuery = `
              INSERT INTO space_amenities (space_id, amenity_id)
              SELECT $1, id FROM amenities WHERE name = $2
              ON CONFLICT DO NOTHING
            `;
            await client.query(amenityQuery, [id, amenityName]);
          }
        }
      }

      await client.query('COMMIT');
      return await Space.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const query = `
      UPDATE spaces 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async checkAvailability(spaceId, startTime, endTime) {
    const query = `
      SELECT COUNT(*) as conflict_count
      FROM bookings
      WHERE space_id = $1
        AND status IN ('confirmed', 'pending')
        AND (
          (start_time <= $2 AND end_time > $2) OR
          (start_time < $3 AND end_time >= $3) OR
          (start_time >= $2 AND end_time <= $3)
        )
    `;
    
    const result = await pool.query(query, [spaceId, startTime, endTime]);
    return parseInt(result.rows[0].conflict_count) === 0;
  }

  static async getAmenities() {
    const query = 'SELECT * FROM amenities ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Space;

// Made with Bob
