import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Delete all existing users from auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    if (existingUsers?.users) {
      for (const user of existingUsers.users) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }

    // Create admin user
    const phoneNumber = "0035799554219";
    const password = "Akarmi.2";
    const phoneEmail = `${phoneNumber}@system.internal`;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: phoneEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: "Administrator",
        phone_number: phoneNumber
      }
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("Failed to create user");

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: phoneEmail,
        full_name: "Administrator"
      });

    if (profileError) throw profileError;

    // Create admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'admin'
      });

    if (roleError) throw roleError;

    // Create team member entry
    const { error: teamError } = await supabaseAdmin
      .from('team_members')
      .insert({
        id: newUser.user.id,
        name: "Administrator",
        initials: "AD",
        role: "Administrator",
        phone_number: phoneNumber,
        email: phoneEmail
      });

    if (teamError) throw teamError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin user created successfully",
        userId: newUser.user.id,
        email: phoneEmail
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
