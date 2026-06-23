-- Fix recursos column in rooms table
-- This script updates the recursos column to have a proper default value

-- Update the column to have a server default of empty JSON array
ALTER TABLE rooms 
ALTER COLUMN recursos SET DEFAULT '[]'::jsonb,
ALTER COLUMN recursos SET NOT NULL;

-- Update any existing NULL values to empty array
UPDATE rooms 
SET recursos = '[]'::jsonb 
WHERE recursos IS NULL;

-- Verify the change
SELECT 'Column updated successfully!' AS status;
SELECT id, nombre, recursos FROM rooms LIMIT 5;

-- Made with Bob
