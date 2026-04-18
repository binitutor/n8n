USE bt_hairsalon_test;

SELECT *
FROM bt_hairsalon_service_hours
ORDER BY slot_date, slot_start, id;

SELECT *
FROM bt_hairsalon_service_types
ORDER BY id;

SELECT *
FROM bt_hairsalon_appointments
ORDER BY created_at DESC, id DESC;
