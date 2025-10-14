import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Expense = {
  date: string;
  amount: number;
  category: string;
  company: string;
  description: string;
};

interface AIInsightsProps {
  expenses: Expense[];
  dateRange: { start: string; end: string };
}

export function AIInsights({ expenses, dateRange }: AIInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<{
    main_drivers?: string[];
    patterns?: string[];
    recommendations?: string[];
  } | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-expenses', {
        body: {
          expenses,
          period1: {
            start: dateRange.start,
            end: dateRange.end,
            label: `${dateRange.start} to ${dateRange.end}`
          }
        }
      });

      if (error) {
        if (error.message === "RATE_LIMIT_EXCEEDED") {
          toast.error("Rate limit exceeded. Please try again in a few minutes.");
        } else if (error.message === "PAYMENT_REQUIRED") {
          toast.error("AI credits exhausted. Please add funds to your Lovable workspace.");
        } else {
          throw error;
        }
        return;
      }

      setInsights(data.insights);
      setGeneratedAt(new Date());
      toast.success("AI analysis generated successfully");
    } catch (err) {
      console.error("Failed to generate AI insights:", err);
      toast.error("Failed to generate AI insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canRegenerate = !generatedAt || (new Date().getTime() - generatedAt.getTime() > 60000);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!insights ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Generate AI-powered insights to understand expense patterns and trends
            </p>
            <Button onClick={generateInsights} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Analysis
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {insights.main_drivers && insights.main_drivers.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-primary">•</span> Main Drivers
                </h4>
                <ul className="space-y-2 ml-4">
                  {insights.main_drivers.map((driver, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {driver}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insights.patterns && insights.patterns.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-chart-2">•</span> Patterns Detected
                </h4>
                <ul className="space-y-2 ml-4">
                  {insights.patterns.map((pattern, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insights.recommendations && insights.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-success">•</span> Recommendations
                </h4>
                <ul className="space-y-2 ml-4">
                  {insights.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Generated: {generatedAt?.toLocaleString()}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={generateInsights}
                disabled={loading || !canRegenerate}
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
