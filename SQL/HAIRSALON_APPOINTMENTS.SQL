-- HairSalon Appointments Database Setup
-- Database: bt_hairsalon_test
-- Table: bt_hairsalon_appointments

USE bt_hairsalon_test;

-- Create table if it does not exist
CREATE TABLE IF NOT EXISTS bt_hairsalon_appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  service_id INT NOT NULL,
  slot_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_service_id (service_id),
  INDEX idx_slot_id (slot_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (service_id) REFERENCES bt_hairsalon_service_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES bt_hairsalon_service_hours(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Populate HairSalon Appointments with 50 dummy records
-- Clear existing data (optional - comment out if you want to keep data)
-- TRUNCATE TABLE bt_hairsalon_appointments;

INSERT INTO bt_hairsalon_appointments (full_name, email, phone, service_id, slot_id, status, created_at, updated_at) VALUES
('Sarah Johnson', 'sarah.johnson@email.com', '555-0101', 1, 1, 'accepted', '2026-04-10 10:30:00', '2026-04-10 11:15:00'),
('Michael Chen', 'm.chen@email.com', '555-0102', 3, 2, 'pending', '2026-04-12 14:45:00', '2026-04-12 14:45:00'),
('Emma Rodriguez', 'emma.r@email.com', '555-0103', 5, 3, 'accepted', '2026-04-11 09:20:00', '2026-04-11 10:00:00'),
('James Wilson', 'jwilson@email.com', '555-0104', 2, 4, 'rejected', '2026-04-09 16:30:00', '2026-04-09 16:45:00'),
('Lisa Anderson', 'lisa.a@email.com', '555-0105', 10, 5, 'accepted', '2026-04-13 11:00:00', '2026-04-13 11:30:00'),
('David Martinez', 'dmartinez@email.com', '555-0106', 7, 6, 'pending', '2026-04-14 08:15:00', '2026-04-14 08:15:00'),
('Jennifer Brown', 'j.brown@email.com', '555-0107', 11, 7, 'accepted', '2026-04-12 13:45:00', '2026-04-12 14:20:00'),
('Robert Taylor', 'r.taylor@email.com', '555-0108', 4, 8, 'cancelled', '2026-04-10 15:30:00', '2026-04-11 09:00:00'),
('Maria Garcia', 'maria.garcia@email.com', '555-0109', 6, 9, 'accepted', '2026-04-13 10:00:00', '2026-04-13 10:45:00'),
('Christopher Lee', 'c.lee@email.com', '555-0110', 13, 10, 'pending', '2026-04-15 12:30:00', '2026-04-15 12:30:00'),
('Patricia White', 'p.white@email.com', '555-0111', 9, 11, 'rejected', '2026-04-08 14:15:00', '2026-04-08 14:30:00'),
('Daniel Harris', 'd.harris@email.com', '555-0112', 8, 12, 'accepted', '2026-04-11 16:00:00', '2026-04-11 16:45:00'),
('Angela Clark', 'angela.clark@email.com', '555-0113', 1, 13, 'accepted', '2026-04-14 09:30:00', '2026-04-14 10:15:00'),
('Kevin Lewis', 'k.lewis@email.com', '555-0114', 12, 14, 'pending', '2026-04-16 11:15:00', '2026-04-16 11:15:00'),
('Jessica Hall', 'j.hall@email.com', '555-0115', 5, 15, 'cancelled', '2026-04-09 10:45:00', '2026-04-10 08:00:00'),
('Daniel Young', 'd.young@email.com', '555-0116', 2, 16, 'accepted', '2026-04-13 15:30:00', '2026-04-13 16:00:00'),
('Michelle Hernandez', 'm.hernandez@email.com', '555-0117', 10, 17, 'pending', '2026-04-16 13:45:00', '2026-04-16 13:45:00'),
('Mark King', 'mark.king@email.com', '555-0118', 6, 18, 'rejected', '2026-04-07 17:00:00', '2026-04-07 17:20:00'),
('Sandra Lopez', 's.lopez@email.com', '555-0119', 15, 19, 'accepted', '2026-04-12 11:30:00', '2026-04-12 12:00:00'),
('Steven Scott', 's.scott@email.com', '555-0120', 3, 20, 'accepted', '2026-04-15 14:00:00', '2026-04-15 14:45:00'),
('Dorothy Green', 'd.green@email.com', '555-0121', 11, 21, 'pending', '2026-04-17 10:30:00', '2026-04-17 10:30:00'),
('Paul Adams', 'p.adams@email.com', '555-0122', 7, 22, 'cancelled', '2026-04-11 12:15:00', '2026-04-12 08:30:00'),
('Barbara Nelson', 'b.nelson@email.com', '555-0123', 4, 23, 'accepted', '2026-04-14 16:00:00', '2026-04-14 16:45:00'),
('Charles Carter', 'c.carter@email.com', '555-0124', 9, 24, 'rejected', '2026-04-06 15:45:00', '2026-04-06 16:00:00'),
('Susan Mitchell', 's.mitchell@email.com', '555-0125', 1, 25, 'accepted', '2026-04-16 09:15:00', '2026-04-16 10:00:00'),
('Gary Roberts', 'g.roberts@email.com', '555-0126', 8, 26, 'pending', '2026-04-18 08:45:00', '2026-04-18 08:45:00'),
('Nancy Phillips', 'n.phillips@email.com', '555-0127', 12, 27, 'accepted', '2026-04-13 14:30:00', '2026-04-13 15:15:00'),
('Edward Campbell', 'e.campbell@email.com', '555-0128', 5, 28, 'cancelled', '2026-04-10 13:00:00', '2026-04-11 07:45:00'),
('Betty Parker', 'b.parker@email.com', '555-0129', 2, 29, 'accepted', '2026-04-15 11:00:00', '2026-04-15 11:45:00'),
('Ronald Evans', 'r.evans@email.com', '555-0130', 13, 30, 'pending', '2026-04-19 12:00:00', '2026-04-19 12:00:00'),
('Carol Edwards', 'carol.edwards@email.com', '555-0131', 10, 31, 'rejected', '2026-04-05 16:30:00', '2026-04-05 16:45:00'),
('Anthony Collins', 'a.collins@email.com', '555-0132', 6, 32, 'accepted', '2026-04-12 10:15:00', '2026-04-12 11:00:00'),
('Diane Stewart', 'd.stewart@email.com', '555-0133', 11, 33, 'accepted', '2026-04-17 14:00:00', '2026-04-17 14:45:00'),
('Francisco Sanchez', 'f.sanchez@email.com', '555-0134', 3, 34, 'pending', '2026-04-20 09:30:00', '2026-04-20 09:30:00'),
('Katherine Morris', 'k.morris@email.com', '555-0135', 7, 35, 'cancelled', '2026-04-08 11:45:00', '2026-04-09 08:00:00'),
('Zachary Rogers', 'z.rogers@email.com', '555-0136', 9, 36, 'accepted', '2026-04-14 15:30:00', '2026-04-14 16:15:00'),
('Brenda Morgan', 'b.morgan@email.com', '555-0137', 1, 37, 'rejected', '2026-04-04 14:00:00', '2026-04-04 14:15:00'),
('Samuel Peterson', 's.peterson@email.com', '555-0138', 4, 38, 'accepted', '2026-04-16 13:00:00', '2026-04-16 13:45:00'),
('Catherine Cooper', 'c.cooper@email.com', '555-0139', 15, 39, 'pending', '2026-04-21 10:00:00', '2026-04-21 10:00:00'),
('Ryan Reed', 'ryan.reed@email.com', '555-0140', 8, 40, 'accepted', '2026-04-13 11:15:00', '2026-04-13 12:00:00'),
('Gloria Bell', 'g.bell@email.com', '555-0141', 12, 41, 'cancelled', '2026-04-09 09:30:00', '2026-04-10 07:00:00'),
('Dennis May', 'd.may@email.com', '555-0142', 2, 42, 'accepted', '2026-04-18 15:45:00', '2026-04-18 16:30:00'),
('Shirley Dawson', 's.dawson@email.com', '555-0143', 5, 43, 'pending', '2026-04-22 11:30:00', '2026-04-22 11:30:00'),
('Jerry Cross', 'j.cross@email.com', '555-0144', 10, 44, 'rejected', '2026-04-03 17:15:00', '2026-04-03 17:30:00'),
('Evelyn Nunez', 'e.nunez@email.com', '555-0145', 6, 45, 'accepted', '2026-04-15 10:00:00', '2026-04-15 10:45:00'),
('Lawrence Brennan', 'l.brennan@email.com', '555-0146', 11, 46, 'accepted', '2026-04-19 13:30:00', '2026-04-19 14:15:00'),
('Mildred Flores', 'm.flores@email.com', '555-0147', 7, 47, 'pending', '2026-04-23 09:00:00', '2026-04-23 09:00:00'),
('Steven Whitley', 's.whitley@email.com', '555-0148', 9, 48, 'cancelled', '2026-04-12 14:45:00', '2026-04-13 08:15:00'),
('Helen Guzman', 'h.guzman@email.com', '555-0149', 1, 49, 'accepted', '2026-04-17 11:45:00', '2026-04-17 12:30:00'),
('Dennis Garrett', 'd.garrett@email.com', '555-0150', 13, 50, 'rejected', '2026-04-02 16:00:00', '2026-04-02 16:20:00');

-- Verification query - view the populated table with status distribution
-- SELECT 
--   status, 
--   COUNT(*) as count 
-- FROM bt_hairsalon_appointments 
-- GROUP BY status 
-- ORDER BY count DESC;
