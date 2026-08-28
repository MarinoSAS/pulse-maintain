import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const [role, setRole] = useState<'admin' | 'manager' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as 'admin' | 'manager');
      setRole(roles.includes('admin') ? 'admin' : roles.includes('manager') ? 'manager' : null);
    } catch (error) {
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, isAdmin: role === 'admin', isManager: role === 'manager' };
}
