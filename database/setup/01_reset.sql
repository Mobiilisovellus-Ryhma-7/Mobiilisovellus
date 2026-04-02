BEGIN;

-- Clear child tables first to satisfy FK constraints.
TRUNCATE TABLE bookings, facility_sections, facilities, users RESTART IDENTITY CASCADE;

COMMIT;
