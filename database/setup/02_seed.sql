BEGIN;

INSERT INTO users (id, email, name) VALUES
('11111111-1111-1111-1111-111111111111', 'test1@example.com', 'Test User 1'),
('11111111-1111-1111-1111-111111111112', 'test2@example.com', 'Test User 2');

INSERT INTO facilities (id, name, address, description, opening_hours, contact_number, image_url) VALUES
('22222222-2222-2222-2222-222222222221', 'Ouluhalli', 'Ouluhallintie 20, Oulu', 'Large indoor sports hall', '07:00-22:00', '+358401000001', 'img-ouluhalli'),
('22222222-2222-2222-2222-222222222222', 'Raksila Arena', 'Teuvo Pakkalan katu 11, Oulu', 'Ice arena', '09:00-23:00', '+358401000002', 'img-raksila');

INSERT INTO facility_sections (id, facility_id, name, sport, description) VALUES
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'Hall A', 'Basketball', 'Main full-size court'),
('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Rink 1', 'Ice Hockey', 'Primary ice rink');

INSERT INTO bookings (id, status, booking_time, user_id, section_id) VALUES
('44444444-4444-4444-4444-444444444441', 'pending', NOW(), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331'),
('44444444-4444-4444-4444-444444444442', 'confirmed', NOW(), '11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-333333333332');

COMMIT;
