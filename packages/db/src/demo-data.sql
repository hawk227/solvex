-- Demo dataset: 10 categories, 10 services, 10 technicians, 10 customers,
-- 10 orders and 10 tickets, for exercising the CMS with realistic volume.
--
-- EVERY row inserted here is tagged so it can be removed again:
--   customers    user.id LIKE 'demo_u%'   email @demo.solvex.invalid
--   technicians  email @demo.solvex.invalid
--   orders       code LIKE 'DEMO-%'
--   tickets      ref LIKE 'TK-DEMO%'
--   catalog      the slugs listed in demo-data-remove.sql
--
-- Run demo-data-remove.sql to take it all out. Orders and tickets cascade from
-- the customer rows, but they are deleted explicitly there so the order of
-- operations does not depend on cascade behaviour.
--
-- created_at is a Drizzle `$defaultFn` — an application-side default, not a
-- database one — so raw SQL must supply it or the NOT NULL constraint fails.

-- ---------------------------------------------------------------- categories
INSERT INTO categories (slug, name, description, sort, active, created_at) VALUES
  ('air-conditioner', 'Air Conditioner', 'Split, window and cassette AC servicing across Dhaka.', 1, 1, unixepoch()*1000),
  ('refrigerator', 'Refrigerator', 'Fridge and freezer servicing and repair.', 2, 1, unixepoch()*1000),
  ('washing-machine', 'Washing Machine', 'Front and top load washer servicing.', 3, 1, unixepoch()*1000),
  ('oven', 'Oven & Microwave', 'Oven, microwave and burner servicing.', 4, 1, unixepoch()*1000),
  ('television', 'Television', 'LED, LCD and smart TV diagnosis and repair.', 5, 1, unixepoch()*1000),
  ('water-purifier', 'Water Purifier', 'RO and UV purifier servicing and filter changes.', 6, 1, unixepoch()*1000),
  ('geyser', 'Geyser & Water Heater', 'Instant and storage geyser servicing.', 7, 1, unixepoch()*1000),
  ('air-cooler', 'Air Cooler', 'Evaporative cooler cleaning and pump repair.', 8, 1, unixepoch()*1000),
  ('kitchen-hood', 'Kitchen Hood', 'Chimney and exhaust hood degreasing.', 9, 1, unixepoch()*1000),
  ('dishwasher', 'Dishwasher', 'Dishwasher servicing and drainage repair.', 10, 0, unixepoch()*1000)
  ON CONFLICT(slug) DO NOTHING;

-- ------------------------------------------------------------------ services
INSERT INTO services
  (category_id, slug, name, short_desc, duration_min, sort, active,
   about_md, included_json, not_included_json, faqs_json, created_at)
