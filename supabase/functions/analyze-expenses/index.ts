import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpenseData {
  date: string;
  amount: number;
  category: string;
  company: string;
  description: string;
}

interface AnalysisRequest {
  expenses: ExpenseData[];
  period1: {
    start: string;
    end: string;
    label: string;
  };
  period2?: {
    start: string;
    end: string;
    label: string;
  };
  companies?: string[];
  categories?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      throw new Error("Admin access required");
    }

    const requestData: AnalysisRequest = await req.json();
    const { expenses, period1, period2, companies, categories } = requestData;

    // Calculate metrics for period 1
    const period1Expenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= new Date(period1.start) && expenseDate <= new Date(period1.end);
    });

    const period1Total = period1Expenses.reduce((sum, e) => sum + e.amount, 0);
    const period1Count = period1Expenses.length;

    // Calculate metrics for period 2 if provided
    let period2Total = 0;
    let period2Count = 0;
    let percentChange = 0;

    if (period2) {
      const period2Expenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= new Date(period2.start) && expenseDate <= new Date(period2.end);
      });
      
      period2Total = period2Expenses.reduce((sum, e) => sum + e.amount, 0);
      period2Count = period2Expenses.length;
      
      if (period1Total > 0) {
        percentChange = ((period2Total - period1Total) / period1Total) * 100;
      }
    }

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    period1Expenses.forEach(e => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
      .join("\n");

    // Company breakdown
    const companyMap: Record<string, number> = {};
    period1Expenses.forEach(e => {
      companyMap[e.company] = (companyMap[e.company] || 0) + e.amount;
    });

    const companyBreakdown = Object.entries(companyMap)
      .map(([comp, amount]) => `${comp}: $${amount.toFixed(2)}`)
      .join("\n");

    // Prepare AI prompt
    const prompt = `You are a financial analyst reviewing fleet maintenance expenses. Analyze the following data:

${period2 ? `Period 1 (${period1.label}): $${period1Total.toFixed(2)} across ${period1Count} expenses
Period 2 (${period2.label}): $${period2Total.toFixed(2)} across ${period2Count} expenses
Change: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%` : `Period (${period1.label}): $${period1Total.toFixed(2)} across ${period1Count} expenses`}

Breakdown by category:
${categoryBreakdown}

Breakdown by company:
${companyBreakdown}

Provide a concise analysis (max 200 words) in JSON format with these keys:
- "main_drivers": Array of 2-3 key factors driving the expense pattern (strings)
- "patterns": Array of 2-3 notable patterns or anomalies (strings)
- "recommendations": Array of 2-3 actionable recommendations (strings)

Focus on maintenance-specific insights (equipment failures, seasonal patterns, vendor efficiency, preventive vs reactive maintenance, etc.).`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      } else if (aiResponse.status === 402) {
        throw new Error("PAYMENT_REQUIRED");
      }
      throw new Error(`AI Gateway error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    let insights;
    try {
      insights = JSON.parse(aiContent);
    } catch {
      // Fallback if JSON parsing fails
      insights = {
        main_drivers: ["Unable to parse AI response"],
        patterns: [],
        recommendations: []
      };
    }

    return new Response(
      JSON.stringify({ 
        insights,
        metadata: {
          period1Total,
          period1Count,
          period2Total,
          period2Count,
          percentChange
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in analyze-expenses:", error);
    
    const errorMessage = error.message || "Unknown error";
    const status = errorMessage === "RATE_LIMIT_EXCEEDED" ? 429 :
                   errorMessage === "PAYMENT_REQUIRED" ? 402 :
                   errorMessage.includes("Admin") ? 403 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status 
      }
    );
  }
});
