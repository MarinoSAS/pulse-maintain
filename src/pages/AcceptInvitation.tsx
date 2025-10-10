import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Invalid invitation link");
      navigate("/auth");
      return;
    }

    loadInvitation(token);
  }, [searchParams, navigate]);

  const loadInvitation = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .eq("accepted", false)
        .single();

      if (error) throw error;

      if (new Date(data.expires_at) < new Date()) {
        toast.error("This invitation has expired");
        navigate("/auth");
        return;
      }

      setInvitation(data);
    } catch (error: any) {
      toast.error("Invalid invitation");
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("No user returned");

      // Assign the role to the user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: invitation.role,
        });

      if (roleError) throw roleError;

      // Mark invitation as accepted
      await supabase
        .from("invitations")
        .update({ accepted: true })
        .eq("id", invitation.id);

      toast.success("Account created successfully! Please sign in.");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join MaintenancePro as a{" "}
            <span className="font-semibold">{invitation.role}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                {...register("fullName")}
                placeholder="John Smith"
              />
              {errors.fullName && (
                <p className="text-sm text-destructive mt-1">{String(errors.fullName.message)}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{String(errors.password.message)}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{String(errors.confirmPassword.message)}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-gradient-accent">
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
