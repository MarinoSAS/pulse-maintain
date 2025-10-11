import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SetupAdmin() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    handleSetup();
  }, []);

  const handleSetup = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-admin');

      if (error) throw error;
      
      setSuccess(true);
      toast.success("Admin account created! Redirecting to login...");
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to setup admin account");
      setLoading(false);
    }
  };

  if (loading && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Setting up Admin Account...</CardTitle>
            <CardDescription>
              Please wait while we create your admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>✓ Admin Account Created!</CardTitle>
            <CardDescription>
              Redirecting to login page...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Login with:</p>
              <p className="text-sm text-muted-foreground">Phone: 0035799554219</p>
              <p className="text-sm text-muted-foreground">Password: Akarmi.2</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Failed</CardTitle>
          <CardDescription>
            There was an error creating the admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSetup} 
            className="w-full bg-gradient-accent"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
