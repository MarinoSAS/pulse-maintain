import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { expenseId } = await req.json();

    // Fetch expense with metadata
    const { data: expense, error: fetchError } = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (fetchError) throw fetchError;

    // Only proceed if maintenance metadata exists
    if (!expense.maintenance_category) {
      return new Response(
        JSON.stringify({ message: 'No maintenance metadata found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate due conditions
    const expenseDate = new Date(expense.date);
    let dueByDate = null;
    let dueByOdometer = null;

    if (expense.next_service_interval_days) {
      dueByDate = new Date(expenseDate);
      dueByDate.setDate(dueByDate.getDate() + expense.next_service_interval_days);
    }

    if (expense.next_service_interval_km && expense.odometer_at_service) {
      dueByOdometer = expense.odometer_at_service + expense.next_service_interval_km;
    }

    // Create maintenance schedule
    const { error: scheduleError } = await supabaseClient
      .from('maintenance_schedules')
      .insert({
        asset_id: expense.asset_id,
        maintenance_type: expense.maintenance_category,
        maintenance_category: expense.maintenance_category,
        scheduled_date: dueByDate ? dueByDate.toISOString().split('T')[0] : expenseDate.toISOString().split('T')[0],
        due_by_date: dueByDate ? dueByDate.toISOString().split('T')[0] : null,
        due_by_odometer: dueByOdometer,
        auto_generated: true,
        source_expense_id: expense.id,
        notes: `Auto-scheduled from expense. Due in ${expense.next_service_interval_days || 'N/A'} days or ${expense.next_service_interval_km || 'N/A'} km (whichever comes first)`,
        created_by: expense.created_by
      });

    if (scheduleError) throw scheduleError;

    // Update asset maintenance tracking
    const { error: assetError } = await supabaseClient
      .from('assets')
      .update({
        last_maintenance_date: expenseDate.toISOString().split('T')[0],
        last_maintenance_odometer: expense.odometer_at_service,
        maintenance_interval_days: expense.next_service_interval_days,
        maintenance_interval_km: expense.next_service_interval_km
      })
      .eq('id', expense.asset_id);

    if (assetError) throw assetError;

    return new Response(
      JSON.stringify({ message: 'Maintenance scheduled successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in auto-schedule-maintenance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
