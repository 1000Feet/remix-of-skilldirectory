REVOKE EXECUTE ON FUNCTION public.claim_email_for_send(uuid, text, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_batch_counter(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_for_send(uuid, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_batch_counter(uuid, text, text) TO service_role;