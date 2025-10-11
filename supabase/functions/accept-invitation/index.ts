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

    console.log('Checking for existing user with email:', generatedEmail);

    // Check if user already exists
    const { data: existingUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error checking for existing users:', listUsersError);
      throw listUsersError;
    }

    const existingUser = existingUsers.users.find(u => u.email === generatedEmail);
    let userId: string;

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      
      // Check if this specific invitation was already accepted
      const { data: existingInvitation, error: checkInvError } = await supabaseAdmin
        .from('invitations')
        .select('accepted')
        .eq('token', token)
        .single();

      if (checkInvError) {
        console.error('Error checking invitation status:', checkInvError);
      }

      if (existingInvitation?.accepted) {
        console.log('Invitation already accepted');
        return new Response(
          JSON.stringify({ error: 'This invitation has already been used' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = existingUser.id;
      
      // Update the password for the existing user
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      );

      if (passwordError) {
        console.error('Error updating password:', passwordError);
        throw passwordError;
      }

      console.log('Using existing user, updated password, will update role and team member');
    } else {
      console.log('Creating new user with email:', generatedEmail);

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

      userId = authData.user.id;
      console.log('User created successfully:', userId);
    }

    // Upsert team member with the correct user ID
    const nameParts = invitation.invitee_name.split(" ");
    const initials = nameParts.map((n: string) => n[0]).join("").toUpperCase().slice(0, 3);
    
    const { error: teamMemberError } = await supabaseAdmin
      .from('team_members')
      .upsert({ 
        id: userId,  // Use the auth user ID as the primary key
        name: invitation.invitee_name,
        initials: initials,
        role: invitation.role === 'admin' ? 'Administrator' : 'Manager',
        phone_number: phoneNumber,
        email: generatedEmail,
        active_tasks: 0,
        completed_tasks: 0
      }, {
        onConflict: 'id'
      });

    if (teamMemberError) {
      console.error('Error upserting team member:', teamMemberError);
      throw teamMemberError;
    }

    // Assign or update the role for the user
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: invitation.role,
      }, {
        onConflict: 'user_id,role'
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
