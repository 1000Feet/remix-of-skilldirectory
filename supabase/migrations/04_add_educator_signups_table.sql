
-- Create temporary table to store pending educator signups
CREATE TABLE IF NOT EXISTS public.educator_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add 24-hour expiration policy for cleanup
CREATE OR REPLACE FUNCTION delete_expired_educator_signups() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.educator_signups
    WHERE created_at < NOW() - INTERVAL '24 hours';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up expired signups
DROP TRIGGER IF EXISTS cleanup_expired_signups ON public.educator_signups;
CREATE TRIGGER cleanup_expired_signups
AFTER INSERT ON public.educator_signups
EXECUTE FUNCTION delete_expired_educator_signups();

-- Set RLS policies for this table
ALTER TABLE public.educator_signups ENABLE ROW LEVEL SECURITY;

-- Only allow inserts from authenticated or anon users, no selects/updates/deletes
CREATE POLICY "Allow inserts from anyone" ON public.educator_signups
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Only admin can view the data
CREATE POLICY "Only service_role can select data" ON public.educator_signups
    FOR SELECT TO service_role
    USING (true);

-- Only service_role can delete the data (for cleanup and after registration)
CREATE POLICY "Only service_role can delete data" ON public.educator_signups
    FOR DELETE TO service_role
    USING (true);
