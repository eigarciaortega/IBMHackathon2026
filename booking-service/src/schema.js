const db = require("./db");

const ensureBookingSchema = async () => {
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'has_air_conditioning'
      )
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'spaces' AND column_name = 'has_ac'
      )
      THEN
        ALTER TABLE spaces RENAME COLUMN has_air_conditioning TO has_ac;
      END IF;

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIME;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendees INTEGER DEFAULT 1;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'starts_at'
      )
      THEN
        UPDATE bookings
        SET date = COALESCE(date, starts_at::date),
            start_time = COALESCE(start_time, starts_at::time),
            end_time = COALESCE(end_time, ends_at::time),
            attendees = COALESCE(attendees, 1),
            updated_at = COALESCE(updated_at, created_at, NOW())
        WHERE date IS NULL OR start_time IS NULL OR end_time IS NULL OR attendees IS NULL;

        ALTER TABLE bookings DROP COLUMN IF EXISTS starts_at;
        ALTER TABLE bookings DROP COLUMN IF EXISTS ends_at;
        ALTER TABLE bookings DROP COLUMN IF EXISTS purpose;
      END IF;
    END $$;
  `);

  await db.query(`
    UPDATE bookings
    SET attendees = COALESCE(attendees, 1),
        status = COALESCE(status, 'ACTIVE'),
        updated_at = COALESCE(updated_at, created_at, NOW())
  `);

  await db.query(`
    ALTER TABLE bookings
      ALTER COLUMN date SET NOT NULL,
      ALTER COLUMN start_time SET NOT NULL,
      ALTER COLUMN end_time SET NOT NULL,
      ALTER COLUMN attendees SET NOT NULL,
      ALTER COLUMN status SET DEFAULT 'ACTIVE',
      ALTER COLUMN updated_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET NOT NULL
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'bookings_attendees_positive'
      )
      THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_attendees_positive CHECK (attendees > 0);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'bookings_valid_time_range'
      )
      THEN
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_valid_time_range CHECK (end_time > start_time);
      END IF;
    END $$;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_bookings_space_time
      ON bookings (space_id, date, start_time, end_time)
      WHERE status = 'ACTIVE'
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_bookings_user
      ON bookings (user_id, date ASC, start_time ASC)
  `);

  await db.query(`
    ALTER TABLE assistant_logs ADD COLUMN IF NOT EXISTS intent VARCHAR(60) DEFAULT 'BUSCAR_ESPACIO';
    ALTER TABLE assistant_logs ADD COLUMN IF NOT EXISTS detected_type VARCHAR(20);
    ALTER TABLE assistant_logs ADD COLUMN IF NOT EXISTS detected_capacity INTEGER;
    ALTER TABLE assistant_logs ADD COLUMN IF NOT EXISTS detected_date DATE;
    ALTER TABLE assistant_logs ADD COLUMN IF NOT EXISTS detected_time_preference VARCHAR(30);
    ALTER TABLE assistant_logs ADD COLUMN IF NOT EXISTS detected_resources TEXT[] DEFAULT ARRAY[]::TEXT[];
  `);

  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assistant_logs' AND column_name = 'interpreted_intent'
      )
      THEN
        UPDATE assistant_logs
        SET intent = COALESCE(intent, interpreted_intent, 'BUSCAR_ESPACIO'),
            detected_resources = COALESCE(detected_resources, ARRAY[]::TEXT[]);
      ELSE
        UPDATE assistant_logs
        SET intent = COALESCE(intent, 'BUSCAR_ESPACIO'),
            detected_resources = COALESCE(detected_resources, ARRAY[]::TEXT[]);
      END IF;
    END $$;
  `);

  await db.query(`
    ALTER TABLE assistant_logs
      ALTER COLUMN intent SET DEFAULT 'BUSCAR_ESPACIO',
      ALTER COLUMN intent SET NOT NULL,
      ALTER COLUMN detected_resources SET DEFAULT ARRAY[]::TEXT[],
      ALTER COLUMN detected_resources SET NOT NULL
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_assistant_logs_created_at
      ON assistant_logs (created_at DESC)
  `);
};

module.exports = {
  ensureBookingSchema
};
