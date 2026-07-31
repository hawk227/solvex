-- Removes everything demo-data.sql inserted, and nothing else.
--
-- Ordered child-first rather than relying on cascade, so it behaves the same
-- whether or not foreign keys are enforced on the connection running it.
--
-- Real customer or order rows are never matched: every statement is anchored to
-- a demo marker ('demo_u%', 'DEMO-%', 'TK-DEMO%', '@demo.solvex.invalid').

DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM tickets WHERE ref LIKE 'TK-DEMO%');
DELETE FROM tickets WHERE ref LIKE 'TK-DEMO%';

DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE code LIKE 'DEMO-%');
DELETE FROM credit_ledger WHERE order_id IN (SELECT id FROM orders WHERE code LIKE 'DEMO-%');
DELETE FROM orders WHERE code LIKE 'DEMO-%';

DELETE FROM referrals WHERE referrer_user_id LIKE 'demo_u%' OR referee_user_id LIKE 'demo_u%';
DELETE FROM credit_ledger WHERE user_id LIKE 'demo_u%';
DELETE FROM profiles WHERE user_id LIKE 'demo_u%';
DELETE FROM user WHERE id LIKE 'demo_u%';

DELETE FROM technicians WHERE email LIKE '%@demo.solvex.invalid';

-- Catalog last, and conditionally.
--
-- A service with a real booking against it CANNOT be deleted (orders reference
-- services with ON DELETE restrict). Deleting unconditionally would abort the
-- whole file and roll back everything above it — meaning that once one real
-- customer books a demo service, the demo customers, orders and tickets become
-- impossible to remove. So each catalog delete skips anything still referenced,
-- and the rest of the cleanup always completes.
--
-- Anything skipped is a service someone genuinely booked. Rename it in the CMS
-- rather than forcing it out.
DELETE FROM service_prices WHERE service_id IN (
  SELECT id FROM services WHERE slug IN (
    'ac-cleaning','ac-health-checkup','ac-gas-refill','fridge-repair','fridge-deep-clean',
    'washer-servicing','oven-servicing','tv-diagnosis','purifier-filter-change','geyser-servicing')
  AND id NOT IN (SELECT service_id FROM orders));

DELETE FROM services WHERE slug IN (
  'ac-cleaning','ac-health-checkup','ac-gas-refill','fridge-repair','fridge-deep-clean',
  'washer-servicing','oven-servicing','tv-diagnosis','purifier-filter-change','geyser-servicing')
  AND id NOT IN (SELECT service_id FROM orders);

-- Categories go only if every service under them is gone.
DELETE FROM categories WHERE slug IN (
  'air-conditioner','refrigerator','washing-machine','oven','television',
  'water-purifier','geyser','air-cooler','kitchen-hood','dishwasher')
  AND id NOT IN (SELECT category_id FROM services);
