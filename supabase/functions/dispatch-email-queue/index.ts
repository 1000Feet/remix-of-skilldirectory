// Cron-driven orchestrator. Runs every minute. Recovers stale leases,
// finds rows ready to send, and fans out to send-one-email. Does NOT send.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FANOUT_PER_TICK = parseInt(Deno.env.get('MAX_FANOUT_PER_TICK') ?? '20', 10)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Recover stale leases (workers that crashed or timed out).
  const { data: recovered, error: recErr } = await supabase
    .from('email_send_queue')
    .update({ status: 'pending', claimed_by: null, claimed_until: null })
    .eq('status', 'sending')
    .lt('claimed_until', new Date().toISOString())
    .select('id')

  if (recErr) console.error('lease recovery error', recErr)
  const recoveredIds = (recovered ?? []).map((r: any) => r.id)

  // 2. Find pending rows whose next_attempt_at has arrived.
  const remaining = Math.max(0, MAX_FANOUT_PER_TICK - recoveredIds.length)
  const { data: due, error: dueErr } = await supabase
    .from('email_send_queue')
    .select('id')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(remaining)

  if (dueErr) {
    console.error('due query error', dueErr)
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const dueIds = (due ?? []).map((r: any) => r.id)
  const allIds = Array.from(new Set([...recoveredIds, ...dueIds]))

  if (allIds.length === 0) {
    return new Response(JSON.stringify({ dispatched: 0 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Fan out — fire-and-forget invocations to send-one-email.
  const workerUrl = `${supabaseUrl}/functions/v1/send-one-email`
  const results = await Promise.allSettled(
    allIds.map((id) =>
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queue_id: id }),
      }).then((r) => r.text())
    )
  )

  const fulfilled = results.filter((r) => r.status === 'fulfilled').length
  const rejected = results.length - fulfilled

  return new Response(JSON.stringify({
    dispatched: allIds.length,
    fulfilled,
    rejected,
    recovered: recoveredIds.length,
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
