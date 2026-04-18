-- HairSalon Services Database Setup
-- Database: bt_hairsalon_test
-- Table: bt_hairsalon_service_types

USE bt_hairsalon_test;

-- Create table if it does not exist
CREATE TABLE IF NOT EXISTS bt_hairsalon_service_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_name (service_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Populate HairSalon Services
-- Clear existing data (optional - comment out if you want to keep data)
-- TRUNCATE TABLE bt_hairsalon_service_types;

INSERT INTO bt_hairsalon_service_types (service_name, price, created_at, updated_at) VALUES
('CUT & STYLING: Longs & Bobs', 65.00, NOW(), NOW()),
('CUT & STYLING: Shortcuts', 55.00, NOW(), NOW()),
('CUT & STYLING: Bangs & Beards', 26.00, NOW(), NOW()),
('CUT & STYLING: Child Cut', 55.00, NOW(), NOW()),
('COLOR: Touch Up', 90.00, NOW(), NOW()),
('COLOR: Pull Through', 27.00, NOW(), NOW()),
('BLEACH & TONE: Touch Up', 117.00, NOW(), NOW()),
('BLEACH & TONE: Pull Through', 168.00, NOW(), NOW()),
('BLEACH & TONE: Platinum Card', 279.00, NOW(), NOW()),
('STYLE: Blowout', 55.00, NOW(), NOW()),
('STYLE: Updo', 95.00, NOW(), NOW()),
('STYLE: Braids', 38.00, NOW(), NOW()),
('TEXTURE: Perm Full', 274.00, NOW(), NOW()),
('TEXTURE: Perm Per Rod', 20.00, NOW(), NOW()),
('TREATMENT: Fusio Dose', 45.00, NOW(), NOW()),
('TREATMENT: Olaplex', 19.00, NOW(), NOW());

-- Verification query - view the populated table
-- SELECT * FROM bt_hairsalon_service_types ORDER BY id;