VALUES
  ((SELECT id FROM categories WHERE slug='air-conditioner'),
   'ac-cleaning', 'AC Cleaning', 'Full indoor and outdoor unit cleaning.', 60, 1, 1,
   'We strip and wash the filters, coils and drain line so the unit cools properly again and stops smelling.',
   '["Filter cleaning","Coil wash","Drain line flush","Cooling check"]',
   '["Gas refill","Spare parts","Installation"]',
   '[{"q":"How long does it take?","a":"About an hour per unit."},{"q":"Do I need to be home?","a":"Yes, someone must let the technician in and confirm the work."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='air-conditioner'),
   'ac-health-checkup', 'AC Health Checkup', 'Full diagnostic on cooling, gas pressure and drainage.', 45, 2, 1,
   'A technician inspects your unit end to end and reports what needs attention, with no obligation to book the repair.',
   '["Cooling performance test","Gas pressure reading","Drain line inspection","Written findings"]',
   '["Gas refill","Spare parts","Deep cleaning"]',
   '[{"q":"Will you fix problems during the checkup?","a":"No. The checkup reports what is wrong; repairs are booked separately so you can decide."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='air-conditioner'),
   'ac-gas-refill', 'AC Gas Refill', 'Leak test and refrigerant top-up.', 90, 3, 1,
   'We pressure-test for leaks first — refilling a leaking system just vents the gas again within weeks.',
   '["Leak pressure test","Refrigerant top-up","Cooling verification"]',
   '["Coil replacement","Compressor repair","Pipe replacement"]',
   '[{"q":"Why test before refilling?","a":"Gas does not get used up. If it is low, it is leaking, and refilling without fixing that wastes your money."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='refrigerator'),
   'fridge-repair', 'Refrigerator Repair', 'Diagnosis and repair of cooling, noise and leak faults.', 90, 1, 1,
   'We diagnose the fault first and confirm the cost of any parts with you before fitting them.',
   '["Fault diagnosis","Thermostat check","Door seal inspection","Labour for the repair"]',
   '["Replacement compressor","Spare parts","Gas recharge"]',
   '[{"q":"Do you carry parts with you?","a":"Common parts yes. Anything else is ordered and fitted on a second visit."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='refrigerator'),
   'fridge-deep-clean', 'Refrigerator Deep Clean', 'Interior, gasket and condenser coil clean.', 60, 2, 1,
   'Clears the dust off the condenser coils, which is the most common reason a fridge runs constantly and still feels warm.',
   '["Interior sanitising","Door gasket clean","Condenser coil dusting","Drain hole clearing"]',
   '["Repairs","Spare parts","Gas recharge"]',
   '[{"q":"Do I need to empty the fridge?","a":"Yes please, before the technician arrives."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='washing-machine'),
   'washer-servicing', 'Washing Machine Servicing', 'Drum clean, filter clean and drainage check.', 60, 1, 1,
   'A full service to clear the build-up that causes smells, poor spins and slow drainage.',
   '["Drum deep clean","Filter clean","Drain hose flush","Spin and balance test"]',
   '["Replacement parts","Motor repair","Installation"]',
   '[{"q":"Do I need to supply anything?","a":"Just a water connection and a power point."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='oven'),
   'oven-servicing', 'Oven Servicing', 'Burner, igniter and interior clean and check.', 60, 1, 1,
   'Keeps burners lighting reliably and the interior clean, with a gas safety check on gas models.',
   '["Burner clean","Igniter check","Interior clean","Gas leak check"]',
   '["Replacement igniter","Glass replacement","Installation"]',
   '[{"q":"Electric ovens too?","a":"Yes. The gas checks are skipped on electric models."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='television'),
   'tv-diagnosis', 'TV Diagnosis', 'Panel, board and backlight fault finding.', 45, 1, 1,
   'We identify whether the fault is the panel, the backlight or a board — the three have very different repair costs.',
   '["Visual and signal inspection","Backlight test","Board-level diagnosis","Written estimate"]',
   '["Panel replacement","Spare boards","Wall mounting"]',
   '[{"q":"Is a cracked panel worth repairing?","a":"Usually not. A replacement panel often costs more than a new set, and we will tell you honestly."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='water-purifier'),
   'purifier-filter-change', 'Water Purifier Filter Change', 'Sediment, carbon and RO membrane replacement.', 45, 1, 1,
   'Filters are consumables. Left too long they stop protecting you and start restricting flow.',
   '["Sediment filter","Carbon filter","Fitting labour","Flow and TDS check"]',
   '["RO membrane (charged separately)","Pump replacement","New installation"]',
   '[{"q":"How often?","a":"Every 6 to 12 months in Dhaka, depending on your supply."}]',
   unixepoch()*1000),

  ((SELECT id FROM categories WHERE slug='geyser'),
   'geyser-servicing', 'Geyser Servicing', 'Descaling, element check and thermostat test.', 60, 1, 1,
   'Descaling restores heating speed and stops the element burning out early.',
   '["Tank descaling","Heating element check","Thermostat test","Safety valve check"]',
   '["Element replacement","Tank replacement","New installation"]',
   '[{"q":"How long does it take?","a":"About an hour, plus time for the tank to drain."}]',
   unixepoch()*1000)
  ON CONFLICT(slug) DO NOTHING;

