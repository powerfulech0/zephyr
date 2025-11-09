-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS polls CASCADE;