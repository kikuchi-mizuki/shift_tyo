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
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Handle POST requests for specific actions
    if (req.method === 'POST') {
      const body = await req.json()
      const { action, userIds, message, timestamp } = body

      // ログエンドポイント
      if (action === 'log' || req.url.includes('/api/log')) {
        console.log(`[${timestamp || new Date().toISOString()}] ${message}`)
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