-- ------------------------------------------------------------------- prices
INSERT INTO service_prices (service_id, combo_key, price)
  SELECT id, '', CASE slug
    WHEN 'ac-cleaning'            THEN 1500
    WHEN 'ac-health-checkup'      THEN 800
    WHEN 'ac-gas-refill'          THEN 3500
    WHEN 'fridge-repair'          THEN 1200
    WHEN 'fridge-deep-clean'      THEN 900
    WHEN 'washer-servicing'       THEN 1400
    WHEN 'oven-servicing'         THEN 1000
    WHEN 'tv-diagnosis'           THEN 700
    WHEN 'purifier-filter-change' THEN 1800
    WHEN 'geyser-servicing'       THEN 1600
  END
  FROM services
  WHERE slug IN ('ac-cleaning','ac-health-checkup','ac-gas-refill','fridge-repair',
                 'fridge-deep-clean','washer-servicing','oven-servicing','tv-diagnosis',
                 'purifier-filter-change','geyser-servicing')
  ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------- technicians
INSERT INTO technicians (full_name, phone, email, base_area, joined_on, notes, active, created_at) VALUES
  ('Kamrul Hasan',    '+8801711000101', 'kamrul@demo.solvex.invalid',  'Dhanmondi',       '2024-02-12', 'AC specialist. Handles cassette units.', 1, unixepoch()*1000),
  ('Rasel Mahmud',    '+8801711000102', 'rasel@demo.solvex.invalid',   'Gulshan',         '2024-05-03', 'Refrigeration and cold chain background.', 1, unixepoch()*1000),
  ('Jahangir Alam',   '+8801711000103', 'jahangir@demo.solvex.invalid','Mirpur',          '2023-11-20', 'Senior. Trains new joiners.', 1, unixepoch()*1000),
  ('Sohel Rana',      '+8801711000104', 'sohel@demo.solvex.invalid',   'Uttara',          '2025-01-15', 'Washing machines and dishwashers.', 1, unixepoch()*1000),
  ('Nazmul Islam',    '+8801711000105', 'nazmul@demo.solvex.invalid',  'Banani',          '2024-08-01', 'Electronics and TV board repair.', 1, unixepoch()*1000),
  ('Ferdous Wahid',   '+8801711000106', 'ferdous@demo.solvex.invalid', 'Mohammadpur',     '2025-03-10', NULL, 1, unixepoch()*1000),
  ('Tanvir Ahmed',    '+8801711000107', 'tanvir@demo.solvex.invalid',  'Bashundhara R/A', '2025-06-22', 'Water purifiers and geysers.', 1, unixepoch()*1000),
  ('Shakil Mia',      '+8801711000108', 'shakil@demo.solvex.invalid',  'Motijheel',       '2024-09-05', NULL, 1, unixepoch()*1000),
  ('Rubel Hossain',   '+8801711000109', 'rubel@demo.solvex.invalid',   'Dhanmondi',       '2025-05-18', 'Ovens and kitchen appliances.', 1, unixepoch()*1000),
  ('Delwar Hossain',  '+8801711000110', 'delwar@demo.solvex.invalid',  'Mirpur',          '2023-06-30', 'Left the rota — kept for order history.', 0, unixepoch()*1000)
  ON CONFLICT(phone) DO NOTHING;

-- ---------------------------------------------------------------- customers
-- No password rows: these accounts exist to populate orders and tickets, and
-- deliberately cannot be signed into.
INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES
  ('demo_u01','Rafiq Hasan',      'rafiq@demo.solvex.invalid',   1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u02','Nusrat Jahan',     'nusrat@demo.solvex.invalid',  1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u03','Imran Kabir',      'imran@demo.solvex.invalid',   1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u04','Sadia Afrin',      'sadia@demo.solvex.invalid',   1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u05','Tanzim Chowdhury', 'tanzim@demo.solvex.invalid',  1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u06','Farhana Rahman',   'farhana@demo.solvex.invalid', 1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u07','Mahmudul Karim',   'mahmud@demo.solvex.invalid',  1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u08','Ishrat Binte',     'ishrat@demo.solvex.invalid',  1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u09','Asif Mahmood',     'asif@demo.solvex.invalid',    1, unixepoch()*1000, unixepoch()*1000),
  ('demo_u10','Sabrina Haque',    'sabrina@demo.solvex.invalid', 1, unixepoch()*1000, unixepoch()*1000)
  ON CONFLICT(id) DO NOTHING;

