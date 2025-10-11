import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SetupAdmin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-admin');

      if (error) throw error;
      
      toast.success("Admin account created successfully! You can now login.");
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to setup admin account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Admin Account</CardTitle>
          <CardDescription>
            This will delete all existing users and create a new admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Admin Details:</p>
              <p className="text-sm text-muted-foreground">Phone: 0035799554219</p>
              <p className="text-sm text-muted-foreground">Password: Akarmi.2</p>
            </div>
            <Button 
              onClick={handleSetup} 
              className="w-full bg-gradient-accent"
              disabled={loading}
            >
              {loading ? "Setting up..." : "Create Admin Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
