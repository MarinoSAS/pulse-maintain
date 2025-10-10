import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  inviteLink: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, role, inviteLink, inviterName }: InvitationRequest = await req.json();

    console.log("Sending invitation email to:", email);

    const emailResponse = await resend.emails.send({
      from: "MaintenancePro <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to join MaintenancePro",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation to MaintenancePro</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">MaintenancePro</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Maintenance Management Platform</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">You're Invited!</h2>
                <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                  ${inviterName} has invited you to join MaintenancePro as a <strong style="color: #667eea;">${role}</strong>.
                </p>
                <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                  MaintenancePro is a comprehensive platform for managing your fleet, equipment, tasks, and maintenance schedules all in one place.
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteLink}" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a>
                </p>
                
                <p style="color: #999; font-size: 14px; margin: 20px 0 0 0;">
                  This invitation will expire in 7 days.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw emailResponse.error;
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send invitation email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