INSERT INTO profiles (user_id, full_name, phone, address, area_id, referral_code, created_at) VALUES
  ('demo_u01','Rafiq Hasan',      '+8801811000201','House 12, Road 5, Dhanmondi',       1,'DEMORAF1', unixepoch()*1000),
  ('demo_u02','Nusrat Jahan',     '+8801811000202','Flat 4B, Road 11, Gulshan 1',       2,'DEMONUS2', unixepoch()*1000),
  ('demo_u03','Imran Kabir',      '+8801811000203','House 27, Road 12, Banani',         3,'DEMOIMR3', unixepoch()*1000),
  ('demo_u04','Sadia Afrin',      '+8801811000204','Sector 7, Road 3, Uttara',          4,'DEMOSAD4', unixepoch()*1000),
  ('demo_u05','Tanzim Chowdhury', '+8801811000205','Block C, Section 6, Mirpur',        5,'DEMOTAN5', unixepoch()*1000),
  ('demo_u06','Farhana Rahman',   '+8801811000206','House 9, Tajmahal Road, Mohammadpur',6,'DEMOFAR6', unixepoch()*1000),
  ('demo_u07','Mahmudul Karim',   '+8801811000207','Block D, Bashundhara R/A',          7,'DEMOMAH7', unixepoch()*1000),
  ('demo_u08','Ishrat Binte',     '+8801811000208','Dilkusha C/A, Motijheel',           8,'DEMOISH8', unixepoch()*1000),
  ('demo_u09','Asif Mahmood',     '+8801811000209','House 40, Road 27, Dhanmondi',      1,'DEMOASI9', unixepoch()*1000),
  ('demo_u10','Sabrina Haque',    '+8801811000210','Road 90, Gulshan 2',                2,'DEMOSAB10',unixepoch()*1000)
  ON CONFLICT(user_id) DO NOTHING;

-- ------------------------------------------------------------------- orders
-- Spread across every status so each CMS filter has something in it, and across
-- past and future dates so the dashboard and the schedule both look real.
INSERT INTO orders
  (code, user_id, service_id, combo_key, base_price, credit_applied, total,
   scheduled_date, slot_id, area_id, name_snapshot, phone_snapshot, address_snapshot,
   notes, status, technician_id, created_at)
