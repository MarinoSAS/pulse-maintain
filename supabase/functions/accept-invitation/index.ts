import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, phoneNumber, password } = await req.json();

    console.log('Accept invitation request received', { token, phoneNumber });

    if (!token || !phoneNumber || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify invitation is valid
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('accepted', false)
      .maybeSingle();

    if (invitationError) {
      console.error('Error fetching invitation:', invitationError);
      throw invitationError;
    }

    if (!invitation) {
      console.log('Invitation not found or already accepted');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.log('Invitation expired');
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique email from phone number
    const generatedEmail = `${phoneNumber.replace(/[^0-9]/g, '')}@maintenancepro.local`;

    console.log('Creating user with email:', generatedEmail);

    // Create user account with admin privileges
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: generatedEmail,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: invitation.invitee_name,
        phone_number: phoneNumber,
      },
    });

    if (signUpError) {
      console.error('Error creating user:', signUpError);
      throw signUpError;
    }

    if (!authData.user) {
      throw new Error('No user returned from createUser');
    }

    console.log('User created successfully:', authData.user.id);

    // Update team member with phone number and email
    const { error: teamMemberError } = await supabaseAdmin
      .from('team_members')
      .update({ 
        phone_number: phoneNumber,
        email: generatedEmail 
      })
      .eq('name', invitation.invitee_name);

    if (teamMemberError) {
      console.error('Error updating team member:', teamMemberError);
    }

    // Assign the role to the user
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: invitation.role,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw roleError;
    }

    console.log('Role assigned successfully');

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ accepted: true })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error marking invitation as accepted:', updateError);
    }

    console.log('Invitation accepted successfully');

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: generatedEmail,
    });

    if (sessionError) {
      console.error('Error generating session:', sessionError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account created successfully',
        email: generatedEmail,
        password: password // Send back so frontend can sign in
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in accept-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create account' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
