import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client with SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Finding orphaned auth users...')

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing auth users:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all user_profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profileIds = new Set(profiles?.map(p => p.id) || [])
    
    // Find orphaned users (in auth.users but not in user_profiles)
    const orphanedUsers = authUsers.users.filter(user => !profileIds.has(user.id))

    console.log(`Found ${orphanedUsers.length} orphaned users`)

    if (orphanedUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No orphaned users found',
          deletedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete orphaned users
    const deletedUsers = []
    const errors = []

    for (const user of orphanedUsers) {
      console.log(`Deleting orphaned user: ${user.email} (${user.id})`)
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
      
      if (error) {
        console.error(`Error deleting user ${user.email}:`, error)
        errors.push({ email: user.email, id: user.id, error: error.message })
      } else {
        deletedUsers.push({ email: user.email, id: user.id })
      }
    }

    console.log(`Cleanup completed. Deleted: ${deletedUsers.length}, Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup completed',
        deletedCount: deletedUsers.length,
        deletedUsers: deletedUsers,
        errorCount: errors.length,
        errors: errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