VALUES
  ('DEMO-0001','demo_u01',(SELECT id FROM services WHERE slug='ac-cleaning'),'',1500,0,1500,date('now','+1 day'),1,1,'Rafiq Hasan','+8801811000201','House 12, Road 5, Dhanmondi','Two split units, both bedrooms.','PENDING',NULL,unixepoch()*1000),
  ('DEMO-0002','demo_u02',(SELECT id FROM services WHERE slug='fridge-repair'),'',1200,0,1200,date('now','+2 day'),2,2,'Nusrat Jahan','+8801811000202','Flat 4B, Road 11, Gulshan 1','Not cooling in the lower compartment.','PENDING',NULL,unixepoch()*1000),
  ('DEMO-0003','demo_u03',(SELECT id FROM services WHERE slug='washer-servicing'),'',1400,0,1400,date('now','+1 day'),3,3,'Imran Kabir','+8801811000203','House 27, Road 12, Banani',NULL,'APPROVED',(SELECT id FROM technicians WHERE email='sohel@demo.solvex.invalid'),unixepoch()*1000),
  ('DEMO-0004','demo_u04',(SELECT id FROM services WHERE slug='ac-gas-refill'),'',3500,200,3300,date('now'),1,4,'Sadia Afrin','+8801811000204','Sector 7, Road 3, Uttara','Used referral credit.','APPROVED',(SELECT id FROM technicians WHERE email='kamrul@demo.solvex.invalid'),unixepoch()*1000),
  ('DEMO-0005','demo_u05',(SELECT id FROM services WHERE slug='geyser-servicing'),'',1600,0,1600,date('now'),2,5,'Tanzim Chowdhury','+8801811000205','Block C, Section 6, Mirpur',NULL,'ON_THE_WAY',(SELECT id FROM technicians WHERE email='tanvir@demo.solvex.invalid'),unixepoch()*1000),
  ('DEMO-0006','demo_u06',(SELECT id FROM services WHERE slug='oven-servicing'),'',1000,0,1000,date('now'),3,6,'Farhana Rahman','+8801811000206','House 9, Tajmahal Road, Mohammadpur','Gas oven, burner not lighting.','IN_PROGRESS',(SELECT id FROM technicians WHERE email='rubel@demo.solvex.invalid'),unixepoch()*1000),
  ('DEMO-0007','demo_u07',(SELECT id FROM services WHERE slug='tv-diagnosis'),'',700,0,700,date('now','-2 day'),1,7,'Mahmudul Karim','+8801811000207','Block D, Bashundhara R/A',NULL,'COMPLETED',(SELECT id FROM technicians WHERE email='nazmul@demo.solvex.invalid'),unixepoch()*1000),
  ('DEMO-0008','demo_u08',(SELECT id FROM services WHERE slug='purifier-filter-change'),'',1800,0,1800,date('now','-4 day'),2,8,'Ishrat Binte','+8801811000208','Dilkusha C/A, Motijheel','Annual filter change.','COMPLETED',(SELECT id FROM technicians WHERE email='tanvir@demo.solvex.invalid'),unixepoch()*1000),
  ('DEMO-0009','demo_u09',(SELECT id FROM services WHERE slug='fridge-deep-clean'),'',900,0,900,date('now','-6 day'),3,1,'Asif Mahmood','+8801811000209','House 40, Road 27, Dhanmondi',NULL,'COMPLETED',(SELECT id FROM technicians WHERE email='rasel@demo.solvex.invalid'),unixepoch()*1000),
  ('DEMO-0010','demo_u10',(SELECT id FROM services WHERE slug='ac-health-checkup'),'',800,0,800,date('now','-1 day'),1,2,'Sabrina Haque','+8801811000210','Road 90, Gulshan 2','Customer cancelled — going abroad.','CANCELLED',NULL,unixepoch()*1000)
  ON CONFLICT(code) DO NOTHING;

-- One event per order so the timeline on the order page is not blank.
INSERT INTO order_events (order_id, status, note, admin_id, created_at)
  SELECT id, status, 'Demo data', NULL, unixepoch()*1000
  FROM orders WHERE code LIKE 'DEMO-%'
    AND id NOT IN (SELECT order_id FROM order_events);

-- ------------------------------------------------------------------ tickets
INSERT INTO tickets (ref, user_id, order_id, subject, topic, status, created_at, last_message_at)
VALUES
  ('TK-DEMO01','demo_u01',(SELECT id FROM orders WHERE code='DEMO-0001'),'Can I move my booking to Friday?','BOOKING','OPEN',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO02','demo_u02',(SELECT id FROM orders WHERE code='DEMO-0002'),'Fridge still warm after the visit','TECHNICIAN','OPEN',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO03','demo_u03',NULL,'Do you cover Savar?','OTHER','ANSWERED',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO04','demo_u04',(SELECT id FROM orders WHERE code='DEMO-0004'),'Referral credit did not apply fully','BILLING','OPEN',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO05','demo_u05',NULL,'How do I share my referral code?','REFERRAL','ANSWERED',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO06','demo_u06',(SELECT id FROM orders WHERE code='DEMO-0006'),'Technician running late','TECHNICIAN','RESOLVED',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO07','demo_u07',(SELECT id FROM orders WHERE code='DEMO-0007'),'Need an invoice for my TV repair','BILLING','RESOLVED',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO08','demo_u08',(SELECT id FROM orders WHERE code='DEMO-0008'),'Which filters were replaced?','OTHER','CLOSED',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO09','demo_u09',NULL,'Change the phone number on my account','OTHER','OPEN',unixepoch()*1000,unixepoch()*1000),
  ('TK-DEMO10','demo_u10',(SELECT id FROM orders WHERE code='DEMO-0010'),'Refund for my cancelled booking','BILLING','ANSWERED',unixepoch()*1000,unixepoch()*1000)
  ON CONFLICT(ref) DO NOTHING;

