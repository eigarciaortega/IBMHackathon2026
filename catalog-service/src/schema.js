const db = require("./db");

const ensureCatalogSchema = async () => {
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'spaces'
          AND column_name = 'has_air_conditioning'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'spaces'
          AND column_name = 'has_ac'
      )
      THEN
        ALTER TABLE spaces RENAME COLUMN has_air_conditioning TO has_ac;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'spaces'
          AND column_name = 'location'
      )
      THEN
        ALTER TABLE spaces ALTER COLUMN location DROP NOT NULL;
      END IF;
    END $$;
  `);
};

module.exports = {
  ensureCatalogSchema
};
