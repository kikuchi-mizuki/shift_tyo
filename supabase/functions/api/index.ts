import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
    }

    try {
    // Create a Supabase client with service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('Edge Function started:', {
      url: Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
      hasGoogleKey: !!Deno.env.get('GOOGLE_MAPS_API_KEY')
    })

    // Handle POST requests for specific actions
    if (req.method === 'POST') {
      const body = await req.json()
      const { action, userIds, message, timestamp } = body

      // ログエンドポイント
      if (action === 'log' || req.url.includes('/api/log')) {
        const logMessage = `[ADMIN_DASHBOARD_LOG] [${timestamp || new Date().toISOString()}] ${message}`
        console.log(logMessage)
        if (body.data) {
          console.log(`[ADMIN_DASHBOARD_DATA] ${JSON.stringify(body.data)}`)
        }
        return new Response(
          JSON.stringify({ success: true, logged: message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (action === 'get_user_profiles' && userIds) {
        const result = await supabaseClient
          .from('user_profiles')
          .select('*')
          .in('id', userIds)
        
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // 交通機関の所要時間（分）を取得してキャッシュ
      if (action === 'get_transit_time') {
        console.log('get_transit_time action called:', { body })
        const { origin, destination } = body as { origin: string; destination: string }
        if (!origin || !destination) {
          console.log('Missing origin or destination:', { origin, destination })
          return new Response(
            JSON.stringify({ error: 'origin and destination are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log('Processing transit time request:', { origin, destination })

        // まずキャッシュを参照
        const { data: cached } = await supabaseClient
          .from('station_travel_times')
          .select('id, minutes')
          .eq('origin_station_name', origin)
          .eq('dest_station_name', destination)
          .eq('provider', 'google')
          .maybeSingle()

        if (cached?.minutes) {
          // last_used_atを更新（失敗しても無視）
          await supabaseClient
            .from('station_travel_times')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', cached.id)
          return new Response(JSON.stringify({ minutes: cached.minutes, source: 'cache' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Google Directions API (Transit) 呼び出し
        const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
        if (!apiKey) {
          console.error('GOOGLE_MAPS_API_KEY is not set')
          return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY is not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        try {
          const params = new URLSearchParams({
            origin,
            destination,
            mode: 'transit',
            language: 'ja',
            key: apiKey,
          })
          const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
          console.log('Calling Google Maps API:', url.replace(apiKey, 'API_KEY_HIDDEN'))
          
          const resp = await fetch(url)
          const json = await resp.json()
          console.log('Google Maps API response status:', resp.status)

          let minutes: number | null = null
          try {
            const route = json.routes?.[0]
            const leg = route?.legs?.[0]
            const durationSec = leg?.duration?.value
            if (typeof durationSec === 'number') minutes = Math.ceil(durationSec / 60)
            console.log('Parsed transit time:', { durationSec, minutes })
          } catch (error) {
            console.error('Error parsing Google Maps response:', error)
          }

          if (!minutes) {
            console.error('Could not get transit time from Google Maps API')
            return new Response(JSON.stringify({ error: 'Could not get transit time' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // キャッシュに保存（衝突時は更新）
          console.log('Saving to station_travel_times:', { origin, destination, minutes })
          const { error: upsertError } = await supabaseClient
            .from('station_travel_times')
            .upsert({
              origin_station_name: origin,
              dest_station_name: destination,
              provider: 'google',
              minutes,
              last_used_at: new Date().toISOString(),
            }, { onConflict: 'origin_station_name, dest_station_name, provider' })

          if (upsertError) {
            console.error('Error saving to station_travel_times:', upsertError)
            return new Response(JSON.stringify({ error: 'Failed to save travel time' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          console.log('Successfully saved travel time to database')
          return new Response(JSON.stringify({ minutes, source: 'google' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          console.error('Error in get_transit_time:', error)
          return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
    }

    // Handle GET requests for backward compatibility
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    let result

    switch (path) {
      case 'user_profiles':
        result = await supabaseClient
          .from('user_profiles')
          .select('*')
        break

      case 'assigned_shifts':
        result = await supabaseClient
        .from('assigned_shifts')
          .select('*')
        break

      case 'shift_requests':
        result = await supabaseClient
          .from('shift_requests')
          .select('*')
        break

      case 'shift_postings':
        result = await supabaseClient
          .from('shift_postings')
          .select('*')
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

    } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})