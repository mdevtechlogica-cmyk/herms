-- HERMS demo data for test@gmail.com only
-- Run in Supabase SQL Editor (safe to re-run)
-- Categories are shared; branches + equipment belong to test@gmail.com

-- Categories (global catalog)
INSERT INTO public.equipment_categories (category_name, description, icon)
VALUES
  ('Excavators', 'Hydraulic excavators for digging and earthwork', 'excavator'),
  ('Cranes', 'Mobile and tower cranes for lifting', 'crane'),
  ('Loaders', 'Wheel loaders and backhoe loaders', 'loader'),
  ('Dump Trucks', 'Articulated and rigid dump trucks', 'truck'),
  ('Compactors', 'Road rollers and soil compactors', 'roller')
ON CONFLICT (category_name) DO NOTHING;

-- Ensure test@gmail.com can manage the shop (if account exists)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = lower('test@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Branches for test@gmail.com only
WITH owner AS (
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower('test@gmail.com')
  LIMIT 1
),
branch_rows AS (
  SELECT * FROM (VALUES
    ('Mumbai Depot', 'IN', 'Plot 12, MIDC Andheri East, Mumbai', '+91 98765 43210'),
    ('Pune Yard',    'IN', 'Chakan Industrial Area, Pune',       '+91 98765 43211'),
    ('Delhi Hub',    'IN', 'Sector 63, Noida, Uttar Pradesh',    '+91 98765 43212')
  ) AS v(name, country_code, address, phone)
)
INSERT INTO public.branches (owner_id, name, country_code, address, phone, is_active)
SELECT o.id, v.name, v.country_code, v.address, v.phone, true
FROM owner o
CROSS JOIN branch_rows v
WHERE o.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.owner_id = o.id AND b.name = v.name
  );

-- Demo equipment on test@gmail.com branches only
WITH owner AS (
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower('test@gmail.com')
  LIMIT 1
),
fleet AS (
  SELECT * FROM (VALUES
    ('JCB 3DX Backhoe',        'Loaders',      'Mumbai Depot', 'JCB',          '3DX Super',      2022, 'DEMO-LDR-001', 'MH-12-AB-1001', 8500,  52000, 180000, 'Diesel', '1.1 cu.m bucket',       'available'),
    ('CAT 320D Excavator',     'Excavators',   'Mumbai Depot', 'Caterpillar',  '320D',           2021, 'DEMO-EXC-001', 'MH-12-CD-2002', 12000, 75000, 260000, 'Diesel', '20 ton class',          'available'),
    ('Komatsu PC210',          'Excavators',   'Pune Yard',    'Komatsu',      'PC210-10',       2020, 'DEMO-EXC-002', 'MH-14-EF-3003', 11500, 70000, 245000, 'Diesel', '21 ton class',          'available'),
    ('Volvo L120 Loader',      'Loaders',      'Pune Yard',    'Volvo',        'L120H',          2019, 'DEMO-LDR-002', 'MH-14-GH-4004', 9500,  58000, 200000, 'Diesel', '3.2 cu.m bucket',       'booked'),
    ('Liebherr LTM 1100',      'Cranes',       'Delhi Hub',    'Liebherr',     'LTM 1100-4.2',   2018, 'DEMO-CRN-001', 'DL-01-IJ-5005', 25000, 150000, 520000, 'Diesel', '100 ton mobile',        'available'),
    ('Tadano GR-800XL',        'Cranes',       'Delhi Hub',    'Tadano',       'GR-800XL',       2017, 'DEMO-CRN-002', 'DL-01-KL-6006', 22000, 135000, 480000, 'Diesel', '80 ton rough terrain',  'under_maintenance'),
    ('BharatBenz 3528 Tipper', 'Dump Trucks',  'Mumbai Depot', 'BharatBenz',   '3528C',          2021, 'DEMO-DMP-001', 'MH-12-MN-7007', 7000,  42000, 145000, 'Diesel', '28 ton payload',        'available'),
    ('Ashok Leyland U-3718',   'Dump Trucks',  'Pune Yard',    'Ashok Leyland','U-3718',         2020, 'DEMO-DMP-002', 'MH-14-OP-8008', 6500,  39000, 135000, 'Diesel', '25 ton payload',        'available'),
    ('Hamm HD 110 Compactor',  'Compactors',   'Delhi Hub',    'Hamm',         'HD 110',         2019, 'DEMO-CMP-001', 'DL-01-QR-9009', 5500,  33000, 115000, 'Diesel', '12 ton roller',         'available'),
    ('JCB VMT 860 Roller',     'Compactors',   'Mumbai Depot', 'JCB',          'VMT 860',        2022, 'DEMO-CMP-002', 'MH-12-ST-0010', 4800,  29000, 100000, 'Diesel', '8 ton roller',          'available')
  ) AS v(
    equipment_name, category_name, branch_name, brand, model, mfg_year,
    serial_number, registration_number, daily_rate, weekly_rate, monthly_rate,
    fuel_type, capacity, status
  )
)
INSERT INTO public.equipment (
  equipment_name, category_id, branch_id, brand, model, manufacture_year,
  serial_number, registration_number, daily_rate, weekly_rate, monthly_rate,
  operator_charge, transport_charge, fuel_type, capacity, status, location
)
SELECT
  f.equipment_name,
  c.id,
  b.id,
  f.brand,
  f.model,
  f.mfg_year,
  f.serial_number,
  f.registration_number,
  f.daily_rate,
  f.weekly_rate,
  f.monthly_rate,
  1500,
  2000,
  f.fuel_type,
  f.capacity,
  f.status::public.equipment_status,
  b.name
FROM fleet f
JOIN public.equipment_categories c ON c.category_name = f.category_name
JOIN public.branches b ON b.name = f.branch_name
JOIN owner o ON b.owner_id = o.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.equipment e WHERE e.serial_number = f.serial_number
);

-- Profile row for test@gmail.com (if missing)
INSERT INTO public.profiles (id, full_name, email, trial_ends_at, subscription_active, subscription_plan)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Test User'),
  u.email,
  now() + interval '365 days',
  true,
  'premium'
FROM auth.users u
WHERE lower(u.email) = lower('test@gmail.com')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  subscription_active = true,
  subscription_plan = 'premium';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower('test@gmail.com')) THEN
    RAISE NOTICE 'No user with email test@gmail.com — sign up first, then run this script again.';
  END IF;
END $$;
