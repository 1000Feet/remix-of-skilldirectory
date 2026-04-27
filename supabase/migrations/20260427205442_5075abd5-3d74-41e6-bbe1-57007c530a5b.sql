-- ============================================================
-- Email outreach system: leads + batches + queue + audit log
-- ============================================================

-- 1. Lead store
CREATE TABLE IF NOT EXISTS public.potential_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  website text,
  category text,
  city text,
  state text,
  address text,
  rating numeric,
  reviews_count int,
  source_query text,
  google_id text,
  contacted boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_potential_clients_email ON public.potential_clients (email);
CREATE INDEX IF NOT EXISTS idx_potential_clients_google_id ON public.potential_clients (google_id);
CREATE INDEX IF NOT EXISTS idx_potential_clients_contacted ON public.potential_clients (contacted);

CREATE TRIGGER trg_potential_clients_updated_at
  BEFORE UPDATE ON public.potential_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Batch metadata
CREATE TABLE IF NOT EXISTS public.email_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','paused','completed','stopped')),
  total int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  cursor int NOT NULL DEFAULT 0,
  prospect_ids jsonb NOT NULL DEFAULT '[]',
  consecutive_failures int NOT NULL DEFAULT 0,
  stop_requested boolean NOT NULL DEFAULT false,
  paused_reason text,
  paused_until timestamptz,
  last_heartbeat_at timestamptz DEFAULT now(),
  last_error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 3. The queue (heart of the system)
CREATE TABLE IF NOT EXISTS public.email_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  campaign_type text NOT NULL DEFAULT 'default'
    CHECK (campaign_type IN ('default')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','failed','skipped')),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  claimed_by text,
  claimed_until timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, prospect_id, campaign_type)
);

CREATE INDEX IF NOT EXISTS idx_queue_dispatch
  ON public.email_send_queue (next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_queue_lease_recovery
  ON public.email_send_queue (claimed_until)
  WHERE status = 'sending';

CREATE TRIGGER trg_email_send_queue_updated_at
  BEFORE UPDATE ON public.email_send_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Audit log
CREATE TABLE IF NOT EXISTS public.campaign_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  prospect_id uuid,
  recipient_email text NOT NULL,
  subject text,
  language text,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  attempt_count int NOT NULL DEFAULT 1,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Anti-duplicate hard safety net: at most ONE 'sent' row per (batch, prospect)
CREATE UNIQUE INDEX IF NOT EXISTS campaign_email_log_unique_sent_pair
  ON public.campaign_email_log (batch_id, prospect_id)
  WHERE status = 'sent' AND batch_id IS NOT NULL AND prospect_id IS NOT NULL;

-- Cross-batch safety net: never send to the same address twice as 'sent'
CREATE UNIQUE INDEX IF NOT EXISTS campaign_email_log_unique_sent_email
  ON public.campaign_email_log (recipient_email)
  WHERE status = 'sent';

-- ============================================================
-- 5. Atomic claim function (anti-double-send primitive)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_email_for_send(
  p_queue_id uuid,
  p_worker_id text,
  p_lease_seconds int
) RETURNS public.email_send_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.email_send_queue;
BEGIN
  UPDATE public.email_send_queue
  SET status = 'sending',
      claimed_by = p_worker_id,
      claimed_until = now() + make_interval(secs => p_lease_seconds),
      attempts = attempts + 1,
      updated_at = now()
  WHERE id = p_queue_id
    AND status = 'pending'
    AND next_attempt_at <= now()
  RETURNING * INTO result;

  RETURN result;  -- NULL row if not claimable
END;
$$;

-- ============================================================
-- 6. Increment batch counters atomically + auto-complete
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_batch_counter(
  p_batch_id uuid,
  p_kind text,
  p_table text DEFAULT 'email_batches'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_kind NOT IN ('sent','failed','skipped') THEN
    RAISE EXCEPTION 'invalid kind %', p_kind;
  END IF;

  IF p_kind = 'sent' THEN
    UPDATE public.email_batches
    SET sent_count = sent_count + 1,
        cursor = cursor + 1,
        last_heartbeat_at = now(),
        consecutive_failures = 0,
        status = CASE
          WHEN sent_count + 1 + failed_count + skipped_count >= total THEN 'completed'
          ELSE status
        END,
        completed_at = CASE
          WHEN sent_count + 1 + failed_count + skipped_count >= total THEN now()
          ELSE completed_at
        END
    WHERE id = p_batch_id;
  ELSIF p_kind = 'failed' THEN
    UPDATE public.email_batches
    SET failed_count = failed_count + 1,
        cursor = cursor + 1,
        last_heartbeat_at = now(),
        status = CASE
          WHEN sent_count + failed_count + 1 + skipped_count >= total THEN 'completed'
          ELSE status
        END,
        completed_at = CASE
          WHEN sent_count + failed_count + 1 + skipped_count >= total THEN now()
          ELSE completed_at
        END
    WHERE id = p_batch_id;
  ELSE
    UPDATE public.email_batches
    SET skipped_count = skipped_count + 1,
        cursor = cursor + 1,
        last_heartbeat_at = now(),
        status = CASE
          WHEN sent_count + failed_count + skipped_count + 1 >= total THEN 'completed'
          ELSE status
        END,
        completed_at = CASE
          WHEN sent_count + failed_count + skipped_count + 1 >= total THEN now()
          ELSE completed_at
        END
    WHERE id = p_batch_id;
  END IF;
END;
$$;

-- ============================================================
-- 7. RLS — admin-only (sensitive: lead data + send logs)
-- ============================================================
ALTER TABLE public.potential_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_email_log ENABLE ROW LEVEL SECURITY;

-- potential_clients: full CRUD for admins only
CREATE POLICY "Admins read potential_clients"
  ON public.potential_clients FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert potential_clients"
  ON public.potential_clients FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update potential_clients"
  ON public.potential_clients FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete potential_clients"
  ON public.potential_clients FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- email_batches: admins read + create + cancel
CREATE POLICY "Admins read email_batches"
  ON public.email_batches FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert email_batches"
  ON public.email_batches FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update email_batches"
  ON public.email_batches FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- email_send_queue: admins can inspect; writes are server-side via service role (bypasses RLS)
CREATE POLICY "Admins read email_send_queue"
  ON public.email_send_queue FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- campaign_email_log: admins read; writes server-side
CREATE POLICY "Admins read campaign_email_log"
  ON public.campaign_email_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 8. Realtime for live progress updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_batches;