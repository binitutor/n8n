-- HairSalon Time Slots Database Setup
-- Database: bt_hairsalon_test
-- Table: bt_hairsalon_service_hours

USE bt_hairsalon_test;

-- Create table if it does not exist
CREATE TABLE IF NOT EXISTS bt_hairsalon_service_hours (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_slot_date (slot_date),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Populate sample data for HairSalon Time Slots
-- Clear existing data (optional - comment out if you want to keep data)
-- TRUNCATE TABLE bt_hairsalon_service_hours;

-- Insert sample time slots for hair salon services
INSERT INTO bt_hairsalon_service_hours (slot_date, slot_start, slot_end, is_active, created_at) VALUES
-- Monday slots
('2026-04-20', '09:00:00', '09:30:00', 1, NOW()),
('2026-04-20', '09:30:00', '10:00:00', 1, NOW()),
('2026-04-20', '10:00:00', '10:30:00', 1, NOW()),
('2026-04-20', '10:30:00', '11:00:00', 1, NOW()),
('2026-04-20', '11:00:00', '11:30:00', 1, NOW()),
('2026-04-20', '11:30:00', '12:00:00', 1, NOW()),
('2026-04-20', '13:00:00', '13:30:00', 1, NOW()),
('2026-04-20', '13:30:00', '14:00:00', 1, NOW()),
('2026-04-20', '14:00:00', '14:30:00', 1, NOW()),
('2026-04-20', '14:30:00', '15:00:00', 1, NOW()),
('2026-04-20', '15:00:00', '15:30:00', 1, NOW()),
('2026-04-20', '15:30:00', '16:00:00', 0, NOW()),
('2026-04-20', '16:00:00', '16:30:00', 0, NOW()),

-- Tuesday slots
('2026-04-21', '09:00:00', '09:30:00', 1, NOW()),
('2026-04-21', '09:30:00', '10:00:00', 1, NOW()),
('2026-04-21', '10:00:00', '10:30:00', 1, NOW()),
('2026-04-21', '10:30:00', '11:00:00', 1, NOW()),
('2026-04-21', '11:00:00', '11:30:00', 1, NOW()),
('2026-04-21', '13:00:00', '13:30:00', 1, NOW()),
('2026-04-21', '13:30:00', '14:00:00', 1, NOW()),
('2026-04-21', '14:00:00', '14:30:00', 1, NOW()),
('2026-04-21', '14:30:00', '15:00:00', 1, NOW()),

-- Wednesday slots
('2026-04-22', '09:00:00', '09:30:00', 1, NOW()),
('2026-04-22', '09:30:00', '10:00:00', 1, NOW()),
('2026-04-22', '10:00:00', '10:30:00', 1, NOW()),
('2026-04-22', '10:30:00', '11:00:00', 1, NOW()),
('2026-04-22', '11:00:00', '11:30:00', 1, NOW()),
('2026-04-22', '13:00:00', '13:30:00', 1, NOW()),
('2026-04-22', '13:30:00', '14:00:00', 1, NOW()),
('2026-04-22', '14:00:00', '14:30:00', 1, NOW()),

-- Thursday slots
('2026-04-23', '09:00:00', '09:30:00', 1, NOW()),
('2026-04-23', '09:30:00', '10:00:00', 1, NOW()),
('2026-04-23', '10:00:00', '10:30:00', 1, NOW()),
('2026-04-23', '10:30:00', '11:00:00', 1, NOW()),
('2026-04-23', '11:00:00', '11:30:00', 1, NOW()),
('2026-04-23', '13:00:00', '13:30:00', 1, NOW()),
('2026-04-23', '13:30:00', '14:00:00', 1, NOW()),

-- Friday slots
('2026-04-24', '09:00:00', '09:30:00', 1, NOW()),
('2026-04-24', '09:30:00', '10:00:00', 1, NOW()),
('2026-04-24', '10:00:00', '10:30:00', 1, NOW()),
('2026-04-24', '10:30:00', '11:00:00', 1, NOW()),
('2026-04-24', '11:00:00', '11:30:00', 1, NOW()),
('2026-04-24', '13:00:00', '13:30:00', 1, NOW()),
('2026-04-24', '13:30:00', '14:00:00', 1, NOW()),

-- Saturday slots (reduced hours)
('2026-04-25', '10:00:00', '10:30:00', 1, NOW()),
('2026-04-25', '10:30:00', '11:00:00', 1, NOW()),
('2026-04-25', '11:00:00', '11:30:00', 1, NOW()),
('2026-04-25', '11:30:00', '12:00:00', 1, NOW()),
('2026-04-25', '13:00:00', '13:30:00', 1, NOW()),
('2026-04-25', '13:30:00', '14:00:00', 1, NOW()),
('2026-04-25', '14:00:00', '14:30:00', 1, NOW());

-- Verification query - view the populated table
-- SELECT * FROM bt_hairsalon_service_hours ORDER BY slot_date, slot_start;
