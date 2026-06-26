
ALTER FUNCTION public.set_booking_number() SET search_path = public;
ALTER FUNCTION public.check_booking_overlap() SET search_path = public;
ALTER FUNCTION public.set_invoice_number() SET search_path = public;
ALTER FUNCTION public.tg_set_updated_at() SET search_path = public;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
