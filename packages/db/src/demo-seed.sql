-- Demo catalog for local development and screenshots. NOT production data —
-- never run this against the remote database.
--
-- Note: created_at is a Drizzle `$defaultFn`, i.e. an application-side default,
-- not a database default. Raw SQL inserts must supply it explicitly or the
-- NOT NULL constraint fails.

INSERT INTO categories (slug, name, description, sort, active, created_at) VALUES
  ('air-conditioner', 'Air Conditioner', 'Split, window and cassette AC servicing across Dhaka.', 1, 1, unixepoch()*1000),
  ('refrigerator', 'Refrigerator', 'Fridge and freezer servicing and repair.', 2, 1, unixepoch()*1000),
  ('oven', 'Oven & Microwave', 'Oven, microwave and burner servicing.', 3, 1, unixepoch()*1000),
  ('washing-machine', 'Washing Machine', 'Front and top load washer servicing.', 4, 1, unixepoch()*1000)
  ON CONFLICT(slug) DO NOTHING;

INSERT INTO services
  (category_id, slug, name, short_desc, duration_min, sort, active,
   about_md, included_json, not_included_json, faqs_json, created_at)
VALUES
  ((SELECT id FROM categories WHERE slug='air-conditioner'),
   'ac-cleaning', 'AC Cleaning',
   'Full indoor and outdoor unit cleaning.', 60, 1, 1,
   'We strip and wash the filters, coils and drain line so the unit cools properly again and stops smelling.',
   '["Filter cleaning","Coil wash","Drain line flush","Cooling check"]',
   '["Gas refill","Spare parts","Installation"]',
   '[{"q":"How long does it take?","a":"About an hour per unit."},{"q":"Do I need to be home?","a":"Yes, someone must let the technician in and confirm the work."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='air-conditioner'),
   'ac-health-checkup', 'AC Health Checkup',
   'Full diagnostic on cooling, gas pressure and drainage.', 45, 2, 1,
   'A technician inspects your unit end to end and reports what needs attention, with no obligation to book the repair.',
   '["Cooling performance test","Gas pressure reading","Drain line inspection","Written findings"]',
   '["Gas refill","Spare parts","Deep cleaning"]',
   '[{"q":"Will you fix problems during the checkup?","a":"No. The checkup reports what is wrong; repairs are booked separately so you can decide."},{"q":"How long does it take?","a":"About 45 minutes for a single unit."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='refrigerator'),
   'fridge-repair', 'Refrigerator Repair',
   'Diagnosis and repair of cooling, noise and leak faults.', 90, 1, 1,
   'We diagnose the fault first and confirm the cost of any parts with you before fitting them.',
   '["Fault diagnosis","Thermostat check","Door seal inspection","Labour for the repair"]',
   '["Replacement compressor","Spare parts","Gas recharge"]',
   '[{"q":"Do you carry parts with you?","a":"Common parts yes. Anything else is ordered and fitted on a second visit."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='washing-machine'),
   'washer-servicing', 'Washing Machine Servicing',
   'Drum clean, filter clean and drainage check.', 60, 1, 1,
   'A full service to clear the build-up that causes smells, poor spins and slow drainage.',
   '["Drum deep clean","Filter clean","Drain hose flush","Spin and balance test"]',
   '["Replacement parts","Motor repair","Installation"]',
   '[{"q":"Do I need to supply anything?","a":"Just a water connection and a power point."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='oven'),
   'oven-servicing', 'Oven Servicing',
   'Burner, igniter and interior clean and check.', 60, 1, 1,
   'Keeps burners lighting reliably and the interior clean, with a gas safety check on gas models.',
   '["Burner clean","Igniter check","Interior clean","Gas leak check"]',
   '["Replacement igniter","Glass replacement","Installation"]',
   '[{"q":"Electric ovens too?","a":"Yes. The gas checks are skipped on electric models."}]',
   unixepoch()*1000)
  ON CONFLICT(slug) DO NOTHING;

INSERT INTO service_prices (service_id, combo_key, price)
  SELECT id, '', 800 FROM services WHERE slug='ac-health-checkup'
  ON CONFLICT DO NOTHING;
INSERT INTO service_prices (service_id, combo_key, price)
  SELECT id, '', 1200 FROM services WHERE slug='fridge-repair'
  ON CONFLICT DO NOTHING;
INSERT INTO service_prices (service_id, combo_key, price)
  SELECT id, '', 1400 FROM services WHERE slug='washer-servicing'
  ON CONFLICT DO NOTHING;
INSERT INTO service_prices (service_id, combo_key, price)
  SELECT id, '', 1000 FROM services WHERE slug='oven-servicing'
  ON CONFLICT DO NOTHING;

-- AC Cleaning is priced per (size x type) combination in the CMS. Here it gets
-- a single base price so the demo catalog is bookable without variables.
INSERT INTO service_prices (service_id, combo_key, price)
  SELECT id, '', 1500 FROM services WHERE slug='ac-cleaning'
  ON CONFLICT DO NOTHING;
