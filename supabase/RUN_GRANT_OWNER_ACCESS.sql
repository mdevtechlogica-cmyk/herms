-- Legacy one-shot: promote users without staff roles to admin.
-- Prefer RUN_SIGNUP_ACCESS_FIX.sql (updates bootstrap + trigger + fixes existing users).
-- Safe to re-run.

DELETE FROM public.user_roles ur
WHERE ur.role::text = 'admin'
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = u.id AND ur.role::text IN ('admin', 'employee')
)
ON CONFLICT (user_id, role) DO NOTHING;
