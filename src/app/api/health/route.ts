import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public health-check endpoint for external uptime monitors.
//
// Deliberately unauthenticated (not in middleware's protectedPaths) so a
// monitor like UptimeRobot can hit it directly. Doubles as a Supabase
// keep-alive: Supabase's free tier auto-pauses a project after 7 days with
// no API activity, so a monitor pinging this every few minutes also covers
// that — no separate daily cron needed.
export const dynamic = 'force-dynamic'

let _adminClient: ReturnType<typeof createClient> | null = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

export async function GET() {
  try {
    // HEAD-style count query against a small, always-present table —
    // cheapest possible real round-trip to Supabase (no rows returned).
    const { error } = await supabaseAdmin()
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        { status: 'error', supabase: 'error', message: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json({ status: 'ok', supabase: 'ok' })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        supabase: 'unreachable',
        message: err instanceof Error ? err.message : 'unknown error',
      },
      { status: 503 }
    )
  }
}
