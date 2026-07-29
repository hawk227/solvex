-- Baseline reference data. Idempotent: safe to re-run.

INSERT INTO settings (key, value) VALUES ('default_slot_capacity', '6')
  ON CONFLICT(key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('referral_reward_taka', '200')
  ON CONFLICT(key) DO NOTHING;

INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('9:00 AM - 12:00 PM', '09:00', '12:00', 1, 1)
  ON CONFLICT(label) DO NOTHING;
INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('12:00 PM - 3:00 PM', '12:00', '15:00', 2, 1)
  ON CONFLICT(label) DO NOTHING;
INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('3:00 PM - 6:00 PM', '15:00', '18:00', 3, 1)
  ON CONFLICT(label) DO NOTHING;

INSERT INTO areas (name, sort, active) VALUES ('Dhanmondi', 1, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Gulshan', 2, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Banani', 3, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Uttara', 4, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Mirpur', 5, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Mohammadpur', 6, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Bashundhara R/A', 7, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Motijheel', 8, 1) ON CONFLICT(name) DO NOTHING;
