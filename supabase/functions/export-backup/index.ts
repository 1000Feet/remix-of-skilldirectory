import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TABLES = ['admin_users','api_keys','categories','chat_messages','educator_profiles','environment_variables','field_permissions','lesson_requests','membership_payments','memberships','profile_views','review_reactions','review_replies','reviews','stripe_transactions','student_profiles','support_submissions'];

Deno.serve(async (_req) => {
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const all: unknown[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supa.from(t).select('*').range(from, from + PAGE - 1);
      if (error) { out[t] = [{ __error: error.message }]; break; }
      all.push(...data);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    if (!out[t]) out[t] = all;
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
});