-- Opening message from the customer on every ticket.
INSERT INTO ticket_messages (ticket_id, author_type, author_id, author_name, body, internal, created_at)
  SELECT t.id, 'CUSTOMER', t.user_id, p.full_name,
    CASE t.ref
      WHEN 'TK-DEMO01' THEN 'Something came up at work. Could we move the AC cleaning to Friday morning instead?'
      WHEN 'TK-DEMO02' THEN 'The technician came yesterday and said it was fixed, but the lower compartment is still warm this morning.'
      WHEN 'TK-DEMO03' THEN 'I live in Savar, just outside Dhaka. Do you send technicians out that far?'
      WHEN 'TK-DEMO04' THEN 'I had 500 taka of referral credit but only 200 came off the total. Can you check?'
      WHEN 'TK-DEMO05' THEN 'Where do I find my referral code to send to friends?'
      WHEN 'TK-DEMO06' THEN 'The slot was 3pm to 6pm and nobody has arrived yet. Is someone still coming?'
      WHEN 'TK-DEMO07' THEN 'Could you email me an invoice for the TV diagnosis? I need it for my office claim.'
      WHEN 'TK-DEMO08' THEN 'Which filters did the technician actually change? I want to know what to expect next time.'
      WHEN 'TK-DEMO09' THEN 'I have a new mobile number. How do I update it on my account?'
      ELSE 'I cancelled my booking yesterday. When will the refund come through?'
    END,
    0, unixepoch()*1000
  FROM tickets t
  JOIN profiles p ON p.user_id = t.user_id
  WHERE t.ref LIKE 'TK-DEMO%'
    AND t.id NOT IN (SELECT ticket_id FROM ticket_messages);

-- A staff reply on the ones that are not still awaiting a first response, plus
-- one internal note — so the staff view and the customer view visibly differ.
INSERT INTO ticket_messages (ticket_id, author_type, author_id, author_name, body, internal, created_at)
  SELECT t.id, 'STAFF', NULL, 'SolveX Support',
    CASE t.ref
      WHEN 'TK-DEMO03' THEN 'Not at the moment — we cover Dhaka city only. We will let you know when that changes.'
      WHEN 'TK-DEMO05' THEN 'It is on your account page under Referrals. Anyone who books with it earns you credit once their first job is completed.'
      WHEN 'TK-DEMO06' THEN 'Apologies for the wait — the technician was held up on the previous job and arrived at 6:40pm.'
      WHEN 'TK-DEMO07' THEN 'Invoice sent to the email on your account. Let us know if it has not arrived.'
      WHEN 'TK-DEMO08' THEN 'Sediment and carbon filters were replaced. The RO membrane was still within tolerance and was left in place.'
      ELSE 'Your refund has been approved and will reach the original payment method within 5 working days.'
    END,
    0, unixepoch()*1000 + 1
  FROM tickets t
  WHERE t.ref IN ('TK-DEMO03','TK-DEMO05','TK-DEMO06','TK-DEMO07','TK-DEMO08','TK-DEMO10')
    AND (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) < 2;

INSERT INTO ticket_messages (ticket_id, author_type, author_id, author_name, body, internal, created_at)
  SELECT t.id, 'STAFF', NULL, 'SolveX Support',
    'Internal: second complaint from this customer this month. Check the technician''s notes before offering anything.',
    1, unixepoch()*1000 + 2
  FROM tickets t
  WHERE t.ref = 'TK-DEMO02'
    AND (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.internal = 1) = 0;
