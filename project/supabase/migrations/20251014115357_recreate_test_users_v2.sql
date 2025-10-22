/*
  # Recrear Usuarios de Prueba

  ## Descripción
  Elimina y recrea los usuarios de prueba con contraseñas correctas.

  ## Usuarios
  - approver@test.com / test123456
  - maria@eventpro.com / test123456
  - creator@test.com / test123456
*/

-- Eliminar usuarios existentes y recrear
DELETE FROM auth.users WHERE email IN ('approver@test.com', 'maria@eventpro.com');

-- Crear usuario approver
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'approver@test.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"procurement_approver"}'::jsonb,
    '{"full_name":"Test Approver"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO users_profile (user_id, role, full_name, email, area)
  VALUES (
    new_user_id,
    'procurement_approver'::user_role,
    'Test Approver',
    'approver@test.com',
    'Compras'
  );
END $$;

-- Crear usuario maria (proveedor)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'maria@eventpro.com',
    crypt('test123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"supplier"}'::jsonb,
    '{"full_name":"Maria Rodriguez"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO users_profile (user_id, role, full_name, email, area)
  VALUES (
    new_user_id,
    'supplier'::user_role,
    'Maria Rodriguez',
    'maria@eventpro.com',
    NULL
  );
END $$;

-- Actualizar contraseña de creator
UPDATE auth.users 
SET 
  encrypted_password = crypt('test123456', gen_salt('bf')),
  raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"request_creator"}'::jsonb,
  email_confirmed_at = now()
WHERE email = 'creator@test.com';